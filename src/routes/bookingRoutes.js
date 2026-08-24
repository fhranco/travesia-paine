const express = require('express');
const router = express.Router();
const db = require('../db/database');
const bookingService = require('../services/bookingService');
const transbankService = require('../services/transbankService');
const pdfService = require('../services/pdfService');

/**
 * GET /api/weather - Clima en tiempo real Parque Nacional Torres del Paine vía Open-Meteo
 */
let cachedWeather = null;
let lastWeatherFetch = 0;

router.get('/weather', async (req, res) => {
    const now = Date.now();
    // Cache de 10 minutos para optimizar llamadas
    if (cachedWeather && (now - lastWeatherFetch < 10 * 60 * 1000)) {
        return res.json({ success: true, data: cachedWeather, source: 'cache' });
    }

    try {
        const url = 'https://api.open-meteo.com/v1/forecast?latitude=-51.25&longitude=-72.90&current=temperature_2m,wind_speed_10m,wind_gusts_10m,weather_code&timezone=America%2FPunta_Arenas';
        const response = await fetch(url);
        if (!response.ok) throw new Error(`Open-Meteo HTTP ${response.status}`);
        const data = await response.json();
        
        if (data && data.current) {
            cachedWeather = data.current;
            lastWeatherFetch = now;
            return res.json({ success: true, data: cachedWeather, source: 'live' });
        }
        throw new Error('Respuesta inválida de Open-Meteo');
    } catch (err) {
        console.error('[Weather API Error]', err.message);
        // Fallback seguro con datos meteorológicos representativos de Torres del Paine
        const fallback = cachedWeather || {
            temperature_2m: 7,
            wind_speed_10m: 22,
            wind_gusts_10m: 35,
            weather_code: 1
        };
        res.json({ success: true, data: fallback, source: 'fallback' });
    }
});

/**
 * GET /api/tours - Lista de tours activos
 */
router.get('/tours', (req, res) => {
    try {
        const tours = db.prepare(`SELECT * FROM tours ORDER BY id ASC`).all();
        res.json({ success: true, data: tours });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

/**
 * GET /api/tours/:tourId/dates - Fechas disponibles para un tour
 */
router.get('/tours/:tourId/dates', (req, res) => {
    try {
        const { tourId } = req.params;
        const dates = db.prepare(`
            SELECT td.id, td.travel_date,
                   (SELECT COUNT(*) FROM seats s WHERE s.tour_date_id = td.id AND s.status = 'AVAILABLE') as available_seats,
                   (SELECT COUNT(*) FROM seats s WHERE s.tour_date_id = td.id) as total_seats
            FROM tour_dates td
            WHERE td.tour_id = ? AND date(td.travel_date) >= date('now')
            ORDER BY td.travel_date ASC
        `).all(tourId);
        res.json({ success: true, data: dates });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

/**
 * GET /api/seats - Obtiene el estado de los asientos de una fecha
 */
router.get('/seats', (req, res) => {
    try {
        const { tourDateId, sessionId } = req.query;
        if (!tourDateId) {
            return res.status(400).json({ success: false, error: 'tourDateId es requerido.' });
        }
        const seats = bookingService.getSeatsForDate(parseInt(tourDateId, 10), sessionId || '');
        res.json({ success: true, data: seats });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

/**
 * POST /api/seats/lock - Bloqueo atómico de asiento por 15 min
 */
router.post('/seats/lock', (req, res) => {
    try {
        const { tourDateId, seatNumber, sessionId } = req.body;
        if (!tourDateId || !seatNumber || !sessionId) {
            return res.status(400).json({ success: false, error: 'Datos incompletos para bloquear asiento.' });
        }

        const seat = bookingService.lockSeat(
            parseInt(tourDateId, 10),
            parseInt(seatNumber, 10),
            sessionId
        );

        res.json({ success: true, data: seat, message: 'Asiento reservado por 15 minutos.' });
    } catch (err) {
        res.status(400).json({ success: false, error: err.message });
    }
});

/**
 * POST /api/seats/release - Liberar bloqueo de asiento
 */
router.post('/seats/release', (req, res) => {
    try {
        const { tourDateId, seatNumber, sessionId } = req.body;
        const released = bookingService.releaseSeat(
            parseInt(tourDateId, 10),
            parseInt(seatNumber, 10),
            sessionId
        );
        res.json({ success: true, released });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

/**
 * POST /api/bookings/initiate - Crear reserva pendiente e iniciar pago Webpay Plus
 */
router.post('/bookings/initiate', async (req, res) => {
    try {
        const {
            tourDateId,
            sessionId,
            passengers, // Array: [{ seatNumber, passengerName, passengerAge, passengerDoc, passengerEmail, passengerPhone, passengerWhatsapp }]
            hotelName,
            hotelStreet,
            hotelNumber,
            policiesAccepted
        } = req.body;

        if (!tourDateId || !sessionId || !Array.isArray(passengers) || passengers.length === 0) {
            return res.status(400).json({ success: false, error: 'Debes seleccionar al menos un asiento y completar los datos de los pasajeros.' });
        }

        if (!policiesAccepted) {
            return res.status(400).json({ success: false, error: 'Debes aceptar las Políticas de Reserva, Cancelación y Reembolso para continuar.' });
        }

        // 1. Obtener precio del tour
        const tourInfo = db.prepare(`
            SELECT t.price_clp, t.name, td.travel_date
            FROM tour_dates td
            JOIN tours t ON t.id = td.tour_id
            WHERE td.id = ?
        `).get(tourDateId);

        if (!tourInfo) {
            return res.status(404).json({ success: false, error: 'El tour o fecha especificada no existe.' });
        }

        const unitPrice = tourInfo.price_clp;

        // 2. Crear orden multi-pasajero en estado PENDING
        const orderResult = bookingService.createPendingOrder({
            tourDateId: parseInt(tourDateId, 10),
            sessionId,
            passengers,
            hotelInfo: {
                hotelName: (hotelName || '').trim(),
                hotelStreet: (hotelStreet || '').trim(),
                hotelNumber: (hotelNumber || '').trim()
            },
            unitPrice
        });

        // 3. Generar orden de compra única e iniciar transacción en Webpay Plus por el monto total
        const buyOrder = `BO-${Date.now().toString().slice(-6)}-${passengers.length}`;
        const baseUrl = process.env.BASE_URL || `${req.protocol}://${req.get('host')}`;
        const returnUrl = `${baseUrl}/return.html`;

        const webpayTx = await transbankService.createTransaction(
            buyOrder,
            sessionId,
            orderResult.totalAmount,
            returnUrl
        );

        // 4. Guardar transacciones para cada reserva del grupo
        const insertTx = db.prepare(`
            INSERT INTO transactions (booking_id, buy_order, session_id, tbk_token, amount, status)
            VALUES (?, ?, ?, ?, ?, 'INITIALIZED')
        `);

        for (const b of orderResult.bookings) {
            insertTx.run(b.bookingId, buyOrder, sessionId, webpayTx.token, unitPrice);
        }

        res.json({
            success: true,
            data: {
                buyOrder,
                groupCode: orderResult.groupCode,
                totalAmount: orderResult.totalAmount,
                totalSeats: passengers.length,
                webpayUrl: webpayTx.url,
                token: webpayTx.token
            }
        });
    } catch (err) {
        console.error('Error in /api/bookings/initiate:', err);
        res.status(400).json({ success: false, error: err.message });
    }
});

/**
 * POST /api/bookings/commit - Validación estricta tras retorno de Webpay
 */
router.post('/bookings/commit', async (req, res) => {
    try {
        const { token_ws, TBK_TOKEN } = req.body;

        // Si el usuario canceló la compra en el formulario de Webpay
        if (TBK_TOKEN && !token_ws) {
            const txRecord = db.prepare(`SELECT buy_order FROM transactions WHERE tbk_token = ? LIMIT 1`).get(TBK_TOKEN);
            if (txRecord) {
                bookingService.handleFailedOrder(txRecord.buy_order);
            }
            return res.status(400).json({
                success: false,
                isCancelled: true,
                message: 'La transacción fue cancelada por el usuario en Webpay.'
            });
        }

        if (!token_ws) {
            return res.status(400).json({ success: false, error: 'Token de Webpay no recibido.' });
        }

        // Buscar transacción localmente
        const txList = db.prepare(`
            SELECT t.id, t.booking_id, t.buy_order, t.status, b.security_token, b.booking_code, b.seat_number, b.passenger_name
            FROM transactions t
            JOIN bookings b ON b.id = t.booking_id
            WHERE t.tbk_token = ?
        `).all(token_ws);

        if (!txList || txList.length === 0) {
            return res.status(404).json({ success: false, error: 'Transacción no encontrada en el sistema.' });
        }

        const buyOrder = txList[0].buy_order;

        // Si ya fue confirmada previamente
        if (txList[0].status === 'AUTHORIZED') {
            return res.json({
                success: true,
                alreadyCommitted: true,
                data: {
                    buyOrder,
                    tokens: txList.map(t => ({
                        securityToken: t.security_token,
                        bookingCode: t.booking_code,
                        seatNumber: t.seat_number,
                        passengerName: t.passenger_name
                    }))
                }
            });
        }

        // 1. Confirmar con Transbank SDK
        const commitResult = await transbankService.commitTransaction(token_ws);

        if (commitResult.isApproved) {
            // 2. Transacción APROBADA ➔ Pasar reservas y asientos a PAID
            bookingService.confirmOrderPaid(buyOrder, commitResult);

            res.json({
                success: true,
                isApproved: true,
                data: {
                    buyOrder,
                    authorizationCode: commitResult.authorizationCode,
                    amount: commitResult.amount,
                    paymentTypeCode: commitResult.paymentTypeCode,
                    cardNumber: commitResult.cardNumber,
                    tickets: txList.map(t => ({
                        securityToken: t.security_token,
                        bookingCode: t.booking_code,
                        seatNumber: t.seat_number,
                        passengerName: t.passenger_name
                    }))
                }
            });
        } else {
            // Rechazo por Transbank
            bookingService.handleFailedOrder(buyOrder);

            res.json({
                success: false,
                isApproved: false,
                responseCode: commitResult.responseCode,
                message: 'Pago no autorizado por el emisor de la tarjeta.'
            });
        }
    } catch (err) {
        console.error('[Commit Route Error]', err);
        res.status(500).json({ success: false, error: err.message || 'Error al validar el pago.' });
    }
});

/**
 * GET /api/voucher/:token/data - Obtener datos del voucher en JSON
 */
router.get('/voucher/:token/data', (req, res) => {
    try {
        const { token } = req.params;
        const booking = db.prepare(`
            SELECT b.*, t.name as tour_name, t.origin, t.destination, t.departure_time, td.travel_date
            FROM bookings b
            JOIN tour_dates td ON td.id = b.tour_date_id
            JOIN tours t ON t.id = td.tour_id
            WHERE b.security_token = ? AND b.payment_status = 'PAID'
        `).get(token);

        if (!booking) {
            return res.status(404).json({ success: false, error: 'Voucher no encontrado o reserva no pagada.' });
        }

        res.json({ success: true, data: booking });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

/**
 * GET /api/voucher/:token/pdf - Descargar voucher en PDF A5
 */
router.get('/voucher/:token/pdf', async (req, res) => {
    try {
        const { token } = req.params;
        const booking = db.prepare(`
            SELECT b.*, t.name as tour_name, t.origin, t.destination, t.departure_time, td.travel_date
            FROM bookings b
            JOIN tour_dates td ON td.id = b.tour_date_id
            JOIN tours t ON t.id = td.tour_id
            WHERE b.security_token = ? AND b.payment_status = 'PAID'
        `).get(token);

        if (!booking) {
            return res.status(404).send('Voucher no encontrado o no autorizado.');
        }

        const pdfBuffer = await pdfService.generateVoucherPdf(booking);

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename=Voucher_${booking.booking_code}.pdf`);
        res.setHeader('Content-Length', pdfBuffer.length);
        res.send(pdfBuffer);
    } catch (err) {
        console.error('[PDF Route Error]', err);
        res.status(500).send('Error al generar el PDF del voucher.');
    }
});

module.exports = router;

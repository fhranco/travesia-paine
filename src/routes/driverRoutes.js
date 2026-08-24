const express = require('express');
const router = express.Router();
const db = require('../db/database');
const pdfService = require('../services/pdfService');

/**
 * POST /api/driver/validate - Validación de abordaje por chofer
 */
router.post('/validate', (req, res) => {
    try {
        const { securityToken } = req.body;
        if (!securityToken) {
            return res.status(400).json({ success: false, status: 'INVALID', message: 'Código o token no provisto.' });
        }

        const booking = db.prepare(`
            SELECT b.id, b.booking_code, b.passenger_name, b.passenger_doc, b.seat_number,
                   b.checked_in, b.check_in_time, b.payment_status,
                   t.name as tour_name, td.travel_date, t.departure_time
            FROM bookings b
            JOIN tour_dates td ON td.id = b.tour_date_id
            JOIN tours t ON t.id = td.tour_id
            WHERE b.security_token = ?
        `).get(securityToken.trim());

        if (!booking || booking.payment_status !== 'PAID') {
            return res.json({
                success: true,
                status: 'INVALID',
                message: '❌ TICKET INVÁLIDO O NO PAGADO'
            });
        }

        if (booking.checked_in === 1) {
            return res.json({
                success: true,
                status: 'ALREADY_USED',
                message: '⚠️ TICKET YA UTILIZADO (ALERTA)',
                data: {
                    bookingCode: booking.booking_code,
                    passengerName: booking.passenger_name,
                    passengerDoc: booking.passenger_doc,
                    seatNumber: booking.seat_number,
                    firstCheckIn: booking.check_in_time,
                    tourName: booking.tour_name,
                    travelDate: booking.travel_date
                }
            });
        }

        const now = new Date().toISOString().replace('T', ' ').substring(0, 19);
        db.prepare(`
            UPDATE bookings
            SET checked_in = 1, check_in_time = ?
            WHERE id = ?
        `).run(now, booking.id);

        res.json({
            success: true,
            status: 'VALID',
            message: '✅ ABORDAJE AUTORIZADO',
            data: {
                bookingCode: booking.booking_code,
                passengerName: booking.passenger_name,
                passengerDoc: booking.passenger_doc,
                seatNumber: booking.seat_number,
                checkInTime: now,
                tourName: booking.tour_name,
                travelDate: booking.travel_date,
                departureTime: booking.departure_time
            }
        });
    } catch (err) {
        console.error('Error validating ticket:', err);
        res.status(500).json({ success: false, error: 'Error al validar el ticket.' });
    }
});

/**
 * GET /api/driver/manifest/:tourDateId - Retorna lista de pasajeros y estadísticas
 */
router.get('/manifest/:tourDateId', (req, res) => {
    try {
        const { tourDateId } = req.params;

        const tourDate = db.prepare(`
            SELECT td.id, td.travel_date, t.name as tour_name, t.departure_time, t.capacity
            FROM tour_dates td
            JOIN tours t ON t.id = td.tour_id
            WHERE td.id = ?
        `).get(tourDateId);

        if (!tourDate) {
            return res.status(404).json({ success: false, error: 'Fecha de tour no encontrada.' });
        }

        const passengers = db.prepare(`
            SELECT b.id, b.seat_number, b.booking_code, b.passenger_name, b.passenger_age,
                   b.passenger_doc, b.passenger_email, b.passenger_phone, b.passenger_whatsapp,
                   b.hotel_name, b.hotel_street, b.hotel_number,
                   b.checked_in, b.check_in_time, b.amount_clp
            FROM bookings b
            WHERE b.tour_date_id = ? AND b.payment_status = 'PAID'
            ORDER BY b.seat_number ASC
        `).all(tourDateId);

        const totalPaid = passengers.length;
        const totalCheckedIn = passengers.filter(p => p.checked_in === 1).length;

        res.json({
            success: true,
            data: {
                tourInfo: tourDate,
                stats: {
                    totalCapacity: tourDate.capacity,
                    totalPaid,
                    totalCheckedIn,
                    pendingCheckIn: totalPaid - totalCheckedIn
                },
                passengers
            }
        });
    } catch (err) {
        console.error('Error fetching manifest:', err);
        res.status(500).json({ success: false, error: 'Error al consultar manifiesto.' });
    }
});

/**
 * GET /api/driver/manifest/:tourDateId/export-csv - Descarga manifiesto en formato CSV
 */
router.get('/manifest/:tourDateId/export-csv', (req, res) => {
    try {
        const { tourDateId } = req.params;

        const tourDate = db.prepare(`
            SELECT td.id, td.travel_date, t.name as tour_name, t.departure_time
            FROM tour_dates td
            JOIN tours t ON t.id = td.tour_id
            WHERE td.id = ?
        `).get(tourDateId);

        if (!tourDate) {
            return res.status(404).send('Fecha de tour no encontrada.');
        }

        const passengers = db.prepare(`
            SELECT b.seat_number, b.booking_code, b.passenger_name, b.passenger_age,
                   b.passenger_doc, b.passenger_email, b.passenger_phone, b.passenger_whatsapp,
                   b.hotel_name, b.hotel_street, b.hotel_number,
                   b.checked_in, b.check_in_time
            FROM bookings b
            WHERE b.tour_date_id = ? AND b.payment_status = 'PAID'
            ORDER BY b.seat_number ASC
        `).all(tourDateId);

        let csv = '\uFEFF';
        csv += `MANIFIESTO DE PASAJEROS - TRAVESÍA PAINE\n`;
        csv += `Tour:;${tourDate.tour_name}\n`;
        csv += `Fecha de Viaje:;${tourDate.travel_date}\n`;
        csv += `Hora de Salida:;${tourDate.departure_time}\n\n`;
        csv += `Asiento;Codigo Reserva;Nombre Pasajero;Edad;Documento / Pasaporte;Telefono;WhatsApp;Alojamiento Pick-Up;Direccion;Estado Abordaje;Hora Check-In\n`;

        passengers.forEach(p => {
            const statusStr = p.checked_in === 1 ? 'ABORDO' : 'PENDIENTE';
            const checkInTimeStr = p.check_in_time || '-';
            const hotelNameStr = p.hotel_name || 'No especificado';
            const hotelAddressStr = `${p.hotel_street || ''} ${p.hotel_number || ''}`.trim() || '-';
            csv += `"${p.seat_number}";"${p.booking_code}";"${p.passenger_name}";"${p.passenger_age || '-'}";"${p.passenger_doc}";"${p.passenger_phone || '-'}";"${p.passenger_whatsapp || '-'}";"${hotelNameStr}";"${hotelAddressStr}";"${statusStr}";"${checkInTimeStr}"\n`;
        });

        const filename = `Manifiesto_${tourDate.travel_date}_Tour_${tourDate.id}.csv`;
        res.setHeader('Content-Type', 'text/csv; charset=utf-8');
        res.setHeader('Content-Disposition', `attachment; filename=${filename}`);
        res.status(200).send(csv);
    } catch (err) {
        console.error('Error exporting CSV:', err);
        res.status(500).send('Error al exportar el manifiesto.');
    }
});

/**
 * GET /api/driver/manifest/:tourDateId/export-pdf - Descarga manifiesto en PDF A4 Horizontal (Ancho Completo)
 */
router.get('/manifest/:tourDateId/export-pdf', async (req, res) => {
    try {
        const { tourDateId } = req.params;

        const tourDate = db.prepare(`
            SELECT td.id, td.travel_date, t.name as tour_name, t.departure_time
            FROM tour_dates td
            JOIN tours t ON t.id = td.tour_id
            WHERE td.id = ?
        `).get(tourDateId);

        if (!tourDate) {
            return res.status(404).send('Fecha de tour no encontrada.');
        }

        const passengers = db.prepare(`
            SELECT b.id, b.seat_number, b.booking_code, b.passenger_name, b.passenger_age,
                   b.passenger_doc, b.passenger_email, b.passenger_phone, b.passenger_whatsapp,
                   b.hotel_name, b.hotel_street, b.hotel_number,
                   b.checked_in, b.check_in_time
            FROM bookings b
            WHERE b.tour_date_id = ? AND b.payment_status = 'PAID'
            ORDER BY b.seat_number ASC
        `).all(tourDateId);

        const pdfBuffer = await pdfService.generateManifestPdf(tourDate, passengers);

        const filename = `Manifiesto_${tourDate.travel_date}_Tour_${tourDate.id}.pdf`;
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `inline; filename="${filename}"`);
        res.status(200).send(pdfBuffer);
    } catch (err) {
        console.error('Error exporting PDF manifest:', err);
        res.status(500).send('Error al exportar el manifiesto PDF.');
    }
});

/**
 * POST /api/driver/toggle-checkin - Marcar o desmarcar abordaje de pasajero directamente en el manifiesto con 1 clic
 */
router.post('/toggle-checkin', (req, res) => {
    try {
        const { bookingId } = req.body;
        if (!bookingId) {
            return res.status(400).json({ success: false, error: 'ID de reserva requerido.' });
        }

        const booking = db.prepare(`SELECT id, checked_in FROM bookings WHERE id = ?`).get(bookingId);
        if (!booking) {
            return res.status(404).json({ success: false, error: 'Reserva no encontrada.' });
        }

        const newCheckedIn = booking.checked_in === 1 ? 0 : 1;
        const now = newCheckedIn === 1 ? new Date().toISOString().replace('T', ' ').substring(0, 19) : null;

        db.prepare(`UPDATE bookings SET checked_in = ?, check_in_time = ? WHERE id = ?`).run(newCheckedIn, now, bookingId);

        res.json({
            success: true,
            checkedIn: newCheckedIn,
            checkInTime: now
        });
    } catch (err) {
        console.error('Error toggling check-in:', err);
        res.status(500).json({ success: false, error: 'Error al actualizar abordaje.' });
    }
});

module.exports = router;

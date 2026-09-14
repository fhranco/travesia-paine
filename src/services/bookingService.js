const db = require('../db/database');
const crypto = require('crypto');

const LOCK_TIMEOUT_MINUTES = 10;

/**
 * Comprueba si la reserva web para una fecha está cerrada.
 * Regla oficial: Cierre a las 17:00 hrs del día anterior (D-1) en huso Chile/Magallanes (UTC-3).
 */
function isBookingCutoffPassed(travelDateStr) {
    if (!travelDateStr) return false;
    const [year, month, day] = travelDateStr.split('-').map(Number);
    // Víspera a las 17:00 hrs en UTC-3 = 20:00 UTC
    const cutoffDateUTC = new Date(Date.UTC(year, month - 1, day - 1, 20, 0, 0));
    const now = new Date();
    return now.getTime() >= cutoffDateUTC.getTime();
}

/**
 * Limpia automáticamente todos los asientos cuyo bloqueo haya superado los 10 minutos.
 */
function cleanupExpiredLocks() {
    const now = new Date().toISOString();
    
    const stmt = db.prepare(`
        UPDATE seats
        SET status = 'AVAILABLE',
            locked_until = NULL,
            lock_session_id = NULL
        WHERE status = 'LOCKED' AND locked_until < ?
    `);

    const result = stmt.run(now);
    return result.changes;
}

/**
 * Bloquea atómicamente un asiento para una sesión durante 15 minutos.
 */
function lockSeat(tourDateId, seatNumber, sessionId) {
    cleanupExpiredLocks();

    const lockTransaction = db.transaction(() => {
        const seat = db.prepare(`
            SELECT id, status, locked_until, lock_session_id
            FROM seats
            WHERE tour_date_id = ? AND seat_number = ?
        `).get(tourDateId, seatNumber);

        if (!seat) {
            throw new Error(`El asiento N° ${seatNumber} no existe para esta fecha.`);
        }

        if (seat.status === 'PAID') {
            throw new Error('El asiento ya ha sido comprado y pagado.');
        }

        const now = new Date();
        const isCurrentlyLocked = seat.status === 'LOCKED' && new Date(seat.locked_until) > now;

        if (isCurrentlyLocked && seat.lock_session_id !== sessionId) {
            throw new Error(`El asiento N° ${seatNumber} está siendo reservado por otro usuario en este momento.`);
        }

        const expMs = now.getTime() + LOCK_TIMEOUT_MINUTES * 60 * 1000;
        const lockedUntil = new Date(expMs).toISOString();

        db.prepare(`
            UPDATE seats
            SET status = 'LOCKED',
                locked_until = ?,
                lock_session_id = ?
            WHERE id = ?
        `).run(lockedUntil, sessionId, seat.id);

        return {
            id: seat.id,
            seat_number: seatNumber,
            status: 'LOCKED',
            locked_until: lockedUntil,
            locked_until_ts: expMs
        };
    });

    return lockTransaction();
}

/**
 * Libera un asiento bloqueado si pertenece a la sesión activa.
 */
function releaseSeat(tourDateId, seatNumber, sessionId) {
    const stmt = db.prepare(`
        UPDATE seats
        SET status = 'AVAILABLE',
            locked_until = NULL,
            lock_session_id = NULL
        WHERE tour_date_id = ? AND seat_number = ? AND lock_session_id = ? AND status = 'LOCKED'
    `);
    return stmt.run(tourDateId, seatNumber, sessionId).changes > 0;
}

/**
 * Retorna todos los asientos de una fecha con su estado en tiempo real.
 */
function getSeatsForDate(tourDateId, sessionId) {
    cleanupExpiredLocks();

    const seats = db.prepare(`
        SELECT id, seat_number, status, locked_until, lock_session_id
        FROM seats
        WHERE tour_date_id = ?
        ORDER BY seat_number ASC
    `).all(tourDateId);

    const now = new Date();

    return seats.map(seat => {
        let displayStatus = seat.status;
        const isMyLock = seat.status === 'LOCKED' && seat.lock_session_id === sessionId;

        if (seat.status === 'LOCKED' && new Date(seat.locked_until) <= now) {
            displayStatus = 'AVAILABLE';
        }

        return {
            id: seat.id,
            seat_number: seat.seat_number,
            status: displayStatus,
            is_my_lock: isMyLock,
            locked_until: seat.locked_until
        };
    });
}

/**
 * Bloquea atómicamente una cantidad de cupos para una sesión durante 15 minutos.
 */
function lockQuantity(tourDateId, quantity, sessionId) {
    cleanupExpiredLocks();
    const qty = parseInt(quantity, 10);
    if (isNaN(qty) || qty < 1 || qty > 16) {
        throw new Error('La cantidad de pasajeros debe estar entre 1 y 16.');
    }

    const lockTransaction = db.transaction(() => {
        const now = new Date();
        const expMs = now.getTime() + LOCK_TIMEOUT_MINUTES * 60 * 1000;
        const lockedUntil = new Date(expMs).toISOString();

        // 0. Validar corte de reserva (17:00 hrs del día anterior)
        const tourDate = db.prepare(`SELECT travel_date FROM tour_dates WHERE id = ?`).get(tourDateId);
        if (tourDate && isBookingCutoffPassed(tourDate.travel_date)) {
            throw new Error('Las reservas web para esta salida cerraron a las 17:00 hrs del día anterior. Por favor consulta disponibilidad directamente por WhatsApp.');
        }

        // 1. Obtener todos los asientos de la fecha
        const allSeats = db.prepare(`
            SELECT id, seat_number, status, locked_until, lock_session_id
            FROM seats
            WHERE tour_date_id = ?
            ORDER BY seat_number ASC
        `).all(tourDateId);

        // 2. Identificar mis asientos ya bloqueados y asientos disponibles
        const myLockedSeats = [];
        const availableSeats = [];

        for (const seat of allSeats) {
            if (seat.status === 'PAID') continue;

            const isLocked = seat.status === 'LOCKED' && new Date(seat.locked_until) > now;
            if (isLocked) {
                if (seat.lock_session_id === sessionId) {
                    myLockedSeats.push(seat);
                }
            } else {
                availableSeats.push(seat);
            }
        }

        const totalUsable = myLockedSeats.length + availableSeats.length;
        if (totalUsable < qty) {
            throw new Error(`Solo quedan ${totalUsable} cupos disponibles para esta fecha.`);
        }

        // 3. Ajustar cantidad: si ya tengo más de los que pido, liberar los sobrantes
        if (myLockedSeats.length > qty) {
            const toRelease = myLockedSeats.slice(qty);
            for (const s of toRelease) {
                db.prepare(`
                    UPDATE seats
                    SET status = 'AVAILABLE', locked_until = NULL, lock_session_id = NULL
                    WHERE id = ?
                `).run(s.id);
            }
            myLockedSeats.length = qty;
        }

        // 4. Si necesito más, tomar de los disponibles
        const needed = qty - myLockedSeats.length;
        if (needed > 0) {
            const toLock = availableSeats.slice(0, needed);
            for (const s of toLock) {
                db.prepare(`
                    UPDATE seats
                    SET status = 'LOCKED', locked_until = ?, lock_session_id = ?
                    WHERE id = ?
                `).run(lockedUntil, sessionId, s.id);
                myLockedSeats.push(s);
            }
        }

        // 5. Renovar timestamp para todos los míos
        for (const s of myLockedSeats) {
            db.prepare(`
                UPDATE seats
                SET status = 'LOCKED', locked_until = ?, lock_session_id = ?
                WHERE id = ?
            `).run(lockedUntil, sessionId, s.id);
        }

        return {
            tourDateId,
            quantity: qty,
            lockedSeats: myLockedSeats.map(s => s.seat_number),
            locked_until: lockedUntil,
            locked_until_ts: expMs
        };
    });

    return lockTransaction();
}

/**
 * Libera todos los bloqueos de una sesión en una fecha específica.
 */
function releaseSessionLocks(tourDateId, sessionId) {
    const stmt = db.prepare(`
        UPDATE seats
        SET status = 'AVAILABLE', locked_until = NULL, lock_session_id = NULL
        WHERE tour_date_id = ? AND lock_session_id = ? AND status = 'LOCKED'
    `);
    return stmt.run(tourDateId, sessionId).changes;
}

/**
 * Retorna la disponibilidad resumida y lista de cupos para una fecha.
 */
function getAvailabilityForDate(tourDateId, sessionId) {
    cleanupExpiredLocks();

    const tourDate = db.prepare(`SELECT td.travel_date, td.tour_id, t.name as tour_name FROM tour_dates td JOIN tours t ON t.id = td.tour_id WHERE td.id = ?`).get(tourDateId);

    const seats = db.prepare(`
        SELECT id, seat_number, status, locked_until, lock_session_id
        FROM seats
        WHERE tour_date_id = ?
        ORDER BY seat_number ASC
    `).all(tourDateId);

    const now = new Date();
    let totalCapacity = seats.length;
    let availableCount = 0;
    let myLockedSeats = [];

    seats.forEach(seat => {
        if (seat.status === 'PAID') {
            // Asiento definitivamente pagado y comprado: ya NO está disponible
            return;
        }

        const isCurrentlyLocked = seat.status === 'LOCKED' && new Date(seat.locked_until) > now;
        if (seat.status === 'AVAILABLE' || !isCurrentlyLocked) {
            availableCount++;
        } else if (isCurrentlyLocked && seat.lock_session_id === sessionId) {
            availableCount++;
            myLockedSeats.push(seat.seat_number);
        }
    });

    const travelDate = tourDate ? tourDate.travel_date : null;
    const isClosed = isBookingCutoffPassed(travelDate);
    const isSoldOut = availableCount === 0;

    return {
        tour_date_id: tourDateId,
        travel_date: travelDate,
        tour_name: tourDate ? tourDate.tour_name : null,
        total_capacity: totalCapacity,
        available_seats: availableCount,
        is_closed: isClosed,
        is_sold_out: isSoldOut,
        my_locked_count: myLockedSeats.length,
        my_seat_numbers: myLockedSeats
    };
}

/**
 * Crea una orden de compra multi-pasajero con sus reservas en estado PENDING.
 * @param {Object} params
 * @param {number} params.tourDateId
 * @param {string} params.sessionId
 * @param {Array} params.passengers - Lista de pasajeros con sus asientos asignados
 * @param {Object} params.hotelInfo - Datos de alojamiento en Puerto Natales
 * @param {number} params.unitPrice - Precio por asiento
 */
function createPendingOrder({
    tourDateId,
    sessionId,
    passengers,
    hotelInfo,
    unitPrice
}) {
    cleanupExpiredLocks();

    const orderTransaction = db.transaction(() => {
        const tourDate = db.prepare(`SELECT travel_date FROM tour_dates WHERE id = ?`).get(tourDateId);
        if (tourDate && isBookingCutoffPassed(tourDate.travel_date)) {
            throw new Error('Las reservas web para esta fecha cerraron a las 17:00 hrs del día anterior. Por favor contáctanos directamente por WhatsApp.');
        }

        const createdBookings = [];
        const groupCode = `GRP-${Date.now().toString().slice(-6)}`;

        for (const p of passengers) {
            const seatNumber = parseInt(p.seatNumber, 10);
            const seat = db.prepare(`
                SELECT id, status, lock_session_id
                FROM seats
                WHERE tour_date_id = ? AND seat_number = ?
            `).get(tourDateId, seatNumber);

            if (!seat || seat.status !== 'LOCKED' || seat.lock_session_id !== sessionId) {
                throw new Error(`El asiento N° ${seatNumber} no está bloqueado para tu sesión o su tiempo expiró.`);
            }

            const bookingCode = `TP-${Date.now().toString().slice(-6)}-${seatNumber.toString().padStart(2, '0')}`;
            const securityToken = crypto.randomBytes(16).toString('hex'); // Token único para QR

            const pName = (p.passengerName || p.name || '').trim();
            const pAge = p.passengerAge || p.age ? parseInt(p.passengerAge || p.age, 10) : null;
            const pDoc = (p.passengerDoc || p.doc || '').trim();
            const pEmail = (p.passengerEmail || p.email || '').trim().toLowerCase();
            const pPhone = (p.passengerPhone || p.phone || '').trim();
            const pWhatsapp = (p.passengerWhatsapp || p.whatsapp || '').trim();

            const insertBooking = db.prepare(`
                INSERT INTO bookings (
                    booking_code, security_token, tour_date_id, seat_id, seat_number,
                    passenger_name, passenger_age, passenger_doc, passenger_email, passenger_phone, passenger_whatsapp,
                    hotel_name, hotel_street, hotel_number, policies_accepted, amount_clp, payment_status
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, 'PENDING')
            `);

            const result = insertBooking.run(
                bookingCode, securityToken, tourDateId, seat.id, seatNumber,
                pName, pAge,
                pDoc, pEmail,
                pPhone, pWhatsapp,
                hotelInfo.hotelName || hotelInfo.name || null,
                hotelInfo.hotelStreet || hotelInfo.street || null,
                hotelInfo.hotelNumber || hotelInfo.number || null,
                unitPrice
            );

            createdBookings.push({
                bookingId: result.lastInsertRowid,
                bookingCode,
                securityToken,
                seatNumber,
                passengerName: pName
            });
        }

        const totalAmount = unitPrice * passengers.length;

        return {
            groupCode,
            bookings: createdBookings,
            totalAmount
        };
    });

    return orderTransaction();
}

/**
 * Confirma todas las reservas asociadas a una orden de Webpay a estado PAID.
 */
function confirmOrderPaid(buyOrder, transactionDetails) {
    const confirmTransaction = db.transaction(() => {
        const transactions = db.prepare(`SELECT booking_id FROM transactions WHERE buy_order = ?`).all(buyOrder);
        
        if (!transactions || transactions.length === 0) {
            throw new Error('Transacción no encontrada para confirmar.');
        }

        for (const tx of transactions) {
            const booking = db.prepare(`SELECT id, seat_id FROM bookings WHERE id = ?`).get(tx.booking_id);
            if (booking) {
                // 1. Actualizar reserva a PAID
                db.prepare(`UPDATE bookings SET payment_status = 'PAID' WHERE id = ?`).run(booking.id);

                // 2. Asiento permanentemente ocupado
                db.prepare(`
                    UPDATE seats
                    SET status = 'PAID',
                        locked_until = NULL,
                        lock_session_id = NULL
                    WHERE id = ?
                `).run(booking.seat_id);
            }
        }

        // 3. Registrar transacción de Webpay
        if (transactionDetails) {
            db.prepare(`
                UPDATE transactions
                SET status = 'AUTHORIZED',
                    authorization_code = ?,
                    response_code = ?,
                    payment_type_code = ?,
                    shares_number = ?,
                    card_last_digits = ?
                WHERE buy_order = ?
            `).run(
                transactionDetails.authorizationCode || 'N/A',
                transactionDetails.responseCode || 0,
                transactionDetails.paymentTypeCode || 'VN',
                transactionDetails.sharesNumber || 0,
                transactionDetails.cardNumber || '****',
                buyOrder
            );
        }

        return true;
    });

    return confirmTransaction();
}

/**
 * Maneja transacciones fallidas liberando los asientos.
 */
function handleFailedOrder(buyOrder) {
    const failTransaction = db.transaction(() => {
        const transactions = db.prepare(`SELECT booking_id FROM transactions WHERE buy_order = ?`).all(buyOrder);
        for (const tx of transactions) {
            const booking = db.prepare(`SELECT id, seat_id FROM bookings WHERE id = ?`).get(tx.booking_id);
            if (booking) {
                db.prepare(`UPDATE bookings SET payment_status = 'FAILED' WHERE id = ?`).run(booking.id);
                db.prepare(`
                    UPDATE seats
                    SET status = 'AVAILABLE',
                        locked_until = NULL,
                        lock_session_id = NULL
                    WHERE id = ? AND status = 'LOCKED'
                `).run(booking.seat_id);
            }
        }
        db.prepare(`UPDATE transactions SET status = 'FAILED' WHERE buy_order = ?`).run(buyOrder);
    });

    return failTransaction();
}

module.exports = {
    lockSeat,
    lockQuantity,
    releaseSeat,
    releaseSessionLocks,
    getSeatsForDate,
    getAvailabilityForDate,
    createPendingOrder,
    confirmOrderPaid,
    handleFailedOrder,
    cleanupExpiredLocks,
    isBookingCutoffPassed
};

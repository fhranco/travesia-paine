const db = require('../db/database');
const crypto = require('crypto');

const LOCK_TIMEOUT_MINUTES = 15;

/**
 * Limpia automáticamente todos los asientos cuyo bloqueo haya superado los 15 minutos.
 */
function cleanupExpiredLocks() {
    const now = new Date().toISOString().replace('T', ' ').substring(0, 19);
    
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

        const lockedUntil = new Date(now.getTime() + LOCK_TIMEOUT_MINUTES * 60 * 1000)
            .toISOString().replace('T', ' ').substring(0, 19);

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
            locked_until: lockedUntil
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
    const result = stmt.run(tourDateId, seatNumber, sessionId);
    return result.changes > 0;
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

            const insertBooking = db.prepare(`
                INSERT INTO bookings (
                    booking_code, security_token, tour_date_id, seat_id, seat_number,
                    passenger_name, passenger_age, passenger_doc, passenger_email, passenger_phone, passenger_whatsapp,
                    hotel_name, hotel_street, hotel_number, policies_accepted, amount_clp, payment_status
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, 'PENDING')
            `);

            const result = insertBooking.run(
                bookingCode, securityToken, tourDateId, seat.id, seatNumber,
                p.passengerName.trim(), p.passengerAge ? parseInt(p.passengerAge, 10) : null,
                p.passengerDoc.trim(), p.passengerEmail.trim().toLowerCase(),
                (p.passengerPhone || '').trim(), (p.passengerWhatsapp || '').trim(),
                hotelInfo.hotelName || null, hotelInfo.hotelStreet || null, hotelInfo.hotelNumber || null,
                unitPrice
            );

            createdBookings.push({
                bookingId: result.lastInsertRowid,
                bookingCode,
                securityToken,
                seatNumber,
                passengerName: p.passengerName
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
    releaseSeat,
    getSeatsForDate,
    createPendingOrder,
    confirmOrderPaid,
    handleFailedOrder,
    cleanupExpiredLocks
};

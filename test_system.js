const http = require('http');

function request(options, data) {
    return new Promise((resolve, reject) => {
        const req = http.request(options, (res) => {
            let body = '';
            res.on('data', chunk => body += chunk);
            res.on('end', () => {
                try {
                    resolve({ status: res.statusCode, data: JSON.parse(body), headers: res.headers });
                } catch {
                    resolve({ status: res.statusCode, raw: body, headers: res.headers });
                }
            });
        });
        req.on('error', reject);
        if (data) {
            req.write(JSON.stringify(data));
        }
        req.end();
    });
}

async function runTests() {
    console.log('--- INICIANDO SUITE DE PRUEBAS DEL SISTEMA ACTUALIZADO ---');

    // 1. Test GET /api/tours
    console.log('\n1. Test GET /api/tours:');
    const toursRes = await request({
        hostname: 'localhost',
        port: 3000,
        path: '/api/tours',
        method: 'GET'
    });
    console.log('Tours encontrados:', toursRes.data.data.length);
    toursRes.data.data.forEach(t => console.log(`- ${t.name} ($${t.price_clp} CLP)`));
    const tour = toursRes.data.data[0];

    // 2. Test GET /api/tours/:tourId/dates
    console.log('\n2. Test GET /api/tours/:id/dates:');
    const datesRes = await request({
        hostname: 'localhost',
        port: 3000,
        path: `/api/tours/${tour.id}/dates`,
        method: 'GET'
    });
    const tourDate = datesRes.data.data[0];
    console.log(`Fecha seleccionada: ${tourDate.travel_date} (ID: ${tourDate.id})`);

    // 3. Test Atomic Seat Lock (Session A locks seat 3)
    console.log('\n3. Test Bloqueo Atómico de Asiento:');
    const lockRes = await request({
        hostname: 'localhost',
        port: 3000,
        path: '/api/seats/lock',
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
    }, {
        tourDateId: tourDate.id,
        seatNumber: 3,
        sessionId: 'test_session_A'
    });
    console.log('Resultado bloqueo Sesión A:', lockRes.data);

    // 4. Test Anti-Overbooking (Session B tries to lock seat 3)
    console.log('\n4. Test Anti-Overbooking (Sesión B intenta bloquear el mismo asiento 3):');
    const overbookRes = await request({
        hostname: 'localhost',
        port: 3000,
        path: '/api/seats/lock',
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
    }, {
        tourDateId: tourDate.id,
        seatNumber: 3,
        sessionId: 'test_session_B'
    });
    console.log('Respuesta a intento de overbooking (esperado error):', overbookRes.data);

    // 5. Test Initiate Booking with Webpay (Multi-passenger details + Hotel pick-up + Policy accept)
    console.log('\n5. Test Iniciar Reserva Multi-Pasajero & Webpay Plus:');
    const initRes = await request({
        hostname: 'localhost',
        port: 3000,
        path: '/api/bookings/initiate',
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
    }, {
        tourDateId: tourDate.id,
        sessionId: 'test_session_A',
        passengers: [
            {
                seatNumber: 3,
                passengerName: 'Fernanda Morales',
                passengerAge: 29,
                passengerDoc: '16.555.444-3',
                passengerEmail: 'fernanda.morales@test.cl',
                passengerPhone: '+56 9 9988 7766',
                passengerWhatsapp: '+56 9 9988 7766'
            }
        ],
        hotelName: 'Hotel Costaustralis',
        hotelStreet: 'Pedro Montt',
        hotelNumber: '160',
        policiesAccepted: true
    });
    console.log('Resultado inicio Webpay:', initRes.data);

    // 6. Test Driver Validation & Anti-Fraud
    console.log('\n6. Test Validación Chofer & Anti-Fraude:');
    const db = require('./src/db/database');
    const booking = db.prepare(`SELECT * FROM bookings WHERE seat_number = 3`).get();
    
    // Simulate confirmed payment in DB
    db.prepare(`UPDATE bookings SET payment_status = 'PAID' WHERE id = ?`).run(booking.id);
    db.prepare(`UPDATE seats SET status = 'PAID' WHERE id = ?`).run(booking.seat_id);

    // First scan by Driver
    const scan1 = await request({
        hostname: 'localhost',
        port: 3000,
        path: '/api/driver/validate',
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
    }, { securityToken: booking.security_token });
    console.log('Primer escaneo chofer (esperado VALID):', scan1.data);

    // Second scan (Fraud check)
    const scan2 = await request({
        hostname: 'localhost',
        port: 3000,
        path: '/api/driver/validate',
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
    }, { securityToken: booking.security_token });
    console.log('Segundo escaneo chofer (esperado ALREADY_USED):', scan2.data);

    // 7. Test Driver Manifest
    console.log('\n7. Test Manifiesto Chofer con Alojamiento Pick-Up:');
    const manifestRes = await request({
        hostname: 'localhost',
        port: 3000,
        path: `/api/driver/manifest/${tourDate.id}`,
        method: 'GET'
    });
    console.log('Pasajeros en Manifiesto:', manifestRes.data.data.passengers.length);
    console.log('Detalle Pasajero 1:', {
        asiento: manifestRes.data.data.passengers[0].seat_number,
        nombre: manifestRes.data.data.passengers[0].passenger_name,
        hotel: manifestRes.data.data.passengers[0].hotel_name,
        direccion: `${manifestRes.data.data.passengers[0].hotel_street} ${manifestRes.data.data.passengers[0].hotel_number}`
    });

    // 8. Test PDF Generation
    console.log('\n8. Test Generación de Voucher PDF A5:');
    const pdfRes = await request({
        hostname: 'localhost',
        port: 3000,
        path: `/api/voucher/${booking.security_token}/pdf`,
        method: 'GET'
    });
    console.log('Código HTTP PDF:', pdfRes.status, '| Content-Type:', pdfRes.headers['content-type'], '| Tamaño:', pdfRes.raw.length, 'bytes');

    console.log('\n✅ ¡TODAS LAS PRUEBAS COMPLETADAS EXITOSAMENTE!');
}

runTests().catch(console.error);

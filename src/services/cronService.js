const db = require('../db/database');
const pdfService = require('./pdfService');
const EmailService = require('./emailService');

let lastDispatchedDateStr = null;
let cronTimer = null;

/**
 * Obtiene la información horaria exacta de Puerto Natales / Magallanes (UTC-3).
 */
function getNatalesTimeInfo() {
    const now = new Date();
    const formatterTime = new Intl.DateTimeFormat('es-CL', {
        timeZone: 'America/Punta_Arenas',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
    });
    const formatterDate = new Intl.DateTimeFormat('en-CA', {
        timeZone: 'America/Punta_Arenas',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
    });

    const dateStr = formatterDate.format(now); // YYYY-MM-DD
    const timeStr = formatterTime.format(now); // HH:MM:SS
    const [hh, mm, ss] = timeStr.split(':').map(Number);

    const isCutoffPassedToday = (hh > 20) || (hh === 20 && (mm > 0 || ss > 0));
    const secondsNow = hh * 3600 + mm * 60 + ss;
    const cutoffSeconds = 20 * 3600; // 20:00:00
    const secondsUntilCutoffToday = Math.max(0, cutoffSeconds - secondsNow);

    return {
        timestamp: now.getTime(),
        dateStr,
        timeStr,
        hours: hh,
        minutes: mm,
        seconds: ss,
        isCutoffPassedToday,
        secondsUntilCutoffToday
    };
}

/**
 * Genera el CSV en texto a partir de los datos de tour y pasajeros.
 */
function generateManifestCsv(tourDate, passengers) {
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

    return csv;
}

/**
 * Despacha el manifiesto oficial por correo electrónico para una fecha/tour específico.
 */
async function dispatchManifestForTourDate(tourDateId, customRecipient = null) {
    const tourDate = db.prepare(`
        SELECT td.id, td.travel_date, t.name as tour_name, t.departure_time, t.capacity
        FROM tour_dates td
        JOIN tours t ON t.id = td.tour_id
        WHERE td.id = ?
    `).get(tourDateId);

    if (!tourDate) {
        throw new Error('Fecha de tour no encontrada.');
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

    // 1. Generar PDF oficial A4 Horizontal
    const pdfBuffer = await pdfService.generateManifestPdf(tourDate, passengers);

    // 2. Generar CSV
    const csvContent = generateManifestCsv(tourDate, passengers);
    const csvBuffer = Buffer.from(csvContent, 'utf-8');

    // 3. Crear HTML elegante para el cuerpo del correo
    const totalPaid = passengers.length;
    const safeTourName = tourDate.tour_name;
    const dateFormatted = tourDate.travel_date;

    let hotelsListHtml = '';
    if (passengers.length === 0) {
        hotelsListHtml = '<p style="color: #64748B;">No se registraron pasajeros pagados para esta salida.</p>';
    } else {
        const uniqueHotels = {};
        passengers.forEach(p => {
            const h = p.hotel_name || 'Sin especificar';
            uniqueHotels[h] = (uniqueHotels[h] || 0) + 1;
        });
        hotelsListHtml = '<ul style="margin: 0.5rem 0; padding-left: 1.2rem; color: #334155;">' + 
            Object.entries(uniqueHotels).map(([name, count]) => `<li><strong>${name}</strong> (${count} pasajero${count > 1 ? 's' : ''})</li>`).join('') + 
            '</ul>';
    }

    const emailHtml = `
    <div style="font-family: Arial, sans-serif; max-width: 650px; margin: 0 auto; border: 1px solid #E2E8F0; border-radius: 12px; overflow: hidden;">
        <div style="background: #183028; color: #FFFFFF; padding: 1.5rem; text-align: center;">
            <h2 style="margin: 0; font-size: 1.4rem; letter-spacing: 1px;">TRAVESÍA PAINE</h2>
            <p style="margin: 0.3rem 0 0; font-size: 0.85rem; color: #D1A186;">MANIFIESTO OFICIAL DE PASAJEROS & HOJA DE RUTA</p>
        </div>
        <div style="padding: 1.5rem; background: #FFFFFF;">
            <p style="font-size: 1rem; color: #0E1A16; margin-top: 0;">
                Hola Equipo Travesía Paine / Chofer:
            </p>
            <p style="font-size: 0.92rem; color: #334155; line-height: 1.5;">
                A las <strong>20:00 hrs</strong> ha concluido el horario oficial de reservas online. Adjuntamos el manifiesto con la lista de pasajeros confirmados y los puntos de recogida para la salida de mañana:
            </p>
            
            <div style="background: #F8FAF9; border-left: 4px solid #183028; padding: 1rem; border-radius: 6px; margin: 1.2rem 0;">
                <div style="font-size: 0.95rem; font-weight: bold; color: #183028;">🚐 ${safeTourName}</div>
                <div style="font-size: 0.88rem; color: #475569; margin-top: 0.3rem;">📅 <strong>Fecha:</strong> ${dateFormatted}</div>
                <div style="font-size: 0.88rem; color: #475569;">⏱ <strong>Hora de Inicio Pick-Up:</strong> ${tourDate.departure_time}</div>
                <div style="font-size: 0.88rem; color: #166534; font-weight: bold; margin-top: 0.3rem;">👥 <strong>Pasajeros Confirmados:</strong> ${totalPaid} / 16 Asientos</div>
            </div>

            <h4 style="color: #0E1A16; margin-bottom: 0.4rem;">📍 Puntos de Recogida (Alojamientos):</h4>
            ${hotelsListHtml}

            <p style="font-size: 0.85rem; color: #64748B; margin-top: 1.5rem; line-height: 1.4;">
                📎 <strong>Archivos adjuntos:</strong><br>
                1. <strong>Manifiesto_${dateFormatted}_Tour_${tourDate.id}.pdf</strong> (Hoja de ruta A4 lista para imprimir o ver en celular/tablet).<br>
                2. <strong>Manifiesto_${dateFormatted}_Tour_${tourDate.id}.csv</strong> (Planilla Excel con teléfonos y direcciones).
            </p>
        </div>
        <div style="background: #F1F5F9; padding: 1rem; text-align: center; font-size: 0.78rem; color: #64748B; border-top: 1px solid #E2E8F0;">
            Sistema Automatizado Travesía Paine · Cierre 20:00 hrs Magallanes (UTC-3)
        </div>
    </div>
    `;

    const recipient = customRecipient || process.env.DRIVER_EMAIL || process.env.OPERATIONS_EMAIL || 'contacto@travesiapaine.com';

    return await EmailService.sendManifestEmail({
        to: recipient,
        subject: `📋 Manifiesto Oficial: ${safeTourName} (${dateFormatted}) - ${totalPaid} Pasajero(s)`,
        html: emailHtml,
        attachments: [
            {
                filename: `Manifiesto_${dateFormatted}_Tour_${tourDate.id}.pdf`,
                content: pdfBuffer,
                contentType: 'application/pdf'
            },
            {
                filename: `Manifiesto_${dateFormatted}_Tour_${tourDate.id}.csv`,
                content: csvBuffer,
                contentType: 'text/csv'
            }
        ]
    });
}

/**
 * Tarea programada diaria: verifica cada 60 segundos si son las 20:00 hrs de Puerto Natales.
 * Al llegar las 20:00 hrs, despacha automáticamente el manifiesto para el día de mañana.
 */
async function checkAndTriggerDailyCutoffCron() {
    const timeInfo = getNatalesTimeInfo();

    // Solo se activa a partir de las 20:00 hrs si aún no se ha ejecutado hoy
    if (timeInfo.hours >= 20 && lastDispatchedDateStr !== timeInfo.dateStr) {
        console.log(`[Cron 20:00] ⏰ Hora oficial 20:00 hrs alcanzada en Puerto Natales (${timeInfo.timeStr}).`);
        console.log(`[Cron 20:00] Iniciando generación automática de manifiestos para mañana...`);

        // Calcular la fecha de mañana en formato YYYY-MM-DD
        const tomorrow = new Date(timeInfo.timestamp + 24 * 60 * 60 * 1000);
        const tomorrowDateStr = new Intl.DateTimeFormat('en-CA', {
            timeZone: 'America/Punta_Arenas',
            year: 'numeric',
            month: '2-digit',
            day: '2-digit'
        }).format(tomorrow);

        console.log(`[Cron 20:00] Buscando salidas programadas para mañana: ${tomorrowDateStr}`);

        try {
            const tomorrowTours = db.prepare(`
                SELECT td.id, td.travel_date, t.name as tour_name
                FROM tour_dates td
                JOIN tours t ON t.id = td.tour_id
                WHERE td.travel_date = ?
            `).all(tomorrowDateStr);

            if (tomorrowTours.length === 0) {
                console.log(`[Cron 20:00] No hay tours programados en la BD para mañana (${tomorrowDateStr}).`);
            } else {
                for (const t of tomorrowTours) {
                    console.log(`[Cron 20:00] Despachando manifiesto para ${t.tour_name} (${t.travel_date})...`);
                    await dispatchManifestForTourDate(t.id);
                }
            }

            lastDispatchedDateStr = timeInfo.dateStr;
            console.log(`[Cron 20:00] ✅ Proceso completado exitosamente para la jornada del ${timeInfo.dateStr}.`);
        } catch (err) {
            console.error(`[Cron 20:00 Error] Falla al despachar manifiesto:`, err);
        }
    }
}

/**
 * Inicia el cron runner en segundo plano.
 */
function startCronRunner() {
    if (cronTimer) clearInterval(cronTimer);
    console.log(`⏱ [Cron Service] Monitor de cierre diario de las 20:00 hrs (Magallanes UTC-3) iniciado.`);
    // Ejecutar chequeo cada 60 segundos
    cronTimer = setInterval(checkAndTriggerDailyCutoffCron, 60000);
    // Ejecutar un chequeo inicial de arranque
    checkAndTriggerDailyCutoffCron();
}

module.exports = {
    getNatalesTimeInfo,
    dispatchManifestForTourDate,
    startCronRunner
};

const PDFDocument = require('pdfkit');
const QRCode = require('qrcode');

/**
 * Genera un Voucher de Embarque tamaño A5 en formato Buffer con QR criptográfico.
 * @param {Object} bookingData - Datos completos de la reserva y el tour.
 * @returns {Promise<Buffer>} Buffer del documento PDF.
 */
async function generateVoucherPdf(bookingData) {
    return new Promise(async (resolve, reject) => {
        try {
            // 1. Generar código QR en buffer PNG a partir del security_token único
            const qrCodeBuffer = await QRCode.toBuffer(bookingData.security_token, {
                errorCorrectionLevel: 'H',
                margin: 1,
                width: 140,
                color: {
                    dark: '#12241E',
                    light: '#FFFFFF'
                }
            });

            // 2. Crear documento PDF tamaño A5 (420 x 595 pt)
            const doc = new PDFDocument({
                size: 'A5',
                margin: 25,
                info: {
                    Title: `Voucher - ${bookingData.booking_code}`,
                    Author: 'Travesía Paine Expediciones',
                    Subject: 'Boleto de Embarque de Transfer'
                }
            });

            const buffers = [];
            doc.on('data', buffers.push.bind(buffers));
            doc.on('end', () => {
                const pdfData = Buffer.concat(buffers);
                resolve(pdfData);
            });

            // Paleta de colores
            const colorPrimary = '#183028';
            const colorAccent = '#B3714C';
            const colorDark = '#12241E';
            const colorMuted = '#5A6B63';
            const colorBgBox = '#F4F6F5';

            // --- CABECERA ---
            // Barra superior decorativa
            doc.rect(0, 0, 420, 60).fill(colorPrimary);

            // Título de la empresa
            doc.fillColor('#FFFFFF')
               .fontSize(16)
               .font('Helvetica-Bold')
               .text('TRAVESÍA PAINE', 25, 18, { characterSpacing: 1 });

            doc.fillColor('#D1A186')
               .fontSize(8)
               .font('Helvetica')
               .text('EXPEDICIONES & TRANSFERS PATAGONIA', 25, 36, { characterSpacing: 2 });

            doc.fillColor('#FFFFFF')
               .fontSize(9)
               .font('Helvetica-Bold')
               .text('VOUCHER DE EMBARQUE', 280, 24, { width: 115, align: 'right' });

            // --- CÓDIGO DE RESERVA & ESTADO ---
            doc.rect(25, 72, 370, 36).fill(colorBgBox);
            doc.rect(25, 72, 370, 36).lineWidth(1).strokeColor('#E0E5E2').stroke();

            doc.fillColor(colorMuted).fontSize(8).font('Helvetica').text('CÓDIGO DE RESERVA', 35, 78);
            doc.fillColor(colorDark).fontSize(12).font('Helvetica-Bold').text(bookingData.booking_code, 35, 90);

            doc.fillColor(colorMuted).fontSize(8).font('Helvetica').text('ESTADO DEL PAGO', 220, 78);
            doc.fillColor('#2A7D4F').fontSize(11).font('Helvetica-Bold').text('✓ PAGADO & CONFIRMADO', 220, 90);

            // --- DETALLES DEL TRAYECTO ---
            let currentY = 120;
            doc.fillColor(colorPrimary).fontSize(11).font('Helvetica-Bold').text('DETALLES DEL SERVICIO', 25, currentY);
            doc.moveTo(25, currentY + 14).lineTo(395, currentY + 14).lineWidth(1).strokeColor(colorAccent).stroke();

            currentY += 22;
            doc.fillColor(colorMuted).fontSize(8).font('Helvetica').text('TRAYECTO:', 25, currentY);
            doc.fillColor(colorDark).fontSize(9).font('Helvetica-Bold').text(bookingData.tour_name, 80, currentY, { width: 315 });

            currentY += 24;
            doc.fillColor(colorMuted).fontSize(8).font('Helvetica').text('FECHA VIAJE:', 25, currentY);
            doc.fillColor(colorDark).fontSize(9).font('Helvetica-Bold').text(bookingData.travel_date, 85, currentY);

            doc.fillColor(colorMuted).fontSize(8).font('Helvetica').text('HORA SALIDA:', 220, currentY);
            doc.fillColor(colorDark).fontSize(9).font('Helvetica-Bold').text(bookingData.departure_time, 285, currentY);

            currentY += 18;
            doc.fillColor(colorMuted).fontSize(8).font('Helvetica').text('ORIGEN:', 25, currentY);
            doc.fillColor(colorDark).fontSize(8.5).font('Helvetica').text(bookingData.origin, 70, currentY, { width: 325 });

            currentY += 16;
            doc.fillColor(colorMuted).fontSize(8).font('Helvetica').text('DESTINO:', 25, currentY);
            doc.fillColor(colorDark).fontSize(8.5).font('Helvetica').text(bookingData.destination, 75, currentY, { width: 320 });

            // --- DETALLES DEL PASAJERO & ASIENTO ---
            currentY += 26;
            doc.fillColor(colorPrimary).fontSize(11).font('Helvetica-Bold').text('PASAJERO & ASIENTO ASIGNADO', 25, currentY);
            doc.moveTo(25, currentY + 14).lineTo(395, currentY + 14).lineWidth(1).strokeColor(colorAccent).stroke();

            currentY += 22;
            // Bloque Pasajero (Izquierda)
            doc.fillColor(colorMuted).fontSize(8).font('Helvetica').text('NOMBRE COMPLETO:', 25, currentY);
            doc.fillColor(colorDark).fontSize(9.5).font('Helvetica-Bold').text(bookingData.passenger_name, 25, currentY + 10);

            doc.fillColor(colorMuted).fontSize(8).font('Helvetica').text('DOCUMENTO / PASAPORTE:', 25, currentY + 26);
            doc.fillColor(colorDark).fontSize(9).font('Helvetica').text(bookingData.passenger_doc, 25, currentY + 36);

            doc.fillColor(colorMuted).fontSize(8).font('Helvetica').text('EMAIL:', 25, currentY + 50);
            doc.fillColor(colorDark).fontSize(8.5).font('Helvetica').text(bookingData.passenger_email, 25, currentY + 60);

            // Bloque Cupo Destacado (Derecha)
            const seatBoxX = 250;
            doc.rect(seatBoxX, currentY, 145, 75).fill(colorPrimary);
            doc.fillColor('#D1A186').fontSize(8.5).font('Helvetica-Bold').text('CUPO CONFIRMADO', seatBoxX, currentY + 12, { width: 145, align: 'center' });
            doc.fillColor('#FFFFFF').fontSize(16).font('Helvetica-Bold').text('UBICACIÓN LIBRE', seatBoxX, currentY + 28, { width: 145, align: 'center' });
            doc.fillColor('#E0EBE5').fontSize(7.5).font('Helvetica').text('Por orden de recogida', seatBoxX, currentY + 50, { width: 145, align: 'center' });

            // --- BLOQUE QR PARA EMBARQUE ---
            currentY += 92;
            doc.rect(25, currentY, 370, 130).fill(colorBgBox);
            doc.rect(25, currentY, 370, 130).lineWidth(1).strokeColor('#E0E5E2').stroke();

            // Dibujar QR Code
            doc.image(qrCodeBuffer, 35, currentY + 10, { width: 110, height: 110 });

            // Texto de instrucciones al chofer/pasajero
            const textQrX = 160;
            doc.fillColor(colorDark).fontSize(10).font('Helvetica-Bold').text('PASE DIGITAL DE ABORDAJE', textQrX, currentY + 14);
            
            doc.fillColor(colorMuted).fontSize(7.8).font('Helvetica').text(
                'Presente este código QR al chofer al momento de su recogida en el alojamiento en Puerto Natales. Los asientos se ocupan libremente a medida que abordan la van (Capacidad: 16 pasajeros).',
                textQrX, currentY + 30, { width: 225, lineGap: 2 }
            );

            doc.fillColor(colorDark).fontSize(8).font('Helvetica-Bold').text(
                'Pick-up confirmado en:', textQrX, currentY + 74
            );
            doc.fillColor(colorDark).fontSize(8).font('Helvetica').text(
                `${bookingData.hotel_name || 'Alojamiento en Puerto Natales'} (${bookingData.hotel_street || ''} ${bookingData.hotel_number || ''})`,
                textQrX, currentY + 85, { width: 225 }
            );

            // --- POLÍTICAS Y RECOMENDACIONES CLAVE (Fondo Página) ---
            currentY += 140;
            doc.rect(25, currentY, 370, 80).fill('#F0F4F2');
            doc.fillColor(colorDark).fontSize(8.5).font('Helvetica-Bold').text('INFORMACIÓN IMPORTANTE PARA SU VIAJE', 35, currentY + 10);
            doc.fillColor(colorMuted).fontSize(7.2).font('Helvetica').text(
                '• Debe estar listo en la recepción o puerta de su alojamiento desde la hora de inicio de pick-up.\n' +
                '• Entrada al Parque Nacional y Cueva del Milodón NO incluidas (comprar previamente en pasesparques.cl).\n' +
                '• Cancelaciones hasta 24 horas antes sin costo. No-show aplica 100% de retención.\n' +
                '• Para consultas o coordinación: WhatsApp +56 9 8269 0081 | contacto@travesiapaine.com',
                35, currentY + 24, { width: 350, lineGap: 2.2 }
            );

            doc.end();
        } catch (err) {
            reject(err);
        }
    });
}

/**
 * Genera el Manifiesto Oficial de Pasajeros en PDF A4 Horizontal (Ancho Completo).
 * @param {Object} tourDateData - Información del tour y fecha
 * @param {Array} passengers - Lista de pasajeros con asientos y datos de contacto/hotel
 * @returns {Promise<Buffer>}
 */
async function generateManifestPdf(tourDateData, passengers) {
    return new Promise((resolve, reject) => {
        try {
            // A4 Landscape: 841.89 x 595.28 pt
            const doc = new PDFDocument({
                size: 'A4',
                layout: 'landscape',
                margin: 30,
                info: {
                    Title: `Manifiesto - ${tourDateData.tour_name} - ${tourDateData.travel_date}`,
                    Author: 'Travesía Paine'
                }
            });

            const buffers = [];
            doc.on('data', buffers.push.bind(buffers));
            doc.on('end', () => resolve(Buffer.concat(buffers)));

            const colorPrimary = '#183028';
            const colorAccent = '#B3714C';
            const colorBorder = '#D1D5DB';

            // --- CABECERA ---
            doc.rect(30, 30, 782, 60).fill(colorPrimary);

            doc.fillColor('#FFFFFF')
               .fontSize(18)
               .font('Helvetica-Bold')
               .text('TRAVESÍA PAINE — MANIFIESTO OFICIAL DE PASAJEROS', 50, 45);

            doc.fillColor('#D1A186')
               .fontSize(10)
               .font('Helvetica')
               .text(`Excursión: ${tourDateData.tour_name}  |  Fecha: ${tourDateData.travel_date}  |  Hora Salida: ${tourDateData.departure_time}  |  Capacidad: 16 Pasajeros (Ubicación Libre)`, 50, 68);

            // --- TABLA DE PASAJEROS (Ancho Completo 782 pt) ---
            const startY = 105;
            const rowHeight = 28;
            const colWidths = {
                seat: 65,
                code: 95,
                name: 185,
                doc: 110,
                contact: 135,
                hotel: 192
            };

            // Header Tabla
            doc.rect(30, startY, 782, 24).fill('#374151');
            doc.fillColor('#FFFFFF').fontSize(9).font('Helvetica-Bold');
            
            let curX = 35;
            doc.text('ASIENTO', curX, startY + 7, { width: colWidths.seat }); curX += colWidths.seat;
            doc.text('CÓDIGO', curX, startY + 7, { width: colWidths.code }); curX += colWidths.code;
            doc.text('PASAJERO (EDAD)', curX, startY + 7, { width: colWidths.name }); curX += colWidths.name;
            doc.text('RUT / PASAPORTE', curX, startY + 7, { width: colWidths.doc }); curX += colWidths.doc;
            doc.text('TELÉFONO / WHATSAPP', curX, startY + 7, { width: colWidths.contact }); curX += colWidths.contact;
            doc.text('ALOJAMIENTO PICK-UP (DIRECCIÓN)', curX, startY + 7, { width: colWidths.hotel });

            // Filas
            let currentY = startY + 24;
            if (!passengers || passengers.length === 0) {
                doc.rect(30, currentY, 782, 35).fill('#F9FAFB').strokeColor(colorBorder).stroke();
                doc.fillColor('#6B7280').fontSize(10).font('Helvetica').text('No hay pasajeros registrados aún para este viaje.', 35, currentY + 12, { width: 770, align: 'center' });
                currentY += 35;
            } else {
                passengers.forEach((p, index) => {
                    const bgColor = index % 2 === 0 ? '#FFFFFF' : '#F9FAFB';
                    doc.rect(30, currentY, 782, rowHeight).fill(bgColor);
                    doc.rect(30, currentY, 782, rowHeight).strokeColor('#E5E7EB').stroke();

                    curX = 35;
                    // Asiento
                    doc.fillColor(colorAccent).fontSize(11).font('Helvetica-Bold')
                       .text(`N° ${p.seat_number.toString().padStart(2, '0')}`, curX, currentY + 8, { width: colWidths.seat });
                    curX += colWidths.seat;

                    // Código
                    doc.fillColor('#4B5563').fontSize(8.5).font('Helvetica')
                       .text(p.booking_code, curX, currentY + 9, { width: colWidths.code });
                    curX += colWidths.code;

                    // Nombre
                    const ageText = p.passenger_age ? ` (${p.passenger_age} años)` : '';
                    doc.fillColor('#111827').fontSize(9.5).font('Helvetica-Bold')
                       .text(`${p.passenger_name}${ageText}`, curX, currentY + 9, { width: colWidths.name });
                    curX += colWidths.name;

                    // Documento
                    doc.fillColor('#374151').fontSize(9).font('Helvetica')
                       .text(p.passenger_doc, curX, currentY + 9, { width: colWidths.doc });
                    curX += colWidths.doc;

                    // Teléfono
                    const contact = p.passenger_whatsapp || p.passenger_phone || '-';
                    doc.fillColor('#374151').fontSize(9).font('Helvetica')
                       .text(contact, curX, currentY + 9, { width: colWidths.contact });
                    curX += colWidths.contact;

                    // Hotel
                    const hotel = p.hotel_name ? `${p.hotel_name} (${p.hotel_street || ''} ${p.hotel_number || ''})`.trim() : 'Sin especificar';
                    doc.fillColor('#1F2937').fontSize(9).font('Helvetica')
                       .text(hotel, curX, currentY + 9, { width: colWidths.hotel });

                    currentY += rowHeight;
                });
            }

            // Firma Chofer
            currentY = Math.max(currentY + 25, 490);
            doc.strokeColor('#9CA3AF').lineWidth(1).moveTo(530, currentY).lineTo(780, currentY).stroke();
            doc.fillColor('#4B5563').fontSize(9).font('Helvetica')
               .text('Firma Chofer / Guía a Cargo', 530, currentY + 5, { width: 250, align: 'center' });

            doc.end();
        } catch (err) {
            reject(err);
        }
    });
}

module.exports = {
    generateVoucherPdf,
    generateManifestPdf
};

const fs = require('fs');
const path = require('path');
const tls = require('tls');
const net = require('net');

const MANIFESTS_DIR = path.join(__dirname, '../../dispatched_manifests');
if (!fs.existsSync(MANIFESTS_DIR)) {
    fs.mkdirSync(MANIFESTS_DIR, { recursive: true });
}

/**
 * Servicio de Envío de Correo y Despacho de Manifiesto
 */
class EmailService {

    /**
     * Envía un correo con el manifiesto adjunto (PDF y CSV).
     * @param {Object} options
     * @param {string} options.to - Destinatario(s) separados por coma
     * @param {string} options.subject - Asunto del correo
     * @param {string} options.html - Contenido HTML del mensaje
     * @param {Array<{filename: string, content: Buffer|string, contentType: string}>} options.attachments
     */
    static async sendManifestEmail({ to, subject, html, attachments = [] }) {
        const recipient = to || process.env.OPERATIONS_EMAIL || 'contacto@travesiapaine.com';
        const fromEmail = process.env.SMTP_FROM || process.env.SMTP_USER || 'manifiestos@travesiapaine.com';

        // 1. Guardar siempre respaldo en la carpeta local dispatched_manifests/
        try {
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            for (const att of attachments) {
                const safeName = att.filename.replace(/[^a-zA-Z0-9_.-]/g, '_');
                const outPath = path.join(MANIFESTS_DIR, `${timestamp}_${safeName}`);
                fs.writeFileSync(outPath, att.content);
            }
        } catch (saveErr) {
            console.warn('[EmailService] Advertencia al guardar copia local:', saveErr.message);
        }

        // 2. Si hay clave de API de Resend configurada en .env, usarla vía HTTPS nativo
        if (process.env.RESEND_API_KEY) {
            return await this.sendViaResend({ to: recipient, from: fromEmail, subject, html, attachments });
        }

        // 3. Si hay credenciales SMTP configuradas en .env, usar SMTP nativo
        if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
            return await this.sendViaNativeSmtp({
                to: recipient,
                from: fromEmail,
                subject,
                html,
                attachments
            });
        }

        // 4. Si no hay credenciales configuradas aún (Modo Desarrollo / Fallback Seguro)
        console.log('================================================================');
        console.log(`📨 [EmailService] Manifiesto generado y despachado con éxito:`);
        console.log(`   Para: ${recipient}`);
        console.log(`   Asunto: ${subject}`);
        console.log(`   Adjuntos: ${attachments.map(a => a.filename).join(', ')}`);
        console.log(`   Copia archivada en: dispatched_manifests/`);
        console.log(`   (Para entrega real vía bandeja de entrada, añade SMTP_USER y SMTP_PASS o RESEND_API_KEY en .env)`);
        console.log('================================================================');

        return {
            success: true,
            mode: 'LOCAL_ARCHIVE',
            recipient,
            message: 'Manifiesto archivado localmente y listo para despacho SMTP.'
        };
    }

    /**
     * Envío a través de Resend API (HTTP REST)
     */
    static async sendViaResend({ to, from, subject, html, attachments }) {
        const url = 'https://api.resend.com/emails';
        const formattedAttachments = attachments.map(a => ({
            filename: a.filename,
            content: Buffer.isBuffer(a.content) ? a.content.toString('base64') : Buffer.from(a.content).toString('base64')
        }));

        const res = await fetch(url, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                from: from || 'Travesía Paine <operaciones@travesiapaine.com>',
                to: to.split(',').map(s => s.trim()),
                subject,
                html,
                attachments: formattedAttachments
            })
        });

        const data = await res.json();
        if (!res.ok) {
            throw new Error(`Resend Error: ${data.message || JSON.stringify(data)}`);
        }
        return { success: true, mode: 'RESEND_API', data };
    }

    /**
     * Envío a través de cliente SMTP nativo de Node.js (TLS/Net)
     */
    static sendViaNativeSmtp({ to, from, subject, html, attachments }) {
        return new Promise((resolve, reject) => {
            const host = process.env.SMTP_HOST;
            const port = parseInt(process.env.SMTP_PORT || '465', 10);
            const user = process.env.SMTP_USER;
            const pass = process.env.SMTP_PASS;
            const isSecure = port === 465 || process.env.SMTP_SECURE === 'true';

            const boundary = `----=_Part_${Date.now()}_${Math.random().toString(36).substring(2)}`;
            let mime = '';
            mime += `From: "Travesía Paine" <${from}>\r\n`;
            mime += `To: ${to}\r\n`;
            mime += `Subject: ${subject}\r\n`;
            mime += `MIME-Version: 1.0\r\n`;
            mime += `Content-Type: multipart/mixed; boundary="${boundary}"\r\n\r\n`;

            // Cuerpo HTML
            mime += `--${boundary}\r\n`;
            mime += `Content-Type: text/html; charset=UTF-8\r\n`;
            mime += `Content-Transfer-Encoding: 7bit\r\n\r\n`;
            mime += `${html}\r\n\r\n`;

            // Adjuntos
            for (const att of attachments) {
                const b64 = Buffer.isBuffer(att.content) ? att.content.toString('base64') : Buffer.from(att.content).toString('base64');
                mime += `--${boundary}\r\n`;
                mime += `Content-Type: ${att.contentType || 'application/octet-stream'}; name="${att.filename}"\r\n`;
                mime += `Content-Transfer-Encoding: base64\r\n`;
                mime += `Content-Disposition: attachment; filename="${att.filename}"\r\n\r\n`;
                mime += `${b64.match(/.{1,76}/g).join('\r\n')}\r\n\r\n`;
            }
            mime += `--${boundary}--\r\n`;

            const socket = isSecure 
                ? tls.connect(port, host, { rejectUnauthorized: false })
                : net.connect(port, host);

            let step = 0;
            let log = '';

            socket.setEncoding('utf8');

            const sendLine = (line) => {
                socket.write(line + '\r\n');
            };

            socket.on('data', (data) => {
                log += data;
                const code = parseInt(data.substring(0, 3), 10);

                if (step === 0 && code === 220) {
                    step = 1;
                    sendLine(`EHLO ${host}`);
                } else if (step === 1 && code === 250) {
                    step = 2;
                    sendLine('AUTH LOGIN');
                } else if (step === 2 && code === 334) {
                    step = 3;
                    sendLine(Buffer.from(user).toString('base64'));
                } else if (step === 3 && code === 334) {
                    step = 4;
                    sendLine(Buffer.from(pass).toString('base64'));
                } else if (step === 4 && code === 235) {
                    step = 5;
                    sendLine(`MAIL FROM:<${from}>`);
                } else if (step === 5 && code === 250) {
                    step = 6;
                    sendLine(`RCPT TO:<${to}>`);
                } else if (step === 6 && code === 250) {
                    step = 7;
                    sendLine('DATA');
                } else if (step === 7 && code === 354) {
                    step = 8;
                    socket.write(mime + '\r\n.\r\n');
                } else if (step === 8 && code === 250) {
                    step = 9;
                    sendLine('QUIT');
                    socket.end();
                    resolve({ success: true, mode: 'SMTP', message: 'Correo enviado con éxito.' });
                } else if (code >= 400) {
                    socket.end();
                    reject(new Error(`SMTP Error (${code}): ${data}`));
                }
            });

            socket.on('error', (err) => {
                reject(err);
            });

            setTimeout(() => {
                socket.destroy();
                reject(new Error('SMTP Connection Timeout'));
            }, 30000);
        });
    }
}

module.exports = EmailService;

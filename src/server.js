const express = require('express');
const cors = require('cors');
const path = require('path');
const dotenv = require('dotenv');

dotenv.config();

const bookingRoutes = require('./routes/bookingRoutes');
const driverRoutes = require('./routes/driverRoutes');
const { cleanupExpiredLocks } = require('./services/bookingService');
const { startCronRunner } = require('./services/cronService');

const app = express();
const PORT = process.env.PORT || 3000;

// Habilitar trust proxy para Hostinger / Nginx / Cloudflare (detecta HTTPS correctamente)
app.set('trust proxy', true);

// Middlewares
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Middleware para URLs amigables (oculta .html de la barra de direcciones)
app.use((req, res, next) => {
    if (req.path.endsWith('.html')) {
        const query = req.url.slice(req.path.length);
        if (req.path === '/index.html') {
            return res.redirect(301, '/' + query);
        }
        const cleanPath = req.path.slice(0, -5);
        return res.redirect(301, cleanPath + query);
    }
    next();
});

// Servir archivos estáticos del frontend con resolución de extensiones limpias
app.use(express.static(path.join(__dirname, '../public'), {
    extensions: ['html'],
    index: 'index.html'
}));

// Rutas de API
app.use('/api', bookingRoutes);
app.use('/api/driver', driverRoutes);

// Iniciar cron automático de cierre a las 20:00 hrs y envío de manifiesto
startCronRunner();

// Tarea periódica de limpieza de bloqueos expirados (cada 60 segundos)
setInterval(() => {
    try {
        cleanupExpiredLocks();
    } catch (err) {
        console.error('[Cleaner Error]', err);
    }
}, 60000);

// Iniciar servidor
app.listen(PORT, () => {
    console.log(`=======================================================`);
    console.log(`🚀 Servidor Travesía Paine Transfer activo en el puerto ${PORT}`);
    console.log(`🌐 Acceso Pasajero: http://localhost:${PORT}`);
    console.log(`📱 Módulo Chofer PWA: http://localhost:${PORT}/driver`);
    console.log(`⏱ Reloj Oficial Sincronizado: http://localhost:${PORT}/api/time`);
    console.log(`=======================================================`);
});

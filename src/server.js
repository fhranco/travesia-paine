const express = require('express');
const cors = require('cors');
const path = require('path');
const dotenv = require('dotenv');

dotenv.config();

const bookingRoutes = require('./routes/bookingRoutes');
const driverRoutes = require('./routes/driverRoutes');
const { cleanupExpiredLocks } = require('./services/bookingService');

const app = express();
const PORT = process.env.PORT || 3000;

// Middlewares
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Servir archivos estáticos del frontend
app.use(express.static(path.join(__dirname, '../public')));

// Rutas de API
app.use('/api', bookingRoutes);
app.use('/api/driver', driverRoutes);

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
    console.log(`📱 Módulo Chofer PWA: http://localhost:${PORT}/driver.html`);
    console.log(`=======================================================`);
});

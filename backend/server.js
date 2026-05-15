// ============================================
// SERVER.JS
// Servidor Express + Socket.IO para API y WebSockets
// ============================================

const express = require('express');
const http = require('http');
const path = require('path');
const socketIo = require('socket.io');
const cors = require('cors');
require('dotenv').config();

const app = express();
const server = http.createServer(app);

// ============================================
// CONFIGURACIÓN INICIAL
// ============================================
const isDev = process.env.NODE_ENV !== 'production';

const io = socketIo(server, {
    cors: { origin: true, methods: ['GET', 'POST'] }
});

app.use(cors({ origin: true, credentials: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ============================================
// 1. INICIALIZAR SOCKETS
// ============================================
const socketHandler = require('./src/sockets/socketHandler');
socketHandler(io);

// ============================================
// 2. CONECTAR RUTAS (Inyectando io al Proxy)
// ============================================
const proxyRoutes = require('./src/routes/proxy.routes')(io); // Le pasamos io
const pushRoutes = require('./src/routes/push.routes');

app.use('/api', proxyRoutes);
app.use('/api', pushRoutes);

// ============================================
// SERVIR FRONTEND ESTÁTICO — Solo en desarrollo
// ============================================
if (isDev) {
    const frontendPath = path.join(__dirname, '../frontend');
    console.log(`📂 Sirviendo frontend desde: ${frontendPath}`);
    app.use(express.static(frontendPath));
}

// ============================================
// ENDPOINT DE STATUS
// ============================================
app.get('/api/status', (req, res) => {
    res.json({ status: 'online', modo: isDev ? 'development' : 'production' });
});

// ============================================
// INICIAR SERVIDOR
// ============================================
const subscriptionStore = require('./src/push/subscriptionStore'); //  Importado para el log

const PORT = process.env.PORT || 80;
server.listen(PORT, '0.0.0.0', () => {
    console.log('');
    console.log('═══════════════════════════════════════════════');
    console.log(`  🚀 Servidor en puerto ${PORT}`);
    console.log(`  📍 Local:   http://localhost:${PORT}`);
    console.log(`  🔧 Modo:    ${isDev ? 'DESARROLLO (frontend incluido)' : 'PRODUCCIÓN (solo API)'}`);
    console.log(`  📡 Push:    ${subscriptionStore.count()} suscripciones`); //  Log restaurado
    console.log('═══════════════════════════════════════════════');
    console.log('');
    if (isDev) {
        console.log('  ⏳ Abre otra terminal y ejecuta:');
        console.log('     ngrok http 80');
        console.log('');
        console.log('  📱 Luego abre la URL de ngrok en tu navegador');
        console.log('');
    }
});
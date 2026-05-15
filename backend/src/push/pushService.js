const webpush = require('web-push');
const subscriptionStore = require('./subscriptionStore');

// Configurar VAPID
const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY;
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY;
const VAPID_EMAIL = process.env.VAPID_EMAIL;

if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
    console.error('Faltan claves VAPID en el archivo .env');
    process.exit(1); // Matamos el servidor si no hay claves (igual que antes)
}

webpush.setVapidDetails(VAPID_EMAIL, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);

module.exports = {
    getPublicKey() {
        return VAPID_PUBLIC_KEY;
    },

    // Enviar push a un domiciliario específico
    async enviarPushADomiciliario(domiciliarioId, pedidoId, pedidoDetalle) {
        const cuerpo = pedidoDetalle
            ? `Pedido #${pedidoId} - ${pedidoDetalle.clienteNombre || ''} - $${parseInt(pedidoDetalle.total || 0).toLocaleString('es-CO')}`
            : `Pedido #${pedidoId} asignado`;

        const payload = JSON.stringify({
            title: '🛵 Nuevo pedido asignado',
            body: cuerpo,
            url: '/domiciliario.html',
            tipo: 'asignacion',
            pedidoId: String(pedidoId),
            icon: '/domidelis/assets/img/icon-192x192.png',
            badge: '/domidelis/assets/img/icon-192x192.png',
            tag: `asignacion-${pedidoId}-${Date.now()}`,
            requireInteraction: true,
            vibrate: [200, 100, 200, 100, 200],
            data: { url: '/domiciliario.html', pedidoId: String(pedidoId), tipo: 'asignacion' }
        });

        const suscripciones = subscriptionStore.getAll();
        for (const [endpoint, subData] of suscripciones) {
            if (String(subData.usuarioId) !== String(domiciliarioId)) continue;
            if (subData.rol !== 'domiciliario') continue;

            try {
                await webpush.sendNotification(subData.subscription, payload);
                console.log(`📱 Push enviado → domiciliario ${domiciliarioId}`);
            } catch (error) {
                console.error(`❌ Push falló → domiciliario ${domiciliarioId}: ${error.message}`);
                if (error.statusCode === 410 || error.statusCode === 404) {
                    subscriptionStore.delete(endpoint);
                }
            }
        }
    },

    // Envío genérico por roles (para el endpoint /api/enviar-push)
    async enviarPushPorRoles(titulo, mensaje, roles, opciones = {}) {
        const payload = JSON.stringify({
            title: titulo, body: mensaje, 
            url: opciones.url || '/', tipo: opciones.tipo || 'general', pedidoId: opciones.pedidoId || null,
            icon: '/domidelis/assets/img/icon-192x192.png',
            badge: '/domidelis/assets/img/icon-192x192.png',
            tag: `domicilio-${opciones.tipo}-${Date.now()}`,
            requireInteraction: true,
            vibrate: [200, 100, 200],
            data: { url: opciones.url, pedidoId: opciones.pedidoId, tipo: opciones.tipo }
        });

        const resultados = { exitosos: 0, fallidos: 0, eliminados: 0 };
        const suscripciones = subscriptionStore.getAll();

        for (const [endpoint, data] of suscripciones) {
            if (!roles.includes(data.rol)) continue;
            try {
                await webpush.sendNotification(data.subscription, payload);
                resultados.exitosos++;
            } catch (error) {
                resultados.fallidos++;
                if (error.statusCode === 410 || error.statusCode === 404) {
                    subscriptionStore.delete(endpoint);
                    resultados.eliminados++;
                }
            }
        }
        return { ...resultados, totalActivos: subscriptionStore.count() };
    }
};
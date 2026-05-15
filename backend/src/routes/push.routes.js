const express = require('express');
const router = express.Router();
const subscriptionStore = require('../push/subscriptionStore');
const pushService = require('../push/pushService');

// POST /api/suscripciones
router.post('/suscripciones', (req, res) => {
    const { subscription, usuarioId, rol } = req.body;
    if (!subscription || !subscription.endpoint) {
        return res.status(400).json({ error: 'Suscripción inválida' });
    }
    subscriptionStore.save(subscription.endpoint, {
        subscription,
        usuarioId: usuarioId || 'anon',
        rol: rol || 'desconocido',
        fecha: new Date()
    });
    console.log(`✅ Push suscrito: user=${usuarioId} rol=${rol} total=${subscriptionStore.count()}`);
    res.json({ success: true, total: subscriptionStore.count() });
});

// POST /api/suscripciones/eliminar
router.post('/suscripciones/eliminar', (req, res) => {
    const { endpoint } = req.body;
    if (endpoint) subscriptionStore.delete(endpoint);
    res.json({ success: true });
});

// GET /api/vapid-public-key
router.get('/vapid-public-key', (req, res) => {
    res.json({ publicKey: pushService.getPublicKey() });
});

// POST /api/enviar-push
router.post('/enviar-push', async (req, res) => {
    const { titulo, mensaje, url = '/', tipo = 'general', roles = ['admin'], pedidoId = null } = req.body;
    const resultados = await pushService.enviarPushPorRoles(titulo, mensaje, roles, { url, tipo, pedidoId });
    res.json({ success: true, ...resultados });
});

module.exports = router;
const express = require('express');
const router = express.Router();
const axios = require('axios');
const { GAS_URL } = require('../config/google');
const pushService = require('../push/pushService');

// Función para obtener pedido de GAS
async function obtenerPedidoPorId(pedidoId) {
    try {
        const response = await axios.get(`${GAS_URL}?action=getPedidos`);
        const pedidos = response.data;
        if (!Array.isArray(pedidos)) return null;
        return pedidos.find(p => String(p.id) === String(pedidoId));
    } catch (e) {
        console.error('Error obteniendo pedido:', e.message);
        return null;
    }
}

// Exportamos una función que recibe 'io' y devuelve el router
module.exports = (io) => {

    // PROXY PRINCIPAL: ALL /api
    router.all('/', async (req, res) => {
        try {
            const action = req.query.action || req.body.action;
            console.log(`📥 [${req.method}] action=${action}`);

            if (!action) {
                return res.status(400).json({ success: false, error: 'Falta action' });
            }

            let gasUrl = `${GAS_URL}?action=${action}`;
            for (const key in req.query) {
                if (key !== 'action') gasUrl += `&${key}=${encodeURIComponent(req.query[key])}`;
            }

            let response;
            if (req.method === 'GET') {
                response = await axios.get(gasUrl);
            } else {
                const params = new URLSearchParams(req.body).toString();
                response = await axios.post(gasUrl, params, {
                    headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
                });
            }

            const data = response.data;
            console.log(`📤 GAS: success=${data.success}`);
            res.json(data);

            // SOCKET + PUSH (después de responder)
            if (!data.success) return;

            try {
                switch (action) {
                    case 'crearPedido': {
                        const pedido = await obtenerPedidoPorId(data.id);
                        io.emit('nuevoPedido', { pedido: pedido || { id: data.id }, mensaje: `Nuevo pedido #${data.id}` });
                        console.log(`📦 Emitido nuevoPedido #${data.id}`);
                        break;
                    }
                    case 'actualizarEstado': {
                        const pedidoId = (req.body && req.body.pedidoId) || req.query.pedidoId;
                        const nuevoEstado = (req.body && req.body.estado) || req.query.estado;
                        io.emit('estadoActualizado', { pedidoId, nuevoEstado });
                        console.log(`🔄 Emitido estadoActualizado #${pedidoId} → ${nuevoEstado}`);
                        break;
                    }
                    case 'asignarDomiciliario': {
                        const pedidoId = (req.body && req.body.pedidoId) || req.query.pedidoId;
                        const domiciliarioId = (req.body && req.body.domiciliarioId) || req.query.domiciliarioId;

                        if (!pedidoId || !domiciliarioId) {
                            console.error('❌ Faltan parámetros para asignarDomiciliario'); // 👈 Log restaurado
                            break;
                        }

                        console.log(`🎯 ASIGNAR: pedido #${pedidoId} → domiciliario ${domiciliarioId}`); // 👈 Log restaurado

                        const pedidoDetalle = await obtenerPedidoPorId(pedidoId);
                        const mensaje = pedidoDetalle ? `Pedido #${pedidoId} asignado - ${pedidoDetalle.clienteNombre || ''}` : `Pedido #${pedidoId} asignado`;

                        // 1. SOCKET directo a la room domiciliario_{id}
                        const roomName = `domiciliario_${domiciliarioId}`;
                        const roomSockets = io.sockets.adapter.rooms.get(roomName);
                        console.log(`🏠 Room ${roomName}: ${roomSockets ? roomSockets.size : 0} socket(s)`); // 👈 Log restaurado

                        io.to(roomName).emit('nuevoPedidoAsignado', { pedidoId: String(pedidoId), pedido: pedidoDetalle, mensaje });
                        console.log(`✅ Socket emitido → ${roomName}`);

                        // 2. PUSH directo al domiciliario
                        await pushService.enviarPushADomiciliario(domiciliarioId, pedidoId, pedidoDetalle);

                        // 3. BROADCAST general (para que el admin vea la actualización)
                        io.emit('pedidoAsignado', { pedidoId: String(pedidoId), domiciliarioId: String(domiciliarioId), pedido: pedidoDetalle });
                        break;
                    }
                }
            } catch (socketError) {
                console.error('❌ Error Socket/Push (no afecta al cliente):', socketError.message);
            }

        } catch (error) {
            console.error('❌ Error proxy:', error.message);
            if (!res.headersSent) {
                res.status(500).json({ success: false, error: error.message });
            }
        }
    });

    return router;
};
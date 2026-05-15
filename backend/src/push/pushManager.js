const subscriptionStore = require('./subscriptionStore');
const pushService = require('./pushService');

module.exports = {
    subscriptionStore,
    pushService,

    // Atajos corregidos
    enviarA: (usuarioId, rol, titulo, opciones) => 
        pushService.enviarPushADomiciliario(usuarioId, null, opciones), // no generico método genérico

    enviarATodos: (rol, titulo, opciones) => 
        pushService.enviarPushPorRoles(titulo, opciones?.mensaje || '', [rol], opciones),

    guardarSuscripcion: (endpoint, usuarioId, rol, subscription) => 
        subscriptionStore.save(endpoint, { usuarioId, rol, subscription, fecha: new Date() }),

    eliminarSuscripcion: (endpoint) => 
        subscriptionStore.deleteByEndpoint(endpoint),

    obtenerSuscripcion: (usuarioId, rol) => 
        subscriptionStore.get(usuarioId, rol),

    totalSuscripciones: () => 
        subscriptionStore.count()
};
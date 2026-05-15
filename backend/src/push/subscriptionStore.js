// Almacén en memoria de suscripciones Push
const suscripciones = new Map();

module.exports = {
    save(endpoint, data) {
        suscripciones.set(endpoint, data);
        return suscripciones.size;
    },
    delete(endpoint) {
        return suscripciones.delete(endpoint);
    },
    getByRole(rol) {
        const result = [];
        for (const [endpoint, data] of suscripciones) {
            if (data.rol === rol) result.push({ endpoint, ...data });
        }
        return result;
    },
    count() {
        return suscripciones.size;
    },
    getAll() {
        return suscripciones;
    }
};
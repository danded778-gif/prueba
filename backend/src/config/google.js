// Configuración de Google Apps Script (Leída desde .env)
const GAS_URL = process.env.GAS_URL || 'URL_POR_DEFECTO_SI_NO_HAY_ENV';

module.exports = { GAS_URL };
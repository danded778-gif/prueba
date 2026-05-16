// ============================================
// VAPID — Claves para Web Push
// Estas NO cambian entre local y producción
// ============================================
require('dotenv').config();

const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY;
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY;
const VAPID_EMAIL = process.env.VAPID_EMAIL;

if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
    console.error('Faltan claves VAPID en el archivo .env');
    process.exit(1);
}
const GAS_URL = process.env.GAS_URL || 'URL_POR_DEFECTO_SI_NO_HAY_ENV';
const isDev   = process.env.NODE_ENV !== 'production';
webpush.setVapidDetails(VAPID_EMAIL, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
module.exports = { VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_EMAIL, GAS_URL, isDev };
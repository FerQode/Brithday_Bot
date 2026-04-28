// scripts/encrypt-auth.js
// Usado por el workflow de GitHub Actions DESPUÉS de ejecutar el bot.
// Re-encripta auth_info_baileys/ → auth_info/auth.enc para que la sesión
// actualizada quede guardada en el repositorio para la próxima ejecución.
import 'dotenv/config';
import { encryptAuthState } from '../src/authManager.js';
import pino from 'pino';

const logger = pino({ level: 'info' });

(async () => {
    try {
        await encryptAuthState();
        logger.info('✅ Sesión de WhatsApp re-encriptada correctamente.');
        process.exit(0);
    } catch (err) {
        logger.error(`❌ Error al encriptar la sesión: ${err.message}`);
        process.exit(1);
    }
})();

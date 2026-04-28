// scripts/decrypt-auth.js
// Usado por el workflow de GitHub Actions antes de ejecutar el bot.
// Restaura la carpeta auth_info_baileys/ desde el archivo encriptado auth_info/auth.enc.
import 'dotenv/config';
import { decryptAuthState } from '../src/authManager.js';
import pino from 'pino';

const logger = pino({ level: 'info' });

(async () => {
    try {
        await decryptAuthState();
        logger.info('✅ Sesión de WhatsApp restaurada correctamente.');
        process.exit(0);
    } catch (err) {
        logger.error(`❌ Error al desencriptar la sesión: ${err.message}`);
        process.exit(1);
    }
})();

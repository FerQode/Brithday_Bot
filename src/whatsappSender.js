//src/whatsappSender.js
// Baileys usa named exports — import * as es la forma correcta.
import * as baileys from '@whiskeysockets/baileys';
import { Boom } from '@hapi/boom';
import pino from 'pino';
import path from 'path';
import fs from 'fs/promises';
import qrcode from 'qrcode-terminal';

// Extraer funciones desde named exports
const { makeWASocket, useMultiFileAuthState, DisconnectReason } = baileys;

// Validación en tiempo de arranque
if (typeof makeWASocket !== 'function') {
    throw new Error('makeWASocket no encontrado en @whiskeysockets/baileys. Verifica la versión instalada.');
}
if (typeof useMultiFileAuthState !== 'function') {
    throw new Error('useMultiFileAuthState no encontrado en @whiskeysockets/baileys. Verifica la versión instalada.');
}

const logger = pino({ level: 'info' });
const AUTH_DIR = path.resolve('auth_info_baileys');

// Máximo de intentos antes de fallar definitivamente
const MAX_REINTENTOS = 5;
// Delays de backoff incremental en ms: intento 2→2s, 3→4s, 4→6s, 5→8s
const BACKOFF_DELAYS = [2000, 4000, 6000, 8000, 10000];
// Pausa simple
const delay = (ms) => new Promise((r) => setTimeout(r, ms));

/**
 * Conecta a WhatsApp usando Baileys con:
 * - Límite de MAX_REINTENTOS intentos (no bucle infinito)
 * - Timeout global único de 120s que NO se resetea entre reintentos
 * - Backoff incremental entre reintentos
 *
 * NOTA SOBRE EL PATRÓN USADO (Opción B):
 * startSocket NO es async y recibe resolveOuter/rejectOuter directamente.
 * Cuando connection === 'open', llama a resolveOuter(sock) con el socket REAL.
 * Cuando hay un error transitorio, llama a startSocket(intento+1, ...) pasando
 * los MISMOS resolve/reject — no crea Promises intermedias que puedan resolverse
 * antes del evento. Esto elimina el bug "sock is undefined".
 */
export async function connectToWhatsApp() {
    await fs.mkdir(AUTH_DIR, { recursive: true });

    return new Promise((resolveOuter, rejectOuter) => {
        // El timeout global se crea UNA sola vez aquí, fuera de startSocket.
        // No se resetea entre reintentos.
        const globalTimeout = setTimeout(() => {
            rejectOuter(new Error(
                'Timeout: No se estableció conexión en 120 segundos.\n' +
                '  → ¿Escaneaste el QR antes de que caducara?\n' +
                '  → Ejecuta npm run setup nuevamente y escanea rápido.'
            ));
        }, 120_000);

        // Wrapper de resolve/reject que limpia el timeout global
        function resolveConCleanup(sock) {
            clearTimeout(globalTimeout);
            resolveOuter(sock);
        }
        function rejectConCleanup(err) {
            clearTimeout(globalTimeout);
            rejectOuter(err);
        }

        // Arrancar desde el intento 1
        startSocket(1, resolveConCleanup, rejectConCleanup);
    });
}

/**
 * Crea un socket de Baileys y espera el evento connection.update.
 * NO es async — retorna void. Se comunica hacia afuera exclusivamente
 * a través de resolveOuter/rejectOuter para garantizar que el socket
 * real (connection === 'open') es lo que se resuelve, nunca undefined.
 *
 * @param {number} intento - Número de intento actual (empieza en 1)
 * @param {Function} resolveOuter - resolve() de la Promise principal
 * @param {Function} rejectOuter  - reject()  de la Promise principal
 */
function startSocket(intento, resolveOuter, rejectOuter) {
    if (intento > MAX_REINTENTOS) {
        rejectOuter(new Error(
            `No se pudo conectar después de ${MAX_REINTENTOS} intentos.\n` +
            '  Posibles causas:\n' +
            '  1. Sesión corrupta → ejecuta npm run setup (limpia auth_info_baileys/ automáticamente)\n' +
            '  2. Baileys bloqueado temporalmente → espera 5 minutos e intenta de nuevo\n' +
            '  3. Versión incompatible → verifica con: npm ls @whiskeysockets/baileys'
        ));
        return;
    }

    // Backoff antes de reconectar (no aplica al primer intento)
    const backoffMs = intento > 1 ? (BACKOFF_DELAYS[intento - 2] ?? 10000) : 0;

    const iniciar = async () => {
        if (intento > 1) {
            logger.info(`⏳ Intento ${intento} de ${MAX_REINTENTOS}... esperando ${backoffMs / 1000}s antes de reconectar.`);
            await delay(backoffMs);
        }

        try {
            const { state, saveCreds } = await useMultiFileAuthState(AUTH_DIR);

            const sock = makeWASocket({
                auth: state,
                // FIX 405 "location: odn": WhatsApp rechaza versiones de protocolo antiguas.
                // Si el 405 vuelve en el futuro, actualizar este array desde:
                // https://github.com/WhiskeySockets/Baileys/issues
                version: [2, 3000, 1037641644],
                // Browsers.ubuntu es el preset oficial — más estable que un array custom
                browser: baileys.Browsers.ubuntu('Chrome'),
                logger: pino({ level: 'silent' })
            });

            sock.ev.on('connection.update', (update) => {
                const { connection, lastDisconnect, qr } = update;

                // Mostrar QR en terminal cuando Baileys lo genere
                if (qr) {
                    logger.info('📱 Escanea este QR con WhatsApp → Dispositivos vinculados → Vincular dispositivo:');
                    qrcode.generate(qr, { small: true });
                }

                if (connection === 'close') {
                    const statusCode = (lastDisconnect?.error instanceof Boom)
                        ? lastDisconnect.error.output?.statusCode
                        : undefined;

                    const loggedOut = statusCode === DisconnectReason.loggedOut;
                    logger.info(`🔌 Conexión cerrada (código: ${statusCode ?? 'desconocido'}) — intento ${intento}/${MAX_REINTENTOS}`);

                    if (loggedOut) {
                        // Sesión explícitamente cerrada — no reintentar
                        rejectOuter(new Error(
                            'Sesión cerrada por WhatsApp (loggedOut).\n' +
                            '  → Ejecuta npm run setup para crear una sesión nueva.'
                        ));
                        return;
                    }

                    // Error transitorio (405, red, etc.) — reconectar pasando los MISMOS resolve/reject.
                    // NO encadenamos .then() porque startSocket no retorna una Promise.
                    startSocket(intento + 1, resolveOuter, rejectOuter);

                } else if (connection === 'open') {
                    // ✅ Conexión exitosa — resolver con el socket REAL (nunca undefined)
                    logger.info('✅ Conexión con WhatsApp establecida.');
                    resolveOuter(sock);
                }
            });

            sock.ev.on('creds.update', saveCreds);

        } catch (err) {
            // Error al inicializar el socket (ej: archivos corruptos en auth state)
            logger.error(`Error al inicializar socket (intento ${intento}): ${err.message}`);
            startSocket(intento + 1, resolveOuter, rejectOuter);
        }
    };

    // Ejecutar el proceso de inicio (usamos void para manejar el async sin perder errores)
    iniciar().catch(rejectOuter);
}

/**
 * Envía un mensaje de cumpleaños (imagen + caption) a un número de WhatsApp.
 * Verifica que el número tenga cuenta activa antes de enviar.
 *
 * @param {object} sock - Socket activo de Baileys
 * @param {string} telefono - Número con código de país (ej: 593991234567)
 * @param {Buffer} imageBuffer - Buffer de la tarjeta generada por Sharp
 * @param {string} caption - Texto del mensaje
 */
export async function sendBirthdayMessage(sock, telefono, imageBuffer, caption) {
    const cleanPhone = telefono.toString().replace(/\D/g, '');
    if (!cleanPhone) {
        throw new Error(`Número de teléfono inválido: "${telefono}"`);
    }

    const jid = `${cleanPhone}@s.whatsapp.net`;

    // Verificar que el número tenga WhatsApp activo antes de enviar
    const [result] = await sock.onWhatsApp(jid);
    if (!result?.exists) {
        throw new Error(`El número ${cleanPhone} no tiene cuenta de WhatsApp activa.`);
    }

    await sock.sendMessage(jid, {
        image: imageBuffer,
        caption: caption,
        mimetype: 'image/jpeg'
    });
}

/**
 * Desconecta el socket de WhatsApp de forma ordenada.
 * Usa sock.end() — API pública estable. NO usar sock.ws.close().
 *
 * @param {object} sock - Socket activo de Baileys
 */
export async function disconnectWhatsApp(sock) {
    try {
        sock.end(undefined);
        logger.info('🔌 Desconectado de WhatsApp correctamente.');
    } catch (err) {
        logger.warn(`Advertencia al desconectar: ${err.message}`);
    }
}

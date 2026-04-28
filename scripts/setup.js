//scripts/setup.js
import 'dotenv/config';
import readline from 'readline';
import path from 'path';
import fs from 'fs/promises';
import { existsSync } from 'fs';
import { connectToWhatsApp, disconnectWhatsApp } from '../src/whatsappSender.js';
import { encryptAuthState } from '../src/authManager.js';
import pino from 'pino';

const logger = pino({ level: 'info' });
const AUTH_DIR = path.resolve('auth_info_baileys');

/**
 * Solicita al usuario un valor por terminal si falta una variable de entorno.
 */
function promptUser(question) {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    return new Promise(resolve => {
        rl.question(question, (answer) => {
            rl.close();
            resolve(answer.trim());
        });
    });
}

async function setup() {
    console.log('\n╔══════════════════════════════════════════════════╗');
    console.log('║         🎂  Birthday Bot — Setup Inicial         ║');
    console.log('╚══════════════════════════════════════════════════╝\n');
    console.log('📌 Instrucciones:');
    console.log('   1. Cuando aparezca el QR, abre WhatsApp en tu celular.');
    console.log('   2. Ve a: Configuración → Dispositivos vinculados → Vincular un dispositivo.');
    console.log('   3. Escanea el código QR. Tienes 120 segundos.\n');

    // ── Validar AUTH_ENCRYPTION_KEY ─────────────────────────────────
    if (!process.env.AUTH_ENCRYPTION_KEY) {
        logger.warn('⚠️  AUTH_ENCRYPTION_KEY no está definida en tu archivo .env');
        const key = await promptUser('🔑 Ingresa una clave de encriptación (mín. 32 caracteres): ');
        if (!key || key.length < 32) {
            logger.error('❌ La clave debe tener al menos 32 caracteres. Abortando.');
            process.exit(1);
        }
        process.env.AUTH_ENCRYPTION_KEY = key;
        logger.info('✅ Clave definida para esta sesión. Recuerda añadirla permanentemente a tu .env');
    }

    // ── Limpiar sesión anterior ANTES de conectar ────────────────────
    // El setup siempre crea una sesión NUEVA desde cero.
    // Archivos de sesiones previas o corruptas causan el error 405.
    if (existsSync(AUTH_DIR)) {
        logger.info('🧹 Limpiando sesión anterior en auth_info_baileys/...');
        await fs.rm(AUTH_DIR, { recursive: true, force: true });
        logger.info('✅ Directorio limpiado. Iniciando sesión nueva desde cero.');
    } else {
        logger.info('ℹ️  No hay sesión previa. Creando sesión nueva.');
    }

    let sock;
    try {
        logger.info('🔗 Iniciando conexión con WhatsApp...\n');
        sock = await connectToWhatsApp();

        // Esperar a que las credenciales se sincronicen completamente.
        // Baileys v6 NO tiene sock.ev.once() — usamos sock.ev.on() con un flag
        // para asegurarnos de que el resolve solo se llame una vez.
        logger.info('⏳ Esperando sincronización de credenciales (máximo 15 segundos)...');
        await new Promise(resolve => {
            let resolved = false;

            sock.ev.on('creds.update', () => {
                if (resolved) return;
                resolved = true;
                logger.info('✅ Credenciales sincronizadas correctamente.');
                resolve();
            });

            // Fallback: si no hay update en 15 seg, continuar con lo que haya
            setTimeout(() => {
                if (resolved) return;
                resolved = true;
                logger.info('⏩ Tiempo de espera agotado. Continuando con el estado actual...');
                resolve();
            }, 15_000);
        });

        // Encriptar el estado de sesión para subirlo al repositorio de forma segura
        logger.info('🔒 Encriptando sesión de WhatsApp...');
        await encryptAuthState();

        console.log('\n╔══════════════════════════════════════════════════╗');
        console.log('║         ✅  Setup completado con éxito           ║');
        console.log('╚══════════════════════════════════════════════════╝');
        console.log('\n📁 Archivo generado: auth_info/auth.enc');
        console.log('📤 Próximos pasos:');
        console.log('   1. Haz commit del archivo auth_info/auth.enc');
        console.log('   2. Configura los GitHub Secrets (ver docs/SETUP.md)');
        console.log('   3. Haz push al repositorio\n');

    } catch (err) {
        console.log('\n╔══════════════════════════════════════════════════╗');
        console.log('║             ❌  Error en el Setup                ║');
        console.log('╚══════════════════════════════════════════════════╝');
        logger.error(`\n${err.message}\n`);
        process.exit(1);
    } finally {
        if (sock) {
            await disconnectWhatsApp(sock);
        }
    }

    process.exit(0);
}

setup();

import crypto from 'crypto';
import fs from 'fs/promises';
import path from 'path';
import pino from 'pino';

const logger = pino({ level: 'info' });

const ALGORITHM = 'aes-256-cbc';
const ENCRYPTED_AUTH_DIR = path.resolve('auth_info');
const AUTH_DIR = path.resolve('auth_info_baileys');

/**
 * Obtiene la clave de 32 bytes requerida para AES-256 desde la variable de entorno.
 */
function getEncryptionKey() {
    const key = process.env.AUTH_ENCRYPTION_KEY;
    if (!key) {
        throw new Error('AUTH_ENCRYPTION_KEY no está definida en las variables de entorno.');
    }
    // Asegurarse que tiene 32 caracteres
    const hash = crypto.createHash('sha256').update(String(key)).digest('base64').substring(0, 32);
    return Buffer.from(hash);
}

/**
 * Encripta un archivo o directorio. 
 * Para Baileys auth_info_baileys (directorio), primero comprimiremos el contenido
 * o simplemente guardaremos los archivos JSON clave como un string encriptado.
 * Baileys guarda creds.json y un directorio app-state-sync-keys.
 * En un entorno serverless, necesitamos que TODO el directorio persista.
 * Para simplificar y dado que tar/zip en Node.js requiere librerías extra,
 * este encriptador/desencriptador leerá todos los archivos en auth_info_baileys,
 * los pondrá en un gran objeto JSON y lo encriptará.
 */

export async function encryptAuthState() {
    logger.info('🔒 Encriptando estado de sesión de WhatsApp...');
    try {
        const filesObj = {};
        
        async function readDirRecursive(dir) {
            const entries = await fs.readdir(dir, { withFileTypes: true });
            for (const entry of entries) {
                const fullPath = path.join(dir, entry.name);
                const relPath = path.relative(AUTH_DIR, fullPath);
                
                if (entry.isDirectory()) {
                    await readDirRecursive(fullPath);
                } else {
                    const content = await fs.readFile(fullPath, 'base64');
                    filesObj[relPath] = content;
                }
            }
        }

        // Verificar que exista
        try {
            await fs.access(AUTH_DIR);
        } catch {
            logger.info('No hay auth_info_baileys que encriptar. Ignorando.');
            return;
        }

        await readDirRecursive(AUTH_DIR);

        const dataStr = JSON.stringify(filesObj);
        
        const iv = crypto.randomBytes(16);
        const cipher = crypto.createCipheriv(ALGORITHM, getEncryptionKey(), iv);
        
        let encrypted = cipher.update(dataStr, 'utf8', 'hex');
        encrypted += cipher.final('hex');
        
        // Guardar IV + contenido encriptado
        const finalContent = `${iv.toString('hex')}:${encrypted}`;
        
        await fs.mkdir(ENCRYPTED_AUTH_DIR, { recursive: true });
        await fs.writeFile(path.join(ENCRYPTED_AUTH_DIR, 'auth.enc'), finalContent, 'utf8');
        logger.info('✅ Estado de sesión encriptado correctamente en auth_info/auth.enc');
        
    } catch (err) {
        logger.error(`Error encriptando auth: ${err.message}`);
        throw err;
    }
}

export async function decryptAuthState() {
    logger.info('🔓 Desencriptando estado de sesión de WhatsApp...');
    try {
        const encFilePath = path.join(ENCRYPTED_AUTH_DIR, 'auth.enc');
        
        let fileContent;
        try {
            fileContent = await fs.readFile(encFilePath, 'utf8');
        } catch (e) {
            logger.info('No se encontró archivo encriptado previo (auth.enc). Es posible que sea una sesión nueva.');
            return;
        }

        const [ivHex, encryptedHex] = fileContent.split(':');
        if (!ivHex || !encryptedHex) {
            throw new Error('El archivo auth.enc está corrupto.');
        }

        const iv = Buffer.from(ivHex, 'hex');
        const decipher = crypto.createDecipheriv(ALGORITHM, getEncryptionKey(), iv);
        
        let decrypted = decipher.update(encryptedHex, 'hex', 'utf8');
        decrypted += decipher.final('utf8');
        
        const filesObj = JSON.parse(decrypted);

        // Recrear la estructura de archivos en auth_info_baileys
        await fs.mkdir(AUTH_DIR, { recursive: true });
        
        for (const [relPath, contentBase64] of Object.entries(filesObj)) {
            const destPath = path.join(AUTH_DIR, relPath);
            await fs.mkdir(path.dirname(destPath), { recursive: true });
            await fs.writeFile(destPath, Buffer.from(contentBase64, 'base64'));
        }

        logger.info('✅ Estado de sesión desencriptado correctamente.');
    } catch (err) {
        logger.error(`Error desencriptando auth: ${err.message}`);
        throw err;
    }
}

//scripts/test-sheet.js
import 'dotenv/config';
import { readContacts } from '../src/sheetReader.js';
import { getConfig } from '../src/configReader.js';
import { writeLog } from '../src/sheetWriter.js';
import pino from 'pino';

const logger = pino({ level: 'info' });

/**
 * Valida que las variables de entorno necesarias estén definidas.
 * Muestra exactamente cuál falta si hay algún problema.
 */
function validateEnvVars() {
    const required = {
        GOOGLE_SERVICE_ACCOUNT_EMAIL: 'Correo del Service Account (desde el JSON de Google Cloud)',
        GOOGLE_PRIVATE_KEY: 'Clave privada del Service Account (desde el JSON de Google Cloud)',
        GOOGLE_SHEET_ID: 'ID del Google Sheet (desde la URL del documento)'
    };

    const missing = [];
    for (const [key, description] of Object.entries(required)) {
        if (!process.env[key]) {
            missing.push({ key, description });
        }
    }

    if (missing.length > 0) {
        logger.error('❌ Faltan variables de entorno en tu archivo .env:\n');
        missing.forEach(({ key, description }) => {
            console.error(`   ➤ ${key}`);
            console.error(`     └── ${description}\n`);
        });
        console.error('💡 Crea o edita el archivo .env en la raíz del proyecto. Ver docs/SETUP.md para instrucciones.\n');
        process.exit(1);
    }
}

async function testSheets() {
    console.log('\n╔══════════════════════════════════════════════════╗');
    console.log('║       🎂  Birthday Bot — Prueba Google Sheets    ║');
    console.log('╚══════════════════════════════════════════════════╝\n');

    // Validar variables de entorno antes de intentar cualquier conexión
    validateEnvVars();

    try {
        // ── 1. Configuración ──────────────────────────────────────────
        logger.info('1️⃣  Leyendo hoja "Configuracion"...');
        const config = await getConfig();
        logger.info(`   ✅ ${Object.keys(config).length} claves de configuración encontradas.`);
        console.log('   Claves:', Object.keys(config).join(', '), '\n');

        // ── 2. Contactos ──────────────────────────────────────────────
        logger.info('2️⃣  Leyendo hoja "Contactos"...');
        const { birthDayContacts, rawContactsLength } = await readContacts();
        logger.info(`   ✅ Se revisaron ${rawContactsLength} filas totales.`);

        if (birthDayContacts.length === 0) {
            console.log('\n   ℹ️  Ningún contacto cumple años hoy. Esto es completamente normal.');
            console.log('   💡 Para probar el flujo completo, agrega en el Sheet un contacto');
            console.log(`      con Dia_Cumple = ${new Date().getDate()} y Mes_Cumple = ${new Date().getMonth() + 1}.\n`);
        } else {
            logger.info(`   🎉 ${birthDayContacts.length} cumpleañero(s) detectado(s) para hoy:`);
            birthDayContacts.forEach(p => {
                console.log(`      - ${p.Nombre} ${p.Apellido} | Rol: ${p.Rol} | Edad: ${p.Edad_Actual} | Categoría: ${p.Categoria_Edad}`);
            });
            console.log('');
        }

        // ── 3. Escritura (opcional) ───────────────────────────────────
        if (process.env.TEST_WRITE === 'true') {
            logger.info('3️⃣  Escribiendo fila de prueba en "Historial_Envios"...');
            await writeLog({
                Nombre_Completo: 'Test User (prueba automática)',
                Telefono_Destino: '593999999999',
                Tipo_Contacto: 'Test',
                Edad_Cumplida: 99,
                Rango_Edad: 'Adulto 25+',
                Estado: 'TEST',
                Mensaje_Error: 'Fila de prueba — puedes eliminarla'
            });
            logger.info('   ✅ Fila de prueba escrita correctamente.\n');
        } else {
            logger.info('3️⃣  (Prueba de escritura omitida — añade TEST_WRITE=true al .env para activarla)\n');
        }

        console.log('╔══════════════════════════════════════════════════╗');
        console.log('║   ✅  Conexión con Google Sheets: EXITOSA         ║');
        console.log('╚══════════════════════════════════════════════════╝\n');

    } catch (err) {
        // Manejo amigable de error de permisos
        if (err.message?.includes('PERMISSION_DENIED') || err.status === 403) {
            logger.error('❌ Error: PERMISO DENEGADO al acceder al Google Sheet.');
            console.error('\n💡 ¿Compartiste el Google Sheet con el email del Service Account?');
            console.error(`   Email: ${process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL}`);
            console.error('   Pasos: Abre el Sheet → Compartir → pega el email → rol "Editor" → Listo.\n');
        } else {
            logger.error(`❌ Error inesperado: ${err.message}`);
            console.error(err);
        }
        process.exit(1);
    }
}

testSheets();

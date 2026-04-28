//scripts/test-card.js
// Genera tarjetas de prueba usando los datos REALES de Google Sheets.
// Si hay cumpleañeros hoy, genera una tarjeta por cada uno.
// Si no hay, usa datos de ejemplo para verificar el diseño visual.
// Las imágenes se guardan en output_tests/<timestamp>/ — nunca se sobreescriben.

import 'dotenv/config';
import { generateCard } from '../src/cardGenerator.js';
import { readContacts } from '../src/sheetReader.js';
import fs from 'fs/promises';
import path from 'path';
import pino from 'pino';

const logger = pino({ level: 'info' });

// Generar timestamp: YYYY-MM-DD_HH-mm-ss (formato seguro para nombres de carpeta)
function getTimestamp() {
    const now = new Date();
    const pad = (n) => String(n).padStart(2, '0');
    return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}` +
           `_${pad(now.getHours())}-${pad(now.getMinutes())}-${pad(now.getSeconds())}`;
}

async function testCard() {
    console.log('\n╔══════════════════════════════════════════════════╗');
    console.log('║       🎂  Birthday Bot — Test de Tarjetas        ║');
    console.log('╚══════════════════════════════════════════════════╝\n');

    // Crear carpeta de salida con timestamp para no sobreescribir nada
    const timestamp = getTimestamp();
    const outputDir = path.resolve('output_tests', timestamp);
    await fs.mkdir(outputDir, { recursive: true });
    logger.info(`📁 Carpeta de salida: output_tests/${timestamp}/`);

    // ── Leer cumpleañeros reales del Sheet ───────────────────────────
    let contactos = [];
    try {
        logger.info('📊 Leyendo cumpleañeros de hoy desde Google Sheets...');
        const { birthDayContacts, rawContactsLength } = await readContacts();
        logger.info(`   → ${rawContactsLength} filas revisadas. ${birthDayContacts.length} cumpleañero(s) hoy.`);
        contactos = birthDayContacts;
    } catch (err) {
        logger.warn(`⚠️  No se pudo leer Google Sheets: ${err.message}`);
        logger.warn('   → Usando datos de ejemplo para prueba visual.');
    }

    // Si no hay cumpleañeros hoy (o falló Sheets), usar datos de ejemplo
    if (contactos.length === 0) {
        logger.info('ℹ️  No hay cumpleañeros hoy. Generando tarjeta de ejemplo para verificar diseño...');
        contactos = [
            { Nombre: 'María', Apellido: 'Ejemplo', Edad_Actual: 25, Rol: 'Estudiante', Categoria_Edad: 'Adulto' }
        ];
    }

    // ── Generar una tarjeta por cada cumpleañero ─────────────────────
    let generadas = 0;
    for (const persona of contactos) {
        try {
            logger.info(`🖼️  Generando tarjeta para: ${persona.Nombre} ${persona.Apellido} (${persona.Edad_Actual} años, ${persona.Rol})...`);
            
            const imageBuffer = await generateCard(persona.Nombre, persona.Edad_Actual, persona.Rol);
            
            // Nombre de archivo: Nombre_Apellido.jpg (sin espacios)
            const fileName = `${persona.Nombre}_${persona.Apellido}.jpg`.replace(/\s+/g, '_');
            const outputPath = path.join(outputDir, fileName);
            
            await fs.writeFile(outputPath, imageBuffer);
            logger.info(`   ✅ Guardada en: output_tests/${timestamp}/${fileName}`);
            generadas++;
        } catch (err) {
            logger.error(`   ❌ Error generando tarjeta para ${persona.Nombre}: ${err.message}`);
        }
    }

    console.log('\n╔══════════════════════════════════════════════════╗');
    if (generadas > 0) {
        console.log(`║  ✅ ${generadas} tarjeta(s) generada(s) correctamente    ║`);
    } else {
        console.log('║  ❌ No se pudo generar ninguna tarjeta           ║');
    }
    console.log('╚══════════════════════════════════════════════════╝');
    console.log(`\n📂 Abre la carpeta para verificar el diseño:`);
    console.log(`   output_tests\\${timestamp}\\\n`);
}

testCard();

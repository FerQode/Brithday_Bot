//src/cardGenerator.js
import sharp from 'sharp';
import fs from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';

// Plantillas en orden de preferencia. El bot elige una al azar entre las que existan.
// Si ninguna existe → error claro para que el usuario sepa qué archivo falta.
const TEMPLATE_CANDIDATES = [
    'plantilla_1.jpg',
    'plantilla_2.jpg',
    'plantilla_3.jpg',
    'plantilla.jpg'  // fallback para compatibilidad con versiones anteriores
];

/**
 * Elige una plantilla al azar entre las disponibles en assets/.
 * @returns {string} Ruta absoluta a la plantilla seleccionada
 * @throws {Error} Si no existe ninguna plantilla en assets/
 */
function selectTemplate() {
    const disponibles = TEMPLATE_CANDIDATES.filter(name =>
        existsSync(path.resolve('assets', name))
    );

    if (disponibles.length === 0) {
        throw new Error(
            'No se encontró ninguna plantilla en assets/.\n' +
            'Asegúrate de tener al menos uno de estos archivos:\n' +
            TEMPLATE_CANDIDATES.map(n => `  → assets/${n}`).join('\n')
        );
    }

    // Selección aleatoria entre las disponibles
    const seleccionada = disponibles[Math.floor(Math.random() * disponibles.length)];
    return { templatePath: path.resolve('assets', seleccionada), templateName: seleccionada };
}

/**
 * Genera una tarjeta de cumpleaños superponiendo un SVG dinámico sobre una imagen base.
 * Elige aleatoriamente entre plantilla_1.jpg, plantilla_2.jpg, plantilla_3.jpg (si existen).
 *
 * @param {string} name - Nombre completo de la persona (ej: "Blanca Quinapallo")
 * @param {number} age  - Edad que cumple
 * @param {string} type - Rol: Estudiante, Profesor, Representante
 * @returns {Promise<Buffer>} Buffer de la imagen generada (JPEG)
 */
export async function generateCard(name, age, type) {
    const { templatePath, templateName } = selectTemplate();

    // Verificar acceso al archivo seleccionado
    await fs.access(templatePath);

    // Dimensiones: deben coincidir con el tamaño de tus plantillas (1080×1080 recomendado)
    const width  = 1080;
    const height = 1080;

    // SVG dinámico superpuesto sobre la imagen base.
    // Ajusta las coordenadas x/y y el font-size según el diseño de tus plantillas.
    const svgOverlay = `
        <svg width="${width}" height="${height}">
            <style>
                .title    { fill: #ffffff; font-size: 80px; font-weight: bold; font-family: sans-serif; }
                .subtitle { fill: #fada5e; font-size: 50px; font-weight: bold; font-family: sans-serif; }
            </style>
            <!-- Línea 1: ¡Feliz Cumpleaños, -->
            <text x="540" y="500" text-anchor="middle" class="title"
                  filter="drop-shadow(3px 3px 2px rgba(0,0,0,0.6))">¡Feliz Cumpleaños,</text>
            <!-- Línea 2: Nombre completo -->
            <text x="540" y="600" text-anchor="middle" class="title"
                  filter="drop-shadow(3px 3px 2px rgba(0,0,0,0.6))">${name}!</text>
            <!-- Línea 3: Edad -->
            <text x="540" y="700" text-anchor="middle" class="subtitle"
                  filter="drop-shadow(2px 2px 2px rgba(0,0,0,0.6))">¡Que disfrutes tus ${age} años!</text>
        </svg>
    `;

    const imageBuffer = await sharp(templatePath)
        .resize(width, height, { fit: 'cover' })  // asegura dimensiones correctas
        .composite([{
            input: Buffer.from(svgOverlay),
            top: 0,
            left: 0,
        }])
        .jpeg({ quality: 90 })
        .toBuffer();

    return imageBuffer;
}

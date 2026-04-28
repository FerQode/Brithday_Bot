//src/index.js
import 'dotenv/config';
import { connectToWhatsApp, disconnectWhatsApp } from './whatsappSender.js';
import { readContacts } from './sheetReader.js';
import { writeLog, markAsSent } from './sheetWriter.js';
import { getConfig } from './configReader.js';
import { generateCard } from './cardGenerator.js';
import pino from 'pino';

const logger = pino({ level: 'info' });

// Retraso aleatorio (3-7 segundos) para evitar bloqueos por spam en WhatsApp
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const getRandomDelay = () => Math.floor(Math.random() * (7000 - 3000 + 1) + 3000);

async function startBot() {
    logger.info('🚀 Iniciando proceso de Birthday Bot...');

    // exitCode controla el proceso.exit() final.
    // Se cambia a 1 en el catch para que GitHub Actions detecte la falla correctamente.
    let exitCode = 0;
    let sock;

    try {
        // 1. Leer configuración desde hoja "Configuracion" del Sheet
        const config = await getConfig();
        if (!config || Object.keys(config).length === 0) {
            throw new Error('La hoja "Configuracion" está vacía o no existe en el Sheet.');
        }

        // 2. Leer hoja "Contactos" y filtrar cumpleañeros de HOY (UTC-5 Ecuador)
        //    sheetReader.js compara Dia_Cumple y Mes_Cumple con la fecha actual.
        //    También filtra contactos con Fecha_Ultimo_Envio === hoy (anti-duplicados).
        const { birthDayContacts, rawContactsLength, skippedAlreadySent } = await readContacts();
        logger.info(`✅ Se revisaron ${rawContactsLength} filas de contactos.`);

        // Informar si se saltaron contactos por ya haber sido atendidos hoy
        if (skippedAlreadySent.length > 0) {
            logger.info(`🔒 ${skippedAlreadySent.length} contacto(s) saltado(s) (ya enviado hoy): ${skippedAlreadySent.join(', ')}`);
        }

        if (birthDayContacts.length === 0) {
            logger.info('🎈 Hoy no hay cumpleañeros pendientes de envío. Finalizando ejecución.');
            return; // exitCode permanece 0 — es un resultado válido, no un error
        }

        logger.info(`🎉 ¡Se encontraron ${birthDayContacts.length} cumpleañero(s) para hoy!`);

        // 3. Conectar a WhatsApp (con reconexión recursiva y timeout de 120s)
        sock = await connectToWhatsApp();

        // Pausa breve para estabilizar la conexión antes de iniciar envíos
        await delay(3000);

        // 4. Procesar cada cumpleañero secuencialmente
        for (const person of birthDayContacts) {
            // targetPhone declarado FUERA del try para que sea accesible en el catch
            let targetPhone = '';

            try {
                // a. Edad y categoría ya calculadas en el Sheet — no usamos ageCalculator.js
                const exactAge = person.Edad_Actual;
                const ageRange = person.Categoria_Edad;

                // b. Rutear: menores de 18 → Representante, adultos → Estudiante
                if (exactAge < 18) {
                    targetPhone = person.Celular_Representante;
                } else {
                    targetPhone = person.Celular_Estudiante;
                }

                // c. Limpiar número para Baileys: quitar +, espacios, guiones
                const cleanPhone = targetPhone ? targetPhone.toString().replace(/\D/g, '') : '';
                if (!cleanPhone) {
                    throw new Error(`Número vacío o inválido para ${person.Nombre} ${person.Apellido}.`);
                }
                const jid = `${cleanPhone}@s.whatsapp.net`;

                // d. Seleccionar plantilla de mensaje según Rol (clave en hoja Configuracion)
                const rolKey = `mensaje_${person.Rol.toLowerCase()}`;
                const msgTemplate = config[rolKey] || config['mensaje_default'] || '¡Feliz cumpleaños {{Nombre}}!';
                const nombreEscuela = config['nombre_escuela'] || 'la institución';
                const nombreCompleto = `${person.Nombre} ${person.Apellido}`;
                const textMessage = msgTemplate
                    .replace(/\{\{Nombre\}\}/g, person.Nombre)
                    .replace(/\{\{NombreCompleto\}\}/g, nombreCompleto)
                    .replace(/\{\{Edad\}\}/g, exactAge)
                    .replace(/\{\{escuela\}\}/g, nombreEscuela)   // doble llave
                    .replace(/\{escuela\}/g, nombreEscuela);       // llave simple

                // e. Generar tarjeta con nombre COMPLETO (Nombre + Apellido)
                const imageBuffer = await generateCard(nombreCompleto, exactAge, person.Rol);

                // f. Enviar imagen + texto por WhatsApp
                logger.info(`✉️  Enviando a ${person.Nombre} ${person.Apellido} → ${targetPhone}...`);
                await sock.sendMessage(jid, {
                    image: imageBuffer,
                    caption: textMessage,
                    mimetype: 'image/jpeg'
                });

                logger.info(`✅ Mensaje enviado a ${person.Nombre} con éxito.`);

                // g. ── ANTI-DUPLICADOS ──────────────────────────────────────────
                // Marcar el contacto como "ya enviado hoy" escribiendo la fecha
                // en la columna Fecha_Ultimo_Envio de la hoja Contactos.
                // Si falla (problema de red, etc.) → logueamos pero NO abortamos.
                // El mensaje ya fue enviado, así que el caso de fallo es:
                //   - En próximas ejecuciones del día se reenviaría (poco probable)
                //   - Historial_Envios tendrá la evidencia del envío exitoso
                try {
                    await markAsSent(person.rowRef);
                    logger.info(`🔒 ${person.Nombre} marcado como enviado en la hoja Contactos.`);
                } catch (markErr) {
                    logger.warn(`⚠️  No se pudo marcar Fecha_Ultimo_Envio para ${person.Nombre}: ${markErr.message}`);
                    logger.warn('   → El mensaje SÍ fue enviado. Riesgo bajo de duplicado en próxima ejecución.');
                }
                // ────────────────────────────────────────────────────────────────

                // h. Registrar envío exitoso en hoja "Historial_Envios"
                try {
                    await writeLog({
                        Nombre_Completo:  `${person.Nombre} ${person.Apellido}`,
                        Telefono_Destino: targetPhone,
                        Tipo_Contacto:    person.Rol,
                        Edad_Cumplida:    exactAge,
                        Rango_Edad:       ageRange,
                        Estado:           'EXITO',
                        Mensaje_Error:    ''
                    });
                } catch (logErr) {
                    logger.warn(`⚠️  No se pudo escribir en Historial_Envios: ${logErr.message}`);
                }

            } catch (err) {
                logger.error(`❌ Error al procesar a ${person.Nombre} ${person.Apellido}: ${err.message}`);

                // Registrar el error en Sheets, sin abortar el loop
                try {
                    await writeLog({
                        Nombre_Completo:  `${person.Nombre} ${person.Apellido}`,
                        Telefono_Destino: targetPhone || 'Desconocido',
                        Tipo_Contacto:    person.Rol || 'Desconocido',
                        Edad_Cumplida:    person.Edad_Actual || 0,
                        Rango_Edad:       person.Categoria_Edad || 'Error',
                        Estado:           'ERROR',
                        Mensaje_Error:    err.message
                    });
                } catch (logErr) {
                    logger.warn(`⚠️  No se pudo registrar el error en Sheets: ${logErr.message}`);
                }
            }

            // i. Delay aleatorio entre mensajes para evitar detección de spam
            const waitTime = getRandomDelay();
            logger.info(`⏳ Esperando ${(waitTime / 1000).toFixed(1)}s antes del siguiente...`);
            await delay(waitTime);
        }

        logger.info('🏁 Todos los mensajes han sido procesados.');

    } catch (error) {
        logger.fatal(`💥 Error crítico en la ejecución del bot: ${error.message}`);
        exitCode = 1; // Señalizar falla a GitHub Actions
    } finally {
        // Desconectar siempre, haya o no error
        if (sock) {
            await disconnectWhatsApp(sock);
        }
        process.exit(exitCode);
    }
}

// Iniciar bot
startBot();

//src/sheetWriter.js
import { GoogleSpreadsheet } from 'google-spreadsheet';
import { JWT } from 'google-auth-library';

const getGoogleAuthClient = () => {
    return new JWT({
        email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
        key: process.env.GOOGLE_PRIVATE_KEY ? process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n') : '',
        scopes: [
            'https://www.googleapis.com/auth/spreadsheets',
        ],
    });
};

const pad = (n) => String(n).padStart(2, '0');

/**
 * Devuelve la fecha y hora actual en Ecuador (UTC-5) con formato YYYY-MM-DD HH:mm:ss.
 * El filtro anti-duplicados en sheetReader compara solo los primeros 10 caracteres
 * (YYYY-MM-DD), por lo que la hora no afecta la detección de duplicados.
 */
function getFechaHoyEcuador() {
    const now = new Date();
    const utcTime = now.getTime() + (now.getTimezoneOffset() * 60000);
    const ecuadorTime = new Date(utcTime - (3600000 * 5)); // UTC-5

    const dia     = pad(ecuadorTime.getDate());
    const mes     = pad(ecuadorTime.getMonth() + 1);
    const anio    = ecuadorTime.getFullYear();
    const hora    = pad(ecuadorTime.getHours());
    const minuto  = pad(ecuadorTime.getMinutes());
    const segundo = pad(ecuadorTime.getSeconds());

    // Formato: 2026-04-28 09:41:05
    return `${anio}-${mes}-${dia} ${hora}:${minuto}:${segundo}`;
}

/**
 * Agrega una fila de registro en la hoja 'Historial_Envios'.
 * @param {Object} logData - Objeto con los datos del envío.
 */
export async function writeLog(logData) {
    const auth = getGoogleAuthClient();
    const doc = new GoogleSpreadsheet(process.env.GOOGLE_SHEET_ID, auth);

    await doc.loadInfo();
    const sheet = doc.sheetsByTitle['Historial_Envios'];

    if (!sheet) {
        throw new Error('La hoja "Historial_Envios" no existe.');
    }

    // Fecha/hora legible en formato Ecuador para la columna Fecha_Envio
    const now = new Date();
    const utcTime = now.getTime() + (now.getTimezoneOffset() * 60000);
    const ecuadorTime = new Date(utcTime - (3600000 * 5)); // UTC-5

    const formattedDate = ecuadorTime.toLocaleString('es-EC', { timeZone: 'UTC' });

    await sheet.addRow({
        Fecha_Envio:      formattedDate,
        Nombre_Completo:  logData.Nombre_Completo,
        Telefono_Destino: logData.Telefono_Destino,
        Tipo_Contacto:    logData.Tipo_Contacto,
        Edad_Cumplida:    logData.Edad_Cumplida,
        Rango_Edad:       logData.Rango_Edad,
        Estado:           logData.Estado,
        Mensaje_Error:    logData.Mensaje_Error || ''
    });
}

/**
 * Marca un contacto como "ya enviado hoy" escribiendo la fecha de Ecuador
 * (formato YYYY-MM-DD) en la columna Fecha_Ultimo_Envio de su fila.
 *
 * Esto es el mecanismo anti-duplicados: si el bot corre 2 veces el mismo día,
 * la segunda ejecución salta a este contacto porque Fecha_Ultimo_Envio === fechaHoy.
 *
 * @param {Object} rowRef - Referencia directa a la fila de Google Sheets
 *                          (el objeto `row` devuelto por sheet.getRows()).
 * @throws {Error} Si la escritura en Sheets falla — el caller debe manejar esto
 *                 con try/catch y NO abortar el flujo principal.
 */
export async function markAsSent(rowRef) {
    const fechaHoy = getFechaHoyEcuador();
    rowRef.set('Fecha_Ultimo_Envio', fechaHoy);
    await rowRef.save();
}

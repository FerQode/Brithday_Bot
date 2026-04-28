//src/sheetReader.js
import { GoogleSpreadsheet } from 'google-spreadsheet';
import { JWT } from 'google-auth-library';

// Inicializar cliente JWT de Google Auth
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
 * Obtiene día, mes y fecha completa en la zona horaria de Ecuador (UTC-5).
 * Devuelve también fechaHoy en formato YYYY-MM-DD para comparar con Fecha_Ultimo_Envio.
 */
function getTodayEcuador() {
    const now = new Date();
    const utcTime = now.getTime() + (now.getTimezoneOffset() * 60000);
    const ecuadorTime = new Date(utcTime - (3600000 * 5)); // UTC-5

    const diaActual = ecuadorTime.getDate();
    const mesActual = ecuadorTime.getMonth() + 1;
    const anioActual = ecuadorTime.getFullYear();

    // Formato YYYY-MM-DD — mismo que usará markAsSent() al escribir
    const fechaHoy = `${anioActual}-${pad(mesActual)}-${pad(diaActual)}`;

    return { diaActual, mesActual, fechaHoy };
}

/**
 * Lee la hoja 'Contactos' y retorna los cumpleañeros de hoy.
 * Filtra contactos donde Fecha_Ultimo_Envio === fechaHoy (ya enviado hoy → saltar).
 * Incluye rowRef en cada contacto para poder actualizar la fila después del envío.
 *
 * Columnas esperadas: ID_Interno, Nombre, Apellido, Celular_Estudiante,
 * Celular_Representante, Fecha_Nacimiento, Rol, Dia_Cumple, Mes_Cumple,
 * Edad_Actual, Categoria_Edad, Fecha_Ultimo_Envio.
 */
export async function readContacts() {
    const auth = getGoogleAuthClient();
    const doc = new GoogleSpreadsheet(process.env.GOOGLE_SHEET_ID, auth);

    await doc.loadInfo();
    const sheet = doc.sheetsByTitle['Contactos'];

    if (!sheet) {
        throw new Error('La hoja "Contactos" no existe en el documento.');
    }

    const rows = await sheet.getRows();
    const birthDayContacts = [];
    const skippedAlreadySent = [];

    const { diaActual, mesActual, fechaHoy } = getTodayEcuador();

    rows.forEach(row => {
        const diaCumple = Number(row.get('Dia_Cumple'));
        const mesCumple = Number(row.get('Mes_Cumple'));

        // Solo procesar si cumple años hoy
        if (diaCumple === diaActual && mesCumple === mesActual) {

            // ── FILTRO ANTI-DUPLICADOS ─────────────────────────────────
            // Fecha_Ultimo_Envio puede ser "YYYY-MM-DD" o "YYYY-MM-DD HH:mm:ss".
            // Comparamos solo los primeros 10 caracteres (la fecha) para que
            // el timestamp con hora no rompa la detección de duplicados.
            const fechaUltimoEnvio = (row.get('Fecha_Ultimo_Envio') || '').trim().substring(0, 10);
            if (fechaUltimoEnvio === fechaHoy) {
                skippedAlreadySent.push(`${row.get('Nombre')} ${row.get('Apellido')}`);
                return; // continuar al siguiente
            }
            // ─────────────────────────────────────────────────────────────

            birthDayContacts.push({
                ID_Interno:            row.get('ID_Interno'),
                Nombre:                row.get('Nombre'),
                Apellido:              row.get('Apellido'),
                Celular_Estudiante:    row.get('Celular_Estudiante'),
                Celular_Representante: row.get('Celular_Representante'),
                Fecha_Nacimiento:      row.get('Fecha_Nacimiento'),
                Rol:                   row.get('Rol') || 'Default',
                Edad_Actual:           Number(row.get('Edad_Actual')) || 0,
                Categoria_Edad:        row.get('Categoria_Edad') || 'Desconocido',
                // rowRef: referencia directa a la fila de Google Sheets.
                // Se usa en markAsSent() para escribir Fecha_Ultimo_Envio.
                rowRef:                row
            });
        }
    });

    return {
        birthDayContacts,
        rawContactsLength: rows.length,
        skippedAlreadySent  // para loguear cuántos se saltaron por ya-enviados
    };
}

//src/configReader.js
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

/**
 * Lee la hoja 'Configuracion' y extrae parámetros clave-valor.
 * Asume que la hoja tiene dos columnas: 'Clave' y 'Valor'.
 */
export async function getConfig() {
    const auth = getGoogleAuthClient();
    const doc = new GoogleSpreadsheet(process.env.GOOGLE_SHEET_ID, auth);
    
    await doc.loadInfo();
    const sheet = doc.sheetsByTitle['Configuracion'];
    
    if (!sheet) {
        throw new Error('La hoja "Configuracion" no existe.');
    }

    const rows = await sheet.getRows();
    const config = {};

    rows.forEach(row => {
        const key = row.get('Clave');
        const value = row.get('Valor');
        if (key && value) {
            config[key.toLowerCase()] = value;
        }
    });

    return config;
}

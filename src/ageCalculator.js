/**
 * Calcula la edad exacta y asigna el rango correspondiente.
 * @param {string} birthDateStr - Fecha en formato 'DD/MM/YYYY'
 * @returns {Object} { exactAge: number, ageRange: string }
 */
export function calculateAgeAndRange(birthDateStr) {
    if (!birthDateStr) {
        return { exactAge: 0, ageRange: 'Desconocido' };
    }

    const [day, month, year] = birthDateStr.split('/').map(Number);
    
    // Obtener la fecha actual ajustada a UTC-5 (Ecuador)
    const now = new Date();
    // getTimezoneOffset retorna la diferencia en minutos (UTC - Local).
    // Sin embargo, para forzar UTC-5 sin importar dónde corra (ej. Github Actions en UTC):
    const utcTime = now.getTime() + (now.getTimezoneOffset() * 60000);
    const ecuadorTime = new Date(utcTime - (3600000 * 5)); // UTC-5
    
    const currentYear = ecuadorTime.getFullYear();
    const currentMonth = ecuadorTime.getMonth() + 1;
    const currentDay = ecuadorTime.getDate();

    let exactAge = currentYear - year;

    // Ajuste si el cumpleaños aún no ha pasado este año (aunque en este caso 
    // se asume que si se ejecuta hoy, es porque hoy es el cumpleaños).
    if (currentMonth < month || (currentMonth === month && currentDay < day)) {
        exactAge--;
    }

    let ageRange = '';
    if (exactAge < 15) {
        ageRange = 'Menor de 15';
    } else if (exactAge >= 15 && exactAge < 18) {
        ageRange = '15-18';
    } else if (exactAge >= 18 && exactAge < 25) {
        ageRange = '18-25';
    } else {
        ageRange = 'Adulto 25+';
    }

    return { exactAge, ageRange };
}

/**
 * Comprueba si hoy (en Ecuador) es el cumpleaños de alguien, dado un string DD/MM/YYYY
 * @param {string} birthDateStr 
 * @returns {boolean}
 */
export function isBirthdayToday(birthDateStr) {
    if (!birthDateStr) return false;

    const [day, month] = birthDateStr.split('/').map(Number);

    const now = new Date();
    const utcTime = now.getTime() + (now.getTimezoneOffset() * 60000);
    const ecuadorTime = new Date(utcTime - (3600000 * 5)); // UTC-5
    
    return (ecuadorTime.getDate() === day && (ecuadorTime.getMonth() + 1) === month);
}

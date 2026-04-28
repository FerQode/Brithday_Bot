# Manual de Google Sheets (Para Marketing)

El archivo de Google Sheets es el "cerebro" del bot. Debe tener **exactamente 3 hojas** con los siguientes nombres (respetando mayúsculas y guiones bajos).

## Hoja 1: "Contactos"
Aquí va la base de datos de los usuarios.

**Columnas requeridas (fila 1):**
- `Nombre`: Ej. Juan
- `Apellido`: Ej. Pérez
- `Telefono_Estudiante`: Ej. 593991234567
- `Telefono_Representante`: Ej. 593981234567
- `Fecha_Nacimiento`: **Estricto: DD/MM/YYYY** (Ej. 25/04/2005)
- `Tipo`: Estudiante, Profesor o Padre
- `Activo`: TRUE o FALSE (Si está en FALSE, no se le enviará nada)

**Reglas para los teléfonos:**
- Deben incluir el código de país (Ej. 593 para Ecuador).
- No uses espacios, guiones ni símbolos `+`. Ej. `593991234567`.

## Hoja 2: "Configuracion"
Parámetros del sistema.

**Columnas requeridas (fila 1):**
- `Clave`
- `Valor`

**Filas:**
- Clave: `mensaje_estudiante` | Valor: `Hola {{Nombre}}, ¡feliz cumpleaños número {{Edad}}! Pásalo increíble.`
- Clave: `mensaje_profesor` | Valor: `Estimado/a {{Nombre}}, le deseamos un excelente cumpleaños número {{Edad}}.`
- Clave: `mensaje_padre` | Valor: `¡Feliz cumpleaños {{Nombre}}! Que este nuevo año esté lleno de bendiciones.`
- Clave: `mensaje_default` | Valor: `¡Feliz cumpleaños {{Nombre}}!`

*Nota: Usa `{{Nombre}}` y `{{Edad}}` para que el bot los reemplace automáticamente.*

## Hoja 3: "Historial_Envios"
Esta hoja se llenará sola. No borres los encabezados.

**Columnas requeridas (fila 1):**
- `Fecha_Envio`
- `Nombre_Completo`
- `Telefono_Destino`
- `Tipo_Contacto`
- `Edad_Cumplida`
- `Rango_Edad`
- `Estado`
- `Mensaje_Error`

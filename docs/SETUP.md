# Guía de Configuración (SETUP)

Sigue estos pasos para poner a funcionar el Birthday Bot desde cero con presupuesto $0.

---

## Paso 1: Google Cloud Console — Crear Service Account

El bot necesita acceder a Google Sheets. Para eso creamos una Cuenta de Servicio (Service Account), que es como un "usuario robot" con sus propias credenciales.

1. Ve a [Google Cloud Console](https://console.cloud.google.com/) e inicia sesión.
2. Crea un **proyecto nuevo** (menú superior → "Seleccionar proyecto" → "Nuevo proyecto"). Nombre sugerido: `birthday-bot`.
3. Con el proyecto seleccionado, ve a la barra de búsqueda superior y busca **"Google Sheets API"**.
4. Haz clic en el resultado y luego en **"Habilitar"**.
5. En el menú lateral izquierdo, ve a **IAM y Administración → Cuentas de Servicio**.
6. Haz clic en **"+ Crear cuenta de servicio"**.
   - Nombre: `birthday-bot-reader` (o el que prefieras)
   - Haz clic en "Crear y continuar" → Omite los pasos opcionales → "Listo".
7. En la lista de cuentas de servicio, haz clic en la que acabas de crear.
8. Ve a la pestaña **"Claves"** → **"Agregar clave"** → **"Crear clave nueva"** → Formato **JSON**.
9. Se descargará automáticamente un archivo `.json`. **Guárdalo en un lugar seguro** — es tu única copia.

### Extraer las credenciales del JSON

Abre el archivo JSON descargado con un editor de texto. Necesitas dos campos:

```json
{
  "client_email": "birthday-bot-reader@tu-proyecto.iam.gserviceaccount.com",
  "private_key": "-----BEGIN PRIVATE KEY-----\nMIIEvgIB...RESTO DE LA LLAVE...\n-----END PRIVATE KEY-----\n"
}
```

- `client_email` → va en `GOOGLE_SERVICE_ACCOUNT_EMAIL` en tu `.env`
- `private_key` → va en `GOOGLE_PRIVATE_KEY` en tu `.env`

> ⚠️ **Importante con `private_key`**: Cópiala tal cual aparece en el JSON, **incluyendo los `\n` literales** y las comillas. No la pegues con saltos de línea reales o el bot fallará con error de autenticación.

---

## Paso 2: Preparar el Google Sheet

1. Crea una nueva Hoja de Cálculo en [Google Sheets](https://sheets.google.com).
2. Copia el **ID** desde la URL:
   ```
   https://docs.google.com/spreadsheets/d/ESTE_ES_EL_ID/edit
   ```
3. Haz clic en **"Compartir"** (arriba a la derecha) → pega el `client_email` del paso anterior → rol **"Editor"** → Enviar.
4. Crea las 3 hojas según la plantilla en [GOOGLE_SHEETS_TEMPLATE.md](GOOGLE_SHEETS_TEMPLATE.md).

---

## Paso 3: Archivo `.env` (entorno local)

Copia el archivo `.env.example` y renómbralo a `.env`:

```bash
# Windows PowerShell
copy .env.example .env
```

Luego edítalo con tus valores reales. Ver `.env.example` para ver qué va en cada campo.

---

## Paso 4: Imagen de plantilla

Coloca tu imagen de diseño en:

```
assets/plantilla.jpg
```

Tamaño recomendado: **1080 × 1080 px** (formato cuadrado, ideal para WhatsApp).

---

## Paso 5: Autenticación de WhatsApp (QR)

Ejecuta el script de setup:

```bash
npm run setup
```

1. Aparecerá un código QR en la terminal.
2. En tu celular, abre WhatsApp → **Configuración → Dispositivos vinculados → Vincular un dispositivo**.
3. Escanea el QR. El script esperará hasta 120 segundos.
4. Una vez conectado, se generará el archivo encriptado `auth_info/auth.enc`.

---

## Paso 6: Prueba la conexión a Google Sheets

```bash
npm run test:sheet
```

Deberías ver un mensaje de éxito indicando cuántas filas se leyeron.

---

## Paso 7: Subir a GitHub

### ✅ SÍ debes subir al repositorio:
- `auth_info/auth.enc` — Archivo **encriptado** y seguro
- `src/` — Todo el código fuente
- `scripts/` — Scripts de utilidad
- `assets/plantilla.jpg` — Imagen de plantilla
- `.github/workflows/birthday-bot.yml` — Workflow de automatización
- `package.json` y `package-lock.json`
- `docs/` — Documentación
- `README.md`

### ❌ NUNCA subas estos archivos:
- `auth_info_baileys/` — Credenciales de WhatsApp en **TEXTO PLANO** (agregado en `.gitignore`)
- `.env` — Contiene tus claves secretas (agregado en `.gitignore`)
- `node_modules/` — Dependencias instalables con `npm install`

---

## Paso 8: Configurar GitHub Secrets

Ve a tu repositorio en GitHub → **Settings → Secrets and variables → Actions → New repository secret**.

Añade los siguientes secretos con exactamente estos nombres:

| Nombre del Secret | Valor |
|---|---|
| `GOOGLE_SERVICE_ACCOUNT_EMAIL` | El `client_email` del JSON |
| `GOOGLE_PRIVATE_KEY` | La `private_key` completa del JSON |
| `GOOGLE_SHEET_ID` | El ID de tu Google Sheet |
| `AUTH_ENCRYPTION_KEY` | La misma clave que usaste en tu `.env` local |

---

## Paso 9: Habilitar permisos de escritura en GitHub Actions

Para que el bot pueda hacer commit del `auth.enc` actualizado tras cada ejecución:

1. Ve a **Settings → Actions → General**.
2. Baja hasta **"Workflow permissions"**.
3. Selecciona **"Read and write permissions"**.
4. Guarda.

---

## ✅ Todo listo

El bot se ejecutará automáticamente todos los días a las **10:30 AM hora de Ecuador**.  
Para forzar una ejecución manual, ve a **Actions → Birthday Bot Cron → Run workflow**.

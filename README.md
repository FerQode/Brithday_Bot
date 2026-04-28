# 🎉 Birthday Bot (WhatsApp Automatizado)

Sistema automatizado de envío de tarjetas de cumpleaños por WhatsApp, diseñado como un micro-SaaS replicable y de bajo costo (Serverless).

## Stack Tecnológico
- **Core**: Node.js 20, ES6 Modules
- **WhatsApp API**: `@whiskeysockets/baileys` (Conexión directa por WebSocket)
- **Generación de Imágenes**: `sharp` (Superposición de SVG dinámico sobre JPG base)
- **Base de Datos**: Google Sheets API v4 (`google-spreadsheet` + JWT auth)
- **Infraestructura**: GitHub Actions (Cronjob Serverless)
- **Dashboard**: Google Looker Studio
- **Seguridad**: Autenticación AES-256 para estado de sesión de WhatsApp.

## 🚀 Setup Rápido

1. Clona el repositorio.
2. Instala las dependencias:
   \`\`\`bash
   npm install
   \`\`\`
3. Crea un archivo \`.env\` en la raíz basándote en la documentación de `docs/SETUP.md`.
4. Añade tu imagen plantilla en `assets/plantilla.jpg` (Tamaño recomendado 1080x1080).
5. Escanea el código QR de WhatsApp para generar la sesión encriptada:
   \`\`\`bash
   npm run setup
   \`\`\`
6. Prueba tu conexión a Google Sheets:
   \`\`\`bash
   npm run test:sheet
   \`\`\`
7. Realiza un commit con tu \`.env\` (solo si es privado, NO LO HAGAS SI ES PÚBLICO) y el directorio \`auth_info/\`.
8. Configura los **GitHub Secrets** en tu repositorio para que el Action corra automáticamente todos los días.

## 📚 Documentación
- [Guía de Configuración Completa](docs/SETUP.md)
- [Arquitectura del Sistema](docs/ARCHITECTURE.md)
- [Plantilla de Google Sheets (Marketing)](docs/GOOGLE_SHEETS_TEMPLATE.md)
- [Configuración del Dashboard Looker Studio](docs/DASHBOARD.md)
- [Solución de Problemas](docs/TROUBLESHOOTING.md)
- [Roadmap de Mejoras](docs/ROADMAP.md)

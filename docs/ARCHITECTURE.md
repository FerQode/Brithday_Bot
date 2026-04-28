# Arquitectura del Sistema

El "Birthday Bot" sigue un enfoque **Serverless / Cron-driven**, diseñado para maximizar el uso del nivel gratuito de la nube (GitHub Actions).

## Diagrama de Flujo
1. **GitHub Actions Trigger**: A las 15:30 UTC (10:30 AM EC), inicia un entorno de Ubuntu.
2. **Setup**: Se inyectan las variables de entorno (Secrets) y se restaura el código.
3. **Desencriptación**: El script `authManager.js` toma el `auth_info/auth.enc`, lo desencripta usando la llave AES-256 (`AUTH_ENCRYPTION_KEY`) y lo extrae en `auth_info_baileys/`.
4. **Ejecución (Node.js)**:
   - `sheetReader.js` se conecta a Google Sheets mediante JWT y busca cumpleañeros que coincidan con la fecha UTC-5 de ejecución.
   - `configReader.js` extrae los mensajes configurables.
   - `whatsappSender.js` se autentica con Baileys.
   - Para cada usuario, `cardGenerator.js` usa `sharp` para crear una imagen en memoria combinando el SVG y `assets/plantilla.jpg`.
   - Se envía la tarjeta + texto.
   - `sheetWriter.js` registra el resultado.
5. **Re-encriptación**: Si Baileys rotó las credenciales, `authManager.js` genera un nuevo `auth.enc`.
6. **Commit**: GitHub Actions hace commit de `auth.enc` al repo para que la sesión sobreviva para el día siguiente.

## Decisiones Técnicas
- **Baileys sobre Puppeteer/Wwebjs**: Baileys usa el protocolo WebSocket nativo de WhatsApp Web. No requiere instalar un navegador completo (Chromium), lo cual lo hace ligero y 100% compatible con contenedores y GitHub Actions.
- **Sharp sobre Jimp**: Sharp es un wrapper de libvips en C++, más de 20 veces más rápido que Jimp. Para generar tarjetas, usamos la composición de SVG como un overlay dinámico, lo que evita depender de librerías lentas de manipulación de Canvas.
- **Autenticación Custom**: Dado que el repositorio es público y Baileys genera llaves privadas para el protocolo de WhatsApp, no podíamos subirlas crudas. Envolver el estado en un archivo AES-256 (`auth.enc`) con un secreto en el CI/CD asegura que el repositorio se mantenga seguro.
- **Looker Studio + Sheets**: Elimina la necesidad de crear un front-end en React/Vue o bases de datos como PostgreSQL/MongoDB.

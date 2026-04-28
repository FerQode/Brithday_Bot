# Troubleshooting (Solución de Problemas)

## 1. El bot no envía mensajes (Error de Conexión / Sesión Inválida)
- **Síntoma**: Los logs de GitHub Actions dicen `Conexión cerrada. Sesión inválida`.
- **Causa**: Escaneaste el código QR en un teléfono distinto, cerraste la sesión desde la app ("Cerrar sesión en dispositivos vinculados"), o el token caducó.
- **Solución**: 
  1. Borra la carpeta local `auth_info/` y `auth_info_baileys/`.
  2. Corre `npm run setup` y vuelve a escanear.
  3. Haz commit y push del nuevo `auth_info/auth.enc`.

## 2. Tarjetas mal generadas (Error con Sharp)
- **Síntoma**: Error indicando `No se encontró la imagen base...`.
- **Causa**: Olvidaste colocar una imagen llamada `plantilla.jpg` en la carpeta `assets/`.
- **Solución**: Asegúrate de que `assets/plantilla.jpg` exista y que no esté ignorada en tu `.gitignore`.

## 3. GitHub Action falla al inicio (Google Auth Error)
- **Síntoma**: `Error: Cannot load Google Credentials`.
- **Causa**: Los GitHub Secrets están mal configurados. 
- **Solución**: Revisa que `GOOGLE_PRIVATE_KEY` incluya todos los `\n` literalmente en el Secret (o copiado tal cual desde el JSON).

## 4. Baneo de cuenta de WhatsApp
- **Síntoma**: Tu número de WhatsApp es suspendido.
- **Prevención**: 
  - Hemos añadido un delay aleatorio de 3 a 7 segundos entre mensajes.
  - No envíes más de 20 mensajes al día desde números nuevos.
  - Asegúrate de que el número que envía los mensajes haya sido guardado en la agenda de contactos de los padres/alumnos (para evitar reportes de spam).

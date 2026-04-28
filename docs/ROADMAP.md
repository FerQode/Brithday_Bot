# Roadmap (Mejoras Futuras)

Este proyecto está diseñado para funcionar en un escenario de bajo volumen (5-10 envíos al día). A medida que la institución educativa crezca, se pueden implementar estas mejoras:

1. **Soporte Multi-Institución (Micro-SaaS Multitenant)**
   - En lugar de leer un solo Sheet, leer un "Master Sheet" que contenga URLs de Sheets para distintos colegios.
   - Enviar desde múltiples sesiones de WhatsApp (manejando varios `auth.enc`).

2. **Reintentos y Cola Asíncrona (Celery/Redis)**
   - Si el número falla, enviar a una cola de reintentos para intentarlo 1 hora después. (Actualmente solo se registra el error).

3. **Mensajes Multilingües**
   - Soporte para enviar mensajes en Inglés o Español dependiendo de un campo de "Idioma" en el Google Sheet.

4. **Integración con Meta Graph API oficial**
   - Una vez que la institución pueda permitirse pagar la API Oficial de WhatsApp Business (aprox $0.01 por mensaje de marketing), migrar de Baileys a la API Oficial para eliminar el riesgo de baneo por completo y usar Plantillas Oficiales Aprobadas.

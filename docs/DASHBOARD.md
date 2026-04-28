# Configuración del Dashboard en Looker Studio

Google Looker Studio (antes Data Studio) te permite crear tableros gerenciales gratuitos que se actualizan solos al leer la hoja `Historial_Envios`.

## Conexión
1. Entra a [Looker Studio](https://lookerstudio.google.com/).
2. Haz clic en **Crear** > **Fuente de Datos**.
3. Selecciona el conector **Google Sheets**.
4. Busca tu documento y selecciona la hoja **Historial_Envios**. Haz clic en Conectar.

## Tipos de Gráficos Recomendados

### 1. Scorecards (Tarjetas de Resultados)
- **Métrica**: Recuento de `Nombre_Completo` (Muestra el total de envíos).
- **Métrica**: Recuento de `Nombre_Completo` filtrado por `Estado = EXITO`.
- **Métrica**: Tasa de Error (%): Calculado como (Errores / Total).

### 2. Gráfico de Pastel (Pie Chart)
- **Dimensión**: `Tipo_Contacto`.
- **Métrica**: Recuento.
- *Propósito*: Ver si enviamos más a Estudiantes, Padres o Profesores.

### 3. Gráfico de Barras
- **Dimensión**: `Rango_Edad`.
- **Métrica**: Recuento.
- *Propósito*: Ver la distribución demográfica de la institución.

### 4. Serie de Tiempo (Líneas)
- **Dimensión**: `Fecha_Envio` (desglosado por mes o semana).
- **Métrica**: Recuento de envíos.
- *Propósito*: Validar estacionalidad (meses con más cumpleaños).

### 5. Tabla de Detalles (Data Table)
- **Dimensiones**: `Fecha_Envio`, `Nombre_Completo`, `Estado`, `Mensaje_Error`.
- *Propósito*: Auditoría rápida si un padre dice que no le llegó el mensaje. Puedes usar controles de filtro arriba de la tabla para buscar por nombre.

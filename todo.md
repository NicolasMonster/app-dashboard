# Meta Ads Dashboard - TODO

## Backend y Base de Datos
- [x] Crear tabla de credenciales de Meta Ads en el esquema de base de datos
- [x] Crear tabla de caché para almacenar datos de la API
- [x] Implementar helpers de base de datos para credenciales y caché
- [x] Crear procedimiento tRPC para guardar credenciales de Meta Ads
- [x] Crear procedimiento tRPC para obtener credenciales del usuario
- [x] Implementar función de integración con Meta Ads API
- [x] Crear procedimiento tRPC para obtener insights de anuncios con filtros de fecha
- [x] Implementar sistema de caché para reducir llamadas a la API
- [x] Crear procedimiento tRPC para obtener métricas principales
- [x] Crear procedimiento tRPC para obtener datos de rankings
- [x] Crear procedimiento tRPC para obtener creativos de anuncios

## Frontend - Configuración y Autenticación
- [x] Configurar tema oscuro profesional para dashboard de análisis
- [x] Crear página de configuración de credenciales de Meta Ads
- [x] Implementar formulario para API Key y Access Token
- [x] Agregar validación y almacenamiento seguro de credenciales

## Frontend - Dashboard Principal
- [x] Crear layout del dashboard con navegación
- [x] Implementar selector de rango de fechas personalizado
- [x] Crear panel de métricas principales (gasto, impresiones, alcance, clics, CTR, CPC, CPM)
- [x] Implementar gráfico de línea temporal para evolución de métricas
- [x] Crear gráfico de barras para comparación entre campañas
- [x] Implementar gráfico de pastel para distribución de gasto

## Frontend - Rankings y Visualización
- [x] Crear tabla de rankings de anuncios por CTR
- [x] Crear tabla de rankings de anuncios por CPC
- [x] Crear tabla de rankings de anuncios por conversiones
- [x] Crear tabla de rankings de anuncios por ROAS
- [x] Implementar visualización de creativos de anuncios
- [x] Agregar previsualizaciones de imágenes y videos

## Testing y Optimización
- [x] Escribir tests unitarios para procedimientos tRPC
- [x] Probar integración con Meta Ads API
- [x] Verificar funcionamiento del sistema de caché
- [x] Optimizar rendimiento de consultas
- [x] Crear checkpoint final

## Mejoras Solicitadas - Fase 2
- [x] Agregar métricas de retención de video (reproducciones, tiempo promedio, tasa de atracción, porcentaje de retención)
- [x] Implementar selector de fecha con calendario interactivo
- [x] Crear modal de detalles de ad en rankings con información completa de creativos
- [x] Incluir URL del video en la visualización de detalles


## Debugging - Métricas de Video
- [x] Revisar respuesta de Meta Ads API para campos de video
- [x] Validar que los campos de video se están solicitando correctamente
- [x] Verificar permisos de API para acceso a métricas de video
- [x] Implementar fallback si Meta Ads API no devuelve datos de video
- [x] Remover campos de video no soportados por Meta Ads API Insights


## Mejoras - Enfoque en Retención de Video
- [x] Agregar campos de retención: video_plays_at_3s, thruplays, avg_watch_time, video_p50_watched_actions, video_p100_watched_actions
- [x] Crear sección visual de métricas de retención en Creatives.tsx
- [x] Implementar gráfico de embudo de retención (3s → 15s → 50% → 100%)
- [ ] Agregar análisis comparativo de retención entre anuncios
- [ ] Crear tabla de calidad de video basada en retención


### Correción - Campos de Video No Válidos
- [x] Remover campos no soportados: video_plays_at_3s, thruplays, avg_watch_time
- [x] Mantener solo campos válidos: video_p50_watched_actions, video_p100_watched_actions
- [x] Actualizar sección de retención para mostrar solo datos disponibles


## Corrección - Gráfico de Evolución Temporal
- [x] Revisar respuesta de Meta Ads API para datos diarios
- [x] Implementar agregación diaria en backend (time_range: DAILY)
- [x] Actualizar Dashboard.tsx para procesar datos diarios correctamente
- [x] Verificar que el gráfico muestre serie temporal completa con múltiples puntos


## Nueva Funcionalidad - Comparación Gasto vs Generado
- [x] Crear sección de ROI y comparación gasto/generado
- [x] Implementar gráfico de comparación gasto vs valor de acciones
- [x] Mostrar métricas clave: Gasto Total, Valor Generado, ROI %
- [x] Agregar desglose por tipo de acción (compras, leads, views, etc)
- [x] Mostrar ROAS (Return on Ad Spend) por período


## Corrección - Filtrado por Fechas en ROI
- [x] Verificar que roiMetrics use solo datos del rango de fechas seleccionado
- [x] Asegurar que startDate y endDate se pasen correctamente al cálculo de ROI
- [x] Actualizar dependencias de useEffect para incluir startDate y endDate
- [x] Validar que ROAS y Valor Generado cambien al modificar las fechas
- [x] Agregar staleTime: 0 a queries de tRPC para forzar refresco de datos


## Corrección - Errores de Formato de Fecha
- [x] Validar formato de fecha que envía el selector HTML5
- [x] Asegurar que las fechas se envíen en formato YYYY-MM-DD a Meta Ads API
- [x] Agregar validación de rango de fecha (máximo 37 meses en el pasado)
- [x] Mostrar mensaje de error si el rango de fecha es inválido


## Debugging - Valores Gasto/Valor/ROAS Incorrectos
- [ ] Analizar cómo se calculan roiMetrics en Dashboard.tsx
- [ ] Verificar que insights contenga solo datos del rango de fechas seleccionado
- [ ] Revisar si el caché del backend está devolviendo datos incorrectos
- [ ] Comparar valores de insights vs metrics para detectar discrepancias
- [ ] Agregar logs para debug de datos recibidos

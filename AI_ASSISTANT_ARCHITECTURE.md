# AI Assistant - Arquitectura y Configuración

## ⚠️ REGLA CRÍTICA (NO NEGOCIABLE)

**La IA NO tiene acceso directo a la API de Meta Ads.**

Esta es una restricción de seguridad fundamental para proteger:
- Credenciales de Meta Ads
- Tokens de acceso
- Account IDs
- Datos sensibles de clientes

## 1️⃣ ARQUITECTURA IMPLEMENTADA

```
┌─────────────────┐
│   Meta Ads API  │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Backend         │ ← Control total de credenciales
│ (Dashboard)     │   y datos de Meta Ads
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Datos Agregados │ ← Métricas procesadas y validadas
│ & Validados     │   (spend, CTR, impressions, etc.)
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Asistente IA    │ ← SOLO lectura de datos procesados
│ (Analista)      │   SIN acceso a API de Meta
└─────────────────┘
```

## 2️⃣ DATOS QUE VE LA IA

El asistente IA **únicamente** tiene acceso a los siguientes datos procesados:

### Contexto enviado desde el frontend:
```typescript
{
  period: string;              // Ejemplo: "2024-01-01 → 2024-01-31"
  spend: number;               // Gasto total agregado
  impressions?: number;        // Total de impresiones
  clicks?: number;             // Total de clics
  ctr?: number;                // CTR promedio calculado
  cpc?: number;                // CPC promedio calculado
  cpm?: number;                // CPM promedio calculado
  reach?: number;              // Alcance total
  topCampaigns?: Array<{       // Top 5 campañas por gasto
    name: string;
    spend: number;
  }>;
  retention?: {                // Métricas de retención de video
    videoPlays?: number;
    p50?: number;
    p100?: number;
  };
}
```

**IMPORTANTE:**
- ✅ La IA recibe **datos ya calculados** por el backend
- ❌ La IA **NO puede consultar** la API de Meta directamente
- ❌ La IA **NO tiene acceso** a tokens, credentials, o account IDs
- ❌ La IA **NO puede ejecutar** fetchs externos a Meta

## 3️⃣ BACKEND - ENDPOINT IMPLEMENTADO

### Archivo: `server/routers.ts`

**Endpoint:** `/api/ai/analyze`

**Tipo:** `protectedProcedure` (requiere autenticación de usuario)

**Input:**
```typescript
{
  context: AIContext;      // Datos ya procesados (ver arriba)
  question: string;        // Pregunta del usuario
  history?: Message[];     // Historial de conversación (opcional)
}
```

**Output:**
```typescript
{
  response: string;        // Respuesta del asistente
  usage?: {                // Estadísticas de uso del LLM
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}
```

**Seguridad:**
- ✅ El endpoint está protegido por autenticación
- ✅ NO tiene acceso a `getMetaAdsCredentials()`
- ✅ NO puede ejecutar `fetchMetaAdsInsights()`
- ✅ Solo procesa datos enviados en el `context` del input

## 4️⃣ PROMPT DEL SISTEMA (OBLIGATORIO)

El asistente usa el siguiente prompt del sistema **siempre**:

```
Sos un analista senior especializado en Meta Ads.
Respondé únicamente usando los datos provistos.
No inventes datos.
No hagas suposiciones externas.
Si la información no alcanza, decilo explícitamente.
Entregá insights accionables y claros.

CONTEXTO DE DATOS ACTUAL:
- Período: [dateRange]
- Gasto Total: $[spend]
- Impresiones: [impressions]
- Clics: [clicks]
- CTR: [ctr]%
- CPC: $[cpc]
- CPM: $[cpm]
- Alcance: [reach]

Top Campañas:
  - [campaign1]: $[spend1]
  - [campaign2]: $[spend2]
  ...

Métricas de Retención:
  - Video Plays: [videoPlays]
  - 50% Vistos: [p50]
  - 100% Vistos: [p100]

Respondé de forma concisa y estructurada. Usa bullets cuando sea apropiado.
```

## 5️⃣ UI / UX IMPLEMENTADA

### Componente: `client/src/components/AIAssistant.tsx`

**Características:**
- Chat flotante en esquina inferior derecha
- Botón de Bot para abrir/cerrar
- Área de mensajes con scroll
- Input con envío por Enter o botón
- Indicador de "Analizando..." mientras procesa
- Footer con mensaje de seguridad: "🔒 La IA solo analiza datos ya procesados · Sin acceso directo a Meta API"

**Integración:**
- El componente se muestra en `Dashboard.tsx`
- Solo aparece cuando hay credenciales configuradas y métricas disponibles
- El contexto se prepara en `Dashboard.tsx` usando `useMemo`

## 6️⃣ CONFIGURACIÓN - API KEY

### Archivo de configuración: `.env`

**Variables requeridas:**

```bash
# AI Assistant - API Key Configuration
BUILT_IN_FORGE_API_URL=https://api.openai.com
BUILT_IN_FORGE_API_KEY=sk-...your-openai-key...
```

### Opciones disponibles:

#### Opción 1: OpenAI (Recomendado)
```bash
BUILT_IN_FORGE_API_URL=https://api.openai.com
BUILT_IN_FORGE_API_KEY=sk-proj-...
```
- Obtener key en: https://platform.openai.com/api-keys
- Modelo usado: `gemini-2.5-flash` (configurable en `server/_core/llm.ts`)

#### Opción 2: Claude (Anthropic)
```bash
BUILT_IN_FORGE_API_URL=https://api.anthropic.com
BUILT_IN_FORGE_API_KEY=sk-ant-...
```
- Obtener key en: https://console.anthropic.com/

#### Opción 3: Forge / Otros compatibles
```bash
BUILT_IN_FORGE_API_URL=https://forge.manus.im
BUILT_IN_FORGE_API_KEY=your-forge-key
```

### ⚠️ IMPORTANTE:
- **NO hardcodear** keys en el código
- **NO commitear** keys al repositorio
- Usar variables de entorno **siempre**
- El archivo `.env` debe estar en `.gitignore`

## 7️⃣ SEGURIDAD - RESUMEN

### ✅ LO QUE LA IA PUEDE HACER:
- Analizar datos ya procesados enviados desde el frontend
- Responder preguntas sobre métricas agregadas
- Dar recomendaciones basadas en los datos provistos
- Mantener contexto de conversación

### ❌ LO QUE LA IA NO PUEDE HACER:
- Acceder a la API de Meta Ads
- Ver tokens o credenciales de usuarios
- Modificar configuración del sistema
- Ejecutar comandos o queries externos
- Acceder a datos de otros usuarios

### 🔒 Medidas de seguridad implementadas:
1. **Separación de responsabilidades:** Backend maneja Meta API, AI solo analiza
2. **Datos procesados:** La IA recibe agregaciones, no datos raw
3. **Autenticación:** El endpoint requiere usuario autenticado
4. **Rate limiting:** Límite de tokens (1000) en respuestas
5. **Sin persistencia de credenciales:** La IA no almacena ni ve tokens

## 8️⃣ PREPARADO PARA MULTI-CLIENTE

La arquitectura actual ya soporta múltiples clientes:

- ✅ Cada usuario tiene sus propias credenciales de Meta Ads (tabla `meta_ads_credentials`)
- ✅ El endpoint AI usa `ctx.user.id` para identificar al usuario
- ✅ Los datos se procesan por usuario usando sus propias credenciales
- ✅ El contexto enviado a la IA es específico del usuario logueado
- ✅ No hay contaminación de datos entre usuarios

## 9️⃣ TESTING

### Verificar instalación:

1. **Backend funcionando:**
```bash
# Verificar que el servidor está corriendo
curl http://localhost:3000/api/health
```

2. **Variables configuradas:**
```bash
# Verificar que las variables están cargadas
echo $BUILT_IN_FORGE_API_KEY
```

3. **Chat funcional:**
- Ir a http://localhost:3000
- Configurar credenciales de Meta Ads en Settings
- Ver Dashboard con métricas cargadas
- Hacer clic en botón flotante de Bot
- Enviar pregunta: "¿Cómo está mi CTR?"
- Verificar respuesta del asistente

### Ejemplos de preguntas para probar:

1. "¿Cómo está mi CTR?"
2. "¿Qué campaña gasta más?"
3. "¿Cuál es mi CPC promedio?"
4. "¿Debería optimizar alguna métrica?"
5. "¿Cómo puedo mejorar mi rendimiento?"

## 🔟 ARCHIVOS MODIFICADOS/CREADOS

### Backend:
- ✅ `server/routers.ts` - Nuevo router `ai` con endpoint `analyze`
- ✅ `.env.example` - Documentación de variables de entorno

### Frontend:
- ✅ `client/src/components/AIAssistant.tsx` - Componente de chat (NUEVO)
- ✅ `client/src/pages/Dashboard.tsx` - Integración del asistente IA
- ✅ `client/src/pages/Dashboard.tsx` - Eliminadas secciones ROAS y Valor Generado

### Documentación:
- ✅ `AI_ASSISTANT_ARCHITECTURE.md` - Este archivo (NUEVO)

## 1️⃣1️⃣ DATOS EXACTOS QUE ANALIZA LA IA

La IA analiza exactamente estos campos del contexto:

| Campo | Tipo | Fuente | Descripción |
|-------|------|--------|-------------|
| `period` | string | `dateRange` | Rango de fechas seleccionado |
| `spend` | number | `metrics.totalSpend` | Gasto total agregado |
| `impressions` | number | `metrics.totalImpressions` | Impresiones totales |
| `clicks` | number | `metrics.totalClicks` | Clics totales |
| `ctr` | number | `metrics.avgCTR` | CTR promedio calculado |
| `cpc` | number | `metrics.avgCPC` | CPC promedio calculado |
| `cpm` | number | `metrics.avgCPM` | CPM promedio calculado |
| `reach` | number | `metrics.totalReach` | Alcance total |
| `topCampaigns` | array | `campaignComparisonData` | Top 5 campañas con name y spend |

**Todos estos datos** ya están procesados por el backend antes de llegar a la IA.

## 1️⃣2️⃣ LIMITACIONES CONOCIDAS

1. **Sin datos históricos extensos:** La IA solo ve el período seleccionado actualmente
2. **Sin acceso a creativos:** No puede analizar imágenes o videos de los anuncios
3. **Sin recomendaciones de targeting:** No tiene acceso a configuración de audiencias
4. **Sin métricas de conversión:** Se eliminaron ROAS y Valor Generado del dashboard
5. **Respuestas limitadas a 1000 tokens:** Para evitar costos excesivos de API

## 1️⃣3️⃣ PRÓXIMOS PASOS (OPCIONAL)

Mejoras futuras que se pueden implementar:

1. **Historial persistente:** Guardar conversaciones en base de datos
2. **Sugerencias automáticas:** Detectar problemas y sugerir preguntas
3. **Exportar conversación:** Permitir descargar el chat en PDF/CSV
4. **Análisis de tendencias:** Comparar períodos automáticamente
5. **Alertas proactivas:** Notificar cuando métricas caen/suben significativamente

---

## 📞 SOPORTE

Si tienes problemas con el asistente IA:

1. Verificar que `BUILT_IN_FORGE_API_KEY` está configurado en `.env`
2. Verificar logs del servidor en la consola
3. Revisar que hay datos de métricas disponibles en el dashboard
4. Verificar que las credenciales de Meta Ads están configuradas

**Error común:** "OPENAI_API_KEY is not configured"
- **Solución:** Agregar `BUILT_IN_FORGE_API_KEY` al archivo `.env`

---

**Última actualización:** 2026-01-22
**Versión:** 1.0.0

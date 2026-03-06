# Sistema de Metricas - Meta Ads Dashboard

Documentacion completa del flujo de datos: como se obtienen de la API, como se filtran, segmentan, calculan y presentan en pantalla. Todo lo necesario para reimplementar el sistema en cualquier otro proyecto.

---

## Tabla de Contenidos

1. [Arquitectura General](#1-arquitectura-general)
2. [Credenciales y Autenticacion](#2-credenciales-y-autenticacion)
3. [Capa de API - Meta Graph API](#3-capa-de-api---meta-graph-api)
4. [Segmentacion de Datos por Nivel](#4-segmentacion-de-datos-por-nivel)
5. [Filtrado por Fechas](#5-filtrado-por-fechas)
6. [Endpoints del Servidor (tRPC)](#6-endpoints-del-servidor-trpc)
7. [Sistema de Cache](#7-sistema-de-cache)
8. [Metricas - Definicion y Calculo](#8-metricas---definicion-y-calculo)
9. [Como Presentar los Datos - Dashboard Principal](#9-como-presentar-los-datos---dashboard-principal)
10. [Rankings - Ordenamiento y Presentacion](#10-rankings---ordenamiento-y-presentacion)
11. [Creativos - Vista y Analisis](#11-creativos---vista-y-analisis)
12. [Metricas de Video - Embudo de Retencion](#12-metricas-de-video---embudo-de-retencion)
13. [Alertas y Umbrales de Rendimiento](#13-alertas-y-umbrales-de-rendimiento)
14. [Asistente AI](#14-asistente-ai)
15. [Base de Datos](#15-base-de-datos)
16. [Variables de Entorno](#16-variables-de-entorno)
17. [Implementar en Otro Proyecto](#17-implementar-en-otro-proyecto)

---

## 1. Arquitectura General

```
Usuario (Navegador)
     |
     | React + TanStack Query (via tRPC)
     v
Frontend (Vite + React + TypeScript)
     |
     | HTTP POST (tRPC over HTTP)
     v
Servidor (Node.js + Express + tRPC)
     |
     | HTTP GET con axios
     v
Meta Graph API v24.0
https://graph.facebook.com/v24.0
```

**Stack tecnologico:**

| Capa | Tecnologia |
|---|---|
| Frontend | React + TypeScript + Vite |
| Routing | Wouter (cliente) |
| Estado del servidor | TanStack Query via tRPC |
| Backend | Node.js + Express + tRPC |
| ORM | Drizzle ORM |
| Base de datos | MySQL (opcional, fallback en memoria) |
| Charts | Recharts |
| Date handling | date-fns |
| HTTP client | Axios |
| API externa | Meta Marketing API v24.0 |

---

## 2. Credenciales y Autenticacion

### Que necesitas de Meta

| Campo | Descripcion | Donde obtenerlo |
|---|---|---|
| `accountId` | ID numerico de la cuenta publicitaria | Administrador de Anuncios Meta → URL contiene `act_XXXXXXXXX` → copiar solo los numeros |
| `accessToken` | Token de acceso | developers.facebook.com → Graph API Explorer → Generate Token |

**Permisos requeridos en el access token:**
- `ads_read` — lectura de datos de anuncios
- `ads_management` — acceso a insights y creativos

### Tipos de Access Token

| Tipo | Duracion | Uso recomendado |
|---|---|---|
| Token de usuario (corto plazo) | ~1 hora | Desarrollo/testing |
| Token de usuario (largo plazo) | ~60 dias | Produccion chica |
| System User Token | No expira | Produccion seria |

Para extender un token a largo plazo: Graph API → `/oauth/access_token?grant_type=fb_exchange_token`

### Flujo de configuracion en el sistema

```
Usuario → /settings
  → Ingresa accountId (sin "act_") y accessToken
  → Frontend llama: trpc.metaAds.saveCredentials.mutate({ accountId, accessToken })
  → Servidor guarda en DB (tabla meta_ads_credentials) por userId
  → A partir de ahi, TODAS las queries del usuario usan esas credenciales automaticamente
  → El accessToken nunca vuelve al frontend — solo se confirma con hasToken: true
```

---

## 3. Capa de API - Meta Graph API

### Archivo: `server/metaAdsApi.ts`

#### 3.1 Funcion Principal: fetchMetaAdsInsights

Esta es la funcion central. Trae todos los datos de rendimiento.

```
GET https://graph.facebook.com/v24.0/act_{accountId}/insights
```

**Parametros de la request:**

| Parametro | Tipo | Descripcion |
|---|---|---|
| `access_token` | string | Token de acceso Meta |
| `level` | string | Nivel de segmentacion (ver seccion 4) |
| `fields` | string | Lista de campos separados por coma |
| `time_range` | JSON string | `{"since":"YYYY-MM-DD","until":"YYYY-MM-DD"}` |
| `date_preset` | string | Alternativa a time_range (ej: `last_30d`) |
| `time_granularity` | string | `daily`, `monthly` o `all_days` |

**Campos que se piden (fields):**

```
account_id, account_name,
campaign_id, campaign_name,
adset_id, adset_name,
ad_id, ad_name,
impressions, reach, frequency,
clicks, unique_clicks,
spend, ctr, cpc, cpm, cpp,
video_play_actions,
video_avg_time_watched_actions,
video_continuous_2_sec_watched_actions,
video_p25_watched_actions,
video_p50_watched_actions,
video_p75_watched_actions,
video_p95_watched_actions,
video_p100_watched_actions,
video_thruplay_watched_actions,
actions,
action_values,
cost_per_action_type
```

**Estructura de respuesta de Meta:**

```json
{
  "data": [
    {
      "ad_id": "123456789",
      "ad_name": "Anuncio verano 2024",
      "adset_id": "987654321",
      "adset_name": "Publico 25-35",
      "campaign_id": "111222333",
      "campaign_name": "Campana verano",
      "account_id": "444555666",
      "account_name": "Mi Empresa",
      "impressions": "15000",
      "reach": "12000",
      "frequency": "1.25",
      "clicks": "375",
      "unique_clicks": "350",
      "spend": "67.50",
      "ctr": "2.50",
      "cpc": "0.18",
      "cpm": "4.50",
      "cpp": "5.62",
      "actions": [
        { "action_type": "link_click", "value": "375" },
        { "action_type": "purchase", "value": "15" },
        { "action_type": "add_to_cart", "value": "42" }
      ],
      "action_values": [
        { "action_type": "purchase", "value": "750.00" },
        { "action_type": "omni_purchase", "value": "750.00" }
      ],
      "video_play_actions": [
        { "action_type": "video_view", "value": "8000" }
      ],
      "video_p50_watched_actions": [
        { "action_type": "video_view", "value": "3200" }
      ],
      "video_p100_watched_actions": [
        { "action_type": "video_view", "value": "1600" }
      ],
      "video_thruplay_watched_actions": [
        { "action_type": "video_view", "value": "2500" }
      ],
      "video_avg_time_watched_actions": [
        { "action_type": "video_view", "value": "18.5" }
      ],
      "date_start": "2024-01-01",
      "date_stop": "2024-01-01"
    }
  ],
  "paging": {
    "cursors": { "before": "xxx", "after": "yyy" }
  }
}
```

> **CRITICO:** Meta devuelve TODOS los numeros como strings (`"2.50"`, no `2.50`). Siempre parsear antes de operar matematicamente.

#### 3.2 Fetch de Campaigns

```
GET https://graph.facebook.com/v24.0/act_{accountId}/campaigns
fields: id, name, status, objective, daily_budget, lifetime_budget
```

#### 3.3 Fetch de Creative (creativo del anuncio)

```
GET https://graph.facebook.com/v24.0/{adId}
fields: creative{id,name,title,body,image_url,video_id,thumbnail_url,object_story_spec}
```

Retorna el contenido visual del anuncio: imagen, video, titulo, texto del anuncio, URL de destino.

---

## 4. Segmentacion de Datos por Nivel

El parametro `level` en la llamada a la API determina como se agrupan los datos.

### Jerarquia de Meta Ads

```
Cuenta (Account)
  └── Campaña (Campaign)
        └── Conjunto de Anuncios (Ad Set)
              └── Anuncio (Ad)
```

### Diferencia entre niveles

| level | Agrupa por | Uso en el sistema |
|---|---|---|
| `account` | Cuenta completa | getMetrics — KPIs generales del dashboard |
| `campaign` | Por campana | Comparacion de campanas, grafico de distribucion |
| `adset` | Por conjunto de anuncios | No se usa actualmente |
| `ad` | Por anuncio individual | Rankings, Creativos, detalle de retención |

### Como afecta la respuesta

Con `level: "account"`, un registro tiene toda la cuenta sumada:
```json
{ "account_name": "Mi Empresa", "spend": "1500.00", "impressions": "450000", ... }
```

Con `level: "campaign"`, un registro por campana:
```json
{ "campaign_name": "Campana A", "spend": "800.00", ... }
{ "campaign_name": "Campana B", "spend": "700.00", ... }
```

Con `level: "ad"`, un registro por anuncio por dia (con `time_granularity: "daily"`):
```json
{ "ad_name": "Anuncio 1", "date_start": "2024-01-01", "spend": "12.50", ... }
{ "ad_name": "Anuncio 1", "date_start": "2024-01-02", "spend": "15.00", ... }
{ "ad_name": "Anuncio 2", "date_start": "2024-01-01", "spend": "8.00", ... }
```

### Cuando usar cada nivel

- **Para KPIs globales:** `level: "account"` — menos registros, mas rapido
- **Para graficos de linea temporal:** `level: "ad"` + `time_granularity: "daily"` — hay que agrupar en frontend
- **Para comparar campanas:** `level: "campaign"` — viene agrupado por Meta
- **Para rankings de anuncios:** `level: "ad"` — datos por anuncio individual

---

## 5. Filtrado por Fechas

### Donde vive el estado de fechas

**Archivo:** `client/src/contexts/DateRangeContext.tsx`

El rango de fechas es un **contexto global de React** que comparten todas las paginas. Cuando el usuario lo cambia en cualquier pantalla, todas las queries se actualizan automaticamente.

```typescript
interface DateRange {
  since: string   // formato: "YYYY-MM-DD"
  until: string   // formato: "YYYY-MM-DD"
}
```

### Inicializacion

1. Busca en `localStorage` la clave `metaAdsDashboard_dateRange`
2. Si no existe, default: **ultimos 30 dias** (hasta ayer)

### Validaciones del rango

| Validacion | Error mostrado |
|---|---|
| Alguna fecha invalida | "Fechas invalidas" |
| `since` > `until` | "La fecha inicial no puede ser posterior a la fecha final" |
| `until` en el futuro | "La fecha final no puede ser futura" |
| Rango > 90 dias | "El rango no puede exceder 90 dias" |

Si la validacion falla, el rango NO se actualiza y se muestra el error en el Dashboard.

### Persistencia

Cada vez que el usuario selecciona un rango valido, se guarda en `localStorage`:
```javascript
localStorage.setItem("metaAdsDashboard_dateRange", JSON.stringify(range))
```

### Componentes de seleccion de fechas

**DateRangePicker** (`components/DateRangePicker.tsx`):
- Abre un popover con calendario doble (dos meses visibles)
- El usuario selecciona `from` y `to` haciendo click
- Al seleccionar ambos, cierra automaticamente y dispara las queries
- Muestra fecha en formato `dd MMM yyyy` en espanol (ej: "01 ene 2024 - 31 ene 2024")

**DatePresets** (`components/DatePresets.tsx`):
- Dropdown con opciones rapidas
- Opciones: Ultimos 7 dias, 30 dias, 90 dias, Mes pasado, Año en curso
- Todos los presets terminan en "ayer" (no incluyen hoy, porque los datos de hoy son parciales)
- Guarda el ultimo preset usado en `localStorage` con clave `lastDatePreset`

```typescript
// Como calcula cada preset (hasta "ayer"):
const until = hoy - 1 dia

"7d":        since = until - 6 dias
"30d":       since = until - 29 dias
"90d":       since = until - 89 dias
"lastMonth": since = 1ro del mes anterior, until = ultimo dia del mes anterior
"ytd":       since = 1ro de enero del año actual
```

### Como el filtro de fecha llega a Meta API

```
Usuario cambia fecha en DateRangePicker
  → setDateRange({ since, until }) [DateRangeContext]
  → React re-renderiza componentes que usan useDateRange()
  → TanStack Query detecta que cambiaron las keys de las queries
  → Dispara nuevas requests al servidor
  → Servidor llama a Meta API con el nuevo time_range
  → Datos nuevos se muestran en pantalla
```

La clave del cache cambia con cada combinacion de fechas, por lo que no hay conflictos entre rangos distintos.

---

## 6. Endpoints del Servidor (tRPC)

Todos los endpoints estan en `server/routers.ts` bajo el namespace `metaAds`.

### 6.1 `metaAds.getCredentials` — Query

```typescript
// Retorna:
{ accountId: string, hasToken: true }  // si tiene credenciales
null                                    // si no tiene
```

Todas las demas queries tienen `enabled: !!credentials` — es decir, no se ejecutan si no hay credenciales configuradas.

### 6.2 `metaAds.saveCredentials` — Mutation

```typescript
input: { accountId: string, accessToken: string }
// Guarda en DB por userId. Requiere sesion autenticada.
```

### 6.3 `metaAds.deleteCredentials` — Mutation

Elimina credenciales del usuario. No tiene input.

### 6.4 `metaAds.getInsights` — Query

Datos crudos de rendimiento. Es la query mas usada.

```typescript
input: {
  datePreset?: string            // alternativa a timeRange
  timeRange?: {
    since: string                // "YYYY-MM-DD"
    until: string                // "YYYY-MM-DD"
  }
  level: "account" | "campaign" | "adset" | "ad"  // default: "ad"
}
// Retorna: MetaAdsInsight[]
// Cache: 30 minutos
// Nota: cuando se usa timeRange, agrega time_granularity: "daily" automaticamente
```

**Clave de cache:**
```
insights_{level}_{datePreset}_{JSON.stringify(timeRange)}
```

### 6.5 `metaAds.getMetrics` — Query

Metricas agregadas a nivel de cuenta. Hace la llamada con `level: "account"`.

```typescript
input: { datePreset?, timeRange? }
// Retorna:
{
  totalSpend: number,
  totalImpressions: number,
  totalReach: number,
  totalClicks: number,
  avgCTR: number,   // promedio aritmetico simple (NO ponderado por impresiones)
  avgCPC: number,   // promedio aritmetico simple
  avgCPM: number,   // promedio aritmetico simple
}
```

Como se calculan los promedios (en el servidor):
```typescript
// Se suman todos los valores de los registros y se dividen por la cantidad
avgCTR = (sum de todos los CTR) / cantidad de registros
// OJO: esto es promedio simple, no ponderado. Para una vista mas precisa,
// calcular CTR real = totalClicks / totalImpressions * 100
```

### 6.6 `metaAds.getRankings` — Query

Top N anuncios ordenados.

```typescript
input: {
  datePreset?: string
  timeRange?: { since, until }
  sortBy: "ctr" | "cpc" | "conversions" | "roas"
  limit: number  // default: 10
}
// Internamente llama fetchMetaAdsInsights con level: "ad"
// Enriquece cada insight con: { roas, conversions }
// Ordena y retorna los primeros `limit` elementos
```

**Logica de ordenamiento:**
```typescript
"ctr":         sort descendente por parseFloat(ctr)
"cpc":         sort ascendente por parseFloat(cpc)  ← menor CPC es mejor
"conversions": sort descendente por conversions (calculado)
"roas":        sort descendente por roas (calculado)
```

### 6.7 `metaAds.getAdCreative` — Query

```typescript
input: { adId: string }
// Retorna: MetaAdsCreative | null
// Cache: 1440 minutos (24 horas)
// Los creativos casi no cambian, por eso el cache mas largo
```

---

## 7. Sistema de Cache

### Por que existe

Meta API tiene rate limits. Sin cache, un dashboard con multiples graficos y tabs agotaria el limite en minutos.

### Mecanismo

```
Request llega al servidor
  → Construye cacheKey: string unico basado en tipo + parametros
  → Busca en storage: SELECT * FROM meta_ads_cache WHERE userId=? AND cacheKey=? AND expiresAt > NOW()
  → Si hay hit: retorna datos cacheados (JSON.parse del campo data)
  → Si miss: llama Meta API → guarda resultado → retorna datos frescos
```

### TTL (tiempo de vida)

| Tipo de dato | TTL |
|---|---|
| Insights / Metrics / Rankings | 30 minutos |
| Creativos de anuncios | 24 horas |

### Storage del cache

**Con base de datos:**
- Tabla `meta_ads_cache` en MySQL
- Clave unica: `(userId, cacheKey)`
- `data` almacena el JSON serializado de la respuesta

**Sin base de datos (fallback en memoria):**
- `Map<string, { data: string, expiresAt: Date }>`
- Clave: `${userId}:${cacheKey}`
- Se pierde al reiniciar el servidor

### Invalidacion del cache

El sistema no invalida el cache manualmente. Simplemente expira por TTL. Si cambias credenciales, el cache de las credenciales anteriores queda pero nunca se usa (porque el accountId es diferente).

> Para forzar datos frescos en desarrollo: reiniciar el servidor (limpia el cache en memoria) o borrar manualmente la tabla `meta_ads_cache`.

---

## 8. Metricas - Definicion y Calculo

### Metricas que vienen directas de Meta (como strings)

| Campo API | Nombre | Formato | Descripcion |
|---|---|---|---|
| `spend` | Gasto | `"12.50"` | Dinero gastado en USD |
| `impressions` | Impresiones | `"10000"` | Veces que se mostro el anuncio |
| `reach` | Alcance | `"8500"` | Personas unicas que lo vieron |
| `frequency` | Frecuencia | `"1.25"` | Impresiones / Reach (promedio de veces visto) |
| `clicks` | Clics | `"250"` | Clics totales en el anuncio |
| `unique_clicks` | Clics unicos | `"230"` | Personas unicas que hicieron clic |
| `ctr` | CTR | `"2.50"` | Click-Through Rate en % (clicks/impressions*100) |
| `cpc` | CPC | `"0.18"` | Costo Por Clic en USD (spend/clicks) |
| `cpm` | CPM | `"4.50"` | Costo Por Mil Impresiones en USD (spend/impressions*1000) |
| `cpp` | CPP | `"5.62"` | Costo Por Persona alcanzada en USD (spend/reach*1000) |
| `date_start` | Inicio | `"2024-01-01"` | Inicio del periodo del registro |
| `date_stop` | Fin | `"2024-01-01"` | Fin del periodo del registro |

### Metricas que requieren extraccion del array `actions`

Los `actions` son eventos que ocurrieron como resultado del anuncio:

```typescript
// Conversion (compra)
const conversion = insight.actions?.find(a =>
  a.action_type === "purchase" ||
  a.action_type === "omni_purchase" ||
  a.action_type === "offsite_conversion.fb_pixel_purchase"
)
const conversions = conversion ? parseFloat(conversion.value) : 0
```

**Tipos de action_type comunes:**
- `link_click` — clics en el enlace del anuncio
- `purchase` — compras (requiere Meta Pixel)
- `omni_purchase` — compras en todos los canales
- `add_to_cart` — agregar al carrito
- `lead` — formularios completados
- `view_content` — vistas de pagina de producto
- `initiate_checkout` — inicio de checkout

### Metricas que requieren extraccion del array `action_values`

Los `action_values` son los valores monetarios asociados a cada evento:

```typescript
// Revenue de compras
const purchaseValue = insight.action_values?.find(av =>
  av.action_type === "purchase" ||
  av.action_type === "omni_purchase"
)
const revenue = purchaseValue ? parseFloat(purchaseValue.value) : 0
```

### ROAS (Return on Ad Spend) — calculado

```typescript
// Funcion: calculateROAS(insight)
const spend = parseFloat(insight.spend || "0")
const revenue = getRevenueFromActionValues(insight)

ROAS = revenue / spend
// Ejemplo: gaste $100, genere $350 en ventas → ROAS = 3.5x
```

**Interpretacion del ROAS:**
- `< 1x`: Perdida neta
- `1x - 2x`: Marginal (depende del margen del producto)
- `2x - 3x`: Aceptable
- `> 3x`: Bueno
- `> 5x`: Excelente

### Metricas de comparacion periodo anterior — calculadas en frontend

```typescript
// En Dashboard.tsx
// 1. Calcular el rango del periodo anterior (misma cantidad de dias)
const diffDays = Math.ceil((untilDate - sinceDate) / (1000*60*60*24))
const prevUntil = sinceDate - 1 dia
const prevSince = prevUntil - diffDays dias

// 2. Hacer segunda query con ese rango
// 3. Calcular variacion
const change = ((current - previous) / previous) * 100
// Resultado: "+12.5%" o "-8.3%"
```

---

## 9. Como Presentar los Datos - Dashboard Principal

**Pagina:** `/` → `client/src/pages/Dashboard.tsx`

### Queries que se ejecutan en paralelo

```typescript
// 1. Metricas globales (KPIs)
trpc.metaAds.getMetrics.useQuery({ timeRange })

// 2. Insights a nivel de anuncio (para graficos temporales y ROAS)
trpc.metaAds.getInsights.useQuery({ timeRange, level: "ad" })

// 3. Insights a nivel de campaña (para comparacion de campanas)
trpc.metaAds.getInsights.useQuery({ timeRange, level: "campaign" })

// 4. Insights del periodo anterior (para mostrar % de cambio)
trpc.metaAds.getInsights.useQuery({ timeRange: previousPeriod, level: "ad" })
```

### KPIs - Tarjetas de metricas globales

Se muestran en una grilla `4 columnas (desktop) / 2 columnas (tablet) / 1 columna (mobile)`.

| KPI | Fuente | Formato display |
|---|---|---|
| Gasto Total | `metrics.totalSpend` | `$1,234.56` + % vs periodo anterior |
| Impresiones | `metrics.totalImpressions` | `450,000` |
| Clics | `metrics.totalClicks` | `11,250` |
| CTR Promedio | `metrics.avgCTR` | `2.50%` + alerta si < 1.5% |
| Alcance | `metrics.totalReach` | `380,000` |
| CPC Promedio | `metrics.avgCPC` | `$0.18` + alerta si > $2.00 |
| CPM Promedio | `metrics.avgCPM` | `$4.50` |
| ROAS | calculado en frontend | `3.50x` + alerta/positivo segun rango |
| Valor Generado | calculado en frontend | `$4,375.00` o `—` si no hay pixel |

**Regla del % de cambio en Gasto Total:**
```typescript
// Solo se muestra si existe previousMetrics.totalSpend > 0
// Flecha ArrowUp → cambio positivo (gasto mayor)
// Flecha ArrowDown → cambio negativo (gasto menor)
// Neutral si no hay datos del periodo anterior
```

### Preparacion de datos para graficos temporales

Los insights vienen como registros individuales por anuncio por dia. Hay que agruparlos por fecha:

```typescript
// En Dashboard.tsx — useMemo
const timelineData = useMemo(() => {
  const dataByDate = new Map<string, {...}>()

  insights.forEach(insight => {
    const date = insight.date_start || "Unknown"
    const existing = dataByDate.get(date) || { date, spend: 0, impressions: 0, clicks: 0 }

    existing.spend += parseFloat(insight.spend || "0")
    existing.impressions += parseInt(insight.impressions || "0")
    existing.clicks += parseInt(insight.clicks || "0")

    dataByDate.set(date, existing)
  })

  // Ordenar cronologicamente
  return Array.from(dataByDate.values()).sort((a, b) => a.date.localeCompare(b.date))
}, [insights])
```

### Preparacion de datos ROAS por dia

```typescript
const roasTimelineData = useMemo(() => {
  const dataByDate = new Map()

  insights.forEach(insight => {
    const date = insight.date_start
    const existing = dataByDate.get(date) || { date, spend: 0, revenue: 0 }

    existing.spend += parseFloat(insight.spend || "0")

    // Extraer revenue de action_values
    const purchase = insight.action_values?.find(av =>
      av.action_type === "purchase" || av.action_type === "omni_purchase"
    )
    if (purchase) existing.revenue += parseFloat(purchase.value || "0")

    dataByDate.set(date, existing)
  })

  return Array.from(dataByDate.values())
    .sort((a, b) => a.date.localeCompare(b.date))
    .map(d => ({
      date: d.date,
      roas: d.spend > 0 ? parseFloat((d.revenue / d.spend).toFixed(2)) : 0,
      spend: parseFloat(d.spend.toFixed(2)),
      revenue: parseFloat(d.revenue.toFixed(2)),
    }))
}, [insights])
```

### Graficos del Dashboard

#### Grafico 1: ROAS en el Tiempo
- **Tipo:** LineChart (Recharts)
- **Datos:** `roasTimelineData`
- **Eje X:** `date` (fecha string "YYYY-MM-DD")
- **Eje Y:** valor de ROAS (number, 2 decimales)
- **Linea:** color `#10b981` (verde)
- **Tooltip:** muestra `${value.toFixed(2)}x`
- **Empty state:** si no hay datos de ROAS, muestra mensaje + nota sobre Meta Pixel

#### Grafico 2: Ventas vs Inversion
- **Tipo:** BarChart (Recharts)
- **Datos:** `roasTimelineData` (mismos datos, distintos campos)
- **Eje X:** `date`
- **Barras:**
  - Inversion (`spend`): color `#3b82f6` (azul)
  - Ventas (`revenue`): color `#10b981` (verde)
- **Tooltip:** muestra `$${value.toFixed(2)}`

#### Grafico 3: Comparacion de Campanas
- **Tipo:** BarChart horizontal
- **Datos:** `campaignComparisonData` — top 5 campanas por gasto
- **Preparacion:**
  ```typescript
  campaignInsights.slice(0, 5).map(campaign => ({
    name: campaign.campaign_name || "Unknown",
    spend: parseFloat(campaign.spend || "0"),
    impressions: parseInt(campaign.impressions || "0"),
    clicks: parseInt(campaign.clicks || "0"),
  }))
  ```
- **Barra:** `spend` en color `#3b82f6`

#### Grafico 4: Distribucion del Gasto (Pie)
- **Tipo:** PieChart
- **Datos:** `spendDistributionData` — top 5 campanas
- **Preparacion:**
  ```typescript
  campaignInsights.slice(0, 5).map(c => ({
    name: c.campaign_name,
    value: parseFloat(c.spend || "0"),
  }))
  ```
- **Colores:** paleta fija `["#3b82f6", "#8b5cf6", "#ec4899", "#f59e0b", "#10b981"]`
- **Label:** `${nombre}: $${valor}`

---

## 10. Rankings - Ordenamiento y Presentacion

**Pagina:** `/rankings` → `client/src/pages/Rankings.tsx`

### Tabs disponibles

| Tab | Query | Criterio de ordenamiento |
|---|---|---|
| Mejor CTR | `getRankings` sortBy=`ctr` | Mayor CTR primero |
| Menor CPC | `getRankings` sortBy=`cpc` | Menor CPC primero (mas eficiente) |
| Mas Conversiones | `getRankings` sortBy=`conversions` | Mas compras primero |
| Mejor ROAS | `getRankings` sortBy=`roas` | Mayor ROAS primero |
| Mejor Retencion | `getInsights` level=`ad` | Calculado en frontend (ver seccion 12) |

### Enriquecimiento de datos en el servidor (para getRankings)

```typescript
const enrichedInsights = insights.map(insight => ({
  ...insight,
  roas: calculateROAS(insight),           // revenue / spend
  conversions: getConversionCount(insight) // count de purchases
}))
```

### Columnas de la tabla segun tab activo

**Columnas comunes (siempre visibles):**
- `#` — posicion en el ranking
- Nombre del Anuncio
- Campaña
- Impresiones

**Columnas para CTR, CPC, Conversiones, ROAS:**
- Clics
- CTR — con icono TrendingUp (verde si > 2%, amarillo si no)
- CPC
- Gasto

**Columnas adicionales por tab:**
- `conversions`: columna "Conversiones" (numero entero)
- `roas`: columna "ROAS" (formato `3.50x`)

**Columnas para tab Retencion:**
- Vistas 3s (`videoPlays`)
- Retencion 50% (cantidad + porcentaje)
- Retencion 100% (cantidad + porcentaje)
- % Mejor Retencion (maximo entre p50% y p100%)

### Modal de detalle de anuncio

Al hacer clic en el ojo de cualquier fila, se abre un Dialog con:

1. **Informacion Basica:**
   - ID del Anuncio (monospace)
   - Nombre de la Campaña
   - Nombre del Ad Set
   - Nombre de la Cuenta

2. **Metricas de Rendimiento** (grilla 2 columnas):
   - Gasto, Impresiones, Clics, CTR, CPC, CPM, Alcance, Frecuencia

3. **Vista del Creativo** (si carga bien):
   - Thumbnail del video (si es video)
   - Imagen (si es imagen)
   - Titulo y texto del anuncio
   - URL de destino
   - Video ID (si aplica)

4. **Periodo:** `date_start` a `date_stop`

---

## 11. Creativos - Vista y Analisis

**Pagina:** `/creatives` → `client/src/pages/Creatives.tsx`

### Flujo de la pagina

```
1. Carga todos los insights (level: "ad") con el rango de fechas actual
2. Muestra lista de anuncios en panel izquierdo
3. Al seleccionar un anuncio → llama getAdCreative(adId)
4. Muestra el creativo en panel derecho
5. Opcional: boton "Analisis IA" → llama ai.analyzeCreative
```

### Filtro de busqueda (cliente)

El filtrado es puramente en frontend, sobre los datos ya cargados:

```typescript
const filteredAds = insights?.filter(ad => {
  if (!searchQuery) return true
  const query = searchQuery.toLowerCase()
  return (
    ad.ad_name?.toLowerCase().includes(query) ||      // por nombre
    ad.campaign_name?.toLowerCase().includes(query) || // por campaña
    ad.ad_id?.includes(query)                          // por ID exacto
  )
})
```

No hay request adicional al servidor al buscar — es filtraje local sobre los datos ya cargados.

### Presentacion de cada anuncio en la lista

```
[Nombre del anuncio en negrita]
Campaña: [nombre campaña]
ID: [ad_id en monospace]
Impresiones: X,XXX   Clics: XXX   CTR: X.XX%
                              [Boton: Análisis IA]
```

### Panel de creativo

Muestra estos elementos si existen:
- `creative.name` → nombre interno del creativo
- `creative.title` → titulo del anuncio
- `creative.body` → texto del anuncio
- `creative.image_url` → imagen con `loading="lazy"`
- `creative.thumbnail_url` → miniatura de video (clickeable para ver video)
- `creative.object_story_spec.link_data.message` → texto del post
- `creative.object_story_spec.link_data.link` → URL de destino

### Reproduccion de video

Al hacer clic en la miniatura, abre modal de video:

```
Si URL incluye "facebook.com" o "fb.com":
  → No se puede reproducir directamente (restriccion de Meta)
  → Muestra thumbnail + boton "Ver Video en Facebook" (abre en nueva pestaña)

Si URL comienza con "http" (video externo):
  → Tag <video> con controls y poster (thumbnail)

Si solo hay video_id (sin URL):
  → Muestra thumbnail + mensaje "Encontrar en Administrador de Anuncios"
```

---

## 12. Metricas de Video - Embudo de Retencion

### Como extraer las metricas de video

```typescript
function getVideoRetentionMetrics(ad: any) {
  // Vistas de al menos 3 segundos (hook / scroll-stop)
  const videoPlays = ad.video_play_actions?.[0]?.value
    ? parseInt(ad.video_play_actions[0].value, 10) : 0

  // ThruPlays: vistas de al menos 15 segundos (o el video completo si < 15s)
  const thruplays = ad.video_thruplay_watched_actions?.[0]?.value
    ? parseInt(ad.video_thruplay_watched_actions[0].value, 10) : 0

  // Tiempo promedio visto en segundos
  const avgTimeWatched = ad.video_avg_time_watched_actions?.[0]?.value
    ? parseFloat(ad.video_avg_time_watched_actions[0].value) : 0

  // Retención del 50%: personas que vieron al menos la mitad
  const p50 = ad.video_p50_watched_actions?.[0]?.value
    ? parseInt(ad.video_p50_watched_actions[0].value, 10) : 0

  // Retención del 100%: personas que vieron el video completo
  const p100 = ad.video_p100_watched_actions?.[0]?.value
    ? parseInt(ad.video_p100_watched_actions[0].value, 10) : 0

  return { videoPlays, thruplays, avgTimeWatched, p50, p100 }
}
```

### Calculo de porcentajes de retencion

```typescript
// Base: video_play_actions (vistas de 3s)
const baseViews = videoPlays || 1  // evitar division por cero

const p50Percentage = (p50 / baseViews) * 100      // % que vio 50%
const p100Percentage = (p100 / baseViews) * 100    // % que vio completo
const thruPlaysPercentage = (thruplays / baseViews) * 100
```

### Embudo de retencion (funnel)

Se presenta como barra de progreso visual para cada etapa:

```
Impresiones (alcance inicial)          450,000   [████████████████] 100%
Vistas 3s (hook / scroll-stop)          80,000   [██████████      ] 17.8%
ThruPlays ≥15s (interes real)           32,000   [████            ] 40.0%
Retencion 50% (valor real)              25,000   [███             ] 31.3%
Retencion 100% (finalizacion)           12,000   [█               ] 15.0%
```

**Colores de las barras:**
- Vistas 3s: color primario
- ThruPlays: `#8b5cf6` (morado)
- Retencion 50%: `#3b82f6` (azul)
- Retencion 100%: `#10b981` (verde)

**Tiempo promedio visto (formato):**
```typescript
const formatTime = (seconds: number) => {
  if (seconds < 60) return `${seconds.toFixed(1)}s`
  const mins = Math.floor(seconds / 60)
  const secs = Math.round(seconds % 60)
  return `${mins}m ${secs}s`
}
```

### Grafico de embudo (BarChart)

Se renderiza un BarChart con Recharts mostrando el embudo:
```typescript
data = [
  { name: "Vistas 3s", value: videoPlays },
  { name: "ThruPlays", value: thruplays },
  { name: "50%", value: p50 },
  { name: "100%", value: p100 },
]
// Color de barra: "#3b82f6"
```

### Ranking de Mejor Retencion (en Rankings.tsx)

```typescript
// Calcula para cada anuncio con datos de video:
const p50Percentage = (p50 / videoPlays) * 100
const p100Percentage = (p100 / videoPlays) * 100
const bestRetention = Math.max(p50Percentage, p100Percentage)

// Filtra: solo anuncios con videoPlays > 0
// Ordena: descendente por bestRetention
// Limita: top 20
```

---

## 13. Alertas y Umbrales de Rendimiento

El sistema muestra alertas visuales cuando las metricas estan fuera de rango esperado. Estos son los umbrales hardcodeados:

### Alertas en KPIs del Dashboard

| Metrica | Condicion de alerta | Visual |
|---|---|---|
| CTR < 1.5% | Rendimiento bajo | Badge naranja "Bajo" + borde naranja en la card |
| CPC > $2.00 | Costo elevado | Badge naranja "Alto" + borde naranja en la card |
| ROAS < 2x (con datos) | Retorno bajo | Badge naranja "Bajo" + borde naranja |
| ROAS >= 3x | Buen retorno | Badge verde "Bueno" + borde verde |

### Alertas en metricas de video (Creativos)

| Metrica | Condicion de alerta | Visual |
|---|---|---|
| Retencion 50% < 20% | Hook debil | Badge naranja "⚠️ Bajo" + borde naranja en bloque |
| Retencion 100% < 10% | Contenido no retiene | Badge naranja "⚠️ Bajo" + borde naranja en bloque |

### Alerta de rango de fechas invalido

Si las fechas son invalidas, se muestra una card roja encima del selector de fechas con el mensaje de error. Las queries se desactivan (`enabled: !dateError`).

### CTR en tabla de Rankings

En la columna CTR de la tabla de Rankings:
- CTR > 2% → icono `TrendingUp` verde
- CTR <= 2% → icono `TrendingDown` amarillo

---

## 14. Asistente AI

El AI no tiene acceso directo a Meta API. Recibe datos ya procesados del frontend.

### Asistente conversacional (`ai.analyze`)

Disponible como boton flotante en el Dashboard (abajo a la derecha).

**Datos que recibe:**
```typescript
context: {
  period: "2024-01-01 → 2024-01-31",
  spend: 1234.56,
  impressions: 450000,
  clicks: 11250,
  ctr: 2.5,
  cpc: 0.18,
  cpm: 4.5,
  reach: 380000,
  topCampaigns: [
    { name: "Campana A", spend: 800.00 },
    { name: "Campana B", spend: 434.56 }
  ],
  retention: {           // opcional, solo si hay datos de video
    videoPlays: 80000,
    p50: 25000,
    p100: 12000
  }
}
question: "string con la pregunta del usuario"
history: [              // historial de la conversacion
  { role: "user", content: "..." },
  { role: "assistant", content: "..." }
]
```

**Responde:** texto libre, en espanol, con insights accionables.
**Contexto del sistema:** "Sos un analista senior especializado en Meta Ads. Responde unicamente usando los datos provistos."
**Max tokens:** 1000

### Analisis estructurado de creativo (`ai.analyzeCreative`)

Disponible en Creativos y Rankings.

**Datos que recibe:** metricas del anuncio especifico + metricas de video si aplica.

**Retorna texto con tres secciones:**
```
## DIAGNOSTICO
[Evaluacion objetiva]

## RECOMENDACIONES
[Lista concreta de acciones]

## PROYECCIONES
[Estimaciones de mejora esperada]
```

**Max tokens:** 900

### Configuracion del LLM

Soporta cualquier API compatible con OpenAI:
- OpenAI: `BUILT_IN_FORGE_API_URL=https://api.openai.com`
- Claude/Anthropic: `BUILT_IN_FORGE_API_URL=https://api.anthropic.com`
- Otros: cualquier endpoint OpenAI-compatible

---

## 15. Base de Datos

### Tablas

#### `users`
```sql
id            INT AUTO_INCREMENT PRIMARY KEY
openId        VARCHAR(64) UNIQUE NOT NULL
name          TEXT NULL
email         VARCHAR(320) NULL
loginMethod   VARCHAR(64) NULL
role          ENUM('user','admin') DEFAULT 'user'
createdAt     TIMESTAMP DEFAULT CURRENT_TIMESTAMP
updatedAt     TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
lastSignedIn  TIMESTAMP NULL
```

#### `meta_ads_credentials`
```sql
id            INT AUTO_INCREMENT PRIMARY KEY
user_id       INT NOT NULL REFERENCES users(id) ON DELETE CASCADE
account_id    VARCHAR(255) NOT NULL
access_token  TEXT NOT NULL           -- token guardado en texto plano
created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP
updated_at    TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
UNIQUE KEY (user_id)                  -- un par de credenciales por usuario
```

#### `meta_ads_cache`
```sql
id            INT AUTO_INCREMENT PRIMARY KEY
user_id       INT NOT NULL REFERENCES users(id) ON DELETE CASCADE
cache_key     VARCHAR(512) NOT NULL
data          LONGTEXT NOT NULL        -- JSON serializado de la respuesta
expires_at    TIMESTAMP NOT NULL
created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP
UNIQUE KEY (user_id, cache_key)
```

---

## 16. Variables de Entorno

```bash
# .env.local

# Servidor
PORT=3000
NODE_ENV=development

# Autenticacion JWT
JWT_SECRET=clave-secreta-larga-aqui

# ID de la aplicacion (visible en frontend)
VITE_APP_ID=meta-ads-dashboard

# OAuth (dejar vacio para deshabilitar autenticacion)
OAUTH_SERVER_URL=
VITE_OAUTH_PORTAL_URL=
OWNER_OPEN_ID=

# Base de datos MySQL (omitir para usar memoria)
# DATABASE_URL=mysql://user:password@host:3306/database_name

# AI Assistant (requerido para el asistente AI)
BUILT_IN_FORGE_API_URL=https://api.anthropic.com
BUILT_IN_FORGE_API_KEY=sk-ant-api03-...
```

> Las credenciales de Meta (accountId + accessToken) NO van en .env. Se configuran por usuario desde la interfaz en /settings y se guardan en la DB.

---

## 17. Implementar en Otro Proyecto

### Minimo indispensable para obtener datos de Meta

**1. Instalar dependencia:**
```bash
npm install axios
```

**2. Funcion de fetch basica:**
```typescript
const META_API_VERSION = "v24.0"
const META_API_BASE_URL = `https://graph.facebook.com/${META_API_VERSION}`

async function fetchInsights(accountId: string, accessToken: string, dateRange: { since: string, until: string }) {
  const url = `${META_API_BASE_URL}/act_${accountId}/insights`

  const response = await axios.get(url, {
    params: {
      access_token: accessToken,
      level: "ad",
      fields: "ad_id,ad_name,campaign_name,impressions,clicks,spend,ctr,cpc,cpm,reach,actions,action_values,video_play_actions,video_p50_watched_actions,video_p100_watched_actions",
      time_range: JSON.stringify(dateRange),
      time_granularity: "daily"
    }
  })

  return response.data.data  // MetaAdsInsight[]
}
```

**3. Como usar los datos:**
```typescript
const insights = await fetchInsights("123456789", "EAAxxxxxx", {
  since: "2024-01-01",
  until: "2024-01-31"
})

// IMPORTANTE: todos los numeros son strings, siempre parsear
insights.forEach(insight => {
  const spend = parseFloat(insight.spend || "0")
  const impressions = parseInt(insight.impressions || "0")
  const clicks = parseInt(insight.clicks || "0")
  const ctr = parseFloat(insight.ctr || "0")

  // Extraer conversiones
  const purchase = insight.actions?.find(a => a.action_type === "purchase")
  const conversions = purchase ? parseFloat(purchase.value) : 0

  // Extraer revenue
  const purchaseValue = insight.action_values?.find(av => av.action_type === "purchase")
  const revenue = purchaseValue ? parseFloat(purchaseValue.value) : 0

  // Calcular ROAS
  const roas = spend > 0 ? revenue / spend : 0

  // Metricas de video
  const videoPlays = parseInt(insight.video_play_actions?.[0]?.value || "0")
  const p50 = parseInt(insight.video_p50_watched_actions?.[0]?.value || "0")
  const p100 = parseInt(insight.video_p100_watched_actions?.[0]?.value || "0")
  const retentionRate = videoPlays > 0 ? (p100 / videoPlays) * 100 : 0
})
```

### Como agregar datos para graficos de linea temporal

```typescript
// Los datos vienen con date_start cuando se usa time_granularity: "daily"
// Hay que agrupar por fecha y sumar metricas

const byDate = new Map()
insights.forEach(insight => {
  const date = insight.date_start
  const existing = byDate.get(date) || { date, spend: 0, clicks: 0, revenue: 0 }
  existing.spend += parseFloat(insight.spend || "0")
  existing.clicks += parseInt(insight.clicks || "0")
  byDate.set(date, existing)
})

const timelineData = Array.from(byDate.values())
  .sort((a, b) => a.date.localeCompare(b.date))
```

### Como segmentar por campana

```typescript
// Cambiar level a "campaign" — Meta agrupa automaticamente
const url = `${META_API_BASE_URL}/act_${accountId}/insights`
// params: { level: "campaign", ... }

// Resultado: un registro por campana (no por dia)
// { campaign_id, campaign_name, spend, impressions, ... }
```

### Consideraciones criticas para produccion

1. **Rate limits de Meta API:** implementar cache. Sin cache, 10 usuarios activos = rate limit superado.

2. **Tokens que expiran:** los tokens de usuario de corta duracion expiran en ~1 hora. Los de larga duracion en ~60 dias. Para produccion real, usar System User Tokens que no expiran.

3. **Meta Pixel obligatorio para ROAS/conversiones:** si el cliente no tiene el Pixel instalado, `actions` y `action_values` vienen vacios. Los graficos de ROAS mostraran cero.

4. **Paginacion de la API:** si hay muchos anuncios, Meta pagina los resultados con `paging.cursors`. El codigo actual no implementa paginacion — solo retorna la primera pagina. Para cuentas grandes con muchos anuncios, hay que implementar el recorrido de todas las paginas.

5. **Campos de video opcionales:** solo estan disponibles si el anuncio es de tipo video. Siempre validar antes de acceder: `insight.video_play_actions?.[0]?.value`.

6. **Zona horaria:** Meta API retorna datos en la zona horaria de la cuenta publicitaria. Tener en cuenta si el servidor y la cuenta estan en zonas distintas.

7. **date_start vs date_stop con granularidad diaria:** cuando se usa `time_granularity: "daily"`, cada registro representa un unico dia (`date_start === date_stop`). Sin granularidad, un unico registro representa todo el rango y `date_start`/`date_stop` son los extremos del periodo.

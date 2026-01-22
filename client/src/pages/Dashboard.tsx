import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { trpc } from "@/lib/trpc";
import { useDateRange } from "@/contexts/DateRangeContext";
import { DateRangePicker } from "@/components/DateRangePicker";
import { AlertCircle, ArrowRight, Calendar, DollarSign, Eye, Loader2, MousePointerClick, TrendingUp } from "lucide-react";
import { useMemo, useState } from "react";
import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis, Bar, BarChart, Pie, PieChart, Cell } from "recharts";
import { toast } from "sonner";
import { Link } from "wouter";

const COLORS = ["#3b82f6", "#8b5cf6", "#ec4899", "#f59e0b", "#10b981"];

export default function Dashboard() {
  const { user } = useAuth();
  const { dateRange, dateError } = useDateRange();
  const [showDebug, setShowDebug] = useState(false);

  const { data: credentials } = trpc.metaAds.getCredentials.useQuery();

  const { data: metrics, isLoading: loadingMetrics } = trpc.metaAds.getMetrics.useQuery(
    { timeRange: dateRange },
    { enabled: !!credentials && !dateError, staleTime: 0 }
  );

  const { data: insights, isLoading: loadingInsights } = trpc.metaAds.getInsights.useQuery(
    { timeRange: dateRange, level: "ad" },
    { enabled: !!credentials && !dateError, staleTime: 0 }
  );

  const { data: campaignInsights, isLoading: loadingCampaigns } = trpc.metaAds.getInsights.useQuery(
    { timeRange: dateRange, level: "campaign" },
    { enabled: !!credentials && !dateError, staleTime: 0 }
  );

  // Prepare timeline data
  const timelineData = useMemo(() => {
    if (!insights || insights.length === 0) return [];

    const dataByDate = new Map<string, { date: string; spend: number; impressions: number; clicks: number }>();

    insights.forEach((insight: any) => {
      const date = insight.date_start || "Unknown";
      const existing = dataByDate.get(date) || { date, spend: 0, impressions: 0, clicks: 0 };

      existing.spend += parseFloat(insight.spend || "0");
      existing.impressions += parseInt(insight.impressions || "0", 10);
      existing.clicks += parseInt(insight.clicks || "0", 10);

      dataByDate.set(date, existing);
    });

    return Array.from(dataByDate.values()).sort((a, b) => a.date.localeCompare(b.date));
  }, [insights]);

  // Prepare campaign comparison data
  const campaignComparisonData = useMemo(() => {
    if (!campaignInsights || campaignInsights.length === 0) return [];

    return campaignInsights.slice(0, 5).map((campaign: any) => ({
      name: campaign.campaign_name || "Unknown",
      spend: parseFloat(campaign.spend || "0"),
      impressions: parseInt(campaign.impressions || "0", 10),
      clicks: parseInt(campaign.clicks || "0", 10),
    }));
  }, [campaignInsights]);

  // Prepare spend distribution data
  const spendDistributionData = useMemo(() => {
    if (!campaignInsights || campaignInsights.length === 0) return [];

    return campaignInsights.slice(0, 5).map((campaign: any) => ({
      name: campaign.campaign_name || "Unknown",
      value: parseFloat(campaign.spend || "0"),
    }));
  }, [campaignInsights]);

  // Calculate ROI metrics directly from insights for accuracy
  // This calculation ensures no duplication by using unique ad_id + date combinations
  const roiMetrics = useMemo(() => {
    if (!insights || insights.length === 0) {
      return {
        totalSpend: 0,
        totalGenerated: 0,
        roas: 0,
        roi: 0,
        debugInfo: { rowCount: 0, uniqueAds: 0, purchaseActions: 0 }
      };
    }

    // Track unique combinations to avoid duplication
    const processedKeys = new Set<string>();
    const uniqueAds = new Set<string>();

    let totalSpend = 0;
    let totalGenerated = 0;
    let purchaseActionCount = 0;

    insights.forEach((insight: any) => {
      // Create unique key for deduplication (ad_id + date_start)
      const uniqueKey = `${insight.ad_id}_${insight.date_start}`;

      // Skip if already processed (prevents duplicate counting)
      if (processedKeys.has(uniqueKey)) {
        return;
      }
      processedKeys.add(uniqueKey);
      uniqueAds.add(insight.ad_id);

      // Sum spend from this unique insight
      const spendValue = parseFloat(insight.spend || "0");
      totalSpend += spendValue;

      // Sum revenue from purchase actions
      if (insight.action_values && Array.isArray(insight.action_values)) {
        insight.action_values.forEach((action: any) => {
          // Only count purchase-related conversions (avoid duplication with other action types)
          if (
            action.action_type === "purchase" ||
            action.action_type === "omni_purchase" ||
            action.action_type === "offsite_conversion.fb_pixel_purchase"
          ) {
            const revenueValue = parseFloat(action.value || "0");
            totalGenerated += revenueValue;
            purchaseActionCount++;
          }
        });
      }
    });

    // Calculate ROAS as: total revenue / total spend (NOT averaging ROAS values)
    const roas = totalSpend > 0 ? (totalGenerated / totalSpend).toFixed(2) : "0";
    const roi = totalSpend > 0 ? (((totalGenerated - totalSpend) / totalSpend) * 100).toFixed(1) : "0";

    return {
      totalSpend,
      totalGenerated,
      roas,
      roi,
      debugInfo: {
        rowCount: insights.length,
        uniqueRows: processedKeys.size,
        uniqueAds: uniqueAds.size,
        purchaseActions: purchaseActionCount
      }
    };
  }, [insights]);

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Acceso Restringido</CardTitle>
            <CardDescription>Debes iniciar sesión para acceder al dashboard</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  if (!credentials) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-6">
        <Card className="w-full max-w-md border-yellow-500/50 bg-yellow-500/5">
          <CardHeader>
            <div className="flex items-center gap-2">
              <AlertCircle className="h-6 w-6 text-yellow-500" />
              <CardTitle className="text-yellow-500">Configuración Requerida</CardTitle>
            </div>
            <CardDescription>
              Necesitas configurar tus credenciales de Meta Ads API para ver el dashboard
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/settings">
              <Button className="w-full">
                Ir a Configuración
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            {/* Dashboard Title with Premium Gold Styling */}
            <h1 className="text-3xl font-bold text-foreground">
              <span className="bg-gradient-to-r from-[#D4AF37] to-[#C9A227] bg-clip-text text-transparent font-extrabold">
                POWERNAX
              </span>
              <span className="text-muted-foreground font-normal"> – REPORTE DE META ADS</span>
            </h1>
            <p className="text-muted-foreground mt-1">Análisis de rendimiento de tus campañas</p>
          </div>

          {/* Interactive Date Range Picker */}
          <DateRangePicker />
          {dateError && (
            <Card className="border-red-500/50 bg-red-500/5">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 text-red-500">
                  <AlertCircle className="h-4 w-4" />
                  <p className="text-sm">{dateError}</p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Metrics Cards */}
        {loadingMetrics ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <Card key={i}>
                <CardContent className="flex items-center justify-center py-12">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : metrics ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Gasto Total</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-foreground">
                  ${metrics.totalSpend.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Impresiones</CardTitle>
                <Eye className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-foreground">
                  {metrics.totalImpressions.toLocaleString()}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Clics</CardTitle>
                <MousePointerClick className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-foreground">
                  {metrics.totalClicks.toLocaleString()}
                </div>
              </CardContent>
            </Card>

            <Card className={metrics.avgCTR < 1.5 ? "border-orange-500/30" : ""}>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">CTR Promedio</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div className="text-2xl font-bold text-foreground">
                    {metrics.avgCTR.toFixed(2)}%
                  </div>
                  {/* Alert: CTR bajo (< 1.5%) */}
                  {metrics.avgCTR < 1.5 && (
                    <span className="text-xs px-2 py-1 bg-orange-500/20 text-orange-500 rounded-full border border-orange-500/30">
                      Bajo
                    </span>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Alcance</CardTitle>
                <Eye className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-foreground">
                  {metrics.totalReach.toLocaleString()}
                </div>
              </CardContent>
            </Card>

            <Card className={metrics.avgCPC > 2.0 ? "border-orange-500/30" : ""}>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">CPC Promedio</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div className="text-2xl font-bold text-foreground">
                    ${metrics.avgCPC.toFixed(2)}
                  </div>
                  {/* Alert: CPC alto (> $2.00) */}
                  {metrics.avgCPC > 2.0 && (
                    <span className="text-xs px-2 py-1 bg-orange-500/20 text-orange-500 rounded-full border border-orange-500/30">
                      Alto
                    </span>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">CPM Promedio</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-foreground">
                  ${metrics.avgCPM.toFixed(2)}
                </div>
              </CardContent>
            </Card>
          </div>
        ) : null}



        {/* ROI Metrics - Valor Generado y ROAS */}
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Valor Generado</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-500">
                  ${roiMetrics.totalGenerated.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
                <p className="text-xs text-muted-foreground mt-1">Valor de conversiones</p>
              </CardContent>
            </Card>

            <Card className={parseFloat(roiMetrics.roas) < 2.0 ? (parseFloat(roiMetrics.roas) < 1.0 ? "border-red-500/30" : "border-orange-500/30") : ""}>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">ROAS</CardTitle>
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowDebug(!showDebug)}
                    className="h-6 px-2 text-xs"
                  >
                    {showDebug ? "Ocultar Debug" : "Debug"}
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div className="text-2xl font-bold text-foreground">
                    {roiMetrics.roas}x
                  </div>
                  {/* Alert: ROAS muy bajo (< 1.0) - perdiendo dinero */}
                  {parseFloat(roiMetrics.roas) < 1.0 && parseFloat(roiMetrics.roas) > 0 && (
                    <span className="text-xs px-2 py-1 bg-red-500/20 text-red-500 rounded-full border border-red-500/30">
                      Crítico
                    </span>
                  )}
                  {/* Alert: ROAS bajo (< 2.0 pero >= 1.0) */}
                  {parseFloat(roiMetrics.roas) >= 1.0 && parseFloat(roiMetrics.roas) < 2.0 && (
                    <span className="text-xs px-2 py-1 bg-orange-500/20 text-orange-500 rounded-full border border-orange-500/30">
                      Bajo
                    </span>
                  )}
                  {/* Good ROAS (>= 2.0) */}
                  {parseFloat(roiMetrics.roas) >= 2.0 && (
                    <span className="text-xs px-2 py-1 bg-green-500/20 text-green-500 rounded-full border border-green-500/30">
                      Bueno
                    </span>
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-1">Retorno por dolar gastado</p>
              </CardContent>
            </Card>
          </div>

          {/* Debug Info Panel (DEV ONLY) */}
          {showDebug && roiMetrics.debugInfo && (
            <Card className="border-yellow-500/50 bg-yellow-500/5">
              <CardHeader>
                <CardTitle className="text-sm font-medium text-yellow-500">🔍 Debug Info - Cálculos ROAS</CardTitle>
                <CardDescription>Información técnica para validar cálculos</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm font-mono">
                  <div>
                    <Label className="text-xs text-muted-foreground">Total Spend (Raw)</Label>
                    <p className="text-foreground font-semibold">
                      ${roiMetrics.totalSpend.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Total Revenue (Raw)</Label>
                    <p className="text-foreground font-semibold">
                      ${roiMetrics.totalGenerated.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">ROAS Final</Label>
                    <p className="text-foreground font-semibold">{roiMetrics.roas}x</p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Filas API</Label>
                    <p className="text-foreground font-semibold">{roiMetrics.debugInfo.rowCount}</p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Filas Únicas</Label>
                    <p className="text-foreground font-semibold">{roiMetrics.debugInfo.uniqueRows}</p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Anuncios Únicos</Label>
                    <p className="text-foreground font-semibold">{roiMetrics.debugInfo.uniqueAds}</p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Purchase Actions</Label>
                    <p className="text-foreground font-semibold">{roiMetrics.debugInfo.purchaseActions}</p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Fórmula</Label>
                    <p className="text-foreground font-semibold text-xs">Revenue / Spend</p>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground mt-3">
                  ℹ️ Cálculo con deduplicación por ad_id + date_start para evitar contar el mismo día múltiples veces
                </p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Campaign Comparison and Spend Distribution */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Comparación de Campañas</CardTitle>
              <CardDescription>Top 5 campañas por gasto</CardDescription>
            </CardHeader>
            <CardContent>
              {loadingCampaigns ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : campaignComparisonData.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={campaignComparisonData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="oklch(1 0 0 / 10%)" />
                    <XAxis dataKey="name" stroke="oklch(0.705 0.015 286.067)" />
                    <YAxis stroke="oklch(0.705 0.015 286.067)" />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "oklch(0.21 0.006 285.885)",
                        border: "1px solid oklch(1 0 0 / 10%)",
                        borderRadius: "8px",
                      }}
                    />
                    <Legend />
                    <Bar dataKey="spend" fill="#3b82f6" name="Gasto ($)" />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  No hay datos de campañas disponibles
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Distribución del Gasto</CardTitle>
              <CardDescription>Por campaña</CardDescription>
            </CardHeader>
            <CardContent>
              {loadingCampaigns ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : spendDistributionData.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={spendDistributionData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={(entry) => `${entry.name}: $${entry.value.toFixed(0)}`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {spendDistributionData.map((entry: any, index: number) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "oklch(0.21 0.006 285.885)",
                        border: "1px solid oklch(1 0 0 / 10%)",
                        borderRadius: "8px",
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  No hay datos de distribución disponibles
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

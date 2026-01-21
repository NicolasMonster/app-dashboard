import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { trpc } from "@/lib/trpc";
import { useDateRange } from "@/contexts/DateRangeContext";
import { AlertCircle, ArrowRight, Calendar, DollarSign, Eye, Loader2, MousePointerClick, TrendingUp } from "lucide-react";
import { useMemo } from "react";
import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis, Bar, BarChart, Pie, PieChart, Cell } from "recharts";
import { toast } from "sonner";
import { Link } from "wouter";

const COLORS = ["#3b82f6", "#8b5cf6", "#ec4899", "#f59e0b", "#10b981"];

export default function Dashboard() {
  const { user } = useAuth();
  const { dateRange, setDateRange, dateError } = useDateRange();

  const handleDateChange = (field: "since" | "until", value: string) => {
    const newRange = { ...dateRange, [field]: value };
    setDateRange(newRange);
  };

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

  // Calculate ROI metrics from account-level data for consistency
  const roiMetrics = useMemo(() => {
    if (!metrics) {
      return { totalSpend: 0, totalGenerated: 0, roas: 0, roi: 0 };
    }

    // Use metrics from getMetrics query (account-level aggregation)
    const totalSpend = metrics.totalSpend || 0;

    // Calculate total revenue from insights, filtering only purchase-related conversions
    let totalGenerated = 0;
    if (insights && insights.length > 0) {
      insights.forEach((insight: any) => {
        if (insight.action_values && Array.isArray(insight.action_values)) {
          insight.action_values.forEach((action: any) => {
            // Only count purchase-related conversions to avoid duplication
            if (
              action.action_type === "purchase" ||
              action.action_type === "omni_purchase" ||
              action.action_type === "offsite_conversion.fb_pixel_purchase"
            ) {
              totalGenerated += parseFloat(action.value || "0");
            }
          });
        }
      });
    }

    const roas = totalSpend > 0 ? (totalGenerated / totalSpend).toFixed(2) : "0";
    const roi = totalSpend > 0 ? (((totalGenerated - totalSpend) / totalSpend) * 100).toFixed(1) : "0";

    return { totalSpend, totalGenerated, roas, roi };
  }, [metrics, insights]);

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
            <h1 className="text-3xl font-bold text-foreground">Meta Ads Dashboard</h1>
            <p className="text-muted-foreground mt-1">Análisis de rendimiento de tus campañas</p>
          </div>

          {/* Date Range Selector */}
          <Card className="md:w-auto">
            <CardContent className="p-4">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <Label className="text-sm text-muted-foreground">Desde:</Label>
                  <input
                    type="date"
                    value={dateRange.since}
                    onChange={(e) => handleDateChange("since", e.target.value)}
                    className="bg-background border border-border rounded px-2 py-1 text-sm text-foreground"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <Label className="text-sm text-muted-foreground">Hasta:</Label>
                  <input
                    type="date"
                    value={dateRange.until}
                    onChange={(e) => handleDateChange("until", e.target.value)}
                    className="bg-background border border-border rounded px-2 py-1 text-sm text-foreground"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
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
                  ${metrics.totalSpend.toFixed(2)}
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

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">CTR Promedio</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-foreground">
                  {metrics.avgCTR.toFixed(2)}%
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

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">CPC Promedio</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-foreground">
                  ${metrics.avgCPC.toFixed(2)}
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
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Valor Generado</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-500">
                ${roiMetrics.totalGenerated.toFixed(2)}
              </div>
              <p className="text-xs text-muted-foreground mt-1">Valor de conversiones</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">ROAS</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">
                {roiMetrics.roas}x
              </div>
              <p className="text-xs text-muted-foreground mt-1">Retorno por dolar gastado</p>
            </CardContent>
          </Card>
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

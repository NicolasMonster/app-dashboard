import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { trpc } from "@/lib/trpc";
import { AlertCircle, CheckCircle2, Loader2, Save } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export default function Settings() {
  const { user } = useAuth();
  const [accountId, setAccountId] = useState("");
  const [accessToken, setAccessToken] = useState("");

  const { data: credentials, isLoading: loadingCredentials } = trpc.metaAds.getCredentials.useQuery();
  const saveCredentialsMutation = trpc.metaAds.saveCredentials.useMutation();
  const deleteCredentialsMutation = trpc.metaAds.deleteCredentials.useMutation();
  const utils = trpc.useUtils();

  const handleSave = async () => {
    if (!accountId.trim() || !accessToken.trim()) {
      toast.error("Por favor completa todos los campos");
      return;
    }

    try {
      await saveCredentialsMutation.mutateAsync({
        accountId: accountId.trim(),
        accessToken: accessToken.trim(),
      });

      toast.success("Credenciales guardadas exitosamente");
      setAccountId("");
      setAccessToken("");
      utils.metaAds.getCredentials.invalidate();
    } catch (error) {
      toast.error("Error al guardar credenciales: " + (error as Error).message);
    }
  };

  const handleDelete = async () => {
    if (!confirm("¿Estás seguro de que deseas eliminar tus credenciales?")) {
      return;
    }

    try {
      await deleteCredentialsMutation.mutateAsync();
      toast.success("Credenciales eliminadas");
      utils.metaAds.getCredentials.invalidate();
    } catch (error) {
      toast.error("Error al eliminar credenciales");
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Acceso Restringido</CardTitle>
            <CardDescription>Debes iniciar sesión para acceder a esta página</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Configuración</h1>
          <p className="text-muted-foreground mt-2">Administra tus credenciales de Meta Ads API</p>
        </div>

        {/* Current Credentials Status */}
        {loadingCredentials ? (
          <Card>
            <CardContent className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </CardContent>
          </Card>
        ) : credentials ? (
          <Card className="border-green-500/50 bg-green-500/5">
            <CardHeader>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-green-500" />
                <CardTitle className="text-green-500">Credenciales Configuradas</CardTitle>
              </div>
              <CardDescription>Tus credenciales están activas</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label className="text-muted-foreground">Account ID</Label>
                <p className="text-foreground font-mono">{credentials.accountId}</p>
              </div>
              <div>
                <Label className="text-muted-foreground">Access Token</Label>
                <p className="text-foreground">••••••••••••••••</p>
              </div>
              <Button
                variant="destructive"
                onClick={handleDelete}
                disabled={deleteCredentialsMutation.isPending}
              >
                {deleteCredentialsMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Eliminando...
                  </>
                ) : (
                  "Eliminar Credenciales"
                )}
              </Button>
            </CardContent>
          </Card>
        ) : (
          <Card className="border-yellow-500/50 bg-yellow-500/5">
            <CardHeader>
              <div className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-yellow-500" />
                <CardTitle className="text-yellow-500">Sin Credenciales</CardTitle>
              </div>
              <CardDescription>Configura tus credenciales para comenzar</CardDescription>
            </CardHeader>
          </Card>
        )}

        {/* Add/Update Credentials Form */}
        <Card>
          <CardHeader>
            <CardTitle>
              {credentials ? "Actualizar Credenciales" : "Agregar Credenciales"}
            </CardTitle>
            <CardDescription>
              Ingresa tu Account ID y Access Token de Meta Ads API
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="accountId">Account ID</Label>
              <Input
                id="accountId"
                placeholder="123456789012345"
                value={accountId}
                onChange={(e) => setAccountId(e.target.value)}
                className="font-mono"
              />
              <p className="text-sm text-muted-foreground">
                El ID de tu cuenta publicitaria de Meta (sin el prefijo "act_")
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="accessToken">Access Token</Label>
              <Input
                id="accessToken"
                type="password"
                placeholder="EAAxxxxxxxxxxxxxxxxxxxxxxxxxx"
                value={accessToken}
                onChange={(e) => setAccessToken(e.target.value)}
                className="font-mono"
              />
              <p className="text-sm text-muted-foreground">
                Tu token de acceso de Meta Ads API con permisos de lectura
              </p>
            </div>

            <Button
              onClick={handleSave}
              disabled={saveCredentialsMutation.isPending || !accountId || !accessToken}
              className="w-full"
            >
              {saveCredentialsMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Guardando...
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  Guardar Credenciales
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Instructions Card */}
        <Card>
          <CardHeader>
            <CardTitle>¿Cómo obtener tus credenciales?</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm text-muted-foreground">
            <div>
              <h4 className="font-semibold text-foreground mb-2">1. Account ID</h4>
              <p>
                Ve a tu Administrador de Anuncios de Meta. El Account ID aparece en la URL como
                "act_XXXXXXXXXX". Copia solo los números después de "act_".
              </p>
            </div>
            <div>
              <h4 className="font-semibold text-foreground mb-2">2. Access Token</h4>
              <p>
                Genera un token de acceso desde{" "}
                <a
                  href="https://developers.facebook.com/tools/explorer/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline"
                >
                  Graph API Explorer
                </a>
                . Asegúrate de que tenga los permisos "ads_read" y "ads_management".
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

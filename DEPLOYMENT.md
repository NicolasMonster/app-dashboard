# 🚀 Guía de Deployment para ads.elevatearg.com

## Opción 1: Deployment automático desde Windows (RECOMENDADO)

### Pasos:

1. **Abrí PowerShell como Administrador** (clic derecho > Ejecutar como administrador)

2. **Navega a la carpeta del proyecto:**
   ```powershell
   cd C:\ruta\a\app-dashboard
   ```

3. **Ejecuta el script:**
   ```powershell
   .\deploy-windows.ps1
   ```

El script automáticamente:
- ✅ Descarga herramientas necesarias (plink, pscp)
- ✅ Copia el script al servidor
- ✅ Instala Node.js, pnpm, Nginx
- ✅ Clona el repositorio
- ✅ Instala dependencias
- ✅ Construye el proyecto
- ✅ Configura Nginx
- ✅ Inicia la app con PM2

---

## Opción 2: Deployment manual vía SSH

### Paso 1: Conectarse al servidor

Desde **PowerShell** o **CMD**:

```bash
ssh root@72.60.157.10
```

**Contraseña:** `SomosELEVATE655+`

### Paso 2: Copiar el script al servidor

Desde **otra terminal en tu PC Windows** (en la carpeta del proyecto):

```bash
scp deploy-to-server.sh root@72.60.157.10:/root/
```

### Paso 3: Ejecutar el script en el servidor

Ya conectado por SSH:

```bash
chmod +x /root/deploy-to-server.sh
/root/deploy-to-server.sh
```

---

## Configuración de variables de entorno

**IMPORTANTE:** Después del deployment, debes configurar tus credenciales de Meta.

Conectate por SSH y edita el archivo `.env`:

```bash
ssh root@72.60.157.10
nano /var/www/app-dashboard/.env
```

Contenido del `.env`:

```env
# Meta Business API Configuration
META_ACCESS_TOKEN=tu_token_de_acceso_aqui
META_AD_ACCOUNT_ID=act_tu_id_de_cuenta_aqui

# Server Configuration
PORT=3000
NODE_ENV=production
```

Después de editar, reinicia la aplicación:

```bash
pm2 restart ads-dashboard
```

---

## Verificar el deployment

### Ver logs en tiempo real:
```bash
pm2 logs ads-dashboard
```

### Ver estado de la aplicación:
```bash
pm2 status
```

### Reiniciar la aplicación:
```bash
pm2 restart ads-dashboard
```

### Ver logs de Nginx:
```bash
tail -f /var/log/nginx/ads.elevatearg.com.access.log
tail -f /var/log/nginx/ads.elevatearg.com.error.log
```

---

## SSL/HTTPS (Opcional pero recomendado)

Para habilitar HTTPS con certificado gratuito de Let's Encrypt:

```bash
ssh root@72.60.157.10
apt install -y certbot python3-certbot-nginx
certbot --nginx -d ads.elevatearg.com
```

---

## Actualizar la aplicación después del primer deployment

Cuando hagas cambios en el código:

1. **Conectate por SSH:**
   ```bash
   ssh root@72.60.157.10
   ```

2. **Actualiza el código:**
   ```bash
   cd /var/www/app-dashboard
   git pull origin claude/add-dashboard-header-zAJoM
   pnpm install
   pnpm build
   pm2 restart ads-dashboard
   ```

O simplemente vuelve a ejecutar el script de deployment:

```bash
/root/deploy-to-server.sh
```

---

## Troubleshooting

### La app no inicia:
```bash
pm2 logs ads-dashboard
```
Revisa los logs para ver el error.

### Nginx no responde:
```bash
systemctl status nginx
nginx -t  # Verificar configuración
systemctl restart nginx
```

### No se ve el sitio:
1. Verifica que el DNS de `ads.elevatearg.com` apunte a `72.60.157.10`
2. Verifica que el firewall permita tráfico HTTP (puerto 80)

---

## URLs

- **Sitio web:** http://ads.elevatearg.com
- **Con SSL:** https://ads.elevatearg.com (después de configurar Let's Encrypt)

---

## Notas importantes

- ✅ El script usa **PM2** para mantener la app corriendo 24/7
- ✅ PM2 reiniciará automáticamente la app si el servidor se reinicia
- ✅ Nginx funciona como proxy reverso (puerto 80 → 3000)
- ⚠️ **NUNCA** subas el archivo `.env` al repositorio de Git
- 🔒 Considera cambiar la contraseña SSH después del deployment

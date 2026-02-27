#!/bin/bash

# Script de deployment para ads.elevatearg.com
# Ejecutar una vez conectado al servidor via SSH

echo "🚀 Iniciando deployment en ads.elevatearg.com..."

# 1. Actualizar sistema e instalar dependencias
echo "📦 Instalando dependencias del sistema..."
apt update
apt install -y nodejs npm nginx git curl

# Instalar Node.js 18+ (si no está)
if ! command -v node &> /dev/null || [[ $(node -v | cut -d'v' -f2 | cut -d'.' -f1) -lt 18 ]]; then
    echo "📦 Instalando Node.js 18..."
    curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
    apt install -y nodejs
fi

# Instalar pnpm
echo "📦 Instalando pnpm..."
npm install -g pnpm

# 2. Clonar o actualizar repositorio
if [ -d "/var/www/app-dashboard" ]; then
    echo "🔄 Actualizando repositorio existente..."
    cd /var/www/app-dashboard
    git fetch origin
    git checkout claude/add-dashboard-header-zAJoM
    git pull origin claude/add-dashboard-header-zAJoM
else
    echo "📥 Clonando repositorio..."
    mkdir -p /var/www
    cd /var/www
    git clone https://github.com/NicolasMonster/app-dashboard.git
    cd app-dashboard
    git checkout claude/add-dashboard-header-zAJoM
fi

# 3. Instalar dependencias del proyecto
echo "📦 Instalando dependencias del proyecto..."
pnpm install

# 4. Verificar archivo .env
if [ ! -f ".env" ]; then
    echo "⚠️  ADVERTENCIA: No existe archivo .env"
    echo "Creando .env de ejemplo..."
    cat > .env << 'EOF'
# Meta Business API Configuration
META_ACCESS_TOKEN=your_access_token_here
META_AD_ACCOUNT_ID=act_your_account_id_here

# Server Configuration
PORT=3000
NODE_ENV=production
EOF
    echo "❗ IMPORTANTE: Edita /var/www/app-dashboard/.env con tus credenciales de Meta"
    echo "   nano /var/www/app-dashboard/.env"
fi

# 5. Build del proyecto
echo "🏗️  Construyendo proyecto..."
pnpm build

# 6. Configurar Nginx
echo "⚙️  Configurando Nginx para ads.elevatearg.com..."
cat > /etc/nginx/sites-available/ads.elevatearg.com << 'EOF'
server {
    listen 80;
    server_name ads.elevatearg.com www.ads.elevatearg.com;

    # Logs
    access_log /var/log/nginx/ads.elevatearg.com.access.log;
    error_log /var/log/nginx/ads.elevatearg.com.error.log;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
EOF

# Activar sitio
ln -sf /etc/nginx/sites-available/ads.elevatearg.com /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default

# Verificar y reiniciar Nginx
nginx -t && systemctl restart nginx

# 7. Configurar PM2 para mantener la app corriendo
echo "🔧 Configurando PM2..."
npm install -g pm2

# Detener proceso anterior si existe
pm2 delete ads-dashboard 2>/dev/null || true

# Iniciar aplicación con PM2
cd /var/www/app-dashboard
pm2 start npm --name "ads-dashboard" -- start

# Configurar PM2 para iniciar al reiniciar servidor
pm2 startup
pm2 save

# 8. Configurar firewall (opcional)
if command -v ufw &> /dev/null; then
    echo "🔒 Configurando firewall..."
    ufw allow 22/tcp
    ufw allow 80/tcp
    ufw allow 443/tcp
    ufw --force enable
fi

# 9. Configurar SSL con Let's Encrypt
echo ""
echo "🔐 ¿Quieres instalar SSL (HTTPS) ahora? (s/n)"
read -r install_ssl
if [[ "$install_ssl" == "s" || "$install_ssl" == "S" ]]; then
    apt install -y certbot python3-certbot-nginx
    certbot --nginx -d ads.elevatearg.com -d www.ads.elevatearg.com --non-interactive --agree-tos --email admin@elevatearg.com || echo "⚠️  SSL falló, configúralo manualmente después"
fi

echo ""
echo "✅ Deployment completado!"
echo ""
echo "📊 Estado de la aplicación:"
pm2 status
echo ""
echo "🌐 Tu aplicación está disponible en:"
echo "   http://ads.elevatearg.com"
if [[ "$install_ssl" == "s" || "$install_ssl" == "S" ]]; then
    echo "   https://ads.elevatearg.com"
fi
echo ""
echo "📝 Comandos útiles:"
echo "   pm2 logs ads-dashboard    # Ver logs en tiempo real"
echo "   pm2 restart ads-dashboard # Reiniciar app"
echo "   pm2 status                # Ver estado"
echo "   nano /var/www/app-dashboard/.env  # Editar variables de entorno"
echo ""

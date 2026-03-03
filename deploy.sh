#!/bin/bash

# Script de Deployment para ads.elevatearg.com
# Ejecutar desde tu computadora local

set -e  # Salir si hay algún error

SERVER="72.60.157.10"
USER="root"
DOMAIN="ads.elevatearg.com"
APP_DIR="/var/www/app-dashboard"
BRANCH="claude/add-dashboard-header-zAJoM"

echo "🚀 Iniciando deployment a $DOMAIN..."

# Colores para output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 1. Verificar conexión SSH
echo -e "${BLUE}📡 Verificando conexión con el servidor...${NC}"
if ! sshpass -p 'SomosELEVATE655+' ssh -o StrictHostKeyChecking=no -o ConnectTimeout=10 $USER@$SERVER 'echo "Conexión exitosa"' 2>/dev/null; then
    echo -e "${YELLOW}⚠️  No se pudo conectar con sshpass, intentando con SSH interactivo...${NC}"
    ssh -o ConnectTimeout=10 $USER@$SERVER 'echo "Conexión exitosa"'
fi

echo -e "${GREEN}✅ Conexión establecida${NC}"

# 2. Verificar si git está instalado en el servidor
echo -e "${BLUE}📦 Verificando dependencias en el servidor...${NC}"
sshpass -p 'SomosELEVATE655+' ssh -o StrictHostKeyChecking=no $USER@$SERVER << 'ENDSSH'
# Instalar dependencias si no existen
if ! command -v git &> /dev/null; then
    echo "Instalando git..."
    apt update && apt install -y git
fi

if ! command -v node &> /dev/null; then
    echo "Instalando Node.js..."
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
    apt install -y nodejs
fi

if ! command -v pnpm &> /dev/null; then
    echo "Instalando pnpm..."
    npm install -g pnpm
fi

if ! command -v pm2 &> /dev/null; then
    echo "Instalando PM2..."
    npm install -g pm2
fi

if ! command -v caddy &> /dev/null; then
    echo "Instalando Caddy..."
    apt install -y debian-keyring debian-archive-keyring apt-transport-https curl
    curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
    curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | tee /etc/apt/sources.list.d/caddy-stable.list
    apt update && apt install -y caddy
fi
ENDSSH

echo -e "${GREEN}✅ Dependencias verificadas${NC}"

# 3. Clonar o actualizar el repositorio
echo -e "${BLUE}📥 Clonando/actualizando repositorio...${NC}"
sshpass -p 'SomosELEVATE655+' ssh -o StrictHostKeyChecking=no $USER@$SERVER << ENDSSH
if [ -d "$APP_DIR" ]; then
    echo "Directorio existe, actualizando..."
    cd $APP_DIR
    git fetch origin
    git checkout $BRANCH
    git pull origin $BRANCH
else
    echo "Clonando repositorio..."
    mkdir -p /var/www
    cd /var/www
    git clone https://github.com/NicolasMonster/app-dashboard.git
    cd $APP_DIR
    git checkout $BRANCH
fi
ENDSSH

echo -e "${GREEN}✅ Código actualizado${NC}"

# 4. Crear archivo .env
echo -e "${BLUE}⚙️  Configurando variables de entorno...${NC}"
sshpass -p 'SomosELEVATE655+' ssh -o StrictHostKeyChecking=no $USER@$SERVER << 'ENDSSH'
cat > /var/www/app-dashboard/.env << 'EOF'
# Server
PORT=3000
NODE_ENV=production

# Authentication
JWT_SECRET=ElevateArg-SecretKey-2024-Production

# App ID
VITE_APP_ID=bordados-jas-dashboard

# OAuth (sin configurar por ahora)
OAUTH_SERVER_URL=
VITE_OAUTH_PORTAL_URL=
OWNER_OPEN_ID=

# AI Assistant (sin configurar por ahora)
BUILT_IN_FORGE_API_URL=
BUILT_IN_FORGE_API_KEY=
VITE_FRONTEND_FORGE_API_URL=
VITE_FRONTEND_FORGE_API_KEY=
EOF
ENDSSH

echo -e "${GREEN}✅ Variables de entorno configuradas${NC}"

# 5. Instalar dependencias y compilar
echo -e "${BLUE}📦 Instalando dependencias y compilando...${NC}"
sshpass -p 'SomosELEVATE655+' ssh -o StrictHostKeyChecking=no $USER@$SERVER << 'ENDSSH'
cd /var/www/app-dashboard
pnpm install
pnpm run build
ENDSSH

echo -e "${GREEN}✅ Aplicación compilada${NC}"

# 6. Configurar PM2
echo -e "${BLUE}🔄 Configurando PM2...${NC}"
sshpass -p 'SomosELEVATE655+' ssh -o StrictHostKeyChecking=no $USER@$SERVER << 'ENDSSH'
cd /var/www/app-dashboard

# Detener proceso anterior si existe
pm2 delete app-dashboard 2>/dev/null || true

# Iniciar aplicación
pm2 start npm --name "app-dashboard" -- start

# Guardar configuración
pm2 save

# Configurar inicio automático
pm2 startup systemd -u root --hp /root 2>/dev/null || true
ENDSSH

echo -e "${GREEN}✅ PM2 configurado${NC}"

# 7. Configurar Caddy
echo -e "${BLUE}🌐 Configurando Caddy...${NC}"
sshpass -p 'SomosELEVATE655+' ssh -o StrictHostKeyChecking=no $USER@$SERVER << 'ENDSSH'
cat > /etc/caddy/Caddyfile << 'EOF'
ads.elevatearg.com {
    reverse_proxy localhost:3000
}
EOF

# Reiniciar Caddy
systemctl restart caddy
systemctl enable caddy
ENDSSH

echo -e "${GREEN}✅ Caddy configurado${NC}"

# 8. Verificar estado
echo -e "${BLUE}🔍 Verificando deployment...${NC}"
sshpass -p 'SomosELEVATE655+' ssh -o StrictHostKeyChecking=no $USER@$SERVER << 'ENDSSH'
echo "Estado de PM2:"
pm2 list

echo ""
echo "Estado de Caddy:"
systemctl status caddy --no-pager | head -n 10

echo ""
echo "Verificando puerto 3000:"
netstat -tulpn | grep :3000 || echo "Puerto 3000 no está escuchando"
ENDSSH

echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}✅ DEPLOYMENT COMPLETADO${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo -e "🌐 Tu aplicación debería estar disponible en:"
echo -e "   ${BLUE}https://ads.elevatearg.com${NC}"
echo ""
echo -e "📊 Ver logs: ${YELLOW}ssh root@$SERVER 'pm2 logs app-dashboard'${NC}"
echo -e "🔄 Reiniciar: ${YELLOW}ssh root@$SERVER 'pm2 restart app-dashboard'${NC}"
echo ""

# 🚀 Guía de Deployment

## Opción 1: Script Automático (Recomendado)

### Ejecutar desde tu computadora local:

```bash
cd /ruta/a/app-dashboard
./deploy.sh
```

Si no tienes `sshpass`, instálalo primero:

```bash
# En Ubuntu/Debian
sudo apt install sshpass

# En macOS
brew install hudochenkov/sshpass/sshpass
```

---

## Opción 2: Deployment Manual

Conectarte al servidor:

```bash
ssh root@72.60.157.10
# Contraseña: SomosELEVATE655+
```

Luego ejecuta estos comandos en el servidor:

```bash
# 1. Instalar dependencias
apt update && apt install -y git curl
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs
npm install -g pnpm pm2

# 2. Clonar repositorio
cd /var/www
git clone https://github.com/NicolasMonster/app-dashboard.git
cd app-dashboard
git checkout claude/add-dashboard-header-zAJoM

# 3. Crear .env
cat > .env << 'ENVEOF'
PORT=3000
NODE_ENV=production
JWT_SECRET=ElevateArg-SecretKey-2024-Production
VITE_APP_ID=bordados-jas-dashboard
ENVEOF

# 4. Instalar y compilar
pnpm install
pnpm run build

# 5. Iniciar con PM2
pm2 start npm --name "app-dashboard" -- start
pm2 save
pm2 startup

# 6. Instalar y configurar Caddy
apt install -y debian-keyring debian-archive-keyring apt-transport-https
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | tee /etc/apt/sources.list.d/caddy-stable.list
apt update && apt install -y caddy

cat > /etc/caddy/Caddyfile << 'CADDYEOF'
ads.elevatearg.com {
    reverse_proxy localhost:3000
}
CADDYEOF

systemctl restart caddy
systemctl enable caddy
```

🌐 Aplicación disponible en: https://ads.elevatearg.com

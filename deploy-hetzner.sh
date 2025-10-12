#!/bin/bash

# =============================================================================
# Food Inventory SaaS - Hetzner Deployment Script
# =============================================================================
# Este script automatiza el deployment completo a un servidor Hetzner
#
# REQUISITOS:
# - Servidor Ubuntu 22.04 LTS
# - Acceso root vía SSH
# - Dominio configurado apuntando al servidor
#
# USO:
# 1. Editar las variables de configuración abajo
# 2. chmod +x deploy-hetzner.sh
# 3. ./deploy-hetzner.sh
# =============================================================================

set -e  # Exit on error

# =============================================================================
# CONFIGURACIÓN - EDITAR ANTES DE EJECUTAR
# =============================================================================

SERVER_IP="YOUR_SERVER_IP"                    # Ej: 123.45.67.89
DOMAIN="your-domain.com"                      # Ej: foodinventory.com
API_SUBDOMAIN="api.${DOMAIN}"                 # Ej: api.foodinventory.com
EMAIL="your-email@example.com"                # Para Let's Encrypt

# GitHub repo (ajustar según tu repo)
REPO_URL="https://github.com/YOUR_USERNAME/food-inventory-saas.git"
REPO_BRANCH="main"

# Contraseñas de MongoDB (CAMBIAR EN PRODUCCIÓN)
MONGODB_ADMIN_PASSWORD="CHANGE_THIS_ADMIN_PASSWORD"
MONGODB_APP_PASSWORD="CHANGE_THIS_APP_PASSWORD"

# JWT y Session Secrets (generar nuevos)
JWT_SECRET=$(openssl rand -base64 48)
SESSION_SECRET=$(openssl rand -base64 24)

# Email SMTP (ajustar según tu proveedor)
SMTP_HOST="smtp.sendgrid.net"
SMTP_PORT="587"
SMTP_USER="apikey"
SMTP_PASSWORD="YOUR_SENDGRID_API_KEY"
SMTP_FROM="noreply@${DOMAIN}"

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# =============================================================================
# FUNCIONES
# =============================================================================

log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

check_config() {
    log_info "Verificando configuración..."

    if [ "$SERVER_IP" == "YOUR_SERVER_IP" ]; then
        log_error "Debes configurar SERVER_IP en el script"
        exit 1
    fi

    if [ "$DOMAIN" == "your-domain.com" ]; then
        log_error "Debes configurar DOMAIN en el script"
        exit 1
    fi

    if [ "$EMAIL" == "your-email@example.com" ]; then
        log_error "Debes configurar EMAIL en el script"
        exit 1
    fi

    if [ "$MONGODB_ADMIN_PASSWORD" == "CHANGE_THIS_ADMIN_PASSWORD" ]; then
        log_warning "Usando contraseña por defecto de MongoDB. CAMBIAR en producción."
    fi

    log_success "Configuración OK"
}

test_ssh() {
    log_info "Probando conexión SSH al servidor..."

    if ssh -o ConnectTimeout=5 root@$SERVER_IP "echo 'SSH OK'" > /dev/null 2>&1; then
        log_success "Conexión SSH exitosa"
    else
        log_error "No se puede conectar al servidor vía SSH"
        log_info "Verifica que:"
        log_info "  1. La IP es correcta: $SERVER_IP"
        log_info "  2. Tienes acceso SSH como root"
        log_info "  3. Tu clave SSH está configurada"
        exit 1
    fi
}

install_dependencies() {
    log_info "Instalando dependencias en el servidor..."

    ssh root@$SERVER_IP 'bash -s' << 'ENDSSH'
        # Actualizar sistema
        apt update && apt upgrade -y

        # Node.js 18.x
        curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
        apt-get install -y nodejs

        # PM2
        npm install -g pm2

        # Nginx
        apt install -y nginx

        # Certbot
        apt install -y certbot python3-certbot-nginx

        # Git
        apt install -y git

        # MongoDB 7.0
        apt-get install -y gnupg curl
        curl -fsSL https://www.mongodb.org/static/pgp/server-7.0.asc | \
           gpg -o /usr/share/keyrings/mongodb-server-7.0.gpg --dearmor

        echo "deb [ arch=amd64,arm64 signed-by=/usr/share/keyrings/mongodb-server-7.0.gpg ] https://repo.mongodb.org/apt/ubuntu jammy/mongodb-org/7.0 multiverse" | \
           tee /etc/apt/sources.list.d/mongodb-org-7.0.list

        apt-get update
        apt-get install -y mongodb-org

        systemctl start mongod
        systemctl enable mongod
ENDSSH

    log_success "Dependencias instaladas"
}

create_user() {
    log_info "Creando usuario deployer..."

    ssh root@$SERVER_IP "bash -s" << ENDSSH
        if id "deployer" &>/dev/null; then
            echo "Usuario deployer ya existe"
        else
            adduser --disabled-password --gecos "" deployer
            usermod -aG sudo deployer

            # Copiar SSH keys
            mkdir -p /home/deployer/.ssh
            cp ~/.ssh/authorized_keys /home/deployer/.ssh/
            chown -R deployer:deployer /home/deployer/.ssh
            chmod 700 /home/deployer/.ssh
            chmod 600 /home/deployer/.ssh/authorized_keys

            # Permitir sudo sin contraseña para deployment
            echo "deployer ALL=(ALL) NOPASSWD:ALL" > /etc/sudoers.d/deployer
        fi
ENDSSH

    log_success "Usuario deployer configurado"
}

configure_mongodb() {
    log_info "Configurando MongoDB..."

    ssh root@$SERVER_IP "bash -s" << ENDSSH
        # Crear usuarios de MongoDB
        mongosh --eval "
        use admin

        db.createUser({
          user: 'foodinventory_admin',
          pwd: '$MONGODB_ADMIN_PASSWORD',
          roles: [
            { role: 'userAdminAnyDatabase', db: 'admin' },
            { role: 'readWriteAnyDatabase', db: 'admin' }
          ]
        })

        use food-inventory-prod

        db.createUser({
          user: 'foodinventory_app',
          pwd: '$MONGODB_APP_PASSWORD',
          roles: [
            { role: 'readWrite', db: 'food-inventory-prod' }
          ]
        })
        " 2>/dev/null || echo "Usuarios MongoDB ya existen o error al crear"

        # Habilitar autenticación
        if ! grep -q "security:" /etc/mongod.conf; then
            echo "security:" >> /etc/mongod.conf
            echo "  authorization: enabled" >> /etc/mongod.conf
            systemctl restart mongod
        fi
ENDSSH

    log_success "MongoDB configurado"
}

clone_repo() {
    log_info "Clonando repositorio..."

    ssh deployer@$SERVER_IP "bash -s" << ENDSSH
        if [ -d "food-inventory-saas" ]; then
            echo "Repositorio ya existe, actualizando..."
            cd food-inventory-saas
            git pull origin $REPO_BRANCH
        else
            git clone -b $REPO_BRANCH $REPO_URL food-inventory-saas
        fi
ENDSSH

    log_success "Repositorio clonado/actualizado"
}

configure_backend() {
    log_info "Configurando backend..."

    ssh deployer@$SERVER_IP "bash -s" << ENDSSH
        cd ~/food-inventory-saas/food-inventory-saas

        # Crear .env
        cat > .env << 'EOF'
NODE_ENV=production
PORT=3000

MONGODB_URI=mongodb://foodinventory_app:$MONGODB_APP_PASSWORD@localhost:27017/food-inventory-prod?authSource=food-inventory-prod

JWT_SECRET=$JWT_SECRET
JWT_EXPIRES_IN=7d

CORS_ORIGINS=https://$DOMAIN,https://www.$DOMAIN,https://$API_SUBDOMAIN
FRONTEND_URL=https://$DOMAIN

SMTP_HOST=$SMTP_HOST
SMTP_PORT=$SMTP_PORT
SMTP_USER=$SMTP_USER
SMTP_PASSWORD=$SMTP_PASSWORD
SMTP_FROM=$SMTP_FROM

RATE_LIMIT_TTL=60
RATE_LIMIT_MAX=100

MAX_FILE_SIZE=5242880
UPLOAD_DIR=./uploads

SESSION_SECRET=$SESSION_SECRET

LOG_LEVEL=info
EOF

        # Instalar dependencias y compilar
        npm ci --production=false
        npm run build

        # Limpiar e instalar solo prod
        rm -rf node_modules
        npm ci --production

        # Crear directorio de logs
        mkdir -p logs

        # Crear ecosystem.config.js para PM2
        cat > ecosystem.config.js << 'EOFPM2'
module.exports = {
  apps: [
    {
      name: 'food-inventory-api',
      script: './dist/main.js',
      instances: 2,
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
      },
      error_file: './logs/pm2-error.log',
      out_file: './logs/pm2-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      autorestart: true,
      watch: false,
      max_memory_restart: '500M',
      time: true,
    },
  ],
};
EOFPM2
ENDSSH

    log_success "Backend configurado"
}

configure_frontend() {
    log_info "Configurando frontend..."

    ssh deployer@$SERVER_IP "bash -s" << ENDSSH
        cd ~/food-inventory-saas/food-inventory-admin

        # Crear .env
        cat > .env << 'EOF'
VITE_API_URL=https://$API_SUBDOMAIN
VITE_FRONTEND_URL=https://$DOMAIN
VITE_ENV=production
EOF

        # Instalar dependencias y compilar
        npm ci
        npm run build
ENDSSH

    log_success "Frontend configurado"
}

start_backend() {
    log_info "Iniciando backend con PM2..."

    ssh deployer@$SERVER_IP "bash -s" << ENDSSH
        cd ~/food-inventory-saas/food-inventory-saas

        # Iniciar con PM2
        pm2 start ecosystem.config.js

        # Configurar PM2 startup
        pm2 startup systemd -u deployer --hp /home/deployer
        pm2 save
ENDSSH

    log_success "Backend iniciado"
}

configure_nginx() {
    log_info "Configurando Nginx..."

    ssh root@$SERVER_IP "bash -s" << ENDSSH
        # Crear configuración de Nginx
        cat > /etc/nginx/sites-available/food-inventory << 'EOF'
server {
    listen 80;
    listen [::]:80;
    server_name $DOMAIN www.$DOMAIN $API_SUBDOMAIN;

    client_max_body_size 10M;

    access_log /var/log/nginx/food-inventory-access.log;
    error_log /var/log/nginx/food-inventory-error.log;

    location / {
        root /home/deployer/food-inventory-saas/food-inventory-admin/dist;
        try_files \$uri \$uri/ /index.html;
    }
}

server {
    listen 80;
    listen [::]:80;
    server_name $API_SUBDOMAIN;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
    }
}
EOF

        # Habilitar sitio
        ln -sf /etc/nginx/sites-available/food-inventory /etc/nginx/sites-enabled/
        rm -f /etc/nginx/sites-enabled/default

        # Verificar y reiniciar
        nginx -t
        systemctl restart nginx
ENDSSH

    log_success "Nginx configurado"
}

setup_ssl() {
    log_info "Configurando SSL con Let's Encrypt..."

    ssh root@$SERVER_IP "bash -s" << ENDSSH
        certbot --nginx \
          -d $DOMAIN \
          -d www.$DOMAIN \
          -d $API_SUBDOMAIN \
          --non-interactive \
          --agree-tos \
          --email $EMAIL \
          --redirect
ENDSSH

    log_success "SSL configurado"
}

configure_firewall() {
    log_info "Configurando firewall..."

    ssh root@$SERVER_IP "bash -s" << ENDSSH
        ufw allow OpenSSH
        ufw allow 'Nginx Full'
        ufw --force enable
ENDSSH

    log_success "Firewall configurado"
}

verify_deployment() {
    log_info "Verificando deployment..."

    sleep 5

    # Verificar backend health
    if curl -f -s "https://$API_SUBDOMAIN/health" > /dev/null; then
        log_success "Backend responde correctamente"
    else
        log_warning "Backend no responde en https://$API_SUBDOMAIN/health"
    fi

    # Verificar frontend
    if curl -f -s "https://$DOMAIN" > /dev/null; then
        log_success "Frontend responde correctamente"
    else
        log_warning "Frontend no responde en https://$DOMAIN"
    fi
}

# =============================================================================
# MAIN
# =============================================================================

echo ""
echo "========================================="
echo "  Food Inventory SaaS - Hetzner Deploy  "
echo "========================================="
echo ""

check_config
test_ssh

log_info "Iniciando deployment a $DOMAIN ($SERVER_IP)..."
echo ""

# Ejecutar pasos de deployment
install_dependencies
create_user
configure_mongodb
clone_repo
configure_backend
configure_frontend
start_backend
configure_nginx
setup_ssl
configure_firewall

echo ""
log_success "========================================="
log_success "  DEPLOYMENT COMPLETADO"
log_success "========================================="
echo ""
log_info "URLs:"
log_success "  Frontend: https://$DOMAIN"
log_success "  Backend:  https://$API_SUBDOMAIN"
log_success "  Health:   https://$API_SUBDOMAIN/health"
echo ""
log_info "Próximos pasos:"
log_info "  1. Accede a https://$DOMAIN"
log_info "  2. Registra la primera cuenta (será superadmin)"
log_info "  3. Configura tu organización"
log_info "  4. Habilita módulo restaurant en settings"
echo ""
log_warning "IMPORTANTE: Cambia las contraseñas de MongoDB en producción"
echo ""

verify_deployment

exit 0

# Guía de Deployment a Hetzner - Food Inventory SaaS

## 📋 Requisitos Previos

### En tu máquina local:
- [ ] Git instalado
- [ ] Node.js 18+ instalado
- [ ] SSH key configurado

### En Hetzner:
- [ ] Servidor contratado (mínimo CPX21: 3 vCPU, 4GB RAM)
- [ ] Ubuntu 22.04 LTS instalado
- [ ] IP pública asignada
- [ ] Dominio apuntando al servidor (A record)

---

## 🚀 MÉTODO 1: Deployment Manual Paso a Paso (Recomendado para primera vez)

### PARTE 1: Configuración Inicial del Servidor

#### 1.1 Conectar al servidor

```bash
# Conectar vía SSH (reemplaza con tu IP)
ssh root@YOUR_SERVER_IP

# Actualizar sistema
apt update && apt upgrade -y
```

#### 1.2 Crear usuario no-root

```bash
# Crear usuario
adduser deployer

# Dar permisos sudo
usermod -aG sudo deployer

# Configurar SSH para nuevo usuario
mkdir -p /home/deployer/.ssh
cp ~/.ssh/authorized_keys /home/deployer/.ssh/
chown -R deployer:deployer /home/deployer/.ssh
chmod 700 /home/deployer/.ssh
chmod 600 /home/deployer/.ssh/authorized_keys

# Cambiar a nuevo usuario
su - deployer
```

#### 1.3 Instalar dependencias

```bash
# Node.js 18.x via NodeSource
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# PM2 para gestión de procesos
sudo npm install -g pm2

# Nginx
sudo apt install -y nginx

# Certbot para SSL
sudo apt install -y certbot python3-certbot-nginx

# Git
sudo apt install -y git

# MongoDB (Community Edition 7.0)
sudo apt-get install -y gnupg curl
curl -fsSL https://www.mongodb.org/static/pgp/server-7.0.asc | \
   sudo gpg -o /usr/share/keyrings/mongodb-server-7.0.gpg --dearmor

echo "deb [ arch=amd64,arm64 signed-by=/usr/share/keyrings/mongodb-server-7.0.gpg ] https://repo.mongodb.org/apt/ubuntu jammy/mongodb-org/7.0 multiverse" | \
   sudo tee /etc/apt/sources.list.d/mongodb-org-7.0.list

sudo apt-get update
sudo apt-get install -y mongodb-org

# Iniciar MongoDB
sudo systemctl start mongod
sudo systemctl enable mongod

# Verificar instalaciones
node --version  # Debe mostrar v18.x.x
npm --version
pm2 --version
nginx -v
mongod --version
```

---

### PARTE 2: Configurar MongoDB

#### 2.1 Crear usuario de base de datos

```bash
# Conectar a MongoDB
mongosh

# Dentro de mongosh:
use admin

db.createUser({
  user: "foodinventory_admin",
  pwd: "GENERA_PASSWORD_SEGURO_AQUI",  // Cambia esto
  roles: [
    { role: "userAdminAnyDatabase", db: "admin" },
    { role: "readWriteAnyDatabase", db: "admin" }
  ]
})

# Crear base de datos de producción
use food-inventory-prod

db.createUser({
  user: "foodinventory_app",
  pwd: "GENERA_PASSWORD_SEGURO_AQUI",  // Cambia esto
  roles: [
    { role: "readWrite", db: "food-inventory-prod" }
  ]
})

# Salir
exit
```

#### 2.2 Habilitar autenticación

```bash
# Editar configuración de MongoDB
sudo nano /etc/mongod.conf

# Descomentar y modificar la sección security:
security:
  authorization: enabled

# Reiniciar MongoDB
sudo systemctl restart mongod

# Verificar que funciona con autenticación
mongosh -u foodinventory_app -p --authenticationDatabase food-inventory-prod
```

---

### PARTE 3: Clonar y Configurar Aplicación

#### 3.1 Clonar repositorio

```bash
# Ir a directorio home
cd ~

# Clonar repo (ajusta la URL)
git clone https://github.com/TU_USUARIO/food-inventory-saas.git
cd food-inventory-saas

# O si usas SSH
# git clone git@github.com:TU_USUARIO/food-inventory-saas.git
```

#### 3.2 Configurar Backend

```bash
cd food-inventory-saas

# Copiar ejemplo de .env
cp .env.example .env

# Editar variables de entorno
nano .env
```

**Contenido del .env para producción:**

```bash
# Node Environment
NODE_ENV=production
PORT=3000

# MongoDB
MONGODB_URI=mongodb://foodinventory_app:TU_PASSWORD_AQUI@localhost:27017/food-inventory-prod?authSource=food-inventory-prod

# JWT
JWT_SECRET=GENERA_SECRET_SEGURO_AQUI_64_CARACTERES_MINIMO
JWT_EXPIRES_IN=7d

# CORS
CORS_ORIGINS=https://tu-dominio.com,https://www.tu-dominio.com

# Frontend URL
FRONTEND_URL=https://tu-dominio.com

# Email (Usar servicio como SendGrid, Mailgun, o SMTP)
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_USER=apikey
SMTP_PASSWORD=TU_SENDGRID_API_KEY
SMTP_FROM=noreply@tu-dominio.com

# Rate Limiting (ajusta según necesites)
RATE_LIMIT_TTL=60
RATE_LIMIT_MAX=100

# File Upload
MAX_FILE_SIZE=5242880
UPLOAD_DIR=./uploads

# Session Secret
SESSION_SECRET=GENERA_SECRET_SEGURO_AQUI_32_CARACTERES_MINIMO

# Redis (Opcional - para sesiones/cache)
# REDIS_HOST=localhost
# REDIS_PORT=6379
# REDIS_PASSWORD=

# Logs
LOG_LEVEL=info
```

**Generar secrets seguros:**

```bash
# Generar JWT_SECRET (64 caracteres)
openssl rand -base64 48

# Generar SESSION_SECRET (32 caracteres)
openssl rand -base64 24
```

#### 3.3 Instalar dependencias y compilar

```bash
# Instalar dependencias
npm ci --production=false

# Compilar aplicación
npm run build

# Verificar que dist/ se creó
ls dist/

# Instalar solo dependencias de producción
rm -rf node_modules
npm ci --production

# Verificar que funciona
node dist/main.js
# Debe mostrar: "Application is running on: http://localhost:3000"
# Ctrl+C para detener
```

---

### PARTE 4: Configurar Frontend

#### 4.1 Configurar variables de entorno

```bash
cd ~/food-inventory-saas/food-inventory-admin

# Crear archivo .env
nano .env
```

**Contenido del .env:**

```bash
# Backend API URL
VITE_API_URL=https://api.tu-dominio.com

# Frontend URL
VITE_FRONTEND_URL=https://tu-dominio.com

# Environment
VITE_ENV=production

# Feature Flags (opcional)
VITE_ENABLE_ANALYTICS=true
VITE_ENABLE_SENTRY=false
```

#### 4.2 Compilar frontend

```bash
# Instalar dependencias
npm ci

# Build para producción
npm run build

# Verificar que dist/ se creó
ls dist/
# Debe mostrar: index.html, assets/, etc.
```

---

### PARTE 5: Configurar PM2

#### 5.1 Crear archivo de configuración PM2

```bash
cd ~/food-inventory-saas/food-inventory-saas

# Crear ecosystem.config.js
nano ecosystem.config.js
```

**Contenido de ecosystem.config.js:**

```javascript
module.exports = {
  apps: [
    {
      name: 'food-inventory-api',
      script: './dist/main.js',
      instances: 2,  // Usar 2 instancias para load balancing
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
```

#### 5.2 Iniciar aplicación con PM2

```bash
# Crear directorio de logs
mkdir -p logs

# Iniciar aplicación
pm2 start ecosystem.config.js

# Verificar que está corriendo
pm2 status

# Ver logs en tiempo real
pm2 logs food-inventory-api

# Configurar PM2 para iniciar al arrancar servidor
pm2 startup systemd
# Ejecutar el comando que PM2 te muestra

pm2 save

# Comandos útiles de PM2:
# pm2 restart food-inventory-api  # Reiniciar
# pm2 stop food-inventory-api     # Detener
# pm2 delete food-inventory-api   # Eliminar
# pm2 logs food-inventory-api     # Ver logs
# pm2 monit                        # Monitor en tiempo real
```

---

### PARTE 6: Configurar Nginx

#### 6.1 Crear configuración de sitio

```bash
sudo nano /etc/nginx/sites-available/food-inventory
```

**Contenido del archivo (ANTES de SSL):**

```nginx
# Configuración temporal HTTP (se reemplazará después de SSL)
server {
    listen 80;
    listen [::]:80;
    server_name tu-dominio.com www.tu-dominio.com api.tu-dominio.com;

    # Tamaño máximo de upload
    client_max_body_size 10M;

    # Logs
    access_log /var/log/nginx/food-inventory-access.log;
    error_log /var/log/nginx/food-inventory-error.log;

    # Backend API (api.tu-dominio.com)
    location /api {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;

        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # Frontend (tu-dominio.com)
    location / {
        root /home/deployer/food-inventory-saas/food-inventory-admin/dist;
        try_files $uri $uri/ /index.html;

        # Cache para assets
        location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
            expires 1y;
            add_header Cache-Control "public, immutable";
        }
    }
}
```

#### 6.2 Habilitar sitio y verificar

```bash
# Crear symlink
sudo ln -s /etc/nginx/sites-available/food-inventory /etc/nginx/sites-enabled/

# Eliminar default si existe
sudo rm -f /etc/nginx/sites-enabled/default

# Verificar configuración
sudo nginx -t

# Si todo OK, reiniciar Nginx
sudo systemctl restart nginx

# Verificar que está corriendo
sudo systemctl status nginx
```

---

### PARTE 7: Configurar SSL con Let's Encrypt

#### 7.1 Obtener certificado SSL

```bash
# Obtener certificado (certbot configurará Nginx automáticamente)
sudo certbot --nginx -d tu-dominio.com -d www.tu-dominio.com -d api.tu-dominio.com

# Seguir el asistente:
# 1. Ingresa tu email
# 2. Acepta términos
# 3. Decide si compartir email (opcional)
# 4. Selecciona "2" para redirect HTTP → HTTPS

# Verificar que se creó el certificado
sudo certbot certificates
```

#### 7.2 Configuración Nginx final (después de SSL)

**Certbot modifica automáticamente el archivo, pero verifica que tenga esto:**

```bash
sudo nano /etc/nginx/sites-available/food-inventory
```

**Debe verse así después de Certbot:**

```nginx
# Redirect HTTP → HTTPS
server {
    listen 80;
    listen [::]:80;
    server_name tu-dominio.com www.tu-dominio.com api.tu-dominio.com;
    return 301 https://$server_name$request_uri;
}

# HTTPS - Backend API
server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name api.tu-dominio.com;

    # SSL Certificates
    ssl_certificate /etc/letsencrypt/live/tu-dominio.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/tu-dominio.com/privkey.pem;
    include /etc/letsencrypt/options-ssl-nginx.conf;
    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem;

    # Security Headers
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;

    # Tamaño máximo de upload
    client_max_body_size 10M;

    # Logs
    access_log /var/log/nginx/food-inventory-api-access.log;
    error_log /var/log/nginx/food-inventory-api-error.log;

    # Proxy a Backend
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

        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }
}

# HTTPS - Frontend
server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name tu-dominio.com www.tu-dominio.com;

    # SSL Certificates
    ssl_certificate /etc/letsencrypt/live/tu-dominio.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/tu-dominio.com/privkey.pem;
    include /etc/letsencrypt/options-ssl-nginx.conf;
    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem;

    # Security Headers
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;

    # Logs
    access_log /var/log/nginx/food-inventory-frontend-access.log;
    error_log /var/log/nginx/food-inventory-frontend-error.log;

    # Frontend
    root /home/deployer/food-inventory-saas/food-inventory-admin/dist;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    # Cache para assets estáticos
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # Evitar logs de favicon
    location = /favicon.ico {
        log_not_found off;
        access_log off;
    }
}
```

```bash
# Verificar configuración
sudo nginx -t

# Reiniciar Nginx
sudo systemctl restart nginx
```

#### 7.3 Configurar renovación automática

```bash
# Verificar timer de renovación
sudo systemctl status certbot.timer

# Si no está activo:
sudo systemctl enable certbot.timer
sudo systemctl start certbot.timer

# Probar renovación (dry-run)
sudo certbot renew --dry-run
```

---

### PARTE 8: Firewall (UFW)

```bash
# Habilitar UFW
sudo ufw allow OpenSSH
sudo ufw allow 'Nginx Full'
sudo ufw enable

# Verificar estado
sudo ufw status

# Debe mostrar:
# 22/tcp         ALLOW       Anywhere
# Nginx Full     ALLOW       Anywhere
```

---

### PARTE 9: Verificación Final

#### 9.1 Verificar servicios

```bash
# MongoDB
sudo systemctl status mongod

# PM2
pm2 status

# Nginx
sudo systemctl status nginx

# Verificar puertos
sudo netstat -tulpn | grep LISTEN
# Debe mostrar:
# 3000 - Node.js (PM2)
# 27017 - MongoDB
# 80 - Nginx
# 443 - Nginx
```

#### 9.2 Probar aplicación

```bash
# Probar backend
curl https://api.tu-dominio.com/health
# Debe retornar JSON con status: 'ok'

# Probar frontend
curl -I https://tu-dominio.com
# Debe retornar 200 OK

# Verificar SSL
curl -I https://tu-dominio.com | grep -i "strict-transport-security"
# Debe mostrar el header HSTS
```

#### 9.3 Acceder desde navegador

1. Abre https://tu-dominio.com
2. ✅ Debe cargar el frontend sin errores de SSL
3. ✅ Debe mostrar login/register
4. ✅ Intenta registrarte y hacer login

---

## 🚀 MÉTODO 2: Script de Deployment Automático

### Script completo para re-deploy (actualizaciones futuras)

```bash
# Crear script de deploy
nano ~/deploy.sh
```

**Contenido de deploy.sh:**

```bash
#!/bin/bash
set -e

echo "🚀 Starting deployment..."

# Colores para output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Directorios
BACKEND_DIR="$HOME/food-inventory-saas/food-inventory-saas"
FRONTEND_DIR="$HOME/food-inventory-saas/food-inventory-admin"

# 1. Pull latest code
echo -e "${YELLOW}📥 Pulling latest code...${NC}"
cd ~/food-inventory-saas
git pull origin main

# 2. Deploy Backend
echo -e "${YELLOW}🔧 Building backend...${NC}"
cd $BACKEND_DIR
npm ci --production=false
npm run build

# Remove dev dependencies
rm -rf node_modules
npm ci --production

# Restart PM2
echo -e "${YELLOW}🔄 Restarting backend...${NC}"
pm2 restart food-inventory-api
pm2 save

# 3. Deploy Frontend
echo -e "${YELLOW}🎨 Building frontend...${NC}"
cd $FRONTEND_DIR
npm ci
npm run build

# 4. Clear Nginx cache (opcional)
echo -e "${YELLOW}🧹 Clearing cache...${NC}"
sudo systemctl reload nginx

# 5. Verificar health
echo -e "${YELLOW}🏥 Checking health...${NC}"
sleep 5
response=$(curl -s -o /dev/null -w "%{http_code}" https://api.tu-dominio.com/health)

if [ $response = "200" ]; then
    echo -e "${GREEN}✅ Deployment successful!${NC}"
    echo -e "${GREEN}Backend: https://api.tu-dominio.com${NC}"
    echo -e "${GREEN}Frontend: https://tu-dominio.com${NC}"
else
    echo -e "${RED}❌ Health check failed with status: $response${NC}"
    echo "Check logs: pm2 logs food-inventory-api"
    exit 1
fi

echo -e "${GREEN}🎉 All done!${NC}"
```

```bash
# Hacer ejecutable
chmod +x ~/deploy.sh

# Usar para futuras actualizaciones
~/deploy.sh
```

---

## 🔄 Comandos de Mantenimiento

### Ver logs

```bash
# Logs de backend (PM2)
pm2 logs food-inventory-api
pm2 logs food-inventory-api --lines 100  # Últimas 100 líneas

# Logs de Nginx
sudo tail -f /var/log/nginx/food-inventory-api-error.log
sudo tail -f /var/log/nginx/food-inventory-frontend-error.log

# Logs de MongoDB
sudo tail -f /var/log/mongodb/mongod.log
```

### Reiniciar servicios

```bash
# Reiniciar backend
pm2 restart food-inventory-api

# Reiniciar Nginx
sudo systemctl restart nginx

# Reiniciar MongoDB
sudo systemctl restart mongod
```

### Backup de base de datos

```bash
# Crear script de backup
nano ~/backup-db.sh
```

**Contenido:**

```bash
#!/bin/bash
BACKUP_DIR="$HOME/backups/mongodb"
DATE=$(date +%Y%m%d_%H%M%S)

mkdir -p $BACKUP_DIR

mongodump \
  --uri="mongodb://foodinventory_app:TU_PASSWORD@localhost:27017/food-inventory-prod?authSource=food-inventory-prod" \
  --out="$BACKUP_DIR/backup_$DATE" \
  --gzip

# Eliminar backups más antiguos de 7 días
find $BACKUP_DIR -type d -mtime +7 -exec rm -rf {} +

echo "✅ Backup completed: $BACKUP_DIR/backup_$DATE"
```

```bash
chmod +x ~/backup-db.sh

# Ejecutar backup manual
~/backup-db.sh

# Configurar backup automático (diario a las 2 AM)
crontab -e
# Agregar:
0 2 * * * /home/deployer/backup-db.sh >> /home/deployer/backup.log 2>&1
```

### Monitoreo de recursos

```bash
# Ver uso de CPU/RAM
htop

# Ver uso de disco
df -h

# Ver procesos de Node
pm2 monit

# Ver conexiones de MongoDB
mongosh -u foodinventory_app -p --authenticationDatabase food-inventory-prod --eval "db.serverStatus().connections"
```

---

## 🐛 Troubleshooting

### Problema: Backend no inicia

```bash
# Ver logs detallados
pm2 logs food-inventory-api --err

# Verificar variables de entorno
pm2 show food-inventory-api

# Probar ejecución manual
cd ~/food-inventory-saas/food-inventory-saas
node dist/main.js
# Ver error exacto
```

### Problema: MongoDB connection error

```bash
# Verificar que MongoDB esté corriendo
sudo systemctl status mongod

# Probar conexión manual
mongosh -u foodinventory_app -p --authenticationDatabase food-inventory-prod

# Verificar MONGODB_URI en .env
cd ~/food-inventory-saas/food-inventory-saas
cat .env | grep MONGODB_URI
```

### Problema: 502 Bad Gateway

```bash
# Backend no está corriendo
pm2 status

# Si está parado, iniciar
pm2 start ecosystem.config.js

# Ver logs de Nginx
sudo tail -f /var/log/nginx/food-inventory-api-error.log
```

### Problema: SSL no funciona

```bash
# Verificar certificados
sudo certbot certificates

# Renovar manualmente
sudo certbot renew

# Verificar configuración de Nginx
sudo nginx -t

# Ver logs de certbot
sudo tail -f /var/log/letsencrypt/letsencrypt.log
```

### Problema: Frontend muestra página en blanco

```bash
# Verificar que dist/ existe
ls ~/food-inventory-saas/food-inventory-admin/dist/

# Verificar VITE_API_URL correcto
cd ~/food-inventory-saas/food-inventory-admin
cat .env

# Re-build
npm run build

# Ver logs del navegador (F12 → Console)
```

---

## 🔒 Seguridad Adicional (Opcional pero Recomendado)

### Fail2Ban (protección contra brute force)

```bash
sudo apt install -y fail2ban

# Configurar
sudo nano /etc/fail2ban/jail.local
```

```ini
[sshd]
enabled = true
port = ssh
logpath = /var/log/auth.log
maxretry = 3
bantime = 3600

[nginx-http-auth]
enabled = true
filter = nginx-http-auth
logpath = /var/log/nginx/food-inventory-*-error.log
maxretry = 5
bantime = 600
```

```bash
sudo systemctl restart fail2ban
sudo fail2ban-client status
```

### Actualizaciones automáticas de seguridad

```bash
sudo apt install -y unattended-upgrades
sudo dpkg-reconfigure -plow unattended-upgrades
```

---

## 📊 Checklist Final de Deployment

- [ ] Servidor configurado con usuario no-root
- [ ] Node.js, PM2, Nginx, MongoDB instalados
- [ ] MongoDB con autenticación habilitada
- [ ] Repositorio clonado
- [ ] Variables de entorno (.env) configuradas
- [ ] Backend compilado (npm run build)
- [ ] Frontend compilado (npm run build)
- [ ] PM2 iniciado y configurado para auto-start
- [ ] Nginx configurado y corriendo
- [ ] SSL instalado y funcionando
- [ ] Firewall (UFW) habilitado
- [ ] Dominio apuntando correctamente
- [ ] Health check pasando (https://api.tu-dominio.com/health)
- [ ] Frontend accesible (https://tu-dominio.com)
- [ ] Login/Register funcionando
- [ ] Script de backup configurado
- [ ] Script de deploy creado

---

## 🎯 URLs Finales

Después de completar el deployment, tendrás:

- **Frontend:** https://tu-dominio.com
- **Backend API:** https://api.tu-dominio.com
- **Health Check:** https://api.tu-dominio.com/health

---

## 📞 Soporte Post-Deployment

Si encuentras problemas:

1. **Revisa logs:** PM2, Nginx, MongoDB
2. **Verifica servicios:** systemctl status
3. **Prueba conectividad:** curl, ping
4. **Revisa DNS:** nslookup tu-dominio.com
5. **Valida SSL:** https://www.ssllabs.com/ssltest/

**Recursos útiles:**
- Documentación Nginx: https://nginx.org/en/docs/
- Documentación PM2: https://pm2.keymetrics.io/
- Documentación MongoDB: https://docs.mongodb.com/
- Let's Encrypt: https://letsencrypt.org/docs/

---

**¡Deployment completado! Tu aplicación Food Inventory SaaS está en producción. 🚀**

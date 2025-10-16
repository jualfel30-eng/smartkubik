# 🛡️ Guía de Deploy SEGURO - SmartKubik

> **ÚLTIMA ACTUALIZACIÓN:** 16 de Octubre 2025
> **SERVIDOR:** smartkubik-server (178.156.182.177)
> **DOMINIOS:** smartkubik.com, api.smartkubik.com

---

## 📋 INFORMACIÓN CRÍTICA

### Credenciales del Servidor
- **IP:** 178.156.182.177
- **Usuario:** deployer
- **SSH:** Configurado con SSH key desde tu Mac
- **Ubicación código:** `/home/deployer/smartkubik/`

### URLs de Producción
- **Frontend:** https://smartkubik.com
- **Backend API:** https://api.smartkubik.com
- **Health Check:** https://api.smartkubik.com/api/v1/health

---

## 🚨 REGLAS DE ORO (NUNCA OLVIDES)

1. ✅ **SIEMPRE hacer backup antes de deploy**
2. ✅ **NUNCA ejecutar `rm -rf` sin verificar 3 veces**
3. ✅ **SIEMPRE probar en local antes de deploy**
4. ✅ **USAR el script de deploy automático**
5. ✅ **Verificar que el backend esté corriendo antes de reiniciar**

---

## 🔐 PROCESO DE DEPLOY SEGURO

### Opción 1: Deploy Automático con Backup (RECOMENDADO)

Usa este comando desde tu Mac:

```bash
./safe-deploy.sh
```

Este script automáticamente:
1. ✅ Hace backup del código actual
2. ✅ Pull del código nuevo desde GitHub
3. ✅ Instala dependencias
4. ✅ Compila backend y frontend
5. ✅ Reinicia PM2 sin downtime
6. ✅ Verifica que todo funcione
7. ✅ Si algo falla, restaura el backup automáticamente

---

### Opción 2: Deploy Manual Paso a Paso

**Solo usa esto si el script automático falla**

#### Paso 1: Conectar al servidor
```bash
ssh deployer@178.156.182.177
```

#### Paso 2: Crear backup manual
```bash
cd ~
BACKUP_DIR="backups/smartkubik-$(date +%Y%m%d-%H%M%S)"
mkdir -p "$BACKUP_DIR"

# Backup del código
cp -r smartkubik "$BACKUP_DIR/"

# Backup de PM2
pm2 save
cp ~/.pm2/dump.pm2 "$BACKUP_DIR/"

echo "✅ Backup guardado en: $BACKUP_DIR"
```

#### Paso 3: Pull del código nuevo
```bash
cd ~/smartkubik
git pull origin main
```

#### Paso 4: Compilar Backend
```bash
cd ~/smartkubik/food-inventory-saas

# Instalar dependencias (si hay nuevas)
npm ci

# Compilar
npm run build

# Verificar que dist/ se creó correctamente
ls -la dist/main.js
```

#### Paso 5: Compilar Frontend
```bash
cd ~/smartkubik/food-inventory-admin

# Instalar dependencias (si hay nuevas)
npm ci

# Compilar
npm run build

# Verificar que dist/ se creó correctamente
ls -la dist/index.html
```

#### Paso 6: Reiniciar Backend (sin downtime)
```bash
cd ~/smartkubik/food-inventory-saas

# Reload (mantiene 1 instancia corriendo mientras reinicia la otra)
pm2 reload smartkubik-api

# Verificar que está corriendo
pm2 status

# Ver logs en tiempo real (Ctrl+C para salir)
pm2 logs smartkubik-api --lines 50
```

#### Paso 7: Verificar que todo funciona
```bash
# Test del backend
curl http://localhost:3000/api/v1/health

# Test del frontend
curl -I http://localhost
```

#### Paso 8: Test desde tu navegador
1. Abre https://smartkubik.com
2. Intenta hacer login
3. Verifica que todo funcione correctamente

---

## 🔄 ROLLBACK (Si algo sale mal)

### Rollback Automático
Si usaste el script de deploy automático y algo falló, el rollback ya se hizo automáticamente.

### Rollback Manual

```bash
cd ~

# 1. Listar backups disponibles
ls -la backups/

# 2. Elegir el backup más reciente
BACKUP_DIR="backups/smartkubik-YYYYMMDD-HHMMSS"

# 3. Detener PM2
pm2 delete all

# 4. Restaurar código
rm -rf smartkubik
cp -r "$BACKUP_DIR/smartkubik" .

# 5. Restaurar PM2
cp "$BACKUP_DIR/dump.pm2" ~/.pm2/

# 6. Reiniciar PM2
cd ~/smartkubik/food-inventory-saas
pm2 start ecosystem.config.js
pm2 save

# 7. Verificar
pm2 status
curl http://localhost:3000/api/v1/health
```

---

## 📊 COMANDOS ÚTILES DE MANTENIMIENTO

### Ver estado del servidor
```bash
ssh deployer@178.156.182.177 "pm2 status && echo '---' && df -h && echo '---' && free -h"
```

### Ver logs en tiempo real
```bash
ssh deployer@178.156.182.177 "pm2 logs smartkubik-api"
```

### Reiniciar sin downtime
```bash
ssh deployer@178.156.182.177 "cd ~/smartkubik/food-inventory-saas && pm2 reload smartkubik-api"
```

### Ver uso de memoria
```bash
ssh deployer@178.156.182.177 "pm2 monit"
```

### Limpiar logs antiguos
```bash
ssh deployer@178.156.182.177 "pm2 flush"
```

---

## 🐛 TROUBLESHOOTING

### El backend no inicia después del deploy

**Problema:** PM2 muestra status "errored" o reinicia constantemente

**Solución:**
```bash
ssh deployer@178.156.182.177

# Ver el error exacto
pm2 logs smartkubik-api --err --lines 50

# Probar ejecutar manualmente para ver el error
cd ~/smartkubik/food-inventory-saas
node dist/main.js
```

**Errores comunes:**
- `Cannot find module 'dotenv'` → Falta dependencia: `npm install dotenv`
- `ERR_REQUIRE_ESM` → Problema de Node version: Verificar que sea Node 20+
- `MongoDB connection failed` → Verificar .env y MongoDB Atlas

---

### Error 502 Bad Gateway

**Problema:** Nginx muestra error 502

**Solución:**
```bash
ssh deployer@178.156.182.177

# Verificar que PM2 esté corriendo
pm2 status

# Si está detenido, iniciar
cd ~/smartkubik/food-inventory-saas
pm2 start ecosystem.config.js

# Ver logs de Nginx
sudo tail -50 /var/log/nginx/smartkubik-error.log
```

---

### Frontend muestra página en blanco

**Problema:** https://smartkubik.com carga pero está en blanco

**Solución:**
```bash
ssh deployer@178.156.182.177

# Verificar que dist/ existe
ls -la ~/smartkubik/food-inventory-admin/dist/

# Re-compilar frontend
cd ~/smartkubik/food-inventory-admin
npm run build

# Verificar permisos
sudo chmod -R 755 ~/smartkubik/food-inventory-admin/dist

# Reiniciar Nginx
sudo systemctl restart nginx
```

---

### Error: "disk space full"

**Problema:** No hay espacio en disco

**Solución:**
```bash
ssh deployer@178.156.182.177

# Ver uso de disco
df -h

# Limpiar logs de PM2
pm2 flush

# Limpiar backups antiguos (más de 30 días)
find ~/backups -mtime +30 -type d -exec rm -rf {} +

# Limpiar npm cache
npm cache clean --force

# Limpiar logs de Nginx
sudo truncate -s 0 /var/log/nginx/*.log
```

---

## 📁 ESTRUCTURA DE DIRECTORIOS

```
/home/deployer/
├── smartkubik/                          # Código principal
│   ├── food-inventory-saas/             # Backend (NestJS)
│   │   ├── dist/                        # Backend compilado
│   │   ├── node_modules/
│   │   ├── .env                         # Variables de entorno
│   │   └── ecosystem.config.js          # Config de PM2
│   ├── food-inventory-admin/            # Frontend (React + Vite)
│   │   ├── dist/                        # Frontend compilado
│   │   ├── node_modules/
│   │   └── .env                         # Variables de entorno
│   └── food-inventory-storefront/       # Storefront (Next.js)
├── backups/                             # Backups automáticos
│   ├── smartkubik-20251016-120000/
│   └── smartkubik-20251016-130000/
└── .pm2/                                # PM2 configs
    └── dump.pm2                         # Estado de PM2
```

---

## 🔧 VARIABLES DE ENTORNO

### Backend (.env en food-inventory-saas/)

**CRÍTICAS - NUNCA compartir:**
```bash
JWT_SECRET=fXXhCBzwzGpRNjGfuI9Wt3QfMz9E5DOTJ81seQBe/nv4Y6h+6WaBz6+xZULC2GjP
JWT_REFRESH_SECRET=LQQ1oHTkfGe0rdh0g1829DlRVBiQR168
SESSION_SECRET=LQQ1oHTkfGe0rdh0g1829DlRVBiQR168
MONGODB_URI=mongodb+srv://kubik:Chipi.24@cluster0.mbtyprl.mongodb.net/food-inventory-prod?retryWrites=true&w=majority&appName=Cluster0
```

**Configuración:**
```bash
NODE_ENV=production
PORT=3000
CORS_ORIGIN=https://smartkubik.com,https://www.smartkubik.com
```

### Frontend (.env en food-inventory-admin/)

```bash
VITE_API_URL=https://api.smartkubik.com/api/v1
VITE_ENABLE_MULTI_TENANT_LOGIN=true
```

---

## 📞 CONTACTOS DE EMERGENCIA

### Proveedores
- **Hosting:** Hetzner (https://console.hetzner.cloud)
- **Dominio:** Namecheap (smartkubik.com)
- **Base de datos:** MongoDB Atlas (cluster0.mbtyprl.mongodb.net)

### Logs Importantes
- **Backend:** `pm2 logs smartkubik-api`
- **Nginx Access:** `/var/log/nginx/smartkubik-access.log`
- **Nginx Error:** `/var/log/nginx/smartkubik-error.log`

---

## ✅ CHECKLIST POST-DEPLOY

Después de cada deploy, verifica:

- [ ] Backend responde: `curl https://api.smartkubik.com/api/v1/health`
- [ ] Frontend carga: Abrir https://smartkubik.com
- [ ] Login funciona
- [ ] PM2 status: `ssh deployer@178.156.182.177 "pm2 status"`
- [ ] Sin errores en logs: `ssh deployer@178.156.182.177 "pm2 logs --lines 20"`
- [ ] Disco con espacio: `ssh deployer@178.156.182.177 "df -h"`
- [ ] Memoria suficiente: `ssh deployer@178.156.182.177 "free -h"`

---

## 🎯 PRÓXIMOS PASOS RECOMENDADOS

1. **Configurar CI/CD con GitHub Actions** (deploy automático en cada push)
2. **Configurar alertas de Uptime** (UptimeRobot o similar)
3. **Configurar backups automáticos de MongoDB** (MongoDB Atlas Backups)
4. **Implementar monitoring** (Sentry para errores frontend/backend)
5. **Configurar backups diarios automáticos** (cron job)

---

**¿Dudas? Contacta al equipo de desarrollo.**

**Última actualización:** 16 de Octubre 2025

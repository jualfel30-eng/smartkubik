# 🚀 DEPLOYMENT CHECKLIST - SMARTKUBIK

## ⚠️ IMPORTANTE: Sigue estos pasos EXACTAMENTE

### 1️⃣ **En tu servidor (ANTES de git pull):**

```bash
# Conéctate al servidor
ssh root@tu-servidor-vultr

# Backup del estado actual (por si acaso)
cd /ruta/al/proyecto
tar -czf backup-$(date +%Y%m%d-%H%M%S).tar.gz food-inventory-*
```

---

### 2️⃣ **Pull del código:**

```bash
cd /ruta/al/proyecto
git pull origin main
```

---

### 3️⃣ **Configurar variables de entorno:**

#### **Admin Panel:**
```bash
cd food-inventory-admin
cp .env.production .env
# Edita la URL del API si es diferente:
nano .env
# Cambia VITE_API_URL si tu backend NO está en https://api.smartkubik.com
```

#### **Backend:**
```bash
cd ../food-inventory-saas
# El .env del backend NO debe estar en Git (tiene secrets)
# Asegúrate de que tenga estas variables CRÍTICAS:
nano .env
```

Contenido mínimo del `.env` del backend:
```env
# Database
MONGODB_URI=mongodb://localhost:27017/food-inventory-saas

# JWT
JWT_SECRET=tu-secret-super-seguro
JWT_EXPIRES_IN=7d

# App
PORT=3000
NODE_ENV=production

# Frontend URL (para CORS)
FRONTEND_URL=https://smartkubik.com

# Email (si usas)
MAIL_HOST=smtp.gmail.com
MAIL_PORT=587
MAIL_USER=tu-email@gmail.com
MAIL_PASS=tu-app-password

# Feature Flags (IMPORTANTE)
ENABLE_MULTI_TENANT_LOGIN=true
```

#### **Storefront:**
```bash
cd ../food-inventory-storefront
# Crea el .env si no existe:
cat > .env.local << 'EOF'
NEXT_PUBLIC_API_URL=https://api.smartkubik.com/api/v1
EOF
```

---

### 4️⃣ **Install dependencias (solo si package.json cambió):**

```bash
cd /ruta/al/proyecto

# Admin
cd food-inventory-admin && npm install

# Backend
cd ../food-inventory-saas && npm install

# Storefront
cd ../food-inventory-storefront && npm install
```

---

### 5️⃣ **Build todas las aplicaciones:**

```bash
cd /ruta/al/proyecto

# Admin
cd food-inventory-admin
npm run build

# Backend
cd ../food-inventory-saas
npm run build

# Storefront
cd ../food-inventory-storefront
npm run build
```

---

### 6️⃣ **Reiniciar servicios:**

```bash
# Si usas PM2:
pm2 restart all
pm2 logs --lines 50

# Si usas systemd:
sudo systemctl restart food-inventory-admin
sudo systemctl restart food-inventory-saas
sudo systemctl restart food-inventory-storefront

# Ver logs:
sudo journalctl -u food-inventory-admin -f
```

---

### 7️⃣ **Verificar que todo funciona:**

```bash
# Check admin
curl https://smartkubik.com

# Check API
curl https://api.smartkubik.com/api/v1/health

# Check storefront (usa un dominio configurado)
curl https://tudominio.smartkubik.com
```

---

## 🔍 **TROUBLESHOOTING COMÚN:**

### **Problema: Login pide código de tenant**
**Solución:** Verificar que `VITE_ENABLE_MULTI_TENANT_LOGIN=true` en `/food-inventory-admin/.env`

### **Problema: Página en blanco en admin**
**Solución:**
1. Verificar que el build se hizo: `ls -la food-inventory-admin/dist/`
2. Verificar Nginx apunta a `dist/`: `cat /etc/nginx/sites-enabled/smartkubik`
3. Reload Nginx: `sudo systemctl reload nginx`

### **Problema: 500 errors en el backend**
**Solución:**
1. Ver logs: `pm2 logs food-inventory-saas --lines 100`
2. Verificar MongoDB: `mongosh` y `show dbs`
3. Verificar variables de entorno: `cd food-inventory-saas && cat .env`

### **Problema: CORS errors**
**Solución:** Verificar que `FRONTEND_URL` en el backend `.env` coincide con tu dominio

---

## 📋 **CHECKLIST POST-DEPLOYMENT:**

- [ ] Login funciona sin código de tenant
- [ ] Puedes ver organizaciones
- [ ] Storefront carga correctamente
- [ ] API responde en `/api/v1/health`
- [ ] No hay errores en los logs (`pm2 logs`)
- [ ] CSS y assets cargan correctamente

---

## 🆘 **Si algo falla:**

```bash
# Restaurar backup
cd /ruta/al/proyecto
tar -xzf backup-FECHA.tar.gz

# Reiniciar servicios
pm2 restart all
```

---

## 📞 **Notas importantes:**

1. **El `.env` del admin DEBE tener `VITE_ENABLE_MULTI_TENANT_LOGIN=true`**
2. **Siempre hacer backup antes de deploy**
3. **Verificar logs después de reiniciar servicios**
4. **El archivo `.env.production` es una plantilla, cópialo como `.env`**

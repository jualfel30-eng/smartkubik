# 🎯 SmartKubik Demo Pages Deployment Guide

Sistema completo para deployar páginas demo de clientes potenciales como subdominios de SmartKubik.

## 📋 Tabla de Contenidos

- [Arquitectura](#-arquitectura)
- [Prerequisitos](#-prerequisitos)
- [Guía Rápida](#-guía-rápida)
- [Guía Paso a Paso](#-guía-paso-a-paso)
- [Gestión de Demos](#-gestión-de-demos)
- [Configuración DNS](#-configuración-dns)
- [Troubleshooting](#-troubleshooting)

---

## 🏗 Arquitectura

```
smartkubik.com
├── app.smartkubik.com        → Admin Panel (React)
├── api.smartkubik.com        → Backend API (NestJS)
├── tienda.smartkubik.com     → Storefront (Next.js)
├── smartkubik.com/blog       → Blog (Next.js)
└── [DEMOS]
    ├── restaurante-casa-pepe.smartkubik.com     → Demo 1 (Puerto 5001)
    ├── cafeteria-dulce-aroma.smartkubik.com     → Demo 2 (Puerto 5002)
    ├── panaderia-el-trigal.smartkubik.com       → Demo 3 (Puerto 5003)
    └── boutique-fashion-store.smartkubik.com    → Demo 4 (Puerto 5004)
```

**Cada demo corre:**
- En su propio proceso PM2 (`demo-{subdomain}`)
- En puerto único (5001, 5002, 5003...)
- Con configuración Nginx dedicada
- Con SSL wildcard (*.smartkubik.com)

---

## 📦 Prerequisitos

### En tu máquina local:
- ✅ Node.js 18+ instalado
- ✅ Git configurado
- ✅ Acceso SSH al servidor (`deployer@178.156.182.177`)
- ✅ Páginas demo en directorios independientes

### En el servidor (ya configurado):
- ✅ PM2 instalado y corriendo
- ✅ Nginx instalado y configurado
- ✅ Certificado SSL wildcard para *.smartkubik.com
- ✅ Directorio `~/smartkubik/` creado

---

## ⚡ Guía Rápida

```bash
# 1. Dale permisos de ejecución a los scripts
chmod +x deploy-demo-page.sh enable-demo-nginx.sh manage-demos.sh

# 2. Deploy una demo
./deploy-demo-page.sh ../path/to/demo restaurante-casa-pepe 5001

# 3. Habilita Nginx para el subdominio
./enable-demo-nginx.sh restaurante-casa-pepe

# 4. Verifica que esté corriendo
./manage-demos.sh list
```

¡Listo! Tu demo está en `https://restaurante-casa-pepe.smartkubik.com`

---

## 📖 Guía Paso a Paso

### 1. Preparar tu Página Demo

Tu página debe ser un proyecto React, Next.js, o Vue con:

```bash
# Estructura mínima
mi-demo/
├── package.json          # ← Requerido
├── src/
└── dist/                 # ← Generado con npm run build
    # o
    .next/                # ← Para Next.js
```

Asegúrate de que tu `package.json` tenga:

```json
{
  "scripts": {
    "build": "vite build",      // o "next build"
    "start": "next start"       // Solo para Next.js
  }
}
```

### 2. Deploy de la Demo

**Sintaxis:**
```bash
./deploy-demo-page.sh <DIRECTORIO_DEMO> <SUBDOMINIO> <PUERTO>
```

**Ejemplo Real:**
```bash
./deploy-demo-page.sh \
  ../clientes-carnada/restaurante-casa-pepe \
  restaurante-casa-pepe \
  5001
```

**Qué hace este script:**
1. ✅ Verifica que el directorio existe y tiene `package.json`
2. 📦 Instala dependencias (`npm install`) si es necesario
3. 🔨 Builda el proyecto localmente (`npm run build`)
4. 📤 Sube archivos compilados al servidor vía rsync
5. 🔄 Inicia/recarga proceso PM2
6. ⚙️ Genera configuración Nginx automáticamente

**Salida esperada:**
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🚀 SmartKubik Demo Page Deploy
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Demo: restaurante-casa-pepe
Subdomain: restaurante-casa-pepe.smartkubik.com
Port: 5001

📦 Checking dependencies...
✅ Dependencies OK
🔨 Building demo page locally...
✅ Demo built successfully
📁 Creating remote directory structure...
📤 Uploading demo files to server...
✅ Files uploaded
🔄 Managing PM2 process...
✅ Demo started with PM2
⚙️  Generating Nginx configuration...
✅ Nginx config generated
🔍 Verifying deployment...
✅ Demo is responding on port 5001

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🎉 DEMO DEPLOYMENT SUCCESSFUL!
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

### 3. Habilitar Nginx

El script anterior genera la configuración Nginx pero NO la activa (por seguridad).

**Para activarla:**
```bash
./enable-demo-nginx.sh restaurante-casa-pepe
```

**Qué hace:**
1. ✅ Copia config a `/etc/nginx/sites-available/`
2. 🔗 Crea symlink en `/etc/nginx/sites-enabled/`
3. 🧪 Testea configuración Nginx
4. ♻️ Recarga Nginx (sin downtime)
5. 🔍 Verifica que el sitio responda

### 4. Configurar DNS (Una sola vez)

Necesitas agregar un registro **wildcard** en tu DNS provider (Cloudflare, NameCheap, etc.):

```
Tipo    Nombre    Valor                   TTL
A       *         178.156.182.177         Auto
```

O registros individuales:
```
Tipo    Nombre                    Valor               TTL
A       restaurante-casa-pepe     178.156.182.177     Auto
A       cafeteria-dulce-aroma     178.156.182.177     Auto
```

**Verificar DNS:**
```bash
nslookup restaurante-casa-pepe.smartkubik.com
# Debe devolver: 178.156.182.177
```

---

## 🎛 Gestión de Demos

### Listar todas las demos activas

```bash
./manage-demos.sh list
```

**Output:**
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📋 Deployed Demo Pages
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

SUBDOMAIN                      STATUS     PORT            URL
────────────────────────────────────────────────────────────────────────────
restaurante-casa-pepe          online     5001            https://restaurante-casa-pepe.smartkubik.com
cafeteria-dulce-aroma          online     5002            https://cafeteria-dulce-aroma.smartkubik.com
```

### Detener una demo (preserva archivos)

```bash
./manage-demos.sh stop restaurante-casa-pepe
```

La demo deja de servir pero los archivos quedan en el servidor.

### Reiniciar una demo

```bash
./manage-demos.sh restart restaurante-casa-pepe
```

Útil después de cambios en configuración o si la demo crasheó.

### Ver logs en tiempo real

```bash
./manage-demos.sh logs restaurante-casa-pepe
```

Presiona `Ctrl+C` para salir.

### Eliminar completamente una demo

```bash
./manage-demos.sh remove restaurante-casa-pepe
```

⚠️ **Esto elimina:**
- Proceso PM2
- Archivos del servidor
- Configuración Nginx

Te pedirá confirmación antes de borrar.

### Ver estado de PM2

```bash
./manage-demos.sh status
```

---

## 🌐 Configuración DNS

### Opción 1: Wildcard DNS (Recomendado)

Configura **una sola vez** y todos los subdominios funcionan automáticamente.

**En Cloudflare:**
1. Ve a DNS settings de `smartkubik.com`
2. Add record:
   - Type: `A`
   - Name: `*`
   - Content: `178.156.182.177`
   - Proxy status: DNS only (gris)
   - TTL: Auto

**Ventaja:** No necesitas agregar DNS para cada nueva demo.

### Opción 2: DNS Individual

Agrega un registro A por cada demo:

```
A    restaurante-casa-pepe    178.156.182.177    Auto
A    cafeteria-dulce-aroma    178.156.182.177    Auto
A    panaderia-el-trigal      178.156.182.177    Auto
```

**Ventaja:** Mayor control sobre cada subdominio.

---

## 📊 Asignación de Puertos

Para evitar conflictos, usa esta convención:

| Rango         | Uso                                    |
|---------------|----------------------------------------|
| 3000          | Backend API (smartkubik-api)           |
| 3001          | Storefront (smartkubik-storefront)     |
| 3032          | Blog (smartkubik-blog)                 |
| 5001 - 5100   | **Demos de clientes** (disponible)     |
| 8000+         | Desarrollo local                       |

**Próximo puerto disponible:** 5001 (si no tienes demos aún)

---

## 🛠 Troubleshooting

### ❌ Error: "Demo is responding with HTTP 502"

**Causa:** PM2 no está corriendo o crasheó.

**Solución:**
```bash
ssh deployer@178.156.182.177
pm2 list
pm2 restart demo-restaurante-casa-pepe
pm2 logs demo-restaurante-casa-pepe --lines 50
```

### ❌ Error: "SSL certificate error"

**Causa:** El certificado wildcard no cubre este subdominio.

**Solución:**
```bash
ssh deployer@178.156.182.177
sudo certbot certificates  # Ver qué dominios cubre

# Si no tiene wildcard, obtener uno
sudo certbot certonly \
  --manual \
  --preferred-challenges=dns \
  -d smartkubik.com \
  -d *.smartkubik.com
```

### ❌ Error: "Connection refused"

**Causa:** Puerto ya está en uso.

**Solución:**
```bash
# Verificar qué está usando el puerto
ssh deployer@178.156.182.177 "lsof -i :5001"

# Usar otro puerto
./deploy-demo-page.sh ../mi-demo restaurante-casa-pepe 5002
```

### ❌ Error: "nginx: configuration test failed"

**Causa:** Error en sintaxis del nginx config.

**Solución:**
```bash
ssh deployer@178.156.182.177
sudo nginx -t  # Ver el error específico
sudo nano /etc/nginx/sites-available/restaurante-casa-pepe.conf

# Corregir y volver a testear
sudo nginx -t
sudo systemctl reload nginx
```

### ❌ La demo se ve en HTTP pero no en HTTPS

**Causa:** Firewall bloqueando puerto 443 o SSL cert no configurado.

**Solución:**
```bash
# Verificar firewall
ssh deployer@178.156.182.177
sudo ufw status
sudo ufw allow 443/tcp

# Verificar SSL
sudo certbot certificates
```

### ❌ Cambios no se reflejan después de redeploy

**Causa:** Caché del navegador o Nginx.

**Solución:**
```bash
# Limpiar caché Nginx
ssh deployer@178.156.182.177
sudo systemctl reload nginx

# Hard refresh en navegador
# Mac: Cmd + Shift + R
# Windows/Linux: Ctrl + Shift + R
```

---

## 📝 Workflow Recomendado

### Para agregar una nueva demo:

```bash
# 1. Verifica que tu demo esté lista
cd /path/to/tu-demo
npm install
npm run build  # Test local build

# 2. Deploy
cd /path/to/smartkubik/FOOD-INVENTORY-SAAS-COMPLETO
./deploy-demo-page.sh ../demos/mi-nueva-demo mi-nueva-demo 5004

# 3. Habilita Nginx
./enable-demo-nginx.sh mi-nueva-demo

# 4. Verifica
./manage-demos.sh list
curl -I https://mi-nueva-demo.smartkubik.com
```

### Para actualizar una demo existente:

```bash
# Mismo comando que el deploy inicial
./deploy-demo-page.sh ../demos/mi-demo mi-demo 5001

# NO necesitas ejecutar enable-demo-nginx.sh de nuevo
# El script detecta que ya existe y hace reload automático
```

---

## 🎨 Personalización por Cliente

### Variables de entorno

Crea archivos `.env` específicos para cada demo:

**`.env.restaurante`**
```env
VITE_DEMO_NAME=restaurante-casa-pepe
VITE_BRAND_PRIMARY=#e74c3c
VITE_BRAND_LOGO=/assets/restaurante-logo.png
VITE_CTA_TEXT=Quiero esta solución para mi restaurante
VITE_CONTACT_PHONE=+1234567890
```

**Build con env específico:**
```bash
# En tu package.json
"scripts": {
  "build:restaurante": "VITE_ENV_FILE=.env.restaurante vite build",
  "build:cafeteria": "VITE_ENV_FILE=.env.cafeteria vite build"
}

# Deploy
npm run build:restaurante
./deploy-demo-page.sh . restaurante-casa-pepe 5001
```

---

## 📈 Tracking y Analytics

### Google Analytics por demo

En cada demo, agrega:

```javascript
// src/analytics.js
export const trackDemoInterest = (action) => {
  if (window.gtag) {
    gtag('event', 'demo_interaction', {
      demo_name: 'restaurante-casa-pepe',
      action: action, // 'page_view', 'cta_click', 'contact_form'
      timestamp: new Date().toISOString()
    });
  }
};
```

```jsx
// En tu componente
import { trackDemoInterest } from './analytics';

function ContactButton() {
  return (
    <button onClick={() => {
      trackDemoInterest('contact_click');
      // ... tu lógica
    }}>
      Contactar
    </button>
  );
}
```

---

## 🚀 Scripts Disponibles

| Script                    | Descripción                                    |
|---------------------------|------------------------------------------------|
| `deploy-demo-page.sh`     | Deploy completo de una demo                    |
| `enable-demo-nginx.sh`    | Activa Nginx para una demo                     |
| `manage-demos.sh`         | Gestiona demos (list, stop, remove, logs)      |
| `simple-deploy.sh`        | Deploy del sistema principal SmartKubik        |

---

## 📞 Soporte

Si encuentras problemas:

1. Revisa los logs: `./manage-demos.sh logs <subdomain>`
2. Verifica PM2: `ssh deployer@178.156.182.177 "pm2 status"`
3. Testea Nginx: `ssh deployer@178.156.182.177 "sudo nginx -t"`
4. Revisa DNS: `nslookup <subdomain>.smartkubik.com`

---

## ✅ Checklist Pre-Deploy

- [ ] Demo tiene `package.json` válido
- [ ] `npm run build` funciona localmente
- [ ] Puerto elegido no está en uso (5001-5100)
- [ ] Subdominio no está duplicado
- [ ] DNS wildcard configurado (una sola vez)
- [ ] Scripts tienen permisos de ejecución (`chmod +x`)

¡Listo para deployar tus demos! 🚀

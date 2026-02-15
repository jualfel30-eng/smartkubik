# 🏪 Guía de Deployment del Storefront

## 📋 Resumen

El storefront de SmartKubik es una aplicación Next.js que permite a los clientes (tenants) tener sus propias tiendas online en subdominios de `smartkubik.com`. Por ejemplo:
- `restaurante-jose.smartkubik.com`
- `tienda-maria.smartkubik.com`
- `panaderia-central.smartkubik.com`

## 🚀 Deployment Automático

El storefront ahora está incluido en los scripts de deployment automáticos:

### 1. Pre-Deploy (Instalar Dependencias)
```bash
./pre-deploy.sh
```

Este script:
- ✅ Instala dependencias del backend
- ✅ Instala dependencias del frontend (admin)
- ✅ Instala dependencias del storefront
- ✅ Verifica que todas las instalaciones sean exitosas

### 2. Simple Deploy (Build y Subir a Producción)
```bash
./simple-deploy.sh
```

Este script:
- ✅ Construye el backend
- ✅ Construye el frontend (admin)
- ✅ Construye el storefront (Next.js)
- ✅ Sube todos los builds al servidor
- ✅ Sube la configuración de nginx
- ✅ Instala dependencias en el servidor si es necesario
- ✅ Inicia/recarga el storefront con PM2
- ✅ Verifica que todo esté funcionando

## ⚙️ Configuración Manual en el Servidor (Primera Vez)

Después de ejecutar `./simple-deploy.sh` por primera vez, necesitas configurar nginx manualmente:

### 1. SSH al Servidor
```bash
ssh deployer@178.156.182.177
```

### 2. Copiar Configuración de Nginx
```bash
sudo cp ~/smartkubik/nginx-configs/storefront-subdomain.conf /etc/nginx/sites-available/storefront-subdomain
```

### 3. Habilitar el Sitio
```bash
sudo ln -s /etc/nginx/sites-available/storefront-subdomain /etc/nginx/sites-enabled/storefront-subdomain
```

### 4. Verificar la Configuración
```bash
sudo nginx -t
```

Deberías ver:
```
nginx: the configuration file /etc/nginx/nginx.conf syntax is ok
nginx: configuration file /etc/nginx/nginx.conf test is successful
```

### 5. Recargar Nginx
```bash
sudo systemctl reload nginx
```

### 6. Obtener Certificado SSL para Subdominios (Opcional pero Recomendado)

**Opción A: Certificado Wildcard (Recomendado)**
```bash
sudo certbot --nginx -d "*.smartkubik.com" -d smartkubik.com
```

**Opción B: Certificado por Subdominio**
```bash
sudo certbot --nginx -d cliente1.smartkubik.com
```

## 🔍 Verificación del Deployment

### 1. Verificar PM2
```bash
pm2 list
```

Deberías ver:
```
┌────────────────────────┬─────┬─────────┬─────────┐
│ Name                   │ id  │ mode    │ status  │
├────────────────────────┼─────┼─────────┼─────────┤
│ smartkubik-api         │ 0   │ cluster │ online  │
│ smartkubik-storefront  │ 1   │ fork    │ online  │
└────────────────────────┴─────┴─────────┴─────────┘
```

### 2. Verificar que el Storefront Responde
```bash
curl http://localhost:3001
```

Deberías recibir una respuesta HTML del storefront.

### 3. Verificar Logs del Storefront
```bash
pm2 logs smartkubik-storefront
```

### 4. Verificar Nginx Logs
```bash
sudo tail -f /var/log/nginx/storefront-access.log
sudo tail -f /var/log/nginx/storefront-error.log
```

## 🌐 Cómo Funciona

### Arquitectura

```
Cliente → Nginx (puerto 80/443) → Storefront (Next.js en puerto 3001)
                 ↓
            Backend API (puerto 3000)
```

### Flujo de Subdominios

1. Cliente accede a `tienda.smartkubik.com`
2. Nginx captura el subdominio usando regex
3. Nginx hace proxy pass al storefront en `localhost:3001`
4. Next.js recibe el request con el header `Host: tienda.smartkubik.com`
5. El storefront usa el subdominio para determinar qué tenant mostrar
6. El storefront hace requests a la API backend en `api.smartkubik.com`

### Subdominios Excluidos

Los siguientes subdominios NO se enrutan al storefront (tienen sus propios configs):
- `admin.smartkubik.com` → Frontend Admin
- `api.smartkubik.com` → Backend API
- `www.smartkubik.com` → Redirige al admin

## 📁 Estructura de Archivos en el Servidor

```
~/smartkubik/
├── food-inventory-saas/       # Backend NestJS
│   ├── dist/                  # Build compilado
│   └── node_modules/
├── food-inventory-admin/      # Frontend Admin (React)
│   └── dist/                  # Build compilado
├── food-inventory-storefront/ # Storefront (Next.js)
│   ├── .next/                 # Build de Next.js
│   ├── public/                # Assets estáticos
│   ├── .env.local             # Variables de entorno
│   └── node_modules/
└── nginx-configs/             # Configuraciones de nginx
    └── storefront-subdomain.conf
```

## 🔧 Variables de Entorno del Storefront

El archivo `.env.local` en el servidor contiene:

```bash
# API Configuration
NEXT_PUBLIC_API_URL=https://api.smartkubik.com/api/v1
```

Este archivo se copia automáticamente desde `.env.production` durante el deployment.

## 🛠️ Comandos Útiles

### Reiniciar el Storefront
```bash
ssh deployer@178.156.182.177 "pm2 restart smartkubik-storefront"
```

### Ver Logs en Tiempo Real
```bash
ssh deployer@178.156.182.177 "pm2 logs smartkubik-storefront --lines 100"
```

### Ver Estado de PM2
```bash
ssh deployer@178.156.182.177 "pm2 status"
```

### Reiniciar Nginx
```bash
ssh deployer@178.156.182.177 "sudo systemctl reload nginx"
```

## 🐛 Troubleshooting

### El storefront no carga (502 Bad Gateway)

**Causa:** El proceso PM2 del storefront no está corriendo.

**Solución:**
```bash
ssh deployer@178.156.182.177
pm2 start npm --name smartkubik-storefront -- start
cd ~/smartkubik/food-inventory-storefront
pm2 save
```

### El subdominio no funciona

**Causa:** Nginx no está configurado o el DNS no apunta al servidor.

**Verificar DNS:**
```bash
dig tienda.smartkubik.com
```

Debe apuntar a `178.156.182.177`

**Verificar Nginx:**
```bash
sudo nginx -t
sudo systemctl status nginx
```

### Error "Module not found" en el storefront

**Causa:** Las dependencias no se instalaron en el servidor.

**Solución:**
```bash
ssh deployer@178.156.182.177
cd ~/smartkubik/food-inventory-storefront
npm ci --production
pm2 restart smartkubik-storefront
```

### El storefront muestra contenido desactualizado

**Causa:** El build de Next.js no se actualizó.

**Solución:**
Re-ejecutar el deployment:
```bash
./simple-deploy.sh
```

## 📊 Monitoreo

### Dashboard de PM2
```bash
pm2 monit
```

### Ver Uso de Recursos del Storefront
```bash
pm2 show smartkubik-storefront
```

### Logs de Nginx por Subdominio
```bash
sudo tail -f /var/log/nginx/storefront-access.log | grep "tienda.smartkubik.com"
```

## 🔐 Seguridad

### Certificados SSL

Los certificados SSL se renuevan automáticamente con certbot. Para verificar:

```bash
sudo certbot certificates
```

### Renovación Manual (si es necesario)
```bash
sudo certbot renew
sudo systemctl reload nginx
```

## 📝 Notas Importantes

1. **Next.js en Producción**: El storefront usa `next start` en modo producción, no `next dev`.

2. **Puerto 3001**: El storefront corre en el puerto 3001, separado del backend (3000) y el admin.

3. **PM2 Auto-Start**: El storefront está configurado para iniciarse automáticamente cuando el servidor se reinicia (via `pm2 save` y `pm2 startup`).

4. **Build Incremental**: Next.js hace builds incrementales, lo que significa que los deployments posteriores son más rápidos.

5. **Caché de Imágenes**: Next.js optimiza imágenes automáticamente. El caché se almacena en `.next/cache/images`.

## 🚀 Próximos Pasos

Después del deployment exitoso:

1. ✅ Probar un subdominio de ejemplo (ej: `demo.smartkubik.com`)
2. ✅ Configurar DNS para apuntar `*.smartkubik.com` al servidor
3. ✅ Obtener certificado SSL wildcard
4. ✅ Documentar cómo los tenants configuran sus subdominios
5. ✅ Configurar CDN (opcional) para assets estáticos

---

**¿Necesitas ayuda?** Revisa los logs con `pm2 logs smartkubik-storefront` o contacta al equipo de desarrollo.

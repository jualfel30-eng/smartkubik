# 🌐 GUÍA DE CONFIGURACIÓN DE SUBDOMINIOS

Esta guía te permite ofrecer subdominios tipo `cliente.smartkubik.com` a tus tenants.

---

## 📋 REQUISITOS

- Servidor con Nginx instalado
- Dominio principal: `smartkubik.com`
- Storefront corriendo en puerto 3001
- Certbot instalado (para SSL)

---

## 🚀 INSTALACIÓN (EN EL SERVIDOR)

### **PASO 1: Configurar Nginx**

```bash
# 1. Copiar la configuración de nginx
sudo cp nginx-configs/storefront-subdomain.conf /etc/nginx/sites-available/storefront-subdomain

# 2. Crear enlace simbólico
sudo ln -s /etc/nginx/sites-available/storefront-subdomain /etc/nginx/sites-enabled/

# 3. Verificar sintaxis
sudo nginx -t

# 4. Si todo está OK, recargar nginx
sudo systemctl reload nginx
```

---

### **PASO 2: Configurar DNS Wildcard**

En tu proveedor de DNS (NameCheap, Cloudflare, etc.):

```
Tipo: A
Nombre: *
Valor: 66.135.27.185
TTL: 3600
```

Esto hace que TODOS los subdominios (`*.smartkubik.com`) apunten a tu servidor.

**Verificar DNS (espera 5-10 minutos):**
```bash
# Desde tu laptop
nslookup cliente1.smartkubik.com
# Debe retornar: 66.135.27.185
```

---

### **PASO 3: Obtener Certificado SSL Wildcard**

```bash
# 1. Instalar certbot si no lo tienes
sudo apt-get update
sudo apt-get install certbot python3-certbot-nginx

# 2. Obtener certificado wildcard
sudo certbot certonly --manual --preferred-challenges dns \
  -d "*.smartkubik.com" -d "smartkubik.com"
```

**IMPORTANTE:** Certbot te pedirá crear un registro TXT en tu DNS:

```
Tipo: TXT
Nombre: _acme-challenge
Valor: (el valor que certbot te diga)
TTL: 300
```

Una vez creado el registro TXT, presiona Enter en certbot y esperará 60 segundos para verificar.

**Si todo sale bien:**
```
Successfully received certificate.
Certificate is saved at: /etc/letsencrypt/live/smartkubik.com/fullchain.pem
Key is saved at:         /etc/letsencrypt/live/smartkubik.com/privkey.pem
```

---

### **PASO 4: Configurar HTTPS en Nginx**

Edita el archivo de configuración:

```bash
sudo nano /etc/nginx/sites-available/storefront-subdomain
```

Descomenta/agrega este bloque HTTPS:

```nginx
server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;

    server_name ~^(?<subdomain>[^.]+)\.smartkubik\.com$;

    # Excluir subdominios reservados
    if ($subdomain ~* ^(admin|api|www)$) {
        return 444;
    }

    # Certificados SSL
    ssl_certificate /etc/letsencrypt/live/smartkubik.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/smartkubik.com/privkey.pem;

    # Configuración SSL moderna
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;

    location / {
        proxy_pass http://localhost:3001;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header X-Forwarded-Host $host;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_cache_bypass $http_upgrade;
    }

    access_log /var/log/nginx/storefront-access.log;
    error_log /var/log/nginx/storefront-error.log;
}

# Redirect HTTP a HTTPS
server {
    listen 80;
    listen [::]:80;
    server_name ~^(?<subdomain>[^.]+)\.smartkubik\.com$;

    if ($subdomain ~* ^(admin|api|www)$) {
        return 444;
    }

    return 301 https://$host$request_uri;
}
```

Recargar nginx:
```bash
sudo nginx -t
sudo systemctl reload nginx
```

---

## ✅ VERIFICACIÓN

### **1. Probar HTTP (si aún no tienes SSL):**
```bash
curl http://cualquier-cosa.smartkubik.com
```

### **2. Probar HTTPS (después de SSL):**
```bash
curl https://cliente1.smartkubik.com
```

### **3. Probar con un tenant real:**

Primero crea un storefront en el admin con dominio `prueba`:

```bash
curl https://prueba.smartkubik.com
```

Deberías ver el HTML del storefront renderizado.

---

## 🎨 CÓMO FUNCIONA

```
1. Cliente visita: https://restaurante.smartkubik.com
2. DNS wildcard resuelve a: 66.135.27.185
3. Nginx captura el subdominio: "restaurante"
4. Proxy pass a storefront: localhost:3001
5. Middleware Next.js detecta: hostname = "restaurante.smartkubik.com"
6. Extrae dominio: "restaurante"
7. Consulta backend: GET /api/v1/public/storefront/by-domain/restaurante
8. Backend retorna config del tenant
9. Next.js renderiza template correspondiente
```

---

## 🔄 RENOVACIÓN AUTOMÁTICA SSL

Certbot instala un cronjob automático que renueva certificados:

```bash
# Ver status del timer
sudo systemctl status certbot.timer

# Probar renovación (dry run)
sudo certbot renew --dry-run
```

Los certificados wildcard se renuevan automáticamente cada 60 días.

---

## 🐛 TROUBLESHOOTING

### **Problema: "Connection refused" al visitar subdominio**
```bash
# Verificar que storefront esté corriendo
forever list | grep smartkubik-storefront

# Si no está, iniciarlo
cd /home/ubuntu/smartkubik
sh deploy.sh
```

### **Problema: "Certificate error" en HTTPS**
```bash
# Verificar que el certificado existe
sudo ls -la /etc/letsencrypt/live/smartkubik.com/

# Verificar que nginx está usando el certificado correcto
sudo nginx -T | grep ssl_certificate
```

### **Problema: DNS no resuelve**
```bash
# Verificar desde el servidor
nslookup prueba.smartkubik.com

# Si no resuelve, verifica tu DNS wildcard en el proveedor
```

### **Problema: Nginx devuelve 444**
Esto significa que el subdominio está en la lista de exclusión (admin, api, www).
Verifica que no estés usando un subdominio reservado.

---

## 💰 PLAN PREMIUM: DOMINIOS PERSONALIZADOS

Para ofrecer dominios personalizados (`clienteX.com`) como feature premium:

1. El cliente configura su DNS:
   ```
   Tipo: A
   Nombre: @
   Valor: 66.135.27.185
   ```

2. Agregas manualmente el dominio a nginx
3. Generas certificado SSL específico:
   ```bash
   sudo certbot --nginx -d clienteX.com -d www.clienteX.com
   ```

**TODO:** Esto se puede automatizar con un panel de administración en el futuro.

---

## 📞 RESUMEN

✅ **Plan Básico (incluido):**
- Subdominio: `cliente.smartkubik.com`
- SSL incluido (wildcard)
- Configuración automática

🔒 **Plan Premium (extra):**
- Dominio personalizado: `cliente.com`
- Configuración manual por dominio
- Cobra extra por este servicio

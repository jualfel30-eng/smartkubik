# 🔐 Guía para Configurar SSL Wildcard

Esta guía te ayudará a configurar un certificado SSL wildcard para `*.smartkubik.com`, permitiendo que todos los subdominios de tus clientes (storefronts) funcionen con HTTPS.

## 📋 Requisitos Previos

- Acceso al panel de administración DNS de smartkubik.com (Namecheap, Cloudflare, etc.)
- SSH al servidor de producción
- El storefront ya debe estar deployeado y funcionando con HTTP

## 🚀 Opción 1: Proceso Automatizado (Recomendado)

### Paso 1: Ejecutar el script helper

Desde tu máquina local:

```bash
cd /Users/jualfelsantamaria/Documents/Saas/smartkubik
chmod +x setup-wildcard-ssl.sh
./setup-wildcard-ssl.sh
```

### Paso 2: Seguir las instrucciones

El script te mostrará algo como:

```
Please deploy a DNS TXT record under the name
_acme-challenge.smartkubik.com with the following value:

xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

Before continuing, verify the record is deployed.
```

### Paso 3: Agregar el registro TXT en tu DNS

**Para Namecheap:**
1. Ve a [Namecheap Dashboard](https://ap.www.namecheap.com/domains/domaincontrolpanel/smartkubik.com/advancedns)
2. Click en "Advanced DNS"
3. Click en "Add New Record"
4. Selecciona "TXT Record"
5. **Host**: `_acme-challenge`
6. **Value**: Pega el valor proporcionado por certbot
7. **TTL**: Automatic (o 1 min)
8. Click "Save All Changes"

**Para Cloudflare:**
1. Ve a tu dashboard de Cloudflare
2. Selecciona el dominio smartkubik.com
3. Ve a la sección DNS
4. Click "Add record"
5. **Type**: TXT
6. **Name**: `_acme-challenge`
7. **Content**: Pega el valor proporcionado por certbot
8. **TTL**: Auto
9. Click "Save"

### Paso 4: Verificar la propagación DNS

Espera 2-5 minutos y verifica que el registro se haya propagado:

```bash
dig _acme-challenge.smartkubik.com TXT +short
```

Deberías ver el valor que agregaste.

### Paso 5: Continuar con certbot

Presiona Enter en la terminal donde está corriendo el script. Si todo sale bien, el certificado se obtendrá y configurará automáticamente.

## 🛠️ Opción 2: Proceso Manual

### Paso 1: SSH al servidor

```bash
ssh deployer@178.156.182.177
```

### Paso 2: Iniciar certbot

```bash
sudo certbot certonly --manual --preferred-challenges dns \
  -d '*.smartkubik.com' \
  -d smartkubik.com \
  --agree-tos \
  --email admin@smartkubik.com
```

### Paso 3: Agregar registro TXT

Sigue las instrucciones en pantalla para agregar el registro TXT en tu DNS (ver Opción 1, Paso 3).

### Paso 4: Aplicar certificado a nginx

Una vez obtenido el certificado, copia la configuración SSL:

```bash
# Copiar configuración SSL
sudo cp ~/smartkubik/nginx-configs/storefront-subdomain-ssl.conf \
  /etc/nginx/sites-available/storefront-subdomain

# Verificar configuración
sudo nginx -t

# Recargar nginx
sudo systemctl reload nginx
```

### Paso 5: Verificar

```bash
# Verificar que el certificado esté instalado
sudo certbot certificates

# Deberías ver el wildcard certificate listado
```

## ✅ Verificación

Después de completar la configuración, verifica que funcione:

```bash
# Desde cualquier máquina
curl -I https://demo.smartkubik.com
curl -I https://tienda.smartkubik.com
curl -I https://cualquier-nombre.smartkubik.com
```

Todas deberían responder con `HTTP/2 200` (o similar) y mostrar el certificado SSL válido.

## 🔄 Renovación Automática

Certbot configurará automáticamente la renovación del certificado. Para probar:

```bash
ssh deployer@178.156.182.177
sudo certbot renew --dry-run
```

## 🐛 Troubleshooting

### El registro TXT no se propaga

**Problema**: El DNS TXT no aparece cuando haces `dig`

**Solución**:
- Espera más tiempo (algunos DNS tardan hasta 15 minutos)
- Verifica que el nombre del registro sea exactamente `_acme-challenge`
- Verifica que el valor esté entre comillas si tu proveedor lo requiere
- Limpia tu caché DNS local: `sudo dscacheutil -flushcache` (Mac)

### Certbot falla con "DNS problem"

**Problema**: `DNS problem: NXDOMAIN looking up TXT for _acme-challenge.smartkubik.com`

**Solución**:
- El registro TXT no está correctamente agregado en el DNS
- Verifica con: `dig _acme-challenge.smartkubik.com TXT @8.8.8.8`
- Espera más tiempo para la propagación

### Nginx no inicia después de aplicar SSL

**Problema**: `nginx: [emerg] cannot load certificate`

**Solución**:
```bash
# Verificar que el certificado existe
sudo ls -la /etc/letsencrypt/live/smartkubik.com/

# Verificar permisos
sudo chmod 755 /etc/letsencrypt/live
sudo chmod 755 /etc/letsencrypt/archive

# Reintentar
sudo nginx -t
```

### El navegador muestra "Certificate Invalid"

**Problema**: El certificado no es válido para el subdominio

**Solución**:
- Verifica que obtuviste el certificado wildcard para `*.smartkubik.com`
- Ejecuta: `sudo certbot certificates` y verifica que diga `Domains: *.smartkubik.com smartkubik.com`
- Si no es correcto, revoca el certificado y repite el proceso

## 📝 Notas Importantes

1. **Certificado Wildcard**: Cubre TODOS los subdominios (*.smartkubik.com)
2. **Renovación**: Certbot renueva automáticamente cada 60 días
3. **DNS Challenge**: Es el único método soportado para certificados wildcard
4. **Propagación DNS**: Puede tardar hasta 15 minutos en algunos casos
5. **Validez**: El certificado es válido por 90 días

## 🆘 ¿Necesitas Ayuda?

Si encuentras problemas:

1. Revisa los logs de nginx: `sudo tail -f /var/log/nginx/error.log`
2. Revisa los logs de certbot: `sudo cat /var/log/letsencrypt/letsencrypt.log`
3. Verifica la configuración de nginx: `sudo nginx -t`
4. Verifica los certificados: `sudo certbot certificates`

---

**Última actualización**: Noviembre 2025

# ☁️ Google Drive Backups - Configuración Rápida (15GB Gratis)

Guía para configurar backups automáticos en Google Drive usando tu cuenta de smartkubik.

## 🎯 POR QUÉ GOOGLE DRIVE ES PERFECTO PARA TI AHORA

### ✅ Ventajas

- **GRATIS:** 15GB sin costo
- **Suficiente:** ~1,363 backups (3.7 años de backups diarios)
- **Fácil:** Configuración en 5 minutos
- **Seguro:** Google tiene 99.9% uptime
- **Accesible:** Desde cualquier lugar (web, móvil)
- **Versionado:** Google guarda versiones anteriores 30 días
- **Sin mantenimiento:** Google se encarga de todo

### 📊 Capacidad con tus datos actuales

```
Backup actual comprimido:  ~10MB
Espacio disponible:         15GB (15,360MB)
Total de backups posibles:  ~1,536 backups
Si haces backup diario:     4.2 años de almacenamiento
Si haces cada 12 horas:     2.1 años de almacenamiento
```

### 💰 Costos Comparados

| Opción | Costo | Capacidad | Fase Actual |
|--------|-------|-----------|-------------|
| **Google Drive** | **$0/mes** | **15GB** | ✅ **PERFECTO** |
| MongoDB Atlas M10 | $57/mes | Ilimitado | ⚠️ Muy caro sin clientes |
| AWS S3 | $0.50/mes | 20GB | ✅ Bueno pero complejo |
| PC Usado | $150 inicial | 2TB+ | ✅ Bueno pero requiere setup |

---

## ⚡ INSTALACIÓN RÁPIDA (5 MINUTOS)

### Paso 1: Ejecutar el Script de Configuración

```bash
cd /Users/jualfelsantamaria/Documents/Saas/V1.03/FOOD-INVENTORY-SAAS-COMPLETO
./scripts/backup-to-google-drive.sh
```

El script detectará que no tienes rclone configurado y te guiará automáticamente.

### Paso 2: Configurar rclone (Primera vez solamente)

El script instalará rclone y te mostrará esta guía interactiva:

```
1. Ejecuta: rclone config
2. Escribe: n (nuevo remote)
3. Nombre: smartkubik-drive
4. Tipo: drive (escribe "drive" y presiona Enter)
5. Client ID: [Enter] (dejar en blanco)
6. Client Secret: [Enter] (dejar en blanco)
7. Scope: 1 (Full access)
8. Root folder: [Enter] (dejar en blanco)
9. Service Account: [Enter] (dejar en blanco)
10. Auto config: y (yes)
```

Se abrirá tu navegador automáticamente:
- **Inicia sesión con:** smartkubik@gmail.com (o tu cuenta de Google)
- **Autoriza** el acceso de rclone

Luego en la terminal:
```
11. Team Drive: n (no)
12. Confirma: y (yes)
13. Quit: q
```

### Paso 3: Primera Subida Manual (Prueba)

```bash
./scripts/backup-to-google-drive.sh
```

Deberías ver:
```
☁️  GOOGLE DRIVE BACKUP UPLOAD
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ Google Drive configured: smartkubik-drive
📂 Latest backup: 2025-12-19T02-00-00
📦 Compressing backup...
✅ Compressed: 10M
📤 Uploading to Google Drive...
✅ Successfully uploaded to Google Drive
📊 Google Drive Status:
   Used: 0.01GB / 15.00GB (0.1%)
   Free: 14.99GB
✅ GOOGLE DRIVE BACKUP COMPLETED
```

---

## 🔄 AUTOMATIZACIÓN COMPLETA

### Configurar Subida Automática Diaria

Editar crontab:
```bash
crontab -e
```

Agregar esta línea (sube a las 4 AM todos los días):
```bash
0 4 * * * /Users/jualfelsantamaria/Documents/Saas/V1.03/FOOD-INVENTORY-SAAS-COMPLETO/scripts/backup-to-google-drive.sh >> /Users/jualfelsantamaria/Documents/Saas/V1.03/FOOD-INVENTORY-SAAS-COMPLETO/backups/automated/gdrive-upload.log 2>&1
```

### Flujo Completo Automatizado

```
1. BACKUP LOCAL (Cada 12 horas)
   ├─ 2:00 AM → Crea backup local
   └─ 2:00 PM → Crea backup local

2. SYNC A GOOGLE DRIVE (Diario)
   └─ 4:00 AM → Sube último backup a Drive

3. LIMPIEZA AUTOMÁTICA
   ├─ Local: Mantiene últimos 7 backups
   └─ Drive: Mantiene últimos 30 backups
```

---

## 📂 ESTRUCTURA EN GOOGLE DRIVE

Tus backups se verán así en Google Drive:

```
Google Drive (smartkubik@gmail.com)
└── MongoDB-Backups/
    ├── 2025-12-18T02-00-00.tar.gz  (10.5 MB)
    ├── 2025-12-19T02-00-00.tar.gz  (10.8 MB)
    ├── 2025-12-20T02-00-00.tar.gz  (11.2 MB)
    └── ...
```

---

## 🔍 MONITOREO Y VERIFICACIÓN

### Ver Backups en Google Drive

**Opción 1: Navegador Web**
- Ve a [drive.google.com](https://drive.google.com)
- Busca carpeta "MongoDB-Backups"

**Opción 2: Desde Terminal**
```bash
# Listar todos los backups
rclone ls smartkubik-drive:MongoDB-Backups/

# Ver espacio usado
rclone about smartkubik-drive:

# Ver últimos 5 backups
rclone lsl smartkubik-drive:MongoDB-Backups/ | tail -5
```

### Ver Logs de Subidas

```bash
# Ver log completo
cat backups/automated/gdrive-upload.log

# Ver últimas 50 líneas
tail -n 50 backups/automated/gdrive-upload.log

# Ver en tiempo real
tail -f backups/automated/gdrive-upload.log
```

---

## 🔄 RESTAURAR DESDE GOOGLE DRIVE

### Opción 1: Desde el Navegador (Más Fácil)

1. Ve a [drive.google.com](https://drive.google.com)
2. Abre carpeta "MongoDB-Backups"
3. Encuentra el backup que quieres restaurar
4. Click derecho → Descargar
5. Descomprime: `tar -xzf 2025-12-19T02-00-00.tar.gz`
6. Restaura: `mongorestore --uri="$MONGODB_URI" --drop ./2025-12-19T02-00-00/test`

### Opción 2: Desde Terminal (Más Rápido)

```bash
# Listar backups disponibles
rclone lsl smartkubik-drive:MongoDB-Backups/

# Descargar backup específico
rclone copy smartkubik-drive:MongoDB-Backups/2025-12-19T02-00-00.tar.gz /tmp/

# Descomprimir
cd /tmp
tar -xzf 2025-12-19T02-00-00.tar.gz

# Restaurar
mongorestore --uri="mongodb+srv://..." --drop ./2025-12-19T02-00-00/test
```

### Script de Restauración Rápida

Crear: `scripts/restore-from-gdrive.sh`

```bash
#!/bin/bash

echo "📋 Available backups in Google Drive:"
rclone lsl smartkubik-drive:MongoDB-Backups/ | tail -10

echo ""
read -p "Enter backup filename to restore: " BACKUP_FILE

echo "📥 Downloading from Google Drive..."
rclone copy "smartkubik-drive:MongoDB-Backups/${BACKUP_FILE}" /tmp/

echo "📦 Extracting..."
cd /tmp
tar -xzf "$BACKUP_FILE"

BACKUP_DIR=$(basename "$BACKUP_FILE" .tar.gz)

echo "🔄 Restoring to MongoDB..."
mongorestore --uri="$MONGODB_URI" --drop "/tmp/${BACKUP_DIR}/test"

echo "✅ Restore completed!"
rm -rf "/tmp/${BACKUP_DIR}" "/tmp/${BACKUP_FILE}"
```

---

## 📊 GESTIÓN DE ESPACIO

### Ver Espacio Usado

```bash
# Ver espacio total
rclone about smartkubik-drive:

# Salida esperada:
# Total:   15 GiB
# Used:    0.5 GiB
# Free:    14.5 GiB
```

### Si te Quedas Sin Espacio (En el futuro)

**Opción 1: Limpiar Backups Viejos**
```bash
# El script ya limpia automáticamente (mantiene últimos 30)
# Puedes ajustar en el script: MAX_BACKUPS_CLOUD=30
```

**Opción 2: Crear Otra Cuenta Gmail**
```bash
# Crear nueva cuenta: smartkubik-backup2@gmail.com
# Configurar como segundo remote
# Otros 15GB gratis
```

**Opción 3: Upgrade a Google One**
```
Google One 100GB: $1.99/mes
Google One 200GB: $2.99/mes
Google One 2TB:   $9.99/mes
```

---

## 🔒 SEGURIDAD Y PRIVACIDAD

### ¿Es Seguro Google Drive?

**✅ SÍ para datos de producción:**
- Encriptación en tránsito (HTTPS)
- Encriptación en reposo (AES-256)
- Autenticación de 2 factores disponible
- Google tiene certificaciones SOC 2, ISO 27001

### Recomendaciones de Seguridad

1. **Habilitar 2FA en smartkubik@gmail.com**
   - Ve a: https://myaccount.google.com/security
   - Activa "Verificación en 2 pasos"

2. **No compartir la carpeta de backups**
   - Mantén "MongoDB-Backups" como privada

3. **Revisar accesos regularmente**
   - Ve a: https://myaccount.google.com/permissions
   - Verifica que solo rclone tenga acceso

### Encriptación Adicional (Opcional - Paranoia)

Si quieres encriptar los backups antes de subirlos:

```bash
# Modificar script para encriptar
# Agregar antes de subir:
openssl enc -aes-256-cbc -salt -in "$TEMP_FILE" -out "${TEMP_FILE}.enc" -k "tu-password-segura"

# Para restaurar:
openssl enc -aes-256-cbc -d -in backup.tar.gz.enc -out backup.tar.gz -k "tu-password-segura"
```

---

## 💡 MEJORES PRÁCTICAS

### Durante Fase de Búsqueda de Clientes

**DO ✅**
- Mantener backups locales (cada 12 horas)
- Subir a Google Drive (diario)
- Revisar logs semanalmente
- Probar restauración mensualmente

**DON'T ❌**
- No pagar por servicios premium sin clientes
- No acumular más de 30 backups en Drive
- No ignorar alertas de espacio lleno

### Cuando Consigas Clientes

**Momento de escalar:**
- 5-10 clientes → Mantén Google Drive + considera MongoDB Atlas
- 10-20 clientes → Agrega AWS S3 para redundancia
- 20+ clientes → MongoDB Atlas M10 + S3 + Servidor local

---

## 🆘 TROUBLESHOOTING

### Error: "rclone not found"

```bash
# macOS
brew install rclone

# Linux
curl https://rclone.org/install.sh | sudo bash

# Verificar
rclone version
```

### Error: "Failed to configure drive"

```bash
# Borrar configuración y empezar de nuevo
rclone config delete smartkubik-drive
rclone config

# Seguir pasos de configuración nuevamente
```

### Error: "Upload failed"

```bash
# Verificar conexión a internet
ping google.com

# Verificar autenticación
rclone lsd smartkubik-drive:

# Si falla, reconfigurar
rclone config reconnect smartkubik-drive:
```

### Drive lleno (15GB alcanzados)

```bash
# Ver qué está ocupando espacio
rclone size smartkubik-drive:

# Limpiar backups viejos manualmente
rclone delete smartkubik-drive:MongoDB-Backups/ --min-age 60d

# O reducir MAX_BACKUPS_CLOUD en el script
```

---

## 📈 PLAN DE ESCALAMIENTO FUTURO

### Fases de Crecimiento

```
FASE 1: Búsqueda de Clientes (ACTUAL)
├─ 0-5 clientes
├─ ~50-100 órdenes/mes
├─ Backups: ~15-20MB/día
└─ 💰 SOLUCIÓN: Google Drive 15GB (GRATIS)

FASE 2: Primeros Clientes
├─ 5-15 clientes
├─ ~500-1000 órdenes/mes
├─ Backups: ~50-100MB/día
└─ 💰 SOLUCIÓN: Google One 100GB ($2/mes)

FASE 3: Crecimiento
├─ 15-50 clientes
├─ ~2000-5000 órdenes/mes
├─ Backups: ~200-500MB/día
└─ 💰 SOLUCIÓN: MongoDB Atlas M10 + S3 ($60/mes)

FASE 4: Consolidación
├─ 50+ clientes
├─ ~10000+ órdenes/mes
├─ Backups: ~1-2GB/día
└─ 💰 SOLUCIÓN: Atlas M30 + S3 + Servidor dedicado ($200/mes)
```

---

## ✅ CHECKLIST DE CONFIGURACIÓN

- [ ] Instalar rclone
- [ ] Configurar Google Drive remote
- [ ] Ejecutar primera subida manual
- [ ] Verificar archivo en drive.google.com
- [ ] Configurar cron job para subidas automáticas
- [ ] Habilitar 2FA en cuenta de Google
- [ ] Probar restauración desde Drive
- [ ] Documentar password/accesos

---

## 🎯 CONCLUSIÓN

**Para tu situación actual (búsqueda de clientes):**

Google Drive 15GB es la **MEJOR OPCIÓN** porque:

✅ **Costo $0** - No gastas mientras buscas clientes
✅ **Simple** - Setup en 5 minutos
✅ **Suficiente** - 3+ años de backups diarios
✅ **Confiable** - 99.9% uptime de Google
✅ **Escalable** - Cuando crezcas, upgrade fácil

**Próximos pasos:**

1. **Ejecuta ahora:** `./scripts/backup-to-google-drive.sh`
2. **Configura cron** para subidas automáticas
3. **Enfócate en conseguir clientes** sabiendo que tus datos están seguros

Cuando tengas 5-10 clientes pagando, entonces evalúas opciones premium. Pero por ahora, **esto es perfecto**.

---

## 📞 AYUDA

Si tienes problemas:
1. Revisa logs: `cat backups/automated/gdrive-upload.log`
2. Prueba manualmente: `rclone lsd smartkubik-drive:`
3. Reconfigura: `rclone config`

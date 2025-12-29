# 📦 Guía de Backups Automáticos

Esta guía explica cómo configurar y usar el sistema de backups automáticos para tu base de datos MongoDB.

## 🎯 Opciones Disponibles

### **Opción 1: Backups Automáticos con Cron (RECOMENDADO)**

Backups programados que se ejecutan automáticamente en segundo plano.

#### ⚡ Instalación Rápida

```bash
cd /Users/jualfelsantamaria/Documents/Saas/V1.03/FOOD-INVENTORY-SAAS-COMPLETO
./scripts/setup-automated-backups.sh
```

El script te preguntará con qué frecuencia quieres los backups:

1. **Diario a las 2:00 AM** (Recomendado) - Ideal para producción
2. **Cada 12 horas** (2:00 AM y 2:00 PM) - Para desarrollo activo
3. **Cada 6 horas** - Para datos críticos
4. **Cada hora** - Para testing
5. **Personalizado** - Define tu propia programación

#### 📋 Características

- ✅ Backups automáticos sin intervención manual
- ✅ Mantiene los últimos 7 backups automáticamente
- ✅ Elimina backups antiguos para ahorrar espacio
- ✅ Logs detallados de cada backup
- ✅ Información de tamaño y timestamp

#### 📂 Ubicación de Backups

```
FOOD-INVENTORY-SAAS-COMPLETO/
└── backups/
    └── automated/
        ├── 2025-12-18T02-00-00/    ← Backup del 18 dic
        ├── 2025-12-19T02-00-00/    ← Backup del 19 dic
        ├── backup.log              ← Logs de todos los backups
        └── ...
```

#### 🔍 Ver Logs

```bash
# Ver todos los logs
cat backups/automated/backup.log

# Ver logs en tiempo real
tail -f backups/automated/backup.log

# Ver últimas 50 líneas
tail -n 50 backups/automated/backup.log
```

#### 🔧 Comandos Útiles

```bash
# Ejecutar backup manualmente
./scripts/auto-backup-daily.sh

# Ver cron jobs activos
crontab -l

# Editar cron jobs
crontab -e

# Eliminar backup automático
crontab -e  # Luego elimina la línea con auto-backup-daily.sh
```

---

### **Opción 2: MongoDB Atlas Automated Backups**

MongoDB Atlas incluye backups automáticos en la nube (requiere plan pago).

#### 🌐 Configuración en Atlas

1. Ve a [MongoDB Atlas](https://cloud.mongodb.com)
2. Selecciona tu cluster
3. Ve a "Backup" en el menú lateral
4. Habilita "Cloud Backup"

#### 📋 Características

- ✅ Backups en la nube (no usa espacio local)
- ✅ Point-in-time recovery
- ✅ Retención configurable (7-365 días)
- ✅ Snapshots automáticos
- ⚠️ Requiere plan M10 o superior (de pago)

---

### **Opción 3: Backup Manual**

Si prefieres hacer backups manualmente cuando lo necesites.

#### 🔧 Crear Backup Manual

```bash
# Usando el script existente
./scripts/backup-before-phase.sh

# O directamente con mongodump
mongodump --uri="mongodb+srv://usuario:password@cluster.mongodb.net/test" --out=backups/manual-$(date +%Y%m%d)
```

---

## 🔄 Restaurar un Backup

### Restaurar Backup Automático

```bash
# Ver backups disponibles
ls -ltr backups/automated/

# Restaurar el más reciente
./scripts/restore-backup.sh

# O manualmente
mongorestore --uri="$MONGODB_URI" --drop backups/automated/2025-12-18T02-00-00/test
```

### Restaurar desde MongoDB Atlas

1. Ve a MongoDB Atlas → Backup
2. Selecciona el snapshot que quieres restaurar
3. Click en "Restore"
4. Elige "Download" o "Restore to Cluster"

---

## 📊 Monitoreo de Backups

### Ver Estado de Backups Automáticos

```bash
# Último backup
ls -lt backups/automated/ | head -5

# Tamaño total de backups
du -sh backups/automated/

# Número de backups
ls -1d backups/automated/*/ | wc -l
```

### Recibir Notificaciones (Opcional)

Puedes modificar el script `auto-backup-daily.sh` para enviar notificaciones:

```bash
# Al final del script, agrega:
# curl -X POST "https://api.tu-servicio.com/notify" -d "Backup completed"
```

---

## ⚠️ Recomendaciones

### Para Desarrollo

- ✅ Backups diarios a las 2:00 AM
- ✅ Mantener últimos 7 backups
- ✅ Backup manual antes de cambios importantes

### Para Producción

- ✅ Backups cada 6-12 horas
- ✅ Mantener últimos 14-30 backups
- ✅ Habilitar MongoDB Atlas Cloud Backup
- ✅ Backup manual antes de deploys
- ✅ Copiar backups críticos a almacenamiento externo

### Seguridad

- ⚠️ Los backups contienen datos sensibles
- ⚠️ Nunca subas backups a GitHub
- ⚠️ Mantén los backups en ubicación segura
- ⚠️ Considera encriptar backups de producción

---

## 🆘 Troubleshooting

### Error: "mongodump not found"

```bash
# Instalar MongoDB Database Tools
brew install mongodb-database-tools

# Verificar instalación
mongodump --version
```

### Error: "MONGODB_URI not found"

Verifica que el archivo `.env` existe y contiene:
```
MONGODB_URI=mongodb+srv://usuario:password@cluster.mongodb.net/test
```

### Backups muy grandes

```bash
# Comprimir backups antiguos
cd backups/automated
for dir in */; do tar -czf "${dir%/}.tar.gz" "$dir" && rm -rf "$dir"; done
```

### Limpiar espacio

```bash
# Eliminar backups más antiguos de 30 días
find backups/automated -type d -mtime +30 -exec rm -rf {} +
```

---

## 📞 Soporte

Si tienes problemas con los backups:

1. Revisa los logs: `cat backups/automated/backup.log`
2. Verifica el cron: `crontab -l`
3. Ejecuta backup manual para debugging: `./scripts/auto-backup-daily.sh`

---

## 🎉 ¡Listo!

Tu sistema de backups automáticos está configurado. Los backups se ejecutarán automáticamente según la programación que elegiste.

**Siguiente paso:** Programa tu primer backup automático ejecutando:

```bash
./scripts/setup-automated-backups.sh
```

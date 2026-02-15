# 🖥️ Guía: Servidor de Backups con PC Empresarial Usado

Esta guía te ayudará a convertir una PC empresarial usada en un servidor de backups profesional.

## 📋 REQUISITOS DEL HARDWARE

### Especificaciones Mínimas Recomendadas

```
Procesador:    Intel i5 6ta generación o superior
RAM:           8GB DDR4 (expandible a 16-32GB)
Disco Duro:    500GB HDD (o 256GB SSD)
Red:           Gigabit Ethernet
USB:           Puertos USB 3.0
Año:           2015-2020
```

### Modelos Recomendados (Mercado de Segunda Mano)

**Dell Optiplex:**
- ✅ Optiplex 3050/5050/7050 (2017-2018) - $80-120
- ✅ Optiplex 3060/5060/7060 (2018-2019) - $100-150
- ✅ Optiplex 3070/5070/7070 (2019-2020) - $120-180

**HP ProDesk:**
- ✅ ProDesk 400 G4/G5 (2017-2019) - $90-130
- ✅ EliteDesk 800 G3/G4 (2017-2019) - $100-160

**Lenovo ThinkCentre:**
- ✅ M710/M910 (2017-2018) - $85-125
- ✅ M720/M920 (2018-2019) - $100-150

### Dónde Comprar

1. **Mercado Libre** - Busca "Dell Optiplex i5" o "HP ProDesk i5"
2. **Facebook Marketplace** - Grupos de compra/venta de equipos
3. **Importadoras de equipos usados** - Muchas ciudades tienen
4. **Empresas que liquidan equipos** - Pregunta en zonas industriales

---

## 💾 MEJORAS RECOMENDADAS (Opcional)

### Opción 1: Solo lo Esencial ($0-30)
- Usar disco duro existente
- Agregar disco USB externo 2TB (~$60) para expandir

### Opción 2: Mejorada ($60-100)
- SSD 500GB SATA (~$40) - Para el sistema operativo
- HDD 2TB 3.5" (~$50) - Para almacenar backups
- **Total invertido:** PC $100 + Mejoras $90 = **$190**

### Opción 3: Profesional ($150-200)
- SSD 1TB NVMe/M.2 (~$70) - Sistema operativo
- 2x HDD 4TB en RAID 1 (~$180) - Redundancia total
- RAM adicional 8GB (~$25) - Total 16GB
- **Total invertido:** PC $100 + Mejoras $275 = **$375**

---

## 🐧 INSTALACIÓN DEL SISTEMA OPERATIVO

### Opción A: Ubuntu Server 24.04 LTS (Recomendado)

**Ventajas:**
- ✅ Gratis y de código abierto
- ✅ Muy estable y seguro
- ✅ Soporte hasta 2034
- ✅ Bajo consumo de recursos
- ✅ Perfecta para servidores

**Instalación:**

1. **Descargar Ubuntu Server:**
   - https://ubuntu.com/download/server
   - Versión: 24.04 LTS

2. **Crear USB Booteable:**
   - Descargar Rufus (Windows) o balenaEtcher (Mac/Linux)
   - Grabar ISO en USB de 4GB+

3. **Instalar:**
   - Bootear desde USB
   - Seguir el instalador (10 minutos)
   - Seleccionar "OpenSSH Server" durante instalación

### Opción B: Debian 12 (Alternativa)

**Ventajas:**
- ✅ Aún más estable que Ubuntu
- ✅ Menos actualizaciones = menos mantenimiento
- ✅ Consumo mínimo de recursos

---

## ⚙️ CONFIGURACIÓN POST-INSTALACIÓN

### 1. Actualizar el Sistema

```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y curl wget git vim htop
```

### 2. Instalar MongoDB Tools

```bash
# Instalar MongoDB Database Tools
wget https://fastdl.mongodb.org/tools/db/mongodb-database-tools-ubuntu2204-x86_64-100.9.4.deb
sudo dpkg -i mongodb-database-tools-ubuntu2204-x86_64-100.9.4.deb

# Verificar instalación
mongodump --version
mongorestore --version
```

### 3. Configurar IP Estática (Importante)

```bash
# Editar configuración de red
sudo nano /etc/netplan/00-installer-config.yaml
```

Agregar:
```yaml
network:
  version: 2
  ethernets:
    enp0s3:  # Puede variar, verifica con: ip a
      dhcp4: no
      addresses:
        - 192.168.1.100/24  # Tu IP fija
      gateway4: 192.168.1.1  # Tu router
      nameservers:
        addresses:
          - 8.8.8.8
          - 8.8.4.4
```

Aplicar:
```bash
sudo netplan apply
```

### 4. Configurar SSH (Acceso Remoto)

```bash
# Generar claves SSH (en tu Mac)
ssh-keygen -t ed25519 -C "backup-server"

# Copiar clave pública al servidor
ssh-copy-id usuario@192.168.1.100

# Ahora puedes conectarte sin password
ssh usuario@192.168.1.100
```

---

## 📦 CONFIGURAR BACKUPS AUTOMÁTICOS

### Script de Backup en el Servidor

Crear en el servidor: `/home/usuario/backup-receive.sh`

```bash
#!/bin/bash

# Directorio de backups
BACKUP_DIR="/backups/mongodb"
RETENTION_DAYS=90  # Mantener 90 días

# Crear directorio si no existe
mkdir -p "$BACKUP_DIR"

# Información
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📦 Backup Server Ready"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Backup Directory: $BACKUP_DIR"
echo "Retention: $RETENTION_DAYS days"
echo "Current Backups: $(ls -1 "$BACKUP_DIR" | wc -l)"
echo "Total Size: $(du -sh "$BACKUP_DIR" | cut -f1)"
echo ""

# Limpiar backups antiguos
find "$BACKUP_DIR" -type f -mtime +$RETENTION_DAYS -delete
echo "✅ Old backups cleaned"

# Mostrar espacio disponible
df -h "$BACKUP_DIR"
```

### Script de Sync desde tu Mac

Crear en tu Mac: `scripts/sync-to-backup-server.sh`

```bash
#!/bin/bash

# Configuración
BACKUP_SERVER="usuario@192.168.1.100"
BACKUP_DIR="/backups/mongodb"
LOCAL_BACKUP_DIR="./backups/automated"

echo "🔄 Syncing backups to backup server..."

# Obtener último backup local
LATEST_BACKUP=$(ls -td ${LOCAL_BACKUP_DIR}/*/ | head -1)

if [ -z "$LATEST_BACKUP" ]; then
    echo "❌ No local backups found"
    exit 1
fi

BACKUP_NAME=$(basename "$LATEST_BACKUP")

echo "📂 Latest backup: $BACKUP_NAME"

# Comprimir antes de enviar
echo "📦 Compressing backup..."
tar -czf "/tmp/${BACKUP_NAME}.tar.gz" -C "$LOCAL_BACKUP_DIR" "$BACKUP_NAME"

# Enviar al servidor
echo "📤 Uploading to backup server..."
scp "/tmp/${BACKUP_NAME}.tar.gz" "${BACKUP_SERVER}:${BACKUP_DIR}/"

if [ $? -eq 0 ]; then
    echo "✅ Backup synced successfully"
    rm "/tmp/${BACKUP_NAME}.tar.gz"
else
    echo "❌ Sync failed"
    exit 1
fi

# Verificar en servidor
ssh "$BACKUP_SERVER" "ls -lh ${BACKUP_DIR}/${BACKUP_NAME}.tar.gz"

echo "✅ Sync completed"
```

Hacer ejecutable:
```bash
chmod +x scripts/sync-to-backup-server.sh
```

---

## 🔄 AUTOMATIZACIÓN COMPLETA

### En tu Mac - Cron Job para Sync Semanal

```bash
# Editar crontab
crontab -e

# Agregar línea (domingos a las 3 AM)
0 3 * * 0 /Users/jualfelsantamaria/Documents/Saas/V1.03/FOOD-INVENTORY-SAAS-COMPLETO/scripts/sync-to-backup-server.sh
```

### Flujo Completo de Backups

```
1. Backup Local Automático (Cada 12 horas)
   ↓
   Crea backup en: backups/automated/2025-12-19T02-00-00/

2. Sync a Servidor Local (Domingos 3 AM)
   ↓
   Comprime y envía a: 192.168.1.100:/backups/mongodb/

3. MongoDB Atlas Cloud (Cada hora)
   ↓
   Snapshot automático en la nube

4. AWS S3 (Opcional - Diario)
   ↓
   Backup comprimido offsite
```

---

## 📊 MONITOREO Y MANTENIMIENTO

### Verificar Estado del Servidor

```bash
# Conectar al servidor
ssh usuario@192.168.1.100

# Ver backups
ls -lh /backups/mongodb/

# Ver espacio disponible
df -h

# Ver uso de CPU/RAM
htop

# Ver logs del sistema
journalctl -xe
```

### Dashboard Simple (Opcional)

Instalar Cockpit para ver el servidor desde el navegador:

```bash
sudo apt install cockpit
sudo systemctl enable --now cockpit.socket
```

Acceder desde tu navegador: `https://192.168.1.100:9090`

---

## 💡 OPTIMIZACIONES AVANZADAS

### 1. Configurar RAID 1 (Redundancia)

Si agregas 2 discos iguales:

```bash
# Instalar mdadm
sudo apt install mdadm

# Crear RAID 1
sudo mdadm --create /dev/md0 --level=1 --raid-devices=2 /dev/sdb /dev/sdc

# Formatear y montar
sudo mkfs.ext4 /dev/md0
sudo mkdir -p /backups
sudo mount /dev/md0 /backups
```

### 2. Configurar UPS (Protección contra cortes)

Si tienes un UPS conectado:

```bash
sudo apt install nut
sudo systemctl enable nut-server
```

### 3. Alertas por Email

Configurar notificaciones cuando:
- Espacio en disco < 20%
- Servidor se reinicia
- Backup falla

---

## 🔒 SEGURIDAD

### 1. Firewall

```bash
sudo ufw enable
sudo ufw allow 22/tcp  # SSH
sudo ufw status
```

### 2. Fail2Ban (Anti-brute force)

```bash
sudo apt install fail2ban
sudo systemctl enable fail2ban
```

### 3. Actualizaciones Automáticas

```bash
sudo apt install unattended-upgrades
sudo dpkg-reconfigure -plow unattended-upgrades
```

---

## 💰 ANÁLISIS DE COSTOS TOTAL

### Escenario Real

**Hardware:**
- PC Dell Optiplex 5050 (usado): $100
- Disco HDD 2TB adicional: $50
- **Total inicial:** $150

**Consumo Eléctrico:**
- Potencia: ~80W
- 24/7 durante 30 días: ~57.6 kWh/mes
- En Venezuela: Prácticamente $0 (subsidiado)
- En LATAM promedio: ~$8-12/mes

**Comparación vs Alternativas:**

| Opción | Costo Inicial | Mensual | Año 1 | Año 3 |
|--------|---------------|---------|-------|-------|
| **PC Usado + HDD** | $150 | $10 | $270 | $510 |
| Raspberry Pi + HDD | $140 | $2 | $164 | $212 |
| MongoDB Atlas M10 | $0 | $57 | $684 | $2,052 |
| AWS S3 + Glacier | $0 | $15 | $180 | $540 |

**Conclusión:**
- Año 1: Más caro que Raspberry Pi, mucho más barato que nube
- Año 3: Amortizado completamente, solo pagas luz
- Capacidad: Ilimitada (puedes agregar más discos)

---

## ✅ CHECKLIST DE CONFIGURACIÓN

- [ ] Comprar PC empresarial usado
- [ ] (Opcional) Comprar disco adicional
- [ ] Descargar Ubuntu Server 24.04
- [ ] Crear USB booteable
- [ ] Instalar Ubuntu Server
- [ ] Actualizar sistema
- [ ] Instalar MongoDB Tools
- [ ] Configurar IP estática
- [ ] Configurar SSH
- [ ] Crear scripts de backup
- [ ] Configurar cron en Mac
- [ ] Probar backup manual
- [ ] Configurar firewall
- [ ] Documentar IPs y passwords

---

## 🆘 TROUBLESHOOTING

### No puedo conectarme por SSH

```bash
# En el servidor
sudo systemctl status ssh
sudo systemctl restart ssh

# Verificar firewall
sudo ufw status
sudo ufw allow 22/tcp
```

### Disco lleno

```bash
# Ver qué consume espacio
du -sh /backups/* | sort -h

# Limpiar backups viejos
find /backups -mtime +90 -delete
```

### Servidor no arranca

- Verificar conexiones de disco
- Bootear desde USB de instalación
- Verificar BIOS/UEFI settings

---

## 🎯 CONCLUSIÓN

Con una inversión de **$150** y **10 horas de configuración inicial**, tendrás:

✅ Servidor de backups profesional
✅ Capacidad expandible ilimitadamente
✅ Control total de tus datos
✅ Sin costos mensuales significativos
✅ Redundancia completa con RAID
✅ Acceso remoto desde cualquier lugar

**ROI:** Se paga solo en 3-6 meses vs servicios en la nube.

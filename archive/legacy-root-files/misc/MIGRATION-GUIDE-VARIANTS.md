# 📘 Guía de Migración: Productos a Formato de Variantes

## 🎯 Objetivo

Migrar todos los productos existentes que NO tienen variantes al nuevo formato, creando automáticamente una variante "Estándar" para cada uno.

---

## ✅ FASE 1: BACKWARD COMPATIBILITY (COMPLETADA)

### ¿Qué se hizo?

Se modificó el código del frontend para soportar **AMBOS** formatos:
- ✅ Productos con variantes (formato nuevo)
- ✅ Productos sin variantes (formato antiguo)

### Archivos modificados:

- `food-inventory-admin/src/components/InventoryManagement.jsx`
  - Líneas 112-137: Validación robusta de variantes

### Resultado:

**El sistema ahora funciona normalmente con productos antiguos y nuevos.**

---

## 🚀 FASE 2: MIGRACIÓN MASIVA

### Pre-requisitos

1. **BACKUP OBLIGATORIO** de la base de datos MongoDB
2. Acceso SSH al servidor de producción
3. Aproximadamente 10-15 minutos de tiempo

---

## 📋 Paso a Paso

### 1. BACKUP DE LA BASE DE DATOS (CRÍTICO)

#### En Producción:

```bash
# Conectar al servidor
ssh deployer@178.156.182.177

# Crear directorio para backups
mkdir -p ~/backups/$(date +%Y%m%d)

# Hacer backup completo
mongodump \
  --uri="mongodb://localhost:27017/food-inventory" \
  --out=~/backups/$(date +%Y%m%d)/pre-migration-variants \
  --gzip

# Verificar que el backup se creó correctamente
ls -lh ~/backups/$(date +%Y%m%d)/pre-migration-variants
```

**IMPORTANTE:** No continúes sin verificar que el backup existe y tiene archivos.

---

### 2. PROBAR EN LOCAL (SIMULACIÓN)

Primero vamos a hacer un DRY RUN en tu ambiente local para ver qué pasaría:

```bash
# En tu máquina local
cd /Users/jualfelsantamaria/Documents/Saas/V1.03/FOOD-INVENTORY-SAAS-COMPLETO/food-inventory-saas

# Compilar el script
npx ts-node scripts/migrate-products-to-variants.ts --dry-run
```

**Deberías ver algo como:**

```
🚀 Iniciando migración de productos a formato de variantes

📋 Modo: DRY RUN (simulación)
🌍 Migrando TODOS los tenants

🔍 Buscando productos...

📊 Encontrados 378 productos

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

[1/378] Procesando: Arroz Blanco
  🔄 Migrando producto: Arroz Blanco (ARR-001)
     → Creando variante: Estándar (ARR-001-VAR1)
     🔍 [DRY RUN] Producto se migraría exitosamente
     📦 Encontrados 1 inventario(s) para migrar
        🔍 [DRY RUN] Inventario 68f69c4b2a682fd945fa1a71 se migraría

[2/378] Procesando: Mantequilla de cabra
  ⏭️  Producto SVG-100 ya tiene 1 variante(s)

...

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📊 RESUMEN DE MIGRACIÓN

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Total de productos:              378
Productos con variantes (skip):  28
Productos sin variantes:         350
Productos migrados:              0 (DRY RUN)
Inventarios migrados:            0 (DRY RUN)
Errores:                         0
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

✅ Migración completada
```

---

### 3. EJECUTAR EN PRODUCCIÓN (REAL)

⚠️ **SOLO DESPUÉS DE:**
1. ✅ Verificar que el backup existe
2. ✅ Verificar que el DRY RUN funcionó sin errores
3. ✅ Informar a los usuarios (si hay clientes activos)

#### Opción A: Migrar TODO

```bash
# SSH al servidor
ssh deployer@178.156.182.177

# Ir al directorio del backend
cd ~/smartkubik/food-inventory-saas

# Ejecutar migración REAL
npx ts-node scripts/migrate-products-to-variants.ts
```

**El script te dará 5 segundos para cancelar (Ctrl+C) antes de empezar.**

#### Opción B: Migrar un solo Tenant (RECOMENDADO para empezar)

Si quieres ser más cauteloso, migra primero el tenant con más productos:

```bash
# Migrar solo un tenant específico (reemplaza TENANT_ID con el ID real)
npx ts-node scripts/migrate-products-to-variants.ts --tenant=68d371dffdb57e5c800f2fcd
```

---

### 4. VERIFICACIÓN POST-MIGRACIÓN

Después de ejecutar la migración:

#### 4.1 Verificar en MongoDB

```bash
# Conectar a MongoDB
mongosh mongodb://localhost:27017/food-inventory

# Verificar productos migrados
db.products.find({
  "variants.0": { $exists: true }
}).count()

# Debería ser cercano a 378 (total de productos)

# Verificar que las variantes tienen el formato correcto
db.products.findOne({
  "variants.0": { $exists: true }
}, {
  name: 1,
  sku: 1,
  variants: 1
})

# Debería mostrar algo como:
# {
#   _id: ...,
#   name: "Arroz Blanco",
#   sku: "ARR-001",
#   variants: [
#     {
#       _id: ...,
#       name: "Estándar",
#       sku: "ARR-001-VAR1",
#       unit: "kg",
#       unitSize: 1,
#       basePrice: 10,
#       costPrice: 6,
#       isActive: true
#     }
#   ]
# }
```

#### 4.2 Verificar en el Frontend

1. **Abre el sistema** en tu navegador
2. **Ve a Productos**
3. **Selecciona un producto** que antes NO tenía variantes
4. **Debería mostrar** la variante "Estándar"
5. **Intenta crear inventario** para ese producto
6. **Debería funcionar normalmente** ✅

---

## 🔄 En caso de problemas

### Si algo sale mal:

1. **RESTAURAR BACKUP INMEDIATAMENTE:**

```bash
# SSH al servidor
ssh deployer@178.156.182.177

# Restaurar desde el backup
mongorestore \
  --uri="mongodb://localhost:27017/food-inventory" \
  ~/backups/$(date +%Y%m%d)/pre-migration-variants \
  --gzip \
  --drop
```

2. **Revisar los errores** en el resumen de migración
3. **Contactar soporte** o revisar logs

---

## 📊 Qué hace exactamente el script

### Para cada producto SIN variantes:

1. **Crea una variante "Estándar":**
   ```javascript
   {
     _id: new ObjectId(),
     name: "Estándar",
     sku: `${producto.sku}-VAR1`,  // Ej: ARR-001-VAR1
     unit: producto.unitOfMeasure || "unidad",
     unitSize: 1,
     basePrice: producto.basePrice || 0,
     costPrice: producto.costPrice || 0,
     isActive: true
   }
   ```

2. **Agrega esa variante al array `variants[]` del producto**

3. **Busca todos los inventarios** de ese producto que no tienen `variantId`

4. **Actualiza esos inventarios** para referenciar la nueva variante:
   ```javascript
   {
     variantId: <nueva_variante_id>,
     variantSku: "ARR-001-VAR1"
   }
   ```

### Para productos que YA tienen variantes:

- ✅ **Los deja tal cual** (skip)

---

## ✅ Checklist de Ejecución

- [ ] Backup de MongoDB creado y verificado
- [ ] DRY RUN ejecutado sin errores
- [ ] Usuarios informados (si aplica)
- [ ] Migración ejecutada
- [ ] Verificación en MongoDB completada
- [ ] Verificación en Frontend completada
- [ ] Sistema funcionando normalmente

---

## 🆘 Contacto de Soporte

Si tienes problemas:
1. **NO CONTINÚES** con la migración
2. **RESTAURA el backup** si ya ejecutaste
3. Revisa este documento nuevamente
4. Contacta soporte técnico

---

## 📅 Cuándo ejecutar

**Recomendaciones:**
- ✅ Fuera de horario laboral
- ✅ Fin de semana o madrugada
- ✅ Cuando haya MENOS usuarios conectados
- ✅ Tener 30-60 minutos disponibles

---

## 🎓 Notas Técnicas

### ¿Por qué una variante "Estándar"?

- Mantiene consistencia en el modelo de datos
- Permite agregar más variantes en el futuro sin migración adicional
- Simplifica el código (un solo flujo para todos los productos)

### ¿Qué pasa con productos nuevos?

- Los productos NUEVOS se crean directamente con el formato correcto
- Esta migración es SOLO para productos existentes

### ¿Afecta el rendimiento?

- ❌ NO afecta el rendimiento del sistema
- Las variantes se cargan junto con el producto (mismo query)

---

**Última actualización:** 20 de Octubre, 2025
**Versión:** 1.0

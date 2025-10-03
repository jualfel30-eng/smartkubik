# Migración de Verticals para Tenants Existentes

## Resumen

Este script migra tenants existentes que no tienen los campos `vertical` y `enabledModules` al nuevo sistema de arquitectura multi-vertical.

## ¿Qué hace la migración?

1. **Detecta tenants sin migrar**: Busca tenants sin campos `vertical` o `enabledModules`
2. **Asigna vertical apropiado**: Analiza el `businessType` del tenant para determinar qué vertical le corresponde
3. **Configura módulos habilitados**: Asigna automáticamente los módulos por defecto según el vertical

## Mapeo de Business Types a Verticals

### FOOD_SERVICE
- restaurante
- cafetería
- bar
- comida

### RETAIL
- retail
- tienda
- comercio
- venta

### SERVICES
- servicio
- consultoría
- spa
- salón

### LOGISTICS
- logística
- transporte
- envío
- distribución

**Default**: Si no coincide con ninguno → `FOOD_SERVICE`

## Cómo ejecutar la migración

### Opción 1: Usando npm script (Recomendado)

```bash
cd food-inventory-saas
npm run db:migrate:vertical
```

### Opción 2: Compilar y ejecutar directamente

```bash
cd food-inventory-saas
npm run build
node dist/scripts/migrate-tenants-vertical.js
```

### Opción 3: Con ts-node

```bash
cd food-inventory-saas
npx ts-node -r dotenv/config scripts/migrate-tenants-vertical.ts
```

## Antes de ejecutar

### 1. Verificar variables de entorno

Asegúrate de que tu archivo `.env` tiene la conexión correcta a MongoDB:

```env
MONGO_URI=mongodb://localhost:27017/food-inventory-saas
# o
MONGO_URI=mongodb+srv://usuario:password@cluster.mongodb.net/food-inventory-saas
```

### 2. Hacer backup de la base de datos

**MUY IMPORTANTE**: Siempre haz backup antes de ejecutar migraciones.

#### Con MongoDB local:
```bash
mongodump --db food-inventory-saas --out ./backups/pre-vertical-migration
```

#### Con MongoDB Atlas:
Usa el panel de Atlas para crear un snapshot manual antes de ejecutar.

### 3. Verificar tenants actuales (Opcional)

Puedes verificar cuántos tenants necesitan migración:

```bash
# En MongoDB shell
use food-inventory-saas
db.tenants.count({ $or: [{ vertical: { $exists: false } }, { enabledModules: { $exists: false } }] })
```

## Durante la ejecución

El script mostrará:

```
🚀 Starting tenant migration...

📊 Found 3 tenants to migrate

🔄 Processing tenant: TENANT001 (Mi Restaurante)
  📌 Business Type: Restaurante
  🎯 Assigned Vertical: FOOD_SERVICE
  📦 Enabled Modules:
     ✓ inventory
     ✓ orders
     ✓ customers
     ✓ suppliers
     ✓ reports
     ✓ accounting
     ✓ tables
     ✓ recipes
     ✓ kitchenDisplay
     ✓ menuEngineering
  ✅ Migration successful

🔄 Processing tenant: TENANT002 (Tienda ABC)
  📌 Business Type: Retail
  🎯 Assigned Vertical: RETAIL
  📦 Enabled Modules:
     ✓ inventory
     ✓ orders
     ✓ customers
     ✓ suppliers
     ✓ reports
     ✓ accounting
     ✓ pos
     ✓ variants
     ✓ ecommerce
     ✓ loyaltyProgram
  ✅ Migration successful

============================================================
📈 Migration Summary:
============================================================
✅ Successfully migrated: 3
❌ Skipped/Failed: 0
📊 Total processed: 3
============================================================

🔍 Verifying migration...
✅ 3 tenants now have vertical and enabledModules

🎉 Migration completed successfully!
```

## Después de ejecutar

### 1. Verificar que la migración fue exitosa

```bash
# En MongoDB shell
use food-inventory-saas

# Verificar que todos los tenants tienen vertical
db.tenants.find({ vertical: { $exists: false } }).count()
# Debe retornar: 0

# Verificar que todos tienen enabledModules
db.tenants.find({ enabledModules: { $exists: false } }).count()
# Debe retornar: 0

# Ver un ejemplo de tenant migrado
db.tenants.findOne({}, { vertical: 1, enabledModules: 1, businessType: 1, name: 1 })
```

### 2. Probar en la aplicación

1. Inicia el backend:
   ```bash
   npm run start:dev
   ```

2. Inicia el frontend:
   ```bash
   cd ../food-inventory-admin
   npm run dev
   ```

3. Prueba accediendo con un usuario de un tenant migrado
4. Verifica que solo se muestran las opciones de menú correspondientes a sus módulos habilitados

### 3. Ajustes manuales (si es necesario)

Si un tenant necesita un vertical diferente o módulos adicionales:

```bash
# En MongoDB shell
db.tenants.updateOne(
  { code: "TENANT001" },
  {
    $set: {
      vertical: "RETAIL",  // Cambiar vertical
      "enabledModules.ecommerce": true  // Habilitar módulo adicional
    }
  }
)
```

## Re-ejecutar la migración

El script es **idempotente**: solo procesa tenants que aún no tienen `vertical` o `enabledModules`.

Si ejecutas el script múltiples veces, solo migrará los tenants pendientes:

```bash
npm run db:migrate:vertical
# Output: ✅ All tenants are already migrated!
```

## Troubleshooting

### Error: "Cannot connect to MongoDB"

**Causa**: Variables de entorno incorrectas o MongoDB no está corriendo

**Solución**:
1. Verifica el `.env`:
   ```bash
   cat .env | grep MONGO_URI
   ```
2. Verifica que MongoDB está corriendo:
   ```bash
   # Local
   sudo systemctl status mongod

   # O prueba conexión
   mongosh
   ```

### Error: "Migration failed" para un tenant específico

**Causa**: Problema con los datos del tenant (datos corruptos, etc.)

**Solución**:
1. Revisa los logs del script para ver el error específico
2. Verifica los datos del tenant en MongoDB
3. Corrige manualmente si es necesario:
   ```javascript
   db.tenants.updateOne(
     { _id: ObjectId("...") },
     { $set: { vertical: "FOOD_SERVICE", enabledModules: { /* ... */ } } }
   )
   ```

### Algunos tenants no se migraron

**Causa**: Es posible que ya tengan el campo `vertical` o `enabledModules`

**Solución**:
1. Verifica los tenants manualmente:
   ```javascript
   db.tenants.find({ vertical: { $exists: true } })
   ```
2. Si necesitas re-migrar un tenant específico:
   ```javascript
   // Primero, elimina los campos
   db.tenants.updateOne(
     { code: "TENANT001" },
     { $unset: { vertical: "", enabledModules: "" } }
   )

   // Luego ejecuta la migración de nuevo
   ```

## Rollback

Si necesitas revertir la migración:

### Opción 1: Restaurar desde backup

```bash
mongorestore --db food-inventory-saas ./backups/pre-vertical-migration/food-inventory-saas
```

### Opción 2: Eliminar campos manualmente

```javascript
// En MongoDB shell
db.tenants.updateMany(
  {},
  { $unset: { vertical: "", enabledModules: "" } }
)
```

**⚠️ ADVERTENCIA**: El rollback solo funciona si no has creado nuevos tenants después de la migración.

## Soporte

Si encuentras problemas durante la migración:

1. Revisa los logs del script
2. Verifica el estado de la base de datos
3. Consulta este documento de troubleshooting
4. Contacta al equipo de desarrollo con:
   - Logs completos del script
   - Output del comando de verificación de MongoDB
   - Descripción del problema

## Checklist de Migración

- [ ] Crear backup de la base de datos
- [ ] Verificar variables de entorno
- [ ] Ejecutar migración: `npm run db:migrate:vertical`
- [ ] Verificar que todos los tenants fueron migrados
- [ ] Probar la aplicación con diferentes tenants
- [ ] Ajustar manualmente si es necesario
- [ ] Documentar cualquier cambio manual realizado

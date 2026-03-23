# 🔧 Consolidación de Proveedores Duplicados

## 📋 Resumen

Este directorio contiene el script `consolidate-duplicate-suppliers.js` para consolidar proveedores duplicados en el tenant **Tiendas Broas, C.A.** (broas.admon@gmail.com).

## 🎯 Problema Original

Debido a un bug previo en la búsqueda de proveedores por RIF/TaxID, se crearon **9 proveedores duplicados** al intentar crear compras. Los usuarios llenaban los datos del proveedor pensando que no existía, y el sistema creaba un nuevo registro.

## ✅ Estado Actual

- **7 grupos de duplicados** identificados
- **9 registros duplicados** para eliminar
- **0 órdenes de compra** vinculadas (sin riesgo de pérdida de datos)
- **0 calificaciones** vinculadas
- **0 productos** vinculados
- Todos los masters tienen `paymentSettings` completos

## 🔍 Grupos Duplicados

| Proveedor | Total | Duplicados | RIF |
|-----------|-------|-----------|-----|
| Inversiones Eurofrutas M&F, C.A. | 3 | 2 | J-400641209 |
| Isola Foods, C.A. | 2 | 1 | J-413164663 |
| Emprendimiento Samuel Gonzalez 11 | 2 | 1 | J-506443430 |
| Geomar Tarazona | 2 | 1 | J-506443430 |
| Frigorifico Mundial, C.A. | 2 | 1 | J-293879183 |
| Avanzada Inversiones 2010 Cledy Vera, F.P | 2 | 1 | V-159783029 |
| Coca Cola Femsa de Venezuela, S.A. | 2 | 1 | J-303836216 |

## 🚀 Uso del Script

### 1️⃣ Análisis (Dry-Run)

Ver qué haría el script **SIN aplicar cambios**:

```bash
cd food-inventory-saas
node src/scripts/consolidate-duplicate-suppliers.js --dry-run
```

**Salida esperada:**
- Lista de todos los grupos duplicados
- Identificación del "master" (registro que se conserva)
- Lista de duplicados que serán eliminados
- Estadísticas de cada registro (órdenes, calificaciones, productos)

### 2️⃣ Ejecución

Aplicar la consolidación **CON cambios reales**:

```bash
node src/scripts/consolidate-duplicate-suppliers.js --execute
```

**El script hará:**
1. ✅ Crear backup completo en `food-inventory-saas/backups/`
2. 🔍 Identificar grupos duplicados
3. 📊 Seleccionar el "master" de cada grupo
4. 🔄 Migrar todas las referencias:
   - Órdenes de compra (`PurchaseOrder.supplierId`)
   - Calificaciones (`PurchaseOrderRating.supplierId`)
   - Enlaces de productos (`Product.suppliers[]`)
5. 💾 Fusionar `paymentSettings` (si el master no tiene y el duplicado sí)
6. 🗑️ Eliminar registros duplicados
7. 🔒 Todo en transacción MongoDB (si algo falla, se revierte todo)

## 🛡️ Seguridad

### Criterios de Selección del "Master"

El script selecciona el registro a **conservar** basándose en:

1. **Prioridad 1**: Tiene un `Customer` real asociado (no es virtual)
2. **Prioridad 2**: Tiene más órdenes de compra
3. **Prioridad 3**: Es el más reciente

### Backup Automático

Antes de ejecutar cambios, el script crea un backup completo en:

```
food-inventory-saas/backups/suppliers-backup-YYYY-MM-DDTHH-mm-ss.json
```

**Contenido del backup:**
- Todos los proveedores del tenant
- Todas las órdenes de compra
- Todas las calificaciones
- Todos los productos con enlaces de proveedores

### Transacciones MongoDB

Todos los cambios se hacen en **una sola transacción**:
- ✅ Si todo funciona → se aplican todos los cambios
- ❌ Si algo falla → se revierten TODOS los cambios (ningún cambio parcial)

## 🔄 Rollback (Deshacer)

Si necesitas revertir los cambios, usa el backup generado:

```bash
node src/scripts/restore-from-backup.js backups/suppliers-backup-YYYY-MM-DDTHH-mm-ss.json
```

*(Este script no está implementado aún - crearlo si es necesario)*

## 📊 Verificación Post-Consolidación

Después de ejecutar, verifica:

1. **Conteo de proveedores**:
   ```javascript
   db.suppliers.countDocuments({ tenantId: "69b187062339e815ceba7487" })
   // Debería ser: 37 - 9 = 28 proveedores
   ```

2. **No hay duplicados por nombre**:
   ```javascript
   db.suppliers.aggregate([
     { $match: { tenantId: "69b187062339e815ceba7487" } },
     { $group: { _id: "$name", count: { $sum: 1 } } },
     { $match: { count: { $gt: 1 } } }
   ])
   // Debería retornar: [] (vacío)
   ```

3. **Todas las órdenes apuntan a proveedores existentes**:
   ```javascript
   const orphanedPOs = await db.purchaseorders.find({
     tenantId: "69b187062339e815ceba7487",
     supplierId: { $nin: (await db.suppliers.distinct("_id", { tenantId: "..." })) }
   })
   // Debería retornar: [] (vacío)
   ```

## 🐛 Troubleshooting

### Error: "Cannot populate path `customerId`"
- **Causa**: Schema de Mongoose estricto
- **Fix**: Ya corregido en el script (no usa populate)

### Error: "Transaction aborted"
- **Causa**: Error durante la migración
- **Fix**: Los cambios se revierten automáticamente, revisa los logs

### Error: "Backup directory not found"
- **Causa**: Directorio `backups/` no existe
- **Fix**: El script lo crea automáticamente

## 📝 Notas Adicionales

### ¿Por qué todos tienen Customer real?

Desde la mejora implementada el 2026-03-18, cuando se crea un proveedor desde el módulo CRM (`/customers` con `customerType='supplier'`), el sistema automáticamente crea un registro `Supplier` vinculado. Por eso todos los duplicados tienen Customer asociado.

### ¿Puedo ejecutar el script múltiples veces?

Sí, es **idempotente**. Si lo ejecutas de nuevo después de consolidar, detectará que no hay duplicados y no hará nada.

### ¿Afecta a otros tenants?

No, el script está **hardcodeado** al tenant ID de Tiendas Broas:
```javascript
const TENANT_ID = '69b187062339e815ceba7487';
```

Para consolidar duplicados en otro tenant, debes modificar esta constante.

## 🎉 Resultado Esperado

Después de ejecutar `--execute`:

```
✅ 7 grupos consolidados
🗑️ 9 registros duplicados eliminados
💾 Backup guardado en: backups/suppliers-backup-...json
📊 Total de proveedores: 28 (antes: 37)
```

El tenant quedará limpio, sin duplicados, y todos los datos preservados.

## 🔗 Referencias

- Script principal: `consolidate-duplicate-suppliers.js`
- Análisis de duplicados: `find-duplicate-suppliers.js`
- Test workflow: `test-supplier-workflow.js`
- Memory notes: `/Users/jualfelsantamaria/.claude/projects/-Users-jualfelsantamaria/memory/MEMORY.md`

---

**Última actualización**: 2026-03-18
**Autor**: Claude Sonnet 4.5 + Juan Alfredo Santa María

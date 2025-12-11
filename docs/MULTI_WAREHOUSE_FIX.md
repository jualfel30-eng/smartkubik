# Fix: Feature Flag ENABLE_MULTI_WAREHOUSE no funciona

## Problema Identificado

El feature flag `ENABLE_MULTI_WAREHOUSE` no se guardaba correctamente desde la UI de Super-admin, mostrando siempre como DISABLED al recargar.

## Análisis de Ingeniería Inversa

### Flujo de Feature Flags que SÍ funcionan:

1. **Frontend - SuperAdminSettings.jsx:**
   - Fetch inicial: `GET /super-admin/feature-flags` → Retorna `{ ENABLE_EMPLOYEE_PERFORMANCE: true/false, ... }`
   - Toggle: modifica estado local
   - Guardar: `POST /super-admin/feature-flags` con `{ flags: { ENABLE_*: true/false } }`

2. **Backend - super-admin.controller.ts:**
   - `GET /super-admin/feature-flags` → `superAdminService.getFeatureFlags()`
   - `POST /super-admin/feature-flags` → `superAdminService.updateFeatureFlags(flags)`

3. **Backend - super-admin.service.ts:**
   - `getFeatureFlags()`: Lee de MongoDB las keys `ENABLE_*` y retorna objeto
   - `updateFeatureFlags()`: Hace `bulkWrite` a MongoDB y llama `featureFlagsService.invalidateCache()`

4. **Backend - FeatureFlagsService:**
   - Tiene `FLAG_KEY_MAP` que mapea `ENABLE_EMPLOYEE_PERFORMANCE` → `EMPLOYEE_PERFORMANCE_TRACKING`
   - `getFeatureFlags()`: Lee MongoDB, mapea a keys internas y retorna objeto `FeatureFlags`
   - Usado por `FeatureFlagsController` que expone `GET /feature-flags` (público)

5. **Frontend - use-feature-flags.jsx:**
   - Llama a `GET /feature-flags` (NOT /super-admin/feature-flags!)
   - Espera `{ data: { EMPLOYEE_PERFORMANCE_TRACKING: true, ... } }`
   - Cachea en localStorage

6. **Frontend - features.js:**
   - Lee de `import.meta.env.VITE_ENABLE_*` como fallback (ESTÁTICO)
   - Log en DEV muestra valores de env vars

### Problema Raíz

Al comparar `ENABLE_MULTI_WAREHOUSE` con los flags que funcionan, encontré que:

**❌ FALTABA en ambos archivos .env:**

1. **Backend** (`food-inventory-saas/.env`):
   - Tenía todas las demás variables `ENABLE_*`
   - **Faltaba** `ENABLE_MULTI_WAREHOUSE`

2. **Frontend** (`food-inventory-admin/.env`):
   - Tenía todas las demás variables `VITE_ENABLE_*`
   - **Faltaban** `VITE_ENABLE_SERVICE_BOOKING_PORTAL`, `VITE_ENABLE_APPOINTMENT_REMINDERS` y `VITE_ENABLE_MULTI_WAREHOUSE`

### Por qué esto causaba el problema

El sistema de feature flags tiene este flujo de fallback:

```typescript
// Backend - FeatureFlagsService
MULTI_WAREHOUSE:
  settingsMap.get("ENABLE_MULTI_WAREHOUSE") ??  // ← Lee de MongoDB primero
  process.env.ENABLE_MULTI_WAREHOUSE === "true"  // ← Fallback a .env si no existe en MongoDB

// Frontend - use-feature-flags.jsx
const envFlags = {
  MULTI_WAREHOUSE: import.meta.env.VITE_ENABLE_MULTI_WAREHOUSE === 'true', // ← Fallback mientras carga
};
```

Sin las variables de entorno:
1. El valor inicial en frontend era siempre `false` (porque `undefined === 'true'` es `false`)
2. El backend podría no guardar correctamente en MongoDB en el primer intento
3. Los logs de desarrollo mostraban siempre DISABLED

## ⚠️ PROBLEMA CRÍTICO REAL (encontrado haciendo ingeniería inversa)

### Los componentes de Inventario usaban la función ESTÁTICA en lugar del HOOK DINÁMICO

**Este fue el problema VERDADERO que causaba que no funcionara:**

❌ **INCORRECTO** (lo que Codex implementó):
```javascript
import { isFeatureEnabled } from '@/config/features.js';

export default function InventoryDashboard() {
  const multiWarehouseEnabled = isFeatureEnabled('MULTI_WAREHOUSE');
  // Esta función lee import.meta.env (ESTÁTICO)
  // NO se actualiza cuando cambias el flag desde Super-admin
}
```

✅ **CORRECTO** (corregido):
```javascript
import { useFeatureFlags } from '@/hooks/use-feature-flags.jsx';

export default function InventoryDashboard() {
  const { flags } = useFeatureFlags();
  const multiWarehouseEnabled = flags.MULTI_WAREHOUSE;
  // Este hook lee del backend /feature-flags (DINÁMICO)
  // SE actualiza cuando guardas desde Super-admin
}
```

### Archivos corregidos:
- ✅ `InventoryDashboard.jsx` - Cambiado a usar `useFeatureFlags()`
- ✅ `InventoryStockSummary.jsx` - Cambiado a usar `useFeatureFlags()`
- ✅ `InventoryMovementsPanel.jsx` - Cambiado a usar `useFeatureFlags()`
- ✅ `InventoryAlertsPanel.jsx` - Cambiado a usar `useFeatureFlags()`

### Por qué esto causaba el problema:

1. `features.js` es un archivo **ESTÁTICO** que se compila con Vite y solo lee `import.meta.env`
2. Aunque guardes el flag en MongoDB desde Super-admin, `import.meta.env` **NO cambia** hasta que reinicies el servidor de desarrollo
3. El hook `useFeatureFlags()` lee del endpoint `/feature-flags` que consulta MongoDB en tiempo real
4. Por eso los demás feature flags "funcionaban" pero este no

## Solución Implementada

### 1. ✅ Corregido uso del hook dinámico (4 archivos)

Todos los componentes de Inventario ahora usan `useFeatureFlags()` en lugar de `isFeatureEnabled()`.

### 2. Agregada variable al Frontend (.env)

```bash
# food-inventory-admin/.env

# Servicios & Booking
VITE_ENABLE_SERVICE_BOOKING_PORTAL=false
VITE_ENABLE_APPOINTMENT_REMINDERS=false

# Inventario
VITE_ENABLE_MULTI_WAREHOUSE=false
```

### 2. Agregada variable al Backend (.env)

```bash
# food-inventory-saas/.env

ENABLE_SERVICE_BOOKING_PORTAL=false
ENABLE_APPOINTMENT_REMINDERS=false
ENABLE_MULTI_WAREHOUSE=false
```

## Pasos para Probar la Solución

### Opción A: Si el código del frontend ya está actualizado con los cambios

1. **Limpiar cache de localStorage** (en la consola del navegador):
   ```javascript
   localStorage.removeItem('featureFlags')
   // O usa la función helper:
   clearFeatureFlagsCache()
   ```

2. **Recargar la página** (Ctrl+R o Cmd+R)

3. **Ir a Super-admin > Settings** (`/super-admin/settings`)

4. **Activar el feature flag ENABLE_MULTI_WAREHOUSE** (toggle ON)

5. **Guardar** y esperar el toast "Feature flags guardados exitosamente"

6. **Esperar 5 segundos** (para que el caché del hook se actualice automáticamente)

7. **Ir a Inventario** y verificar que:
   - ✅ Aparece la pestaña "Almacenes" entre "Inventario" y "Compras"
   - ✅ Puedes hacer clic en "Almacenes" y ver el componente `WarehouseManagement`
   - ✅ Las columnas "Por almacén" aparecen en las tablas de stock

### Opción B: Si necesitas actualizar el código primero

1. **Hacer pull de los cambios** o actualizar manualmente los 4 archivos:
   - `InventoryDashboard.jsx`
   - `InventoryStockSummary.jsx`
   - `InventoryMovementsPanel.jsx`
   - `InventoryAlertsPanel.jsx`

2. **El frontend se recargará automáticamente** (hot reload)

3. **Seguir los pasos de la Opción A**

### ⚠️ NO es necesario reiniciar servidores

Gracias a que ahora usamos el hook `useFeatureFlags()`:
- ✅ Los cambios se aplican en **tiempo real** al guardar desde Super-admin
- ✅ El caché se actualiza automáticamente cada 5 minutos
- ✅ NO necesitas reiniciar el backend
- ✅ NO necesitas reiniciar el frontend (solo si actualizaste el código)

## Verificación de MongoDB

Si aún no funciona, verificar en MongoDB Atlas:

1. Conectar a la base de datos `test`
2. Collection: `globalsettings`
3. Buscar documento con:
   ```json
   { "key": "ENABLE_MULTI_WAREHOUSE" }
   ```
4. Debe existir y tener:
   ```json
   {
     "key": "ENABLE_MULTI_WAREHOUSE",
     "value": "true"  // ← String "true", no boolean
   }
   ```

Si no existe, crear manualmente:
```javascript
db.globalsettings.insertOne({
  key: "ENABLE_MULTI_WAREHOUSE",
  value: "false",
  createdAt: new Date(),
  updatedAt: new Date()
})
```

## Logs útiles para debugging

### Backend logs:
```
[FeatureFlagsService] Feature flags reloaded from database
🎛️  Feature Flags Status:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  ✅ ENABLED  - MULTI_WAREHOUSE  ← Debe aparecer si está activado
```

### Frontend logs (consola del navegador):
```
📡 Fetching feature flags from backend...
📦 Backend response: { data: { MULTI_WAREHOUSE: true, ... } }
🎛️  Feature Flags loaded from backend: { MULTI_WAREHOUSE: true, ... }
```

## Comparación: Lo que funcionaba vs lo que no

### ✅ Feature Flags que SÍ funcionaban:
- `ENABLE_EMPLOYEE_PERFORMANCE` → Tenía variable en ambos .env
- `ENABLE_BANK_MOVEMENTS` → Tenía variable en ambos .env
- `ENABLE_DASHBOARD_CHARTS` → Tenía variable en ambos .env
- etc.

### ❌ Feature Flag que NO funcionaba:
- `ENABLE_MULTI_WAREHOUSE` → **FALTABA** en ambos .env

## Conclusión

El problema tenía **DOS causas**:

### 1. ❌ CRÍTICO: Uso incorrecto del sistema de feature flags

**Los componentes de Inventario usaban la función ESTÁTICA** `isFeatureEnabled()` de `features.js` que lee `import.meta.env`, en lugar del **hook DINÁMICO** `useFeatureFlags()` que lee del backend.

Esto explica por qué:
- Nunca se veían las pestañas de almacén aunque guardaras el flag
- El log siempre mostraba `DISABLED`
- Parecía que "no tenía solución"

**Comparación con otros módulos que SÍ funcionan:**

Por ejemplo, el módulo de Bank Accounts usa **correctamente** el hook:
```javascript
// En BankAccountsPage.jsx (funciona bien)
import { useFeatureFlags } from '@/hooks/use-feature-flags.jsx';
const { flags } = useFeatureFlags();
const movementsEnabled = flags.BANK_ACCOUNTS_MOVEMENTS;
```

Pero los componentes de Inventario que Codex creó usaban **incorrectamente** la función estática:
```javascript
// En InventoryDashboard.jsx (NO funcionaba)
import { isFeatureEnabled } from '@/config/features.js';
const multiWarehouseEnabled = isFeatureEnabled('MULTI_WAREHOUSE');
```

### 2. ❌ SECUNDARIO: Variables faltantes en .env

Codex también olvidó agregar las variables de entorno, pero **este problema era menor** comparado con el uso incorrecto del hook.

### Resumen de lo que hizo mal Codex:

Cuando Codex agregó el feature flag al código:
- ✅ Agregó al `FLAG_KEY_MAP` en `feature-flags.service.ts`
- ✅ Agregó al array de `featureFlagKeys` en `super-admin.service.ts`
- ✅ Agregó al `FEATURE_FLAGS_INFO` en `SuperAdminSettings.jsx`
- ✅ Agregó a los hooks `use-feature-flags.jsx` y `features.js`
- ❌ **USIÓ LA FUNCIÓN ESTÁTICA** en lugar del hook dinámico en los componentes de Inventario
- ❌ **OLVIDÓ** agregar las variables de entorno a los archivos `.env`

**Lección aprendida:**
1. Siempre comparar con lo que funciona en lugar de asumir que el código está mal ✅
2. Codex estaba "ciego" porque nunca miró cómo funcionaban los demás feature flags exitosos
3. La ingeniería inversa reveló el problema en minutos

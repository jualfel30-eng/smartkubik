# SOLUCIÓN: Módulos de vertical incorrecta apareciendo en el menú

## Problema identificado
El tenant "Early Adopter Inc." tenía configurado `vertical: "SERVICES"` en la base de datos, pero debería ser `vertical: "RETAIL"` para la vertical de minoristas de alimentación.

## Causa raíz
Cuando Gemini borró la base de datos ayer y se restauró el backup del 15 de noviembre, el tenant quedó con la configuración incorrecta.

## Solución aplicada

### 1. Corrección en la base de datos ✅
Se actualizó el tenant en MongoDB con:
```javascript
db.tenants.updateOne(
    { _id: ObjectId('68d371dffdb57e5c800f2fcd') },
    {
        $set: {
            vertical: 'RETAIL',
            'verticalProfile.key': 'food-retail',
            enabledModules: {
                // Core modules
                inventory: true,
                orders: true,
                customers: true,
                suppliers: true,
                reports: true,
                accounting: true,
                bankAccounts: true,
                payroll: true,
                hrCore: true,
                timeAndAttendance: true,
                
                // Communication & Marketing
                chat: true,
                marketing: true,
                
                // RETAIL specific modules
                pos: true,
                variants: true,
                ecommerce: false,
                loyaltyProgram: true,
                
                // Disable SERVICES modules
                appointments: false,
                resources: false,
                booking: false,
                servicePackages: false,
                
                // Disable FOOD_SERVICE modules
                restaurant: false,
                tables: false,
                recipes: false,
                kitchenDisplay: false,
                menuEngineering: false,
                tips: false,
                reservations: false
            }
        }
    }
);
```

### 2. Acción requerida del usuario ⚠️

**El frontend cachea los datos del tenant en `localStorage`**, por lo que necesitas:

**Opción 1 (Recomendada):**
1. Ve a http://localhost:5173
2. Haz clic en "Cerrar Sesión"
3. Vuelve a iniciar sesión con tus credenciales

**Opción 2 (Manual):**
1. Abre DevTools (F12)
2. Ve a la consola
3. Ejecuta:
   ```javascript
   localStorage.removeItem('tenant');
   location.reload();
   ```

## Resultado esperado
Después de cerrar sesión y volver a iniciar sesión, deberías ver:

### ✅ Módulos que DEBEN aparecer (RETAIL):
- Panel de Control
- Órdenes
- WhatsApp
- Inventario
- Marketing
- POS
- Programa de lealtad
- CRM
- Contabilidad
- Recursos Humanos
- Reportes

### ❌ Módulos que NO deben aparecer:
- Citas (Appointments)
- Servicios
- Recursos
- Operaciones Hotel
- Plano Hotel
- Mesas (Restaurant)
- Cocina (KDS)
- Reservas (Restaurant)
- Propinas
- Ingeniería de Menú
- Recetas

## Verificación
Puedes verificar el tenant actual ejecutando:
```bash
./scripts/check-earlyadopter-tenant.sh
```

Debería mostrar:
```
vertical: RETAIL
verticalProfile.key: food-retail
```

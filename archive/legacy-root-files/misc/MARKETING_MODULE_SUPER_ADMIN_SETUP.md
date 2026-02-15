# Marketing Module - Super Admin Setup Guide

## 📋 Overview

El módulo de Marketing es ahora un **módulo opt-in** (no habilitado por defecto) que debe ser activado manualmente por el Super Admin para cada tenant que lo contrate.

---

## ✅ Cambios Implementados

### 1. **Nuevo Módulo en Tenant Schema**
- Agregado `marketing?: boolean` a `enabledModules` en [tenant.schema.ts](food-inventory-saas/src/schemas/tenant.schema.ts#L220)
- Categorizado como "Communication & Marketing modules"

### 2. **Nuevos Permisos**
Agregados a [constants.ts](food-inventory-saas/src/modules/permissions/constants.ts):
- `marketing_read` - Permite ver campañas, analíticas, templates
- `marketing_write` - Permite crear, editar, lanzar campañas

### 3. **Configuración de Verticales**
El módulo `marketing` está configurado como `false` por defecto en **TODOS** los verticales:
- FOOD_SERVICE
- RETAIL
- SERVICES
- LOGISTICS
- HYBRID
- MANUFACTURING

Esto significa que ningún tenant tendrá marketing habilitado automáticamente al crearse.

### 4. **Frontend**
- Ruta universal: `/marketing` (no más `/restaurant/marketing`)
- Requiere permiso: `marketing_read`
- Requiere módulo habilitado: `requiresModule: 'marketing'`

---

## 🔧 Cómo Activar Marketing para un Tenant

### **Opción 1: Via API (Recomendado para Super Admin)**

#### Endpoint
```http
PATCH /super-admin/tenants/:tenantId/modules
Content-Type: application/json
Authorization: Bearer <super-admin-token>

{
  "enabledModules": {
    "marketing": true
  }
}
```

#### Ejemplo con cURL
```bash
curl -X PATCH \
  'http://localhost:3000/super-admin/tenants/507f1f77bcf86cd799439011/modules' \
  -H 'Content-Type: application/json' \
  -H 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' \
  -d '{
    "enabledModules": {
      "marketing": true
    }
  }'
```

#### Ejemplo con JavaScript/Fetch
```javascript
const enableMarketingForTenant = async (tenantId, token) => {
  const response = await fetch(
    `http://localhost:3000/super-admin/tenants/${tenantId}/modules`,
    {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({
        enabledModules: {
          marketing: true
        }
      })
    }
  );

  return await response.json();
};

// Uso
await enableMarketingForTenant('507f1f77bcf86cd799439011', superAdminToken);
```

---

### **Opción 2: Via Base de Datos Directa (MongoDB)**

Si tienes acceso directo a MongoDB:

```javascript
// Usando MongoDB shell o MongoDB Compass
db.tenants.updateOne(
  { _id: ObjectId("507f1f77bcf86cd799439011") },
  {
    $set: {
      "enabledModules.marketing": true
    }
  }
);
```

O con Mongoose:

```javascript
// Usando código Node.js con Mongoose
const { MongoClient } = require('mongodb');

async function enableMarketingModule(tenantId) {
  const client = await MongoClient.connect('mongodb://localhost:27017');
  const db = client.db('your-database-name');

  const result = await db.collection('tenants').updateOne(
    { _id: new ObjectId(tenantId) },
    { $set: { 'enabledModules.marketing': true } }
  );

  await client.close();
  return result;
}

await enableMarketingModule('507f1f77bcf86cd799439011');
```

---

## 🔐 Asignar Permisos a Roles

Después de habilitar el módulo, los usuarios del tenant necesitan los permisos correspondientes.

### Endpoint para Actualizar Permisos de un Rol
```http
PATCH /super-admin/roles/:roleId/permissions
Content-Type: application/json
Authorization: Bearer <super-admin-token>

{
  "permissions": ["marketing_read", "marketing_write"]
}
```

### Ejemplo Completo: Agregar Permisos a Rol "Admin"

```javascript
const addMarketingPermissionsToRole = async (roleId, token) => {
  // 1. Obtener permisos actuales del rol
  const roleResponse = await fetch(
    `http://localhost:3000/super-admin/roles/${roleId}`,
    {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    }
  );
  const role = await roleResponse.json();

  // 2. Agregar nuevos permisos a los existentes
  const updatedPermissions = [
    ...role.permissions,
    'marketing_read',
    'marketing_write'
  ];

  // 3. Actualizar el rol
  const response = await fetch(
    `http://localhost:3000/super-admin/roles/${roleId}/permissions`,
    {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({
        permissions: updatedPermissions
      })
    }
  );

  return await response.json();
};

// Uso
await addMarketingPermissionsToRole('507f1f77bcf86cd799439012', superAdminToken);
```

---

## 📋 Workflow Completo de Activación

### Paso a Paso para Activar Marketing en un Tenant

```javascript
async function setupMarketingForTenant(tenantId, adminRoleId, token) {
  try {
    // 1. Habilitar módulo de marketing para el tenant
    console.log('Paso 1: Habilitando módulo de marketing...');
    await fetch(
      `http://localhost:3000/super-admin/tenants/${tenantId}/modules`,
      {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          enabledModules: {
            marketing: true
          }
        })
      }
    );
    console.log('✅ Módulo habilitado');

    // 2. Obtener el rol Admin del tenant
    console.log('Paso 2: Obteniendo rol Admin del tenant...');
    const roleResponse = await fetch(
      `http://localhost:3000/super-admin/roles/${adminRoleId}`,
      {
        headers: { 'Authorization': `Bearer ${token}` }
      }
    );
    const role = await roleResponse.json();
    console.log('✅ Rol obtenido');

    // 3. Agregar permisos de marketing al rol Admin
    console.log('Paso 3: Agregando permisos de marketing...');
    const updatedPermissions = [
      ...role.permissions,
      'marketing_read',
      'marketing_write'
    ];

    await fetch(
      `http://localhost:3000/super-admin/roles/${adminRoleId}/permissions`,
      {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          permissions: updatedPermissions
        })
      }
    );
    console.log('✅ Permisos agregados');

    console.log('\n🎉 Marketing module successfully activated for tenant!');
    console.log('Los usuarios con rol Admin ahora pueden acceder a /marketing');

  } catch (error) {
    console.error('❌ Error durante la activación:', error);
    throw error;
  }
}

// Uso
await setupMarketingForTenant(
  '507f1f77bcf86cd799439011', // tenantId
  '507f1f77bcf86cd799439012', // adminRoleId del tenant
  superAdminToken
);
```

---

## 🔍 Verificar Estado del Módulo

### Verificar si Marketing está Habilitado

```javascript
const checkMarketingStatus = async (tenantId, token) => {
  const response = await fetch(
    `http://localhost:3000/super-admin/tenants/${tenantId}`,
    {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    }
  );

  const tenant = await response.json();
  const isMarketingEnabled = tenant.enabledModules?.marketing === true;

  console.log(`Marketing para ${tenant.name}: ${isMarketingEnabled ? 'HABILITADO' : 'DESHABILITADO'}`);

  return isMarketingEnabled;
};

// Uso
await checkMarketingStatus('507f1f77bcf86cd799439011', superAdminToken);
```

### Ver Todos los Módulos Habilitados

```javascript
const getTenantModules = async (tenantId, token) => {
  const response = await fetch(
    `http://localhost:3000/super-admin/tenants/${tenantId}`,
    {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    }
  );

  const tenant = await response.json();
  const enabledModules = Object.entries(tenant.enabledModules || {})
    .filter(([_, enabled]) => enabled === true)
    .map(([module, _]) => module);

  console.log(`Módulos habilitados para ${tenant.name}:`, enabledModules);

  return enabledModules;
};

// Uso
await getTenantModules('507f1f77bcf86cd799439011', superAdminToken);
```

---

## 🚫 Desactivar Marketing

### Desactivar el Módulo

```javascript
const disableMarketingForTenant = async (tenantId, token) => {
  const response = await fetch(
    `http://localhost:3000/super-admin/tenants/${tenantId}/modules`,
    {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({
        enabledModules: {
          marketing: false
        }
      })
    }
  );

  return await response.json();
};

// Uso
await disableMarketingForTenant('507f1f77bcf86cd799439011', superAdminToken);
```

**Nota**: Desactivar el módulo NO elimina las campañas existentes, solo oculta el acceso en el frontend.

---

## 📊 Reportes y Monitoreo

### Listar Todos los Tenants con Marketing Habilitado

```javascript
const getTenantsWithMarketing = async (token) => {
  // Obtener todos los tenants
  const response = await fetch(
    'http://localhost:3000/super-admin/tenants',
    {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    }
  );

  const tenants = await response.json();

  // Filtrar los que tienen marketing habilitado
  const tenantsWithMarketing = tenants.filter(
    tenant => tenant.enabledModules?.marketing === true
  );

  console.log(`${tenantsWithMarketing.length} tenants tienen Marketing habilitado:`);
  tenantsWithMarketing.forEach(tenant => {
    console.log(`- ${tenant.name} (${tenant._id})`);
  });

  return tenantsWithMarketing;
};

// Uso
await getTenantsWithMarketing(superAdminToken);
```

---

## 💰 Integración con Planes de Suscripción

### Configurar Marketing según Plan

```javascript
const PLAN_FEATURES = {
  trial: {
    marketing: false
  },
  basic: {
    marketing: false
  },
  professional: {
    marketing: true
  },
  enterprise: {
    marketing: true
  }
};

const updateModulesBasedOnPlan = async (tenantId, plan, token) => {
  const features = PLAN_FEATURES[plan] || PLAN_FEATURES.basic;

  const response = await fetch(
    `http://localhost:3000/super-admin/tenants/${tenantId}/modules`,
    {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({
        enabledModules: features
      })
    }
  );

  return await response.json();
};

// Cuando un tenant actualiza su plan
await updateModulesBasedOnPlan('507f1f77bcf86cd799439011', 'professional', superAdminToken);
```

---

## 🛠️ UI de Super Admin (Recomendado Implementar)

### Interfaz Sugerida

Crear una página en el panel de Super Admin con:

```jsx
// Ejemplo de componente React para Super Admin

const TenantModulesManager = ({ tenantId }) => {
  const [modules, setModules] = useState({});
  const [loading, setLoading] = useState(false);

  const toggleModule = async (moduleName) => {
    setLoading(true);
    try {
      await fetch(
        `/super-admin/tenants/${tenantId}/modules`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
          },
          body: JSON.stringify({
            enabledModules: {
              [moduleName]: !modules[moduleName]
            }
          })
        }
      );

      // Actualizar estado local
      setModules(prev => ({
        ...prev,
        [moduleName]: !prev[moduleName]
      }));

      toast.success(`Módulo ${moduleName} ${!modules[moduleName] ? 'habilitado' : 'deshabilitado'}`);
    } catch (error) {
      toast.error('Error al actualizar módulo');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <h2>Módulos Disponibles</h2>

      <div className="grid grid-cols-2 gap-4">
        {/* Marketing Module */}
        <div className="border p-4 rounded">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold">Marketing</h3>
              <p className="text-sm text-gray-600">
                Email, SMS, WhatsApp, Push Notifications
              </p>
              <p className="text-xs text-gray-500 mt-1">
                Planes: Professional, Enterprise
              </p>
            </div>
            <Switch
              checked={modules.marketing || false}
              onCheckedChange={() => toggleModule('marketing')}
              disabled={loading}
            />
          </div>
        </div>

        {/* Chat Module */}
        <div className="border p-4 rounded">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold">Chat / WhatsApp</h3>
              <p className="text-sm text-gray-600">
                Gestión de conversaciones con clientes
              </p>
              <p className="text-xs text-gray-500 mt-1">
                Planes: Professional, Enterprise
              </p>
            </div>
            <Switch
              checked={modules.chat || false}
              onCheckedChange={() => toggleModule('chat')}
              disabled={loading}
            />
          </div>
        </div>
      </div>
    </div>
  );
};
```

---

## 📝 Checklist de Activación

Usa este checklist al activar marketing para un tenant:

- [ ] 1. Verificar que el tenant tiene plan Professional o Enterprise
- [ ] 2. Habilitar módulo `marketing` via API o DB
- [ ] 3. Agregar permisos `marketing_read` y `marketing_write` al rol Admin
- [ ] 4. (Opcional) Agregar permisos a otros roles según necesidad
- [ ] 5. Verificar que el módulo aparece en el menú del tenant
- [ ] 6. Documentar la activación (fecha, plan, usuario que solicitó)
- [ ] 7. (Opcional) Configurar límites de uso (emails/mes, SMS/mes)

---

## 🐛 Troubleshooting

### Problema: El módulo no aparece en el menú

**Causas posibles:**
1. El módulo no está habilitado en `enabledModules`
2. El usuario no tiene permiso `marketing_read`
3. El frontend no se refrescó después del cambio

**Solución:**
```javascript
// 1. Verificar módulo habilitado
const tenant = await getTenant(tenantId);
console.log('Marketing enabled:', tenant.enabledModules?.marketing);

// 2. Verificar permisos del usuario
const user = await getUser(userId);
console.log('Permissions:', user.role.permissions);

// 3. Limpiar caché y recargar
localStorage.clear();
location.reload();
```

### Problema: Error "Permission denied" al acceder a /marketing

**Causa**: El usuario no tiene el permiso `marketing_read`

**Solución**: Agregar el permiso al rol del usuario

---

## 📚 Referencia Rápida

### Endpoints Super Admin

| Acción | Método | Endpoint | Body |
|--------|--------|----------|------|
| Habilitar módulo | PATCH | `/super-admin/tenants/:id/modules` | `{ enabledModules: { marketing: true } }` |
| Deshabilitar módulo | PATCH | `/super-admin/tenants/:id/modules` | `{ enabledModules: { marketing: false } }` |
| Agregar permisos | PATCH | `/super-admin/roles/:id/permissions` | `{ permissions: ["marketing_read", "marketing_write"] }` |
| Ver tenant | GET | `/super-admin/tenants/:id` | - |
| Listar tenants | GET | `/super-admin/tenants` | - |

### Permisos Disponibles

| Permiso | Descripción |
|---------|-------------|
| `marketing_read` | Ver campañas, analíticas, plantillas |
| `marketing_write` | Crear, editar, lanzar, pausar campañas |

### Estados del Módulo

| Estado | Valor en DB | Comportamiento |
|--------|-------------|----------------|
| Habilitado | `marketing: true` | Módulo visible y accesible |
| Deshabilitado | `marketing: false` o `undefined` | Módulo oculto |

---

## 🎯 Próximos Pasos Recomendados

1. **Crear UI de Super Admin** para gestionar módulos visualmente
2. **Implementar límites de uso** (emails/mes, SMS/mes) por tenant
3. **Agregar auditoría** de activación/desactivación de módulos
4. **Configurar planes de suscripción** con módulos incluidos
5. **Implementar facturación** por uso de marketing (emails enviados, SMS, etc.)

---

Generado: 2025-11-19
Versión: 1.0.0
Estado: Listo para Producción

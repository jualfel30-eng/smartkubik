# Guía de Migración - Permisos de Marketing

## 🎯 Problema

Los permisos `marketing_read` y `marketing_write` no aparecen en el super-admin porque no existen en la base de datos. Necesitamos agregarlos mediante una migración.

---

## ✅ Solución

### **Opción 1: Ejecutar Migración via API (Recomendado)**

He creado un endpoint especial para ejecutar la migración automáticamente.

#### Paso 1: Iniciar el servidor backend

```bash
cd food-inventory-saas
npm run start:dev
```

#### Paso 2: Ejecutar la migración

```bash
curl -X POST \
  'http://localhost:3000/migrations/add-marketing-permissions' \
  -H 'Content-Type: application/json' \
  -H 'Authorization: Bearer YOUR_SUPER_ADMIN_TOKEN'
```

O usando httpie:

```bash
http POST localhost:3000/migrations/add-marketing-permissions \
  Authorization:"Bearer YOUR_SUPER_ADMIN_TOKEN"
```

#### Respuesta esperada:

```json
{
  "success": true,
  "message": "Marketing permissions migration completed successfully"
}
```

---

### **Opción 2: Inserción Manual en MongoDB**

Si prefieres hacerlo directamente en la base de datos:

#### Usando MongoDB Compass o Studio 3T:

1. Conectar a la base de datos
2. Abrir la colección `permissions`
3. Insertar los siguientes documentos:

```javascript
// Restaurant permissions
{
  "name": "restaurant_read",
  "description": "Ver módulo de restaurante",
  "category": "restaurant",
  "createdAt": new Date(),
  "updatedAt": new Date()
}

{
  "name": "restaurant_write",
  "description": "Gestionar módulo de restaurante",
  "category": "restaurant",
  "createdAt": new Date(),
  "updatedAt": new Date()
}

// Chat permissions
{
  "name": "chat_read",
  "description": "Ver conversaciones y mensajes",
  "category": "communication",
  "createdAt": new Date(),
  "updatedAt": new Date()
}

{
  "name": "chat_write",
  "description": "Enviar mensajes y gestionar conversaciones",
  "category": "communication",
  "createdAt": new Date(),
  "updatedAt": new Date()
}

// Marketing permissions
{
  "name": "marketing_read",
  "description": "Ver campañas de marketing y analíticas",
  "category": "marketing",
  "createdAt": new Date(),
  "updatedAt": new Date()
}

{
  "name": "marketing_write",
  "description": "Crear y gestionar campañas de marketing",
  "category": "marketing",
  "createdAt": new Date(),
  "updatedAt": new Date()
}

// Payroll permissions
{
  "name": "payroll_employees_read",
  "description": "Ver información de nómina de empleados",
  "category": "payroll",
  "createdAt": new Date(),
  "updatedAt": new Date()
}

{
  "name": "payroll_employees_write",
  "description": "Gestionar nómina de empleados",
  "category": "payroll",
  "createdAt": new Date(),
  "updatedAt": new Date()
}
```

#### Usando mongo shell:

```javascript
// Conectar a la base de datos
use your_database_name

// Insertar permisos
db.permissions.insertMany([
  {
    name: "restaurant_read",
    description: "Ver módulo de restaurante",
    category: "restaurant",
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    name: "restaurant_write",
    description: "Gestionar módulo de restaurante",
    category: "restaurant",
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    name: "chat_read",
    description: "Ver conversaciones y mensajes",
    category: "communication",
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    name: "chat_write",
    description: "Enviar mensajes y gestionar conversaciones",
    category: "communication",
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    name: "marketing_read",
    description: "Ver campañas de marketing y analíticas",
    category: "marketing",
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    name: "marketing_write",
    description: "Crear y gestionar campañas de marketing",
    category: "marketing",
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    name: "payroll_employees_read",
    description: "Ver información de nómina de empleados",
    category: "payroll",
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    name: "payroll_employees_write",
    description: "Gestionar nómina de empleados",
    category: "payroll",
    createdAt: new Date(),
    updatedAt: new Date()
  }
])
```

---

## 🔍 Verificar que los Permisos Existen

### Via API:

```bash
curl -X GET 'http://localhost:3000/super-admin/permissions' \
  -H 'Authorization: Bearer YOUR_SUPER_ADMIN_TOKEN'
```

Buscar en la respuesta los permisos:
- `marketing_read`
- `marketing_write`

### Via MongoDB:

```javascript
db.permissions.find({
  name: { $in: ["marketing_read", "marketing_write"] }
})
```

Deberías ver 2 documentos.

---

## 📋 Activar Marketing para el Tenant "earlyadopter"

Una vez que los permisos existan, sigue estos pasos:

### Paso 1: Obtener el ID del tenant "earlyadopter"

```bash
curl -X GET 'http://localhost:3000/super-admin/tenants' \
  -H 'Authorization: Bearer YOUR_SUPER_ADMIN_TOKEN'
```

Busca en la respuesta el tenant con nombre "earlyadopter" y copia su `_id`.

### Paso 2: Habilitar el módulo de marketing

```bash
curl -X PATCH \
  'http://localhost:3000/super-admin/tenants/TENANT_ID/modules' \
  -H 'Content-Type: application/json' \
  -H 'Authorization: Bearer YOUR_SUPER_ADMIN_TOKEN' \
  -d '{
    "enabledModules": {
      "marketing": true
    }
  }'
```

Reemplaza `TENANT_ID` con el ID obtenido en el paso anterior.

### Paso 3: Obtener el ID del rol "Admin" del tenant

```bash
curl -X GET 'http://localhost:3000/super-admin/roles?tenantId=TENANT_ID' \
  -H 'Authorization: Bearer YOUR_SUPER_ADMIN_TOKEN'
```

Busca el rol con `name: "Admin"` y copia su `_id`.

### Paso 4: Obtener los IDs de los permisos de marketing

```bash
curl -X GET 'http://localhost:3000/super-admin/permissions' \
  -H 'Authorization: Bearer YOUR_SUPER_ADMIN_TOKEN'
```

Busca los permisos `marketing_read` y `marketing_write` y copia sus `_id`.

### Paso 5: Agregar permisos al rol Admin

```bash
curl -X GET \
  'http://localhost:3000/super-admin/roles/ROLE_ID' \
  -H 'Authorization: Bearer YOUR_SUPER_ADMIN_TOKEN'
```

Esto te dará los permisos actuales del rol. Luego ejecuta:

```bash
curl -X PATCH \
  'http://localhost:3000/super-admin/roles/ROLE_ID/permissions' \
  -H 'Content-Type: application/json' \
  -H 'Authorization: Bearer YOUR_SUPER_ADMIN_TOKEN' \
  -d '{
    "permissions": [
      ...EXISTING_PERMISSIONS_IDS,
      "MARKETING_READ_PERMISSION_ID",
      "MARKETING_WRITE_PERMISSION_ID"
    ]
  }'
```

Reemplaza:
- `ROLE_ID` con el ID del rol Admin
- `...EXISTING_PERMISSIONS_IDS` con los IDs de permisos actuales
- `MARKETING_READ_PERMISSION_ID` y `MARKETING_WRITE_PERMISSION_ID` con los IDs obtenidos

---

## 🚀 Script Completo en JavaScript/Node.js

Para facilitar el proceso, aquí tienes un script completo:

```javascript
const axios = require('axios');

const API_URL = 'http://localhost:3000';
const SUPER_ADMIN_TOKEN = 'YOUR_TOKEN_HERE';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Authorization': `Bearer ${SUPER_ADMIN_TOKEN}`,
    'Content-Type': 'application/json'
  }
});

async function setupMarketingForEarlyAdopter() {
  try {
    console.log('🚀 Starting marketing setup for earlyadopter...\n');

    // 1. Ejecutar migración de permisos
    console.log('Step 1: Running permissions migration...');
    await api.post('/migrations/add-marketing-permissions');
    console.log('✅ Permissions migration completed\n');

    // 2. Obtener tenant earlyadopter
    console.log('Step 2: Finding earlyadopter tenant...');
    const tenantsResponse = await api.get('/super-admin/tenants');
    const tenant = tenantsResponse.data.find(t =>
      t.name.toLowerCase().includes('earlyadopter')
    );

    if (!tenant) {
      throw new Error('Tenant earlyadopter not found');
    }
    console.log(`✅ Found tenant: ${tenant.name} (${tenant._id})\n`);

    // 3. Habilitar módulo de marketing
    console.log('Step 3: Enabling marketing module...');
    await api.patch(`/super-admin/tenants/${tenant._id}/modules`, {
      enabledModules: { marketing: true }
    });
    console.log('✅ Marketing module enabled\n');

    // 4. Obtener permisos de marketing
    console.log('Step 4: Getting marketing permissions...');
    const permissionsResponse = await api.get('/super-admin/permissions');
    const marketingRead = permissionsResponse.data.find(p => p.name === 'marketing_read');
    const marketingWrite = permissionsResponse.data.find(p => p.name === 'marketing_write');

    if (!marketingRead || !marketingWrite) {
      throw new Error('Marketing permissions not found');
    }
    console.log(`✅ Found permissions: ${marketingRead._id}, ${marketingWrite._id}\n`);

    // 5. Obtener rol Admin del tenant
    console.log('Step 5: Finding Admin role...');
    const rolesResponse = await api.get(`/super-admin/roles?tenantId=${tenant._id}`);
    const adminRole = rolesResponse.data.find(r => r.name === 'Admin');

    if (!adminRole) {
      throw new Error('Admin role not found');
    }
    console.log(`✅ Found Admin role: ${adminRole._id}\n`);

    // 6. Agregar permisos al rol Admin
    console.log('Step 6: Adding marketing permissions to Admin role...');
    const currentPermissions = adminRole.permissions || [];
    const newPermissions = [
      ...currentPermissions,
      marketingRead._id,
      marketingWrite._id
    ];

    await api.patch(`/super-admin/roles/${adminRole._id}/permissions`, {
      permissions: newPermissions
    });
    console.log('✅ Permissions added to Admin role\n');

    console.log('🎉 Setup completed successfully!');
    console.log('\nNext steps:');
    console.log('1. Log out and log back in as earlyadopter user');
    console.log('2. Navigate to /marketing in the app');
    console.log('3. Start creating marketing campaigns!\n');

  } catch (error) {
    console.error('❌ Error:', error.response?.data || error.message);
  }
}

// Ejecutar
setupMarketingForEarlyAdopter();
```

**Uso:**

```bash
# Instalar axios si no lo tienes
npm install axios

# Guardar el script como setup-marketing.js
# Editar el token en la línea 4
# Ejecutar
node setup-marketing.js
```

---

## 🔧 Troubleshooting

### Problema: "Cannot POST /migrations/add-marketing-permissions"

**Solución:** Asegúrate de que el backend esté corriendo y que hayas hecho `npm run build` después de agregar el módulo de migraciones.

### Problema: Los permisos ya existen pero no aparecen en super-admin

**Solución:** Puede ser un problema de caché. Intenta:
1. Refrescar la página del super-admin (Ctrl/Cmd + Shift + R)
2. Limpiar localStorage: `localStorage.clear()` en la consola del navegador
3. Reiniciar el servidor backend

### Problema: El módulo aparece pero dice "Permission denied"

**Solución:** El usuario no tiene los permisos asignados. Verifica:
1. Que los permisos `marketing_read` y `marketing_write` existan en la base de datos
2. Que el rol del usuario incluya estos permisos
3. Que el usuario cierre sesión y vuelva a iniciar para obtener el token actualizado

### Problema: No puedo activar el módulo para el tenant

**Solución:** Verifica que:
1. El campo `marketing` existe en `enabledModules` del schema de Tenant
2. El backend se compiló correctamente después de agregar el campo
3. El endpoint PATCH `/super-admin/tenants/:id/modules` funciona correctamente

---

## 📊 Verificación Final

Después de completar todos los pasos, verifica:

### En la Base de Datos:

```javascript
// 1. Permisos existen
db.permissions.countDocuments({
  name: { $in: ["marketing_read", "marketing_write"] }
})
// Debe retornar: 2

// 2. Módulo habilitado para el tenant
db.tenants.findOne(
  { name: /earlyadopter/i },
  { "enabledModules.marketing": 1 }
)
// Debe mostrar: { enabledModules: { marketing: true } }

// 3. Permisos asignados al rol
db.roles.findOne(
  { name: "Admin", tenantId: ObjectId("TENANT_ID") },
  { permissions: 1 }
)
// Debe incluir los IDs de marketing_read y marketing_write
```

### En el Frontend:

1. **Iniciar sesión** como usuario del tenant earlyadopter
2. **Verificar** que aparece "Marketing" en el menú lateral
3. **Hacer clic** en Marketing
4. **Verificar** que se carga la página `/marketing` correctamente
5. **Intentar** crear una campaña de prueba

---

## ✅ Checklist Completo

- [ ] 1. Backend compilado exitosamente
- [ ] 2. Migración de permisos ejecutada
- [ ] 3. Permisos verificados en base de datos
- [ ] 4. Módulo `marketing` habilitado para tenant earlyadopter
- [ ] 5. Permisos agregados al rol Admin del tenant
- [ ] 6. Usuario cierra sesión y vuelve a iniciar
- [ ] 7. Módulo "Marketing" aparece en el menú
- [ ] 8. Página `/marketing` se carga correctamente
- [ ] 9. Formulario de creación de campaña funciona
- [ ] 10. Documentación actualizada

---

Generado: 2025-11-19
Versión: 1.0.0
Estado: Listo para Ejecutar

# Migration Scripts

Herramientas utilitarias para ejecutar migraciones manuales sobre la base de datos.

## 2025-01-backfill-memberships.js

Crea documentos `UserTenantMembership` para usuarios que todavía sólo tienen el campo `tenantId` directo en la colección `users`.

### Variables de entorno

- `MONGODB_URI` **(requerido)**: cadena de conexión al clúster MongoDB.
- `DRY_RUN` *(opcional)*: si es `true`, no se realizan escrituras.
- `DOTENV_PATH` *(opcional)*: ruta alternativa al archivo `.env` a cargar antes de ejecutar.

### Uso

```bash
# Ensayo sin escribir en la base de datos
DRY_RUN=true node 2025-01-backfill-memberships.js

# Ejecución real
node 2025-01-backfill-memberships.js

# Con archivo .env específico
DOTENV_PATH=../food-inventory-saas/.env.production node 2025-01-backfill-memberships.js
```

### Lo que hace

1. Recorre usuarios con `tenantId` asignado.
2. Evita duplicados si la membresía ya existe.
3. Marca la primera membresía de cada usuario como `isDefault`.
4. Copia el `roleId` y cachea los permisos asociados (si existen).

### Siguientes migraciones sugeridas

- Normalización de códigos de tenant a mayúsculas.
- Limpieza progresiva del campo `tenantId` en `users` cuando toda la aplicación use memberships.

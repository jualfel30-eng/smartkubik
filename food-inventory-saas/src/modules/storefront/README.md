# Módulo Storefront

Módulo para la gestión de configuraciones de storefront (tiendas online) en el sistema multi-tenant.

## Endpoints

### Admin (Autenticados)
- `POST /api/v1/admin/storefront` - Crear configuración
- `GET /api/v1/admin/storefront` - Obtener configuración
- `PUT /api/v1/admin/storefront` - Actualizar completo
- `PATCH /api/v1/admin/storefront` - Actualizar parcial
- `POST /api/v1/admin/storefront/reset` - Resetear a defaults

### Públicos
- `GET /api/v1/public/storefront/:tenantId/config` - Config por tenant ID
- `GET /api/v1/public/storefront/:domain/config` - Config por dominio

## Estructura

```
storefront/
├── storefront.module.ts                    # Módulo principal
├── storefront.controller.ts                # Controlador admin
├── storefront-public.controller.ts         # Controlador público
├── storefront.service.ts                   # Servicio
└── dto/
    ├── create-storefront-config.dto.ts     # DTO crear
    └── update-storefront-config.dto.ts     # DTO actualizar
```

## Permisos Requeridos

- `storefront_create` - Crear configuración
- `storefront_read` - Leer configuración
- `storefront_update` - Actualizar configuración
- `storefront_delete` - Eliminar configuración

## Requisitos

- El tenant debe tener el módulo `ecommerce` habilitado
- JWT válido para endpoints admin
- Permisos configurados en el sistema de roles

## Validaciones

- Colores en formato hexadecimal (#RRGGBB o #RGB)
- URLs válidas para imágenes y redes sociales
- Email válido (RFC compliant)
- Teléfono en formato internacional (+584121234567)
- Dominio válido (mitienda.smartkubik.com)
- Template type: 'ecommerce' o 'services'

## Ejemplo de Uso

```typescript
// Crear configuración
const config = await fetch('/api/v1/admin/storefront', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    domain: 'mitienda.smartkubik.com',
    theme: {
      primaryColor: '#3B82F6',
      secondaryColor: '#10B981',
    },
    templateType: 'ecommerce',
    seo: {
      title: 'Mi Tienda Online',
      description: 'Los mejores productos',
    },
    contactInfo: {
      email: 'contacto@mitienda.com',
      phone: '+584121234567',
    },
  }),
});

// Obtener configuración pública
const publicConfig = await fetch(
  `/api/v1/public/storefront/${tenantId}/config`
);
```

## Schema

Ver `src/schemas/storefront-config.schema.ts` para la estructura completa del documento MongoDB.

## Documentación

Para documentación completa, consultar Swagger en `/api/docs`

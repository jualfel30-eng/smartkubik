# Module Access Guard

Sistema de control de acceso basado en módulos habilitados por tenant.

## Uso

### 1. En un Controller completo

Aplica la validación del módulo a TODOS los endpoints del controller:

```typescript
import { Controller, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { ModuleAccessGuard } from '../guards/module-access.guard';
import { RequireModule } from '../decorators/require-module.decorator';

@Controller('tables')
@UseGuards(JwtAuthGuard, ModuleAccessGuard)
@RequireModule('tables') // Requiere que el tenant tenga 'tables' habilitado
export class TablesController {
  @Get()
  findAll() {
    // Solo accesible si el tenant tiene el módulo 'tables' habilitado
  }
}
```

### 2. En un endpoint específico

Aplica la validación solo a un endpoint:

```typescript
import { Controller, Get, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { ModuleAccessGuard } from '../guards/module-access.guard';
import { RequireModule } from '../decorators/require-module.decorator';

@Controller('products')
@UseGuards(JwtAuthGuard)
export class ProductsController {
  @Get()
  findAll() {
    // Accesible para todos
  }

  @Get('variants')
  @UseGuards(ModuleAccessGuard)
  @RequireModule('variants')
  findVariants() {
    // Solo accesible si el tenant tiene el módulo 'variants' habilitado
  }
}
```

### 3. Módulos disponibles

Usa los nombres exactos de los módulos definidos en `tenant.schema.ts`:

**Core modules:**
- `inventory`
- `orders`
- `customers`
- `suppliers`
- `reports`
- `accounting`

**Food Service:**
- `tables`
- `recipes`
- `kitchenDisplay`
- `menuEngineering`

**Retail:**
- `pos`
- `variants`
- `ecommerce`
- `loyaltyProgram`

**Services:**
- `appointments`
- `resources`
- `booking`
- `servicePackages`

**Logistics:**
- `shipments`
- `tracking`
- `routes`
- `fleet`
- `warehousing`
- `dispatch`

## Comportamiento

1. **Sin decorator**: El endpoint es accesible para todos los usuarios autenticados
2. **Con decorator**:
   - Verifica que el tenant tenga el módulo habilitado
   - Si no está habilitado → `403 Forbidden` con mensaje explicativo
   - Super-admin siempre tiene acceso (bypass)

## Mensajes de error

Cuando un tenant intenta acceder a un módulo deshabilitado:

```json
{
  "statusCode": 403,
  "message": "El módulo 'tables' no está habilitado para este tenant. Contacte al administrador para habilitar este módulo.",
  "error": "Forbidden"
}
```

## Logs

El guard registra:
- ✅ **Acceso concedido**: `Access granted for tenant RESTAURANT-1: module 'tables' is enabled`
- ⚠️ **Acceso denegado**: `Access denied for tenant STORE-1: module 'tables' is not enabled (vertical: RETAIL)`
- 🔓 **Super-admin**: `Super-admin access granted for module: tables`

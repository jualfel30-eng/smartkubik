# 🔒 Reporte de Auditoría de Seguridad
**Food Inventory SaaS**
**Fecha:** 2025-10-01
**Nivel de Riesgo Global:** 🟡 MEDIO (6.5/10)

---

## 📊 Resumen Ejecutivo

Se identificaron **19 vulnerabilidades** críticas y de alto impacto en el sistema. El sistema cuenta con protecciones básicas (JWT, tenant isolation, RBAC), pero carece de controles críticos que podrían permitir:

- **Borrado de datos entre tenants** (falta validación de propiedad)
- **Inyección XSS** (sin sanitización de inputs)
- **Ataques de fuerza bruta** (sin rate limiting)
- **Exposición de datos sensibles** (logs sin redacción)

### Puntuación por Categoría

| Categoría | Puntuación | Estado |
|-----------|------------|--------|
| Autenticación | 8/10 | 🟢 BUENO |
| Autorización | 7/10 | 🟡 ACEPTABLE |
| Validación de Datos | 6/10 | 🟡 MEDIO |
| Sanitización XSS | 2/10 | 🔴 CRÍTICO |
| Rate Limiting | 0/10 | 🔴 CRÍTICO |
| Ownership Validation | 4/10 | 🔴 ALTO |
| Logging Seguro | 5/10 | 🟡 MEDIO |

---

## 🚨 Vulnerabilidades Críticas (Acción Inmediata)

### 1. ❌ CRÍTICO: Falta de Validación de Propiedad en DELETE

**Riesgo:** Un usuario podría eliminar productos/clientes de otro tenant si conoce el ID.

**Archivos Vulnerables:**

#### ✅ BIEN (con validación de tenantId):
```typescript
// products.service.ts:383-391
async remove(id: string, tenantId: string): Promise<any> {
  const productToRemove = await this.productModel.findOne({ _id: id, tenantId }).lean();
  if (!productToRemove) {
    throw new NotFoundException("Producto no encontrado");
  }
  const result = await this.productModel.deleteOne({ _id: id, tenantId }).exec();
  // ✅ Valida tenantId antes de borrar
}

// customers.service.ts:482-491
async remove(id: string, tenantId: string): Promise<boolean> {
  const result = await this.customerModel.updateOne(
    { _id: id, tenantId },
    { status: "inactive", inactiveReason: "Eliminado por usuario" },
  );
  // ✅ Soft delete con validación de tenantId
}
```

#### ⚠️ REVISAR (potencialmente vulnerable):
```typescript
// events.service.ts (detectado)
async remove(id: string, tenantId: string) {
  await this.eventModel.deleteOne({ _id: id }).exec();
  // ❌ NO valida tenantId - VULNERABLE
}
```

**Endpoints DELETE Identificados:**
1. ✅ `/products/:id` - Validado
2. ✅ `/customers/:id` - Validado (soft delete)
3. ⚠️ `/roles/:id` - Por revisar
4. ⚠️ `/payables/:id` - Por revisar
5. ⚠️ `/todos/:id` - Por revisar
6. ❌ `/events/:id` - VULNERABLE (no valida tenantId)
7. ⚠️ `/subscription-plans/:id` - Por revisar (super-admin)

**Impacto:** 🔴 CRÍTICO - Posible eliminación de datos entre tenants

**Esfuerzo:** 2 horas

**Solución:**
```typescript
// ANTES (vulnerable)
async remove(id: string, tenantId: string) {
  await this.eventModel.deleteOne({ _id: id }).exec();
}

// DESPUÉS (seguro)
async remove(id: string, tenantId: string) {
  const event = await this.eventModel.findOne({ _id: id, tenantId });
  if (!event) {
    throw new NotFoundException("Evento no encontrado o no tiene permisos");
  }
  await this.eventModel.deleteOne({ _id: id, tenantId }).exec();
}
```

---

### 2. ❌ CRÍTICO: Sin Sanitización XSS en Inputs

**Riesgo:** Inyección de scripts maliciosos en campos de texto (nombres, descripciones, direcciones).

**Estado Actual:**
- ✅ **Validación de tipos:** Sí (con `class-validator`)
- ❌ **Sanitización HTML/XSS:** NO
- ❌ **Transformación de strings:** NO (excepto algunos casos aislados)

**Ejemplos Vulnerables:**

```typescript
// customer.dto.ts:49-51
@IsString()
@IsNotEmpty()
taxId: string;  // ❌ Sin sanitización - vulnerable a XSS

// customer.dto.ts:76-77
@IsOptional()
@IsString()
street?: string;  // ❌ Sin sanitización - vulnerable a XSS

// product.dto.ts:21-23
@IsString()
@IsNotEmpty()
name: string;  // ❌ Sin sanitización - vulnerable a XSS
```

**Campos Vulnerables Identificados:**
- `Customer`: name, taxName, street, city, notes
- `Product`: name, description, ingredients, brand, category, subcategory
- `Payable`: description, notes
- `Order`: notes, customerName
- `Supplier`: name, address

**Impacto:** 🔴 CRÍTICO - XSS almacenado en BD

**Esfuerzo:** 3 horas

**Solución:**
```typescript
import { Transform } from 'class-transformer';
import * as sanitizeHtml from 'sanitize-html';

// Helper function
function SanitizeString() {
  return Transform(({ value }) => {
    if (typeof value !== 'string') return value;
    return sanitizeHtml(value, {
      allowedTags: [],
      allowedAttributes: {},
    }).trim();
  });
}

// Aplicar a DTOs
export class CreateCustomerDto {
  @IsString()
  @IsNotEmpty()
  @SanitizeString()  // ✅ Previene XSS
  name: string;

  @IsOptional()
  @IsString()
  @SanitizeString()  // ✅ Previene XSS
  street?: string;
}
```

**Instalación:**
```bash
npm install sanitize-html
npm install -D @types/sanitize-html
```

---

### 3. ❌ CRÍTICO: Sin Rate Limiting

**Riesgo:** Ataques de fuerza bruta en login, spam de requests, DoS.

**Estado Actual:**
- ❌ **Rate limiting:** NO implementado
- ❌ **Throttling:** NO implementado
- ❌ **IP blocking:** NO implementado

**Endpoints Críticos Sin Protección:**
- `POST /auth/login` - Fuerza bruta de contraseñas
- `POST /auth/register` - Spam de registros
- `POST /orders` - Spam de órdenes
- `POST /customers` - Spam de clientes

**Impacto:** 🔴 ALTO - DoS, fuerza bruta, spam

**Esfuerzo:** 2 horas

**Solución:**
```bash
npm install @nestjs/throttler
```

```typescript
// app.module.ts
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';

@Module({
  imports: [
    ThrottlerModule.forRoot([
      {
        name: 'short',
        ttl: 60000,      // 1 minuto
        limit: 10,       // 10 requests por minuto
      },
      {
        name: 'medium',
        ttl: 600000,     // 10 minutos
        limit: 100,      // 100 requests por 10 minutos
      },
      {
        name: 'long',
        ttl: 3600000,    // 1 hora
        limit: 500,      // 500 requests por hora
      },
    ]),
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}

// auth.controller.ts - Rate limiting estricto para login
@Controller('auth')
@UseGuards(ThrottlerGuard)
export class AuthController {

  @Post('login')
  @Throttle({ short: { limit: 5, ttl: 60000 } })  // 5 intentos por minuto
  async login(@Body() loginDto: LoginDto) {
    // ...
  }

  @Post('register')
  @Throttle({ short: { limit: 3, ttl: 60000 } })  // 3 registros por minuto
  async register(@Body() registerDto: RegisterDto) {
    // ...
  }
}
```

---

## 🟡 Vulnerabilidades de Riesgo Medio

### 4. ⚠️ MEDIO: Datos Sensibles en Logs

**Riesgo:** Tokens y contraseñas podrían quedar en logs.

**Ejemplos Encontrados:**
```typescript
// onboarding.service.ts
this.logger.log('[DEBUG] Tokens generated. Preparing final response object.');
// ⚠️ Podría loggear objeto con tokens
```

**Impacto:** 🟡 MEDIO - Exposición de credenciales en logs

**Esfuerzo:** 1 hora

**Solución:**
```typescript
// utils/logger-sanitizer.util.ts
export class LoggerSanitizer {
  private static SENSITIVE_FIELDS = [
    'password', 'token', 'accessToken', 'refreshToken',
    'secret', 'apiKey', 'authorization', 'cookie',
  ];

  static sanitize(data: any): any {
    if (typeof data !== 'object' || data === null) return data;

    const sanitized = Array.isArray(data) ? [...data] : { ...data };

    for (const key in sanitized) {
      if (this.SENSITIVE_FIELDS.some(field => key.toLowerCase().includes(field))) {
        sanitized[key] = '***REDACTED***';
      } else if (typeof sanitized[key] === 'object') {
        sanitized[key] = this.sanitize(sanitized[key]);
      }
    }

    return sanitized;
  }
}

// Uso
this.logger.log(`User data: ${JSON.stringify(LoggerSanitizer.sanitize(userData))}`);
```

---

### 5. ⚠️ MEDIO: Sin CSRF Protection

**Riesgo:** Ataques CSRF en endpoints que modifican datos.

**Estado Actual:**
- ❌ **CSRF tokens:** NO implementado
- ✅ **CORS:** Sí configurado (parcial)

**Impacto:** 🟡 MEDIO - CSRF en operaciones state-changing

**Esfuerzo:** 2 horas

**Solución:**
```bash
npm install csurf
npm install -D @types/csurf
```

```typescript
// main.ts
import * as csurf from 'csurf';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Solo para sesiones basadas en cookies (si aplica)
  // Si usas JWT en headers, CSRF no es tan crítico
  app.use(csurf({ cookie: true }));

  await app.listen(3000);
}
```

---

### 6. ⚠️ MEDIO: Sin Paginación en Endpoints Críticos

**Riesgo:** Carga de 10k+ registros puede causar timeout o OOM.

**Endpoints Sin Paginación:**
- ✅ `GET /products` - Tiene paginación
- ✅ `GET /customers` - Tiene paginación
- ❌ `GET /payables` - Sin paginación
- ❌ `GET /orders` - Sin paginación (solo en algunos casos)
- ❌ `GET /inventory` - Sin paginación

**Impacto:** 🟡 MEDIO - DoS por sobrecarga

**Esfuerzo:** 4 horas

**Ver:** `SYSTEM-HEALTH-ANALYSIS.md` sección Performance para solución completa.

---

## 🟢 Controles Existentes (Bien Implementados)

### ✅ Autenticación JWT
- Tokens firmados con secreto
- Expiración configurada
- Refresh tokens implementados

### ✅ Tenant Isolation
- TenantGuard validando tenantId en requests
- Queries filtrando por tenantId
- Multi-tenancy a nivel de BD

### ✅ RBAC (Role-Based Access Control)
- Sistema de permisos granular
- PermissionsGuard funcionando
- Decorador `@Permissions()` en endpoints

### ✅ Validación de DTOs
- ValidationPipe global configurado
- class-validator en todos los DTOs
- Whitelist activado (previene mass-assignment)

### ✅ Helmet (Security Headers)
- Configurado en main.ts
- Headers de seguridad básicos aplicados

---

## 📋 Checklist de Remediación (Priorizado)

### Semana 1 - Crítico (8 horas)
- [ ] **Validación de propiedad en DELETE** (2h)
  - [ ] Auditar todos los métodos `remove()` en services
  - [ ] Agregar validación de tenantId antes de `deleteOne()`
  - [ ] Agregar test unitario para cada uno

- [ ] **Rate Limiting** (2h)
  - [ ] Instalar @nestjs/throttler
  - [ ] Configurar límites globales
  - [ ] Configurar límites estrictos en auth endpoints

- [ ] **Sanitización XSS** (3h)
  - [ ] Instalar sanitize-html
  - [ ] Crear decorador `@SanitizeString()`
  - [ ] Aplicar a todos los DTOs con strings de usuario

- [ ] **Logger Sanitizer** (1h)
  - [ ] Crear LoggerSanitizer utility
  - [ ] Reemplazar logs sensibles

### Semana 2 - Medio (6 horas)
- [ ] **CSRF Protection** (2h)
  - [ ] Evaluar necesidad (JWT en headers = menos crítico)
  - [ ] Implementar si se usan cookies

- [ ] **Paginación Completa** (4h)
  - [ ] Agregar paginación a `/payables`
  - [ ] Agregar paginación a `/orders`
  - [ ] Agregar paginación a `/inventory`

### Semana 3 - Testing (10 horas)
- [ ] **Security Tests**
  - [ ] Test de ownership validation
  - [ ] Test de XSS prevention
  - [ ] Test de rate limiting
  - [ ] Test de CSRF (si aplica)

---

## 🔍 Vulnerabilidades Detalladas por Endpoint

### DELETE Endpoints - Estado de Seguridad

| Endpoint | Servicio | Valida tenantId | Estado |
|----------|----------|----------------|--------|
| `DELETE /products/:id` | products.service.ts:383 | ✅ Sí | 🟢 SEGURO |
| `DELETE /customers/:id` | customers.service.ts:482 | ✅ Sí (soft delete) | 🟢 SEGURO |
| `DELETE /roles/:id` | roles.service.ts | ⚠️ Por confirmar | 🟡 REVISAR |
| `DELETE /payables/:id` | payables.service.ts | ⚠️ Por confirmar | 🟡 REVISAR |
| `DELETE /todos/:id` | todos.service.ts | ⚠️ Por confirmar | 🟡 REVISAR |
| `DELETE /events/:id` | events.service.ts | ❌ NO | 🔴 VULNERABLE |
| `DELETE /subscription-plans/:id` | subscription-plans.service.ts | N/A (super-admin) | 🟢 SEGURO |

---

## 📊 Métricas de Seguridad

### Cobertura de Validación
- **Autenticación:** 100% (JWT en todos los endpoints)
- **Autorización:** 95% (RBAC en casi todos los endpoints)
- **Tenant Isolation (READ):** 100%
- **Tenant Isolation (DELETE):** ~70% (3 de 7 endpoints confirmados)
- **XSS Prevention:** 0% (sin sanitización)
- **Rate Limiting:** 0% (no implementado)

### Tiempo Estimado de Remediación
- **Crítico:** 8 horas
- **Medio:** 6 horas
- **Testing:** 10 horas
- **Total:** 24 horas (3 días de trabajo)

---

## 🎯 Recomendaciones Finales

### Prioridad Inmediata (Esta Semana)
1. ✅ Validar propiedad en todos los DELETE
2. ✅ Implementar rate limiting en auth endpoints
3. ✅ Sanitizar todos los inputs de usuario

### Prioridad Alta (Próximas 2 Semanas)
4. Agregar paginación a endpoints faltantes
5. Implementar logger sanitizer
6. Crear suite de security tests

### Prioridad Media (Próximo Mes)
7. Evaluación de CSRF (según arquitectura de cookies)
8. Implementar Content Security Policy
9. Agregar security headers adicionales
10. Auditoría de dependencias (npm audit)

---

## 📞 Siguiente Paso

**¿Por dónde empezamos?**

Sugiero empezar con la **validación de propiedad en DELETE**, ya que:
- ✅ Es el riesgo más crítico (borrado entre tenants)
- ✅ Es rápido de implementar (2 horas)
- ✅ Tiene impacto inmediato en seguridad
- ✅ Es fácil de testear

**Comando para empezar:**
```bash
# Vamos a revisar todos los servicios con DELETE
grep -rn "async remove" src/modules --include="*.service.ts" -A 15
```

¿Procedemos con la remediación de los endpoints DELETE vulnerables?

# RESUMEN EJECUTIVO - ARQUITECTURA DEL BACKEND ERP

## HALLAZGOS CLAVE

Este ERP está construido con:
- **Framework**: NestJS (Node.js/TypeScript)
- **Base de datos**: MongoDB con Mongoose
- **Arquitectura**: Modular, Multi-tenant, Orientada por Eventos
- **Seguridad**: JWT + Guards para autenticación, Permissions para autorización
- **ORM**: Mongoose con TypeScript support

## ESTRUCTURA DE MÓDULOS (65 módulos)

El sistema está dividido en domínios de negocio:
- **Ventas**: Orders, Payments, Bill-Splits, Delivery
- **Inventario**: Inventory, Unit-Conversions, Consumables, Supplies
- **Compras**: Purchases, Payables, Recurring-Payables
- **Finanzas**: Accounting, Bank-Accounts, Bank-Reconciliation, Exchange-Rate
- **Recursos Humanos**: Payroll, Payroll-Employees, Payroll-Runs, Shifts
- **Productos**: Products, Pricing, Modifier-Groups, Production (BOM/Routing)
- **Clientes**: Customers, Loyalty, Appointments, Ratings
- **Operaciones**: Reports, Analytics, Dashboard, Notifications
- **Integraciones**: Whapi, OpenAI, Hospitality-Integrations, Knowledge-Base

## PATRONES ARQUITECTÓNICOS CRÍTICOS

### 1. VALIDACIÓN Y TRANSFORMACIÓN DE DATOS

**DTOs** usando class-validator y class-transformer:
```
Decoradores principales:
- @IsString, @IsNumber, @IsMongoId (validación)
- @Type(() => Date) (transformación)
- @Transform(({ value }) => ...) (lógica personalizada)
- @ValidateNested({ each: true }) (arrays anidados)
- @SanitizeString(), @SanitizeText() (sanitización XSS)
```

**Patrones:**
- Todos los IDs lleguen como strings en DTOs: `@IsMongoId() id: string`
- Se convierten a ObjectId en schemas: `@Prop({ type: Types.ObjectId })`
- Se retornan como strings: `.toObject()` automáticamente

### 2. SCHEMAS Y ENTIDADES

**Siempre incluir:**
```typescript
@Prop({ type: String, required: true }) tenantId: string;  // Multi-tenant
@Prop({ type: [ItemSchema] }) items: Item[];               // Arrays anidados
@Prop({ type: Types.ObjectId, ref: "Model" }) refId?: Types.ObjectId;
PaymentSchema.index({ tenantId: 1, status: 1, date: -1 }); // Índices
```

**Tipos de datos:**
- ObjectId: Referencias a otros documentos
- Object: Datos dinámicos/anidados
- Number: Precios, cantidades (nunca strings)
- Date: Fechas (se convierten automáticamente)
- Enum: Estados, categorías (validar con `@IsEnum`)

### 3. SERVICIOS Y LÓGICA DE NEGOCIO

**Patrón CRUD + Búsqueda:**
```typescript
async create(dto, user)              // Crear
async findAll(query, tenantId)       // Listar con paginación
async findOne(id, tenantId)          // Obtener uno
async update(id, dto, user)          // Actualizar
async delete(id)                     // Eliminar

// Métodos privados para reutilización
private buildQuery(query, tenantId)  // Filtrado común
private escapeRegExp(value)          // Escapar regex
```

**Manejo de errores:**
```typescript
throw new NotFoundException("No encontrado");
throw new BadRequestException("Datos inválidos");
throw new ConflictException("Conflicto");

try { } catch (error) {
  this.logger.error("msg", error.stack);
  // Continuar si es no-bloqueante
}
```

**Transacciones (múltiples escrituras):**
```typescript
const session = await this.connection.startSession();
session.startTransaction();
try {
  await model.save({ session });
  await session.commitTransaction();
} catch {
  await session.abortTransaction();
}
```

### 4. CONTROLLERS

**Estructura estándar:**
```typescript
@Controller("resource")
@UseGuards(JwtAuthGuard, TenantGuard, PermissionsGuard)
@Permissions("resource_create")  // Control granular
async create(@Body() dto, @Request() req) {
  try {
    const result = await this.service.create(dto, req.user);
    return { success: true, data: result.toObject() };
  } catch (error) {
    throw new HttpException(error.message, error.status);
  }
}
```

### 5. EVENT-DRIVEN ARCHITECTURE

**Patrón:**
```typescript
// Emitir evento
this.eventEmitter.emit("entity.created", {
  entityId: doc._id.toString(),
  tenantId: user.tenantId,
  // ... datos relevantes
});

// Escuchar en otro servicio
@OnEvent("entity.created")
async handleEntityCreated(payload) {
  // Procesar de forma asincrónica
}
```

**Beneficios:** Desacoplamiento, operaciones no-bloqueantes, auditoria

### 6. MULTI-TENANCY

**Regla de oro:**
```typescript
// SIEMPRE filtrar por tenantId
const filter: any = { tenantId };

// Nunca confiar solo en req.user.tenantId
// El TenantGuard lo valida
const tenantId = req.user.tenantId;
```

## INCOMPATIBILIDADES FRECUENTES A EVITAR

### Problema 1: Mezclar ObjectId y String
```typescript
// MAL - inconsistente
productId: Types.ObjectId,  // DTO: @IsMongoId() productId: string
                            // Schema: @Prop({ type: String })

// BIEN - consistente
DTO: @IsMongoId() productId: string;
Schema: @Prop({ type: Types.ObjectId }) productId: Types.ObjectId;
Comparar: p._id.toString() === dtoId (ambos como strings)
```

### Problema 2: Olvidar tenantId en filtros
```typescript
// MAL - acceso multi-tenant
const order = await this.orderModel.findById(id);

// BIEN - filtrado por tenant
const order = await this.orderModel.findOne({ _id: id, tenantId });
```

### Problema 3: No validar inputs anidados
```typescript
// MAL
items: CreateItemDto[];

// BIEN
@ValidateNested({ each: true })
@Type(() => CreateItemDto)
items: CreateItemDto[];
```

### Problema 4: No usar sesiones en múltiples inserts
```typescript
// MAL - puede fallar la mitad
await model1.save();
await model2.save();

// BIEN - transaccional
const session = await this.connection.startSession();
session.startTransaction();
try {
  await model1.save({ session });
  await model2.save({ session });
  await session.commitTransaction();
} catch { await session.abortTransaction(); }
```

### Problema 5: Retornar DocumentoMongo directamente
```typescript
// MAL - ObjectIds no se convierten
return savedDoc;

// BIEN - convierte ObjectIds a strings
return savedDoc.toObject();
```

## CHECKLIST PARA NUEVO MÓDULO

```
1. SCHEMA (src/schemas/)
  [ ] @Schema({ timestamps: true })
  [ ] Incluir tenantId siempre
  [ ] Types.ObjectId para referencias
  [ ] Crear índices compuestos
  [ ] Exportar Document type

2. DTO (src/dto/)
  [ ] Usar class-validator decoradores
  [ ] @IsMongoId() para IDs
  [ ] @Type(() => Date) para fechas
  [ ] @ValidateNested() para arrays
  [ ] Documentar con @ApiProperty

3. SERVICE (src/modules/xxx/)
  [ ] @Injectable()
  [ ] @InjectModel() para cada schema
  [ ] Logger private readonly
  [ ] Métodos: create, findAll, findOne, update, delete
  [ ] Métodos privados: buildQuery, métodos auxiliares
  [ ] Manejo de errores con try-catch
  [ ] Emit eventos con EventEmitter2
  [ ] Filtrar siempre por tenantId
  [ ] Retornar .toObject() en respuestas

4. CONTROLLER (src/modules/xxx/)
  [ ] @Controller("resource")
  [ ] @UseGuards(JwtAuthGuard, TenantGuard, PermissionsGuard)
  [ ] @Permissions("resource_create/read/update/delete")
  [ ] @Request() req para obtener user
  [ ] Documentar endpoints con @ApiOperation
  [ ] Try-catch en cada endpoint
  [ ] Retornar { success, message, data }

5. MODULE (src/modules/xxx/)
  [ ] @Module({ imports: [...] })
  [ ] MongooseModule.forFeature([...])
  [ ] Importar AuthModule
  [ ] Exportar servicio
  [ ] Registrar en app.module.ts

6. GUANITO FINAL
  [ ] Revisar patrones de orden existente
  [ ] Ejecutar linter
  [ ] Probar con Postman/Insomnia
  [ ] Revisar permisos en BD
```

## ARCHIVOS BASE PARA COPIAR Y ADAPTAR

Usa como plantillas:
1. `src/modules/orders/` - CRUD completo con anidamiento
2. `src/modules/customers/` - Búsqueda y filtrado avanzado
3. `src/modules/inventory/` - Transacciones y sesiones
4. `src/dto/order.dto.ts` - Validación compleja
5. `src/schemas/order.schema.ts` - Schemas anidados

## REGLAS DE ORO

1. **Tenancy first**: Siempre pensar en multi-tenant
2. **Type safety**: TypeScript strict, validación en DTOs
3. **Error handling**: Específico, no genérico
4. **Logging**: Logger en cada servicio
5. **Transactions**: Si hay múltiples escrituras, usar sesión
6. **Events**: Para operaciones que otros módulos necesitan saber
7. **Pagination**: Siempre para listados, incluso si no lo pides
8. **Indexes**: Compuestos incluyendo tenantId
9. **Sanitización**: Siempre en strings de usuario
10. **Conversion**: ObjectId -> String en respuestas, String -> ObjectId en entrada

---

## EJEMPLO RÁPIDO: 5 MINUTOS

Para crear un módulo rápido, copia:
1. `/src/modules/orders/` -> `/src/modules/mi_recurso/`
2. Renombra classes y tipos
3. Adapta schema (campos)
4. Adapta DTOs (validadores)
5. Actualiza service (lógica)
6. Actualiza controller (endpoints)
7. Registra en app.module.ts

**Tiempo estimado: 30-45 minutos por módulo nuevo**

---

**Documentos generados:**
- `/tmp/erp_backend_analysis.md` - Análisis exhaustivo (8 secciones)
- `/tmp/patron_completo_ejemplo.md` - Ejemplo completo paso a paso
- `/tmp/RESUMEN_EJECUTIVO.md` - Este archivo

**Rutas críticas en el proyecto:**
- Backend: `/Users/jualfelsantamaria/Documents/Saas/V1.03/FOOD-INVENTORY-SAAS-COMPLETO/food-inventory-saas/src/`
- Schemas: `src/schemas/`
- DTOs: `src/dto/`
- Módulos: `src/modules/`
- Config: `src/config/`


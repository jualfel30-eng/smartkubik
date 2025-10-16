# 🗺️ ROADMAP DE IMPLEMENTACIÓN - MEJORAS DEL SISTEMA
## Food Inventory SaaS - Fases 2024-2025

> **Documento Maestro**: Guía paso a paso para implementar mejoras de forma segura y robusta.
> **Última actualización**: 2025-01-03

---

## 📋 ÍNDICE

1. [Orden Óptimo de Implementación](#orden-óptimo)
2. [Mejores Prácticas Generales](#mejores-prácticas)
3. [Fases Detalladas](#fases-detalladas)
4. [Checklist por Fase](#checklist-por-fase)
5. [Herramientas y Configuración](#herramientas)
6. [Plan de Rollback](#rollback)
7. [Métricas de Éxito](#métricas)

---

## 🎯 ORDEN ÓPTIMO DE IMPLEMENTACIÓN

### **Principios de Ordenamiento:**

1. **Dependencias**: Funcionalidades base antes que avanzadas
2. **Riesgo**: Fixes críticos primero, features nuevas después
3. **Valor**: Quick wins antes que implementaciones largas
4. **Testing**: Cambios pequeños y testeables incrementalmente
5. **Rollback**: Cada fase debe ser reversible independientemente

### **Orden Recomendado:**

```
FASE 0: Preparación y Configuración (1-2 horas)
   └─> FASE 1: Fixes Críticos (2-3 horas)
          └─> FASE 2: Mejoras Incrementales - Backend (6-8 horas)
                 └─> FASE 3: Mejoras Incrementales - Frontend (8-10 horas)
                        └─> FASE 4: Features Avanzadas (10-15 horas)
                               └─> FASE 5: Optimización y Pulido (5-8 horas)
```

**Razón del orden:**
- Preparación evita sorpresas
- Fixes críticos dan estabilidad
- Backend primero porque frontend depende de APIs
- Features avanzadas requieren base sólida
- Optimización al final cuando todo funciona

### Estado actual (enero 2025)

| Fase | Estado | Comentarios clave |
|------|--------|-------------------|
| Fase 0 | ✅ Completada | Feature flags, logger Winston y rama/tag baseline listos (`development/mejoras-2025`, `v2.0.0-baseline`). |
| Fase 1 | ✅ Completada | Órdenes se asignan al empleado con turno activo (`orders.service.ts`), se pobla `assignedTo` en listados y se agregó columna en la UI (`OrdersManagementV2.jsx`) con unit tests de respaldo. |
| Fase 1B | ✅ Completada | Login multi-tenant ya operativo (`food-inventory-saas/src/auth/auth.service.ts`, `food-inventory-admin/src/hooks/use-auth.jsx`, `food-inventory-admin/src/components/auth/TenantPickerDialog.jsx`, `scripts/migrations/2025-01-backfill-memberships.js`). |
| Fase 2 | 🚧 En progreso | Movimientos bancarios: esquema, servicio y endpoints ya listos (`bank-transactions.schema.ts`, `bank-transactions.service.ts`), se registran pagos/ajustes automáticamente y hay fixtures. Falta conciliación (2.2), transferencias/alertas (2.3) y UI dedicada. |
| Fase 3 | ⏳ Pendiente | Recharts está instalado como utilidad (`food-inventory-admin/src/components/ui/chart.jsx`), sin dashboards de gráficas implementados. |
| Fase 4 | ⏳ Pendiente | Sin avances en analítica predictiva. |
| Fase 5 | ⏳ Pendiente | Optimización y UX todavía no abordadas. |

---

## ✅ MEJORES PRÁCTICAS GENERALES

### **1. Control de Versiones (Git)**

#### Antes de CADA sesión de trabajo:

```bash
# 1. Verificar estado limpio
git status

# 2. Actualizar desde remoto (si trabajas en equipo)
git pull origin main

# 3. Crear rama específica para la fase
git checkout -b fase-1/employee-performance-fix
```

#### Durante el trabajo:

```bash
# Commits pequeños y descriptivos
git add src/modules/orders/orders.service.ts
git commit -m "feat(orders): add assignedTo field when user has active shift"

git add src/modules/analytics/analytics.service.ts
git commit -m "fix(analytics): handle orders without assignedTo"

git add src/modules/orders/orders.service.spec.ts
git commit -m "test(orders): add tests for assignedTo assignment"
```

#### Al terminar la sesión:

```bash
# Push a la rama
git push origin fase-1/employee-performance-fix

# Crear tag de versión si completaste la fase
git tag -a v2.1.0-fase1 -m "Completed Phase 1: Employee Performance Fix"
git push origin v2.1.0-fase1
```

#### Nomenclatura de commits:

```
feat(modulo): descripción        ← Nueva funcionalidad
fix(modulo): descripción         ← Corrección de bug
refactor(modulo): descripción    ← Refactorización
test(modulo): descripción        ← Agregar tests
docs(modulo): descripción        ← Documentación
perf(modulo): descripción        ← Mejora de performance
style(modulo): descripción       ← Formato, no cambia lógica
```

---

### **2. Backups Obligatorios**

#### Antes de empezar CUALQUIER fase:

```bash
#!/bin/bash
# Script: backup-before-phase.sh

BACKUP_DIR="backups/$(date +%Y%m%d_%H%M%S)"
mkdir -p $BACKUP_DIR

# 1. Backup de Base de Datos
echo "📦 Backing up database..."
mongodump --uri="$MONGODB_URI" --out="$BACKUP_DIR/db"

# 2. Backup de código crítico de la fase
echo "📁 Backing up code..."
cp -r src/modules/orders $BACKUP_DIR/code/
cp -r src/modules/analytics $BACKUP_DIR/code/
cp -r src/schemas $BACKUP_DIR/code/

# 3. Backup de package.json (por si instalas librerías)
cp package.json $BACKUP_DIR/
cp package-lock.json $BACKUP_DIR/

# 4. Guardar estado de git
git log --oneline -n 10 > $BACKUP_DIR/git-state.txt
git diff > $BACKUP_DIR/uncommitted-changes.diff

echo "✅ Backup completed: $BACKUP_DIR"
```

#### Uso:

```bash
# Antes de empezar Fase 1
./backup-before-phase.sh

# Guardar el path del backup para rollback
echo "backups/20250103_140500" > .last-backup
```

---

### **3. Feature Flags (Activación Controlada)**

#### Configuración inicial:

```typescript
// src/config/features.config.ts
export interface FeatureFlags {
  // Fase 1
  EMPLOYEE_PERFORMANCE_TRACKING: boolean;

  // Fase 2
  BANK_ACCOUNTS_MOVEMENTS: boolean;
  BANK_ACCOUNTS_RECONCILIATION: boolean;
  BANK_ACCOUNTS_TRANSFERS: boolean;

  // Fase 3
  DASHBOARD_CHARTS: boolean;
  ADVANCED_REPORTS: boolean;

  // Fase 4
  PREDICTIVE_ANALYTICS: boolean;
  CUSTOMER_SEGMENTATION: boolean;
}

export const FEATURES: FeatureFlags = {
  // Leer desde variables de entorno con fallback a false
  EMPLOYEE_PERFORMANCE_TRACKING:
    process.env.ENABLE_EMPLOYEE_PERFORMANCE === 'true',

  BANK_ACCOUNTS_MOVEMENTS:
    process.env.ENABLE_BANK_MOVEMENTS === 'true',

  BANK_ACCOUNTS_RECONCILIATION:
    process.env.ENABLE_BANK_RECONCILIATION === 'true',

  BANK_ACCOUNTS_TRANSFERS:
    process.env.ENABLE_BANK_TRANSFERS === 'true',

  DASHBOARD_CHARTS:
    process.env.ENABLE_DASHBOARD_CHARTS === 'true',

  ADVANCED_REPORTS:
    process.env.ENABLE_ADVANCED_REPORTS === 'true',

  PREDICTIVE_ANALYTICS:
    process.env.ENABLE_PREDICTIVE_ANALYTICS === 'true',

  CUSTOMER_SEGMENTATION:
    process.env.ENABLE_CUSTOMER_SEGMENTATION === 'true',
};

// Helper para logging
export function logFeatureStatus() {
  console.log('🎛️  Feature Flags Status:');
  Object.entries(FEATURES).forEach(([key, value]) => {
    console.log(`  ${value ? '✅' : '❌'} ${key}`);
  });
}
```

#### Variables de entorno por ambiente:

```env
# .env.development (todo activado para desarrollo)
ENABLE_EMPLOYEE_PERFORMANCE=true
ENABLE_BANK_MOVEMENTS=true
ENABLE_BANK_RECONCILIATION=true
ENABLE_BANK_TRANSFERS=true
ENABLE_DASHBOARD_CHARTS=true
ENABLE_ADVANCED_REPORTS=true
ENABLE_PREDICTIVE_ANALYTICS=true
ENABLE_CUSTOMER_SEGMENTATION=true

# .env.staging (activar solo lo que estés probando)
ENABLE_EMPLOYEE_PERFORMANCE=true
ENABLE_BANK_MOVEMENTS=false
ENABLE_BANK_RECONCILIATION=false
ENABLE_BANK_TRANSFERS=false
ENABLE_DASHBOARD_CHARTS=false
ENABLE_ADVANCED_REPORTS=false
ENABLE_PREDICTIVE_ANALYTICS=false
ENABLE_CUSTOMER_SEGMENTATION=false

# .env.production (todo desactivado inicialmente)
ENABLE_EMPLOYEE_PERFORMANCE=false
ENABLE_BANK_MOVEMENTS=false
ENABLE_BANK_RECONCILIATION=false
ENABLE_BANK_TRANSFERS=false
ENABLE_DASHBOARD_CHARTS=false
ENABLE_ADVANCED_REPORTS=false
ENABLE_PREDICTIVE_ANALYTICS=false
ENABLE_CUSTOMER_SEGMENTATION=false
```

#### Uso en código:

```typescript
// Backend
import { FEATURES } from '@/config/features.config';

async create(orderDto: CreateOrderDto, user: any) {
  const order = new this.orderModel(orderDto);

  // Feature flag para asignar empleado
  if (FEATURES.EMPLOYEE_PERFORMANCE_TRACKING) {
    const activeShift = await this.shiftsService.findActiveShift(
      user.userId,
      user.tenantId
    );

    if (activeShift) {
      order.assignedTo = new Types.ObjectId(user.userId);
      this.logger.log(`Order assigned to user ${user.userId}`);
    }
  }

  return order.save();
}

// Frontend
import { FEATURES } from '@/config/features';

export function OrderDetails({ order }) {
  return (
    <div>
      <h2>Orden #{order.orderNumber}</h2>

      {FEATURES.EMPLOYEE_PERFORMANCE_TRACKING && order.assignedTo && (
        <Badge>Atendido por: {order.assignedTo.name}</Badge>
      )}
    </div>
  );
}
```

---

### **4. Testing Riguroso**

#### Estructura de tests por fase:

```
src/
├── modules/
│   ├── orders/
│   │   ├── orders.service.ts
│   │   ├── orders.service.spec.ts      ← Tests unitarios
│   │   └── orders.e2e-spec.ts          ← Tests E2E
│   └── analytics/
│       ├── analytics.service.ts
│       └── analytics.service.spec.ts
└── test/
    ├── checklist-fase-1.md              ← Checklist manual
    └── fixtures/
        └── orders-test-data.json        ← Datos de prueba
```

#### Template de tests unitarios:

```typescript
// orders.service.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { OrdersService } from './orders.service';
import { getModelToken } from '@nestjs/mongoose';
import { ShiftsService } from '../shifts/shifts.service';

describe('OrdersService - Phase 1: Employee Assignment', () => {
  let service: OrdersService;
  let shiftsService: ShiftsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrdersService,
        {
          provide: getModelToken('Order'),
          useValue: mockOrderModel,
        },
        {
          provide: ShiftsService,
          useValue: mockShiftsService,
        },
      ],
    }).compile();

    service = module.get<OrdersService>(OrdersService);
    shiftsService = module.get<ShiftsService>(ShiftsService);
  });

  describe('create() with assignedTo', () => {
    it('should assign user to order when shift is active', async () => {
      // Arrange
      const mockUser = { userId: 'user123', tenantId: 'tenant1' };
      const mockShift = { userId: 'user123', clockOut: null };
      jest.spyOn(shiftsService, 'findActiveShift').mockResolvedValue(mockShift);

      // Act
      const result = await service.create(orderDto, mockUser);

      // Assert
      expect(result.assignedTo).toBe('user123');
      expect(shiftsService.findActiveShift).toHaveBeenCalledWith('user123', 'tenant1');
    });

    it('should NOT assign user when shift is inactive', async () => {
      const mockUser = { userId: 'user123', tenantId: 'tenant1' };
      jest.spyOn(shiftsService, 'findActiveShift').mockResolvedValue(null);

      const result = await service.create(orderDto, mockUser);

      expect(result.assignedTo).toBeUndefined();
    });

    it('should handle errors gracefully', async () => {
      jest.spyOn(shiftsService, 'findActiveShift').mockRejectedValue(
        new Error('Database error')
      );

      // No debe fallar la creación de orden si falla el shift lookup
      const result = await service.create(orderDto, mockUser);
      expect(result).toBeDefined();
    });
  });
});
```

#### Checklist de testing manual:

```markdown
# CHECKLIST FASE 1: Rendimiento de Empleados

## Prerequisitos
- [ ] Backend corriendo en http://localhost:3001
- [ ] Frontend corriendo en http://localhost:5173
- [ ] Base de datos con datos de prueba
- [ ] Usuario de prueba creado
- [ ] Feature flag activado: `ENABLE_EMPLOYEE_PERFORMANCE=true`

## Escenario 1: Flujo Completo Exitoso
- [ ] 1. Login con usuario de prueba
- [ ] 2. Verificar que aparece botón "Iniciar Turno"
- [ ] 3. Click en "Iniciar Turno"
- [ ] 4. Verificar badge verde "Turno Activo"
- [ ] 5. Ir a módulo de Órdenes
- [ ] 6. Crear nueva orden
- [ ] 7. Agregar al menos 1 producto
- [ ] 8. Confirmar orden
- [ ] 9. Marcar orden como "Entregada"
- [ ] 10. Abrir DevTools > Network
- [ ] 11. Ir a Reportes > Rendimiento de Empleados
- [ ] 12. Seleccionar fecha de hoy
- [ ] 13. Verificar que aparece en tabla:
     - [ ] Nombre del usuario
     - [ ] Ventas totales > $0
     - [ ] N° de órdenes >= 1
     - [ ] Horas trabajadas > 0
     - [ ] Ventas por hora > $0
- [ ] 14. Click en "Finalizar Turno"
- [ ] 15. Verificar badge desaparece

## Escenario 2: Orden sin Turno Activo
- [ ] 1. Asegurar NO hay turno activo
- [ ] 2. Crear orden
- [ ] 3. Inspeccionar orden en DB: `assignedTo` debe ser null
- [ ] 4. Reporte de rendimiento NO debe mostrar esta orden

## Escenario 3: Múltiples Empleados
- [ ] 1. Crear 2 usuarios diferentes
- [ ] 2. Usuario A: iniciar turno, crear 2 órdenes
- [ ] 3. Usuario B: iniciar turno, crear 3 órdenes
- [ ] 4. Reporte debe mostrar:
     - [ ] Usuario A: 2 órdenes
     - [ ] Usuario B: 3 órdenes
     - [ ] Ventas separadas correctamente

## Escenario 4: Manejo de Errores
- [ ] 1. Apagar base de datos temporalmente
- [ ] 2. Intentar crear orden
- [ ] 3. Verificar mensaje de error claro
- [ ] 4. Encender base de datos
- [ ] 5. Reintentar, debe funcionar

## Regresión (Que NO se rompió nada)
- [ ] Órdenes sin turno aún se pueden crear
- [ ] Dashboard sigue funcionando
- [ ] Otros reportes no afectados
- [ ] Performance similar (< 2s respuesta)
```

---

### **5. Logging y Monitoreo**

#### Niveles de logging por ambiente:

```typescript
// src/config/logger.config.ts
import { WinstonModule } from 'nest-winston';
import * as winston from 'winston';

const logLevel = {
  development: 'debug',
  staging: 'info',
  production: 'warn',
}[process.env.NODE_ENV || 'development'];

export const loggerConfig = WinstonModule.createLogger({
  level: logLevel,
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json(),
  ),
  transports: [
    // Consola
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.printf(({ timestamp, level, message, context, trace }) => {
          return `${timestamp} [${context}] ${level}: ${message}${trace ? `\n${trace}` : ''}`;
        }),
      ),
    }),

    // Archivo de errores
    new winston.transports.File({
      filename: 'logs/error.log',
      level: 'error',
    }),

    // Archivo de todo
    new winston.transports.File({
      filename: 'logs/combined.log',
    }),
  ],
});
```

#### Uso estratégico en código:

```typescript
export class OrdersService {
  private readonly logger = new Logger(OrdersService.name);

  async create(orderDto: CreateOrderDto, user: any) {
    // DEBUG: Solo desarrollo
    this.logger.debug(`Creating order with data: ${JSON.stringify(orderDto)}`);

    try {
      // LOG: Eventos importantes
      this.logger.log(`User ${user.userId} creating order`);

      const order = new this.orderModel(orderDto);

      if (FEATURES.EMPLOYEE_PERFORMANCE_TRACKING) {
        const activeShift = await this.shiftsService.findActiveShift(
          user.userId,
          user.tenantId
        );

        if (activeShift) {
          order.assignedTo = user.userId;
          // LOG: Acción crítica exitosa
          this.logger.log(`Order assigned to user ${user.userId} (shift active)`);
        } else {
          // WARN: Situación no ideal pero no error
          this.logger.warn(`User ${user.userId} creating order without active shift`);
        }
      }

      const savedOrder = await order.save();

      // LOG: Éxito
      this.logger.log(`Order ${savedOrder.orderNumber} created successfully`);

      return savedOrder;

    } catch (error) {
      // ERROR: Fallo crítico
      this.logger.error(
        `Failed to create order for user ${user.userId}: ${error.message}`,
        error.stack
      );

      throw new InternalServerErrorException('Failed to create order');
    }
  }
}
```

#### Revisar logs después de cambios:

```bash
# Ver logs en tiempo real
tail -f logs/combined.log

# Buscar errores
grep "ERROR" logs/combined.log

# Analizar logs de una fase específica
grep "Order assigned" logs/combined.log | wc -l  # ¿Cuántas órdenes se asignaron?
grep "without active shift" logs/combined.log    # ¿Órdenes sin turno?
```

---

## 🏗️ FASES DETALLADAS

---

## 📦 FASE 0: PREPARACIÓN Y CONFIGURACIÓN

**Objetivo**: Preparar el entorno para desarrollo seguro
**Duración**: 1-2 horas
**Riesgo**: Bajo
**Reversibilidad**: N/A

**Estado actual**: ⚠️ Parcial  
- ✅ `features.config.ts` y feature flags en frontend/back (`food-inventory-saas/src/config/features.config.ts`, `food-inventory-admin/src/config/features.js`).  
- ✅ Script `scripts/backup-before-phase.sh`.  
- ⚠️ Logging con Winston aún sin configurar (no existe `logger.config.ts` ni dependencias `winston`).  
- ⚠️ Rama `development/mejoras-2025` y tag baseline no creados (`git branch`).  
- ⚠️ Variables `.env` del backend solo incluyen `ENABLE_MULTI_TENANT_LOGIN`; falta enumerar el resto de flags sugeridos.

### Tareas:

#### 1. Configurar Feature Flags

```bash
# Backend
touch food-inventory-saas/src/config/features.config.ts
```

Copiar código de feature flags de sección anterior.

#### 2. Scripts de Backup

```bash
# Crear directorio de scripts
mkdir -p scripts

# Crear script de backup
touch scripts/backup-before-phase.sh
chmod +x scripts/backup-before-phase.sh
```

Copiar script de backup de sección anterior.

#### 3. Configurar Logging

```bash
# Instalar Winston
cd food-inventory-saas
npm install winston nest-winston

# Crear configuración
touch src/config/logger.config.ts
```

#### 4. Estructura de Testing

```bash
# Crear directorios de testing
mkdir -p food-inventory-saas/test/fixtures
mkdir -p food-inventory-saas/test/checklists

# Crear checklist de Fase 1
touch food-inventory-saas/test/checklists/fase-1-employee-performance.md
```

#### 5. Variables de Entorno

```bash
# Backend
cd food-inventory-saas
cp .env .env.backup
echo "
# Feature Flags - Fase 0
ENABLE_EMPLOYEE_PERFORMANCE=false
ENABLE_BANK_MOVEMENTS=false
ENABLE_BANK_RECONCILIATION=false
ENABLE_BANK_TRANSFERS=false
ENABLE_DASHBOARD_CHARTS=false
ENABLE_ADVANCED_REPORTS=false
ENABLE_PREDICTIVE_ANALYTICS=false
ENABLE_CUSTOMER_SEGMENTATION=false
" >> .env

# Frontend
cd ../food-inventory-admin
cp .env .env.backup
echo "
# Feature Flags - Fase 0
VITE_ENABLE_EMPLOYEE_PERFORMANCE=false
VITE_ENABLE_BANK_MOVEMENTS=false
VITE_ENABLE_DASHBOARD_CHARTS=false
" >> .env
```

#### 6. Git: Rama de Desarrollo

```bash
cd ..
git checkout -b development/mejoras-2025

# Crear tag del estado actual
git tag -a v2.0.0-baseline -m "Baseline before Phase 0"
git push origin v2.0.0-baseline
```

### Validación Fase 0:

- [ ] Feature flags configurados
- [ ] Script de backup funciona
- [ ] Logging configurado
- [ ] Estructura de tests creada
- [ ] Variables de entorno actualizadas
- [ ] Rama de desarrollo creada
- [ ] Tag baseline creado

### Resultado Esperado:

```
✅ Entorno preparado para desarrollo seguro
✅ Mecanismos de rollback en su lugar
✅ Sistema de feature flags operativo
✅ Logging y monitoreo configurados
```

---

## 🔧 FASE 1: FIXES CRÍTICOS

**Objetivo**: Arreglar el reporte de rendimiento de empleados
**Duración**: 2-3 horas
**Riesgo**: Medio (modifica flujo de órdenes)
**Reversibilidad**: Alta (feature flag + git revert)

**Estado actual**: ✅ Completada  
- `OrdersService.create` asigna automáticamente `assignedTo` cuando el usuario tiene turno activo (`food-inventory-saas/src/modules/orders/orders.service.ts`).  
- `OrdersModule` importa `ShiftsModule` y se puebla `assignedTo` en las consultas (`orders.module.ts`, `orders.service.ts`).  
- UI muestra la columna “Atendido Por” en la vista V2 (`food-inventory-admin/src/components/orders/v2/OrdersManagementV2.jsx`).  
- Se añadieron tests unitarios (`orders.service.spec.ts`) y checklist manual (`test/checklists/fase-1-employee-performance.md`).

### Por qué esta fase va primero:

1. ✅ **Es un bug crítico** que ya existe, no una feature nueva
2. ✅ **Base para reportes avanzados** (Fase 3)
3. ✅ **Quick win** - valor inmediato para el cliente
4. ✅ **Scope pequeño** - fácil de testear y revertir
5. ✅ **No rompe nada** - cambio aditivo, no destructivo

### Checklist Pre-Fase:

```bash
# 1. Backup
./scripts/backup-before-phase.sh

# 2. Rama específica
git checkout -b fase-1/employee-performance-fix

# 3. Activar feature flag (solo desarrollo)
# En .env
ENABLE_EMPLOYEE_PERFORMANCE=true
```

### Implementación:

#### Paso 1.1: Backend - Modificar Orders Service (30 min)

**Archivo**: `food-inventory-saas/src/modules/orders/orders.service.ts`

```typescript
// Agregar import
import { FEATURES } from '../../config/features.config';
import { ShiftsService } from '../shifts/shifts.service';

// En constructor
constructor(
  @InjectModel(Order.name) private orderModel: Model<OrderDocument>,
  private readonly shiftsService: ShiftsService,  // ← AGREGAR
  // ... otros servicios
) {}

// Modificar método create
async create(createOrderDto: CreateOrderDto, user: any): Promise<Order> {
  this.logger.log(`Creating order for user ${user.userId}`);

  const order = new this.orderModel({
    ...createOrderDto,
    tenantId: new Types.ObjectId(user.tenantId),
  });

  // 🎯 NUEVO: Asignar empleado si tiene turno activo
  if (FEATURES.EMPLOYEE_PERFORMANCE_TRACKING) {
    try {
      const activeShift = await this.shiftsService.findActiveShift(
        user.userId,
        user.tenantId
      );

      if (activeShift) {
        order.assignedTo = new Types.ObjectId(user.userId);
        this.logger.log(`Order assigned to user ${user.userId} (active shift)`);
      } else {
        this.logger.warn(`User ${user.userId} has no active shift`);
      }
    } catch (error) {
      this.logger.error(
        `Failed to check active shift: ${error.message}. Order will not be assigned.`
      );
      // No fallar la creación de orden si falla el lookup de shift
    }
  }

  return order.save();
}
```

**Commit**:
```bash
git add src/modules/orders/orders.service.ts
git commit -m "feat(orders): assign user to order when shift is active"
```

#### Paso 1.2: Backend - Actualizar Module (10 min)

**Archivo**: `food-inventory-saas/src/modules/orders/orders.module.ts`

```typescript
// Agregar import
import { ShiftsModule } from '../shifts/shifts.module';

@Module({
  imports: [
    // ... existing imports
    ShiftsModule,  // ← AGREGAR
  ],
  // ...
})
```

**Commit**:
```bash
git add src/modules/orders/orders.module.ts
git commit -m "feat(orders): import ShiftsModule for employee assignment"
```

#### Paso 1.3: Backend - Agregar Índice a Schema (5 min)

**Archivo**: `food-inventory-saas/src/schemas/order.schema.ts`

```typescript
// Al final del archivo, después de los índices existentes
OrderSchema.index({ assignedTo: 1, confirmedAt: 1, tenantId: 1 });
OrderSchema.index({ assignedTo: 1, status: 1, tenantId: 1 });
```

**Commit**:
```bash
git add src/schemas/order.schema.ts
git commit -m "perf(orders): add indexes for assignedTo queries"
```

#### Paso 1.4: Backend - Tests Unitarios (45 min)

**Archivo**: `food-inventory-saas/src/modules/orders/orders.service.spec.ts`

Crear/agregar los tests del template anterior.

**Commit**:
```bash
git add src/modules/orders/orders.service.spec.ts
git commit -m "test(orders): add unit tests for employee assignment"
```

#### Paso 1.5: Frontend - Mostrar Empleado en Órdenes (20 min)

**Archivo**: `food-inventory-admin/src/components/orders/v2/OrdersManagementV2.jsx`

```jsx
// En la tabla de órdenes, agregar columna
<TableHead>Atendido Por</TableHead>

// En el body
<TableCell>
  {order.assignedTo ? (
    <Badge variant="outline">{order.assignedTo.firstName}</Badge>
  ) : (
    <span className="text-muted-foreground">-</span>
  )}
</TableCell>
```

**Commit**:
```bash
git add src/components/orders/v2/OrdersManagementV2.jsx
git commit -m "feat(orders): display assigned employee in orders table"
```

#### Paso 1.6: Testing Manual (30 min)

Seguir checklist de testing manual de Fase 1.

**Commit** (del checklist completado):
```bash
git add test/checklists/fase-1-employee-performance-completed.md
git commit -m "docs(test): complete manual testing checklist for phase 1"
```

### Validación Fase 1:

- [ ] Tests unitarios pasan: `npm test`
- [ ] Backend compila sin errores: `npm run build`
- [ ] Frontend compila sin errores: `npm run build`
- [ ] Checklist manual 100% completado
- [ ] No errores en logs durante testing
- [ ] Performance similar (response time < 2s)

### Merge y Tag:

```bash
# Merge a development
git checkout development/mejoras-2025
git merge fase-1/employee-performance-fix

# Tag de versión
git tag -a v2.1.0-fase1 -m "Phase 1: Employee Performance Fix"
git push origin v2.1.0-fase1
```

### Resultado Esperado:

```
✅ Órdenes se asignan automáticamente al empleado con turno activo
✅ Reporte de rendimiento muestra ventas generadas por empleado
✅ Nueva columna "Atendido Por" en tabla de órdenes
✅ Tests cubren casos happy path y edge cases
✅ Sistema estable, sin regresiones
```

---

## 🔐 FASE 1B: LOGIN MULTI-TENANT SIN FRICCIÓN

**Objetivo**: Eliminar la dependencia del `tenantCode` en el login, habilitar cuentas globales por email y permitir a un usuario seleccionar cualquiera de sus tenant memberships después de autenticarse.

**Duración estimada**: 10-12 horas (dividido en 3 sub-fases)  
**Riesgo**: Medio (impacta autenticación y autorización)  
**Reversibilidad**: Alta si mantenemos compatibilidad en cada sub-fase

**Estado actual**: ✅ Completada  
- AuthService ya realiza login por email y retorna memberships (`food-inventory-saas/src/auth/auth.service.ts:46`).  
- `MembershipsService` y esquema `user-tenant-membership` están activos (`food-inventory-saas/src/modules/memberships/memberships.service.ts`, `food-inventory-saas/src/schemas/user-tenant-membership.schema.ts`).  
- Endpoint `POST /auth/switch-tenant` operativo y usado por frontend.  
- Frontend incluye selector (`food-inventory-admin/src/components/auth/TenantPickerDialog.jsx`) y flujo en `use-auth`/`Login.jsx`.  
- Script de migración `2025-01-backfill-memberships.js` y sincronización vía `super-admin` implementados.  
- Feature flag `ENABLE_MULTI_TENANT_LOGIN` activado en `.env` y `VITE_ENABLE_MULTI_TENANT_LOGIN` en frontend.

### Por qué va antes de Fase 2
- ✅ Reduce fricción inmediata reportada por clientes (alto impacto en adopción)
- ✅ Aísla la nueva arquitectura de identidad antes de expandir módulos financieros
- ✅ Evita tocar teclas críticas sin tener un plan de rollback probado
- ✅ Prepara el camino para futuras features multi-tenant (por ejemplo controlar múltiples sedes)

### Sub-fases
```
FASE 1B.1: Backend - Identidad global y memberships (4-5 h)
   └─> FASE 1B.2: Frontend - Selector de tenant y UX (3-4 h)
          └─> FASE 1B.3: Migraciones, rollout y soporte dual (3 h)
```

### 🔹 FASE 1B.1: BACKEND - IDENTIDAD GLOBAL Y MEMBERSHIPS

**Feature flag sugerida**: `ENABLE_MULTI_TENANT_LOGIN`

#### Checklist previo
```bash
# 1. Backup de base de datos y estado actual
./scripts/backup-before-phase.sh

# 2. Crear rama dedicada
git checkout -b fase-1b.1/multi-tenant-backend

# 3. Agregar feature flag temporal en configs
ENABLE_MULTI_TENANT_LOGIN=false
```

#### Paso 1: Crear esquema `UserTenantMembership` (Mongo)
- Archivo nuevo: `food-inventory-saas/src/schemas/user-tenant-membership.schema.ts`
- Campos clave: `userId`, `tenantId`, `roleId`, `status`, `default`, `permissionsCache`
- Índices:
  - `{ userId: 1, tenantId: 1 }` unique
  - `{ tenantId: 1, status: 1 }`

#### Paso 2: Servicio y repositorio
- Crear módulo ligero `memberships` con service + DTOs + guards
- Métodos mínimos:
  - `findActiveMembershipsByUser(email | userId)`
  - `setDefaultMembership(userId, membershipId)`
  - `assertUserAccess(userId, tenantId)`

#### Paso 3: Ajustar `AuthService.login`
- Aceptar `email` + `password` únicamente.
- Si `ENABLE_MULTI_TENANT_LOGIN=false`, seguir ruta antigua (compatibilidad).
- Si flag en true:
  - Buscar usuario por email (ignorando `tenantId`).
  - Validar password y estado.
  - Consultar memberships activas (`status === 'active'`).
  - Generar JWT sin `tenantId` (solo `userId`, `roleGlobal`, scopes base).
  - Retornar `{ user, memberships }`.

#### Paso 4: Endpoint `POST /auth/switch-tenant`
- Recibe `membershipId` y valida pertenencia.
- Genera tokens de corta duración (access/refresh) con `tenantContext`.
- Adjunta permisos del rol + membership.
- Respuesta: `{ tokens, tenant, permissions }`.

#### Paso 5: Guards y headers
- Actualizar `JwtAuthGuard` para aceptar token sin tenant o con `tenantContext`.
- En endpoints multi-tenant, exigir header `x-tenant-id` o `tenantId` en token.
- Añadir helper `TenantContextService` para resolver el tenant activo.

#### Paso 6: Tests
- Unit tests para `AuthService.login` (modo legacy vs flag on).
- Tests para `switch-tenant` asegurando que no permite memberships ajenos.
- Ajustar E2E básicos de login.

**Commit sugeridos**
```bash
git commit -m "feat(auth): add user-tenant membership schema and service"
git commit -m "feat(auth): support email-only login behind feature flag"
git commit -m "feat(auth): add tenant switch endpoint and guards"
git commit -m "test(auth): cover membership login flows"
```

### 🔹 FASE 1B.2: FRONTEND - SELECTOR DE TENANT Y UX

**Feature flag**: `ENABLE_MULTI_TENANT_LOGIN` (compartida con backend)

#### Checklist previo
```bash
git checkout -b fase-1b.2/multi-tenant-frontend
ENABLE_MULTI_TENANT_LOGIN=true # en .env.local
```

#### Paso 1: Actualizar `useAuth`
- Aceptar respuesta `{ user, memberships }` cuando flag activo.
- Guardar `memberships` en contexto.
- Crear métodos `setActiveMembership` y `loadTenantContext`.

#### Paso 2: Nuevo componente `TenantPickerDialog`
- Ubicación: `food-inventory-admin/src/components/auth/TenantPickerDialog.jsx`
- Casos:
  - 0 memberships → mostrar error “No tienes organizaciones activas”.
  - 1 membership → autoseleccionar y llamar `/auth/switch-tenant`.
  - >1 memberships → lista con búsqueda, badges de rol, botón “Recordar como predeterminada”.

#### Paso 3: Flujo en `Login.jsx`
- Ocultar campo `tenantCode` si flag activo.
- Tras login exitoso:
  - Mostrar `TenantPickerDialog` si múltiples memberships.
  - Guardar `activeTenant` en `localStorage`.
  - Cargar token contextual y redirigir.

#### Paso 4: Navbar / Switcher persistente
- Agregar botón en layout principal para cambiar de tenant.
- Mostrar nombre + role + badge “Predeterminado”.
- Al cambiar, refrescar datos y token (`/auth/switch-tenant`).

#### Paso 5: Manejo de permisos
- Asegurar que `useAuth.permissions` se refresque después de `switchTenant`.
- Invalidar queries (React Query o fetch manual) dependientes de tenant.

#### Paso 6: Tests / QA
- Test unitario para `useAuth` (mock de memberships).
- Test de integración (Cypress o Playwright) para flujo multi-tenant.
- Checklist manual: flujos legacy (flag off) y nuevo login (flag on).

**Commits sugeridos**
```bash
git commit -m "feat(auth): add tenant picker dialog and multi-tenant UX"
git commit -m "feat(auth): add tenant switcher to admin layout"
git commit -m "test(auth): cover multi-tenant login happy path"
```

### 🔹 FASE 1B.3: MIGRACIONES, ROLLOUT Y SOPORTE DUAL

#### Paso 1: Script de migración
- Ubicación: `scripts/migrations/2025-01-backfill-memberships.js`
- Por cada usuario con `tenantId`:
  - Crear membership `active`.
  - Marcar `default=true`.
  - Guardar `roleId` actual.
- Logs detallados + dry-run opcional.
- Disponible acción manual en Super Admin (`Sincronizar membresías`) que reusa esta lógica desde la interfaz.

#### Paso 2: Normalización de tenant codes
- Script secundario que itera sobre tenants y aplica `code = code.trim().toUpperCase()`.
- Mantener compatibilidad permitiendo `tenantCode` en minúscula (`toUpperCase()` antes de buscar).

#### Paso 3: Rollout plan
1. **Staging**  
   - Ejecutar migración con flag on.  
   - QA completo (legacy y multi-tenant).
2. **Producción - Fase 1**  
   - Ejecutar migración con flag off (usuarios aún ven login actual).  
   - Validar que todo sigue operando.
3. **Producción - Fase 2**  
   - Activar flag para organizaciones piloto.  
   - Monitorear métricas (logins fallidos, soporte).
4. **Producción - Fase 3**  
   - Activar flag global.  
   - Comunicar cambio a clientes, incluir tutorial rápido.

#### Paso 4: Rollback
- Script `rollback-memberships.js` que elimina memberships creadas y restaura `tenantId` si fuese necesario.
- Mantener backups lo suficientemente recientes.
- Revertir flag a `false` y redeploy versión previa si hay incidente.

#### Paso 5: Métricas de éxito
- Disminución de tickets por “tenant code inválido” a 0.
- % de logins exitosos en primer intento > 95%.
- Usuarios con más de un tenant logran cambiar sin errores (monitorear logs de `/auth/switch-tenant`).

#### Paso 6: Documentación
- Actualizar `PROYECTO_COMPLETO_README.md` con nuevo flujo.
- Crear guía rápida para soporte (`docs/soporte/login-multi-tenant.md`).
- Grabar GIF o video corto mostrando el selector.

**Commits sugeridos**
```bash
git commit -m "chore(migrations): create user-tenant membership backfill script"
git commit -m "docs(auth): document multi-tenant login rollout plan"
```

### Validación final de la fase
- [ ] Tests unitarios y e2e pasando con flag on/off.
- [ ] Scripts de migración probados en staging con snapshot de prod.
- [ ] QA manual de flujos críticos (login, switch, logout, permisos).
- [ ] Observabilidad: logs, métricas, alertas configuradas para monitorear fallos de login.
- [ ] Plan de comunicación listo (email a clientes + notas de versión).

---

## 🏦 FASE 2: CUENTAS BANCARIAS - MEJORAS INCREMENTALES

**Objetivo**: Implementar Fases 2-4 del módulo de cuentas bancarias
**Duración**: 8-10 horas (dividido en sub-fases)
**Riesgo**: Bajo-Medio (funcionalidad nueva, aislada)
**Reversibilidad**: Alta (feature flags independientes)

**Estado actual**: ⏳ Pendiente  
- Módulo de cuentas permite CRUD básico (`bank-accounts.service.ts`), pero no existen esquemas ni servicios para `BankTransaction`.  
- `bank-reconciliation.service.ts` y controladores asociados contienen métodos vacíos que devuelven `null`.  
- Frontend solo gestiona cuentas bancarias; movimientos, conciliación y transferencias no están presentes.

### Por qué esta fase va segunda:

1. ✅ **Solicitado explícitamente** por el cliente
2. ✅ **No depende de Fase 1** - módulo independiente
3. ✅ **Valor tangible** - gestión financiera mejorada
4. ✅ **Base para reportes financieros** avanzados (Fase 3)
5. ✅ **Scope bien definido** - 3 sub-fases claras

### Sub-Fases:

```
FASE 2.1: Movimientos de Cuenta (3-4 horas)
   └─> FASE 2.2: Conciliación Bancaria (4-5 horas)
          └─> FASE 2.3: Transferencias y Alertas (3-4 horas)
```

---

### 🔹 FASE 2.1: MOVIMIENTOS Y HISTÓRICO DE CUENTA

**Duración**: 3-4 horas
**Feature Flag**: `ENABLE_BANK_MOVEMENTS`

#### Checklist Pre-Sub-Fase:

```bash
# 1. Backup
./scripts/backup-before-phase.sh

# 2. Rama específica
git checkout -b fase-2.1/bank-movements

# 3. Activar feature flag
# En .env
ENABLE_BANK_MOVEMENTS=true
```

#### Paso 2.1.1: Backend - Schema de Movimientos (30 min)

**Archivo**: `food-inventory-saas/src/schemas/bank-transaction.schema.ts`

```typescript
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type BankTransactionDocument = BankTransaction & Document;

@Schema({ timestamps: true })
export class BankTransaction {
  @Prop({ type: Types.ObjectId, ref: 'BankAccount', required: true, index: true })
  bankAccountId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Tenant', required: true, index: true })
  tenantId: Types.ObjectId;

  @Prop({ type: String, required: true, enum: ['deposit', 'withdrawal', 'transfer_in', 'transfer_out', 'fee', 'interest', 'adjustment'] })
  type: string;

  @Prop({ type: Number, required: true })
  amount: number;

  @Prop({ type: Number, required: true })
  balanceAfter: number;

  @Prop({ type: String, required: true })
  description: string;

  @Prop({ type: String })
  reference?: string;

  @Prop({ type: String })
  category?: string;

  @Prop({ type: Date, required: true, index: true })
  transactionDate: Date;

  @Prop({ type: Types.ObjectId, ref: 'Payment' })
  linkedPaymentId?: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'BankTransaction' })
  linkedTransferId?: Types.ObjectId;

  @Prop({ type: Object })
  metadata?: {
    importedFrom?: string;
    reconciled?: boolean;
    reconciledAt?: Date;
  };
}

export const BankTransactionSchema = SchemaFactory.createForClass(BankTransaction);

// Índices
BankTransactionSchema.index({ bankAccountId: 1, transactionDate: -1 });
BankTransactionSchema.index({ tenantId: 1, transactionDate: -1 });
BankTransactionSchema.index({ type: 1, bankAccountId: 1 });
```

**Commit**:
```bash
git add src/schemas/bank-transaction.schema.ts
git commit -m "feat(bank): add bank transaction schema for movements tracking"
```

#### Paso 2.1.2: Backend - DTO para Transacciones (15 min)

**Archivo**: `food-inventory-saas/src/dto/bank-transaction.dto.ts`

```typescript
import { IsString, IsNumber, IsEnum, IsOptional, IsDateString, IsMongoId } from 'class-validator';

export class CreateBankTransactionDto {
  @IsMongoId()
  bankAccountId: string;

  @IsEnum(['deposit', 'withdrawal', 'transfer_in', 'transfer_out', 'fee', 'interest', 'adjustment'])
  type: string;

  @IsNumber()
  amount: number;

  @IsString()
  description: string;

  @IsOptional()
  @IsString()
  reference?: string;

  @IsOptional()
  @IsString()
  category?: string;

  @IsDateString()
  transactionDate: string;
}

export class FilterTransactionsDto {
  @IsOptional()
  @IsDateString()
  from?: string;

  @IsOptional()
  @IsDateString()
  to?: string;

  @IsOptional()
  @IsEnum(['deposit', 'withdrawal', 'transfer_in', 'transfer_out', 'fee', 'interest', 'adjustment'])
  type?: string;

  @IsOptional()
  @IsString()
  category?: string;
}
```

**Commit**:
```bash
git add src/dto/bank-transaction.dto.ts
git commit -m "feat(bank): add DTOs for bank transactions"
```

#### Paso 2.1.3: Backend - Service de Transacciones (60 min)

**Archivo**: `food-inventory-saas/src/modules/bank-accounts/bank-transactions.service.ts`

```typescript
import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { BankTransaction, BankTransactionDocument } from '../../schemas/bank-transaction.schema';
import { BankAccount, BankAccountDocument } from '../../schemas/bank-account.schema';
import { CreateBankTransactionDto, FilterTransactionsDto } from '../../dto/bank-transaction.dto';
import { FEATURES } from '../../config/features.config';

@Injectable()
export class BankTransactionsService {
  private readonly logger = new Logger(BankTransactionsService.name);

  constructor(
    @InjectModel(BankTransaction.name)
    private transactionModel: Model<BankTransactionDocument>,
    @InjectModel(BankAccount.name)
    private bankAccountModel: Model<BankAccountDocument>,
  ) {}

  async create(
    dto: CreateBankTransactionDto,
    tenantId: string,
  ): Promise<BankTransaction> {
    if (!FEATURES.BANK_ACCOUNTS_MOVEMENTS) {
      throw new Error('Bank movements feature is not enabled');
    }

    const account = await this.bankAccountModel
      .findOne({ _id: dto.bankAccountId, tenantId: new Types.ObjectId(tenantId) })
      .exec();

    if (!account) {
      throw new NotFoundException('Bank account not found');
    }

    // Calcular nuevo saldo
    const amountChange = ['deposit', 'transfer_in', 'interest'].includes(dto.type)
      ? dto.amount
      : -dto.amount;

    const newBalance = account.currentBalance + amountChange;

    // Crear transacción
    const transaction = new this.transactionModel({
      ...dto,
      bankAccountId: new Types.ObjectId(dto.bankAccountId),
      tenantId: new Types.ObjectId(tenantId),
      balanceAfter: newBalance,
      transactionDate: new Date(dto.transactionDate),
    });

    // Actualizar saldo de cuenta
    await this.bankAccountModel
      .findByIdAndUpdate(dto.bankAccountId, { currentBalance: newBalance })
      .exec();

    this.logger.log(
      `Transaction created for account ${dto.bankAccountId}: ${dto.type} ${dto.amount}`,
    );

    return transaction.save();
  }

  async findByAccount(
    bankAccountId: string,
    tenantId: string,
    filters?: FilterTransactionsDto,
  ): Promise<BankTransaction[]> {
    const query: any = {
      bankAccountId: new Types.ObjectId(bankAccountId),
      tenantId: new Types.ObjectId(tenantId),
    };

    if (filters?.from || filters?.to) {
      query.transactionDate = {};
      if (filters.from) {
        query.transactionDate.$gte = new Date(filters.from);
      }
      if (filters.to) {
        query.transactionDate.$lte = new Date(filters.to);
      }
    }

    if (filters?.type) {
      query.type = filters.type;
    }

    if (filters?.category) {
      query.category = filters.category;
    }

    return this.transactionModel
      .find(query)
      .sort({ transactionDate: -1 })
      .exec();
  }

  async getAccountStatement(
    bankAccountId: string,
    tenantId: string,
    from: string,
    to: string,
  ) {
    const transactions = await this.findByAccount(
      bankAccountId,
      tenantId,
      { from, to },
    );

    const account = await this.bankAccountModel
      .findOne({ _id: bankAccountId, tenantId: new Types.ObjectId(tenantId) })
      .exec();

    const summary = transactions.reduce(
      (acc, txn) => {
        if (['deposit', 'transfer_in', 'interest'].includes(txn.type)) {
          acc.totalDeposits += txn.amount;
        } else {
          acc.totalWithdrawals += txn.amount;
        }
        return acc;
      },
      { totalDeposits: 0, totalWithdrawals: 0 },
    );

    return {
      account: {
        id: account._id,
        bankName: account.bankName,
        accountNumber: account.accountNumber,
        currentBalance: account.currentBalance,
      },
      period: { from, to },
      summary,
      transactions,
    };
  }
}
```

**Commit**:
```bash
git add src/modules/bank-accounts/bank-transactions.service.ts
git commit -m "feat(bank): implement bank transactions service with statement generation"
```

#### Paso 2.1.4: Backend - Controller (30 min)

**Archivo**: `food-inventory-saas/src/modules/bank-accounts/bank-transactions.controller.ts`

```typescript
import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { BankTransactionsService } from './bank-transactions.service';
import { CreateBankTransactionDto, FilterTransactionsDto } from '../../dto/bank-transaction.dto';
import { JwtAuthGuard } from '../../guards/jwt-auth.guard';
import { TenantGuard } from '../../guards/tenant.guard';
import { PermissionsGuard } from '../../guards/permissions.guard';
import { Permissions } from '../../decorators/permissions.decorator';

@Controller('bank-transactions')
@UseGuards(JwtAuthGuard, TenantGuard, PermissionsGuard)
export class BankTransactionsController {
  constructor(private readonly transactionsService: BankTransactionsService) {}

  @Post()
  @Permissions('accounting_write')
  async create(@Body() dto: CreateBankTransactionDto, @Request() req) {
    return this.transactionsService.create(dto, req.user.tenantId);
  }

  @Get('account/:accountId')
  @Permissions('accounting_read')
  async getByAccount(
    @Param('accountId') accountId: string,
    @Query() filters: FilterTransactionsDto,
    @Request() req,
  ) {
    return this.transactionsService.findByAccount(
      accountId,
      req.user.tenantId,
      filters,
    );
  }

  @Get('account/:accountId/statement')
  @Permissions('accounting_read')
  async getStatement(
    @Param('accountId') accountId: string,
    @Query('from') from: string,
    @Query('to') to: string,
    @Request() req,
  ) {
    return this.transactionsService.getAccountStatement(
      accountId,
      req.user.tenantId,
      from,
      to,
    );
  }
}
```

**Commit**:
```bash
git add src/modules/bank-accounts/bank-transactions.controller.ts
git commit -m "feat(bank): add bank transactions controller with statement endpoint"
```

#### Paso 2.1.5: Backend - Actualizar Module (10 min)

**Archivo**: `food-inventory-saas/src/modules/bank-accounts/bank-accounts.module.ts`

```typescript
import { BankTransaction, BankTransactionSchema } from '../../schemas/bank-transaction.schema';
import { BankTransactionsService } from './bank-transactions.service';
import { BankTransactionsController } from './bank-transactions.controller';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: BankAccount.name, schema: BankAccountSchema },
      { name: BankTransaction.name, schema: BankTransactionSchema },  // ← AGREGAR
      { name: Tenant.name, schema: TenantSchema },
    ]),
    AuthModule,
    PermissionsModule,
  ],
  controllers: [
    BankAccountsController,
    BankTransactionsController,  // ← AGREGAR
  ],
  providers: [
    BankAccountsService,
    BankTransactionsService,  // ← AGREGAR
  ],
  exports: [BankAccountsService, BankTransactionsService],  // ← ACTUALIZAR
})
```

**Commit**:
```bash
git add src/modules/bank-accounts/bank-accounts.module.ts
git commit -m "feat(bank): register bank transactions in module"
```

#### Paso 2.1.6: Backend - Modificar Payments para Crear Transacciones (45 min)

**Archivo**: `food-inventory-saas/src/modules/payments/payments.service.ts`

```typescript
// Agregar import
import { BankTransactionsService } from '../bank-accounts/bank-transactions.service';
import { FEATURES } from '../../config/features.config';

// En constructor
constructor(
  // ... existing
  private readonly bankTransactionsService: BankTransactionsService,  // ← AGREGAR
) {}

// Modificar updateBalance
if (newPayment.bankAccountId) {
  try {
    const adjustment = paymentType === 'sale' ? newPayment.amount : -newPayment.amount;

    // Actualizar saldo
    await this.bankAccountsService.updateBalance(
      newPayment.bankAccountId.toString(),
      adjustment,
      tenantId
    );

    // 🎯 NUEVO: Crear transacción si feature está activa
    if (FEATURES.BANK_ACCOUNTS_MOVEMENTS) {
      await this.bankTransactionsService.create(
        {
          bankAccountId: newPayment.bankAccountId.toString(),
          type: paymentType === 'sale' ? 'deposit' : 'withdrawal',
          amount: Math.abs(newPayment.amount),
          description: `${paymentType === 'sale' ? 'Pago recibido' : 'Pago realizado'} - ${newPayment.method}`,
          reference: newPayment.referenceNumber || undefined,
          transactionDate: new Date().toISOString(),
        },
        tenantId,
      );

      this.logger.log(`Bank transaction created for payment ${newPayment._id}`);
    }

  } catch (error) {
    this.logger.error(`Failed to update bank account: ${error.message}`);
  }
}
```

**Commit**:
```bash
git add src/modules/payments/payments.service.ts
git commit -m "feat(payments): create bank transaction when payment is linked to account"
```

#### Paso 2.1.7: Frontend - Vista de Movimientos (90 min)

**Archivo**: `food-inventory-admin/src/components/BankAccountMovements.jsx`

```jsx
import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Download, ArrowUpCircle, ArrowDownCircle } from 'lucide-react';
import { fetchApi } from '@/lib/api';
import { toast } from 'sonner';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';

export function BankAccountMovements() {
  const { accountId } = useParams();
  const [statement, setStatement] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    from: new Date(new Date().setMonth(new Date().getMonth() - 1)).toISOString().split('T')[0],
    to: new Date().toISOString().split('T')[0],
  });

  const fetchStatement = async () => {
    setLoading(true);
    try {
      const response = await fetchApi(
        `/bank-transactions/account/${accountId}/statement?from=${filters.from}&to=${filters.to}`
      );
      setStatement(response);
    } catch (error) {
      toast.error('Error al cargar movimientos', { description: error.message });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatement();
  }, [accountId, filters]);

  const exportToExcel = () => {
    const data = statement.transactions.map(txn => ({
      Fecha: new Date(txn.transactionDate).toLocaleDateString(),
      Tipo: txn.type,
      Descripción: txn.description,
      Referencia: txn.reference || '-',
      Monto: txn.amount,
      Saldo: txn.balanceAfter,
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Movimientos');

    const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    saveAs(blob, `movimientos-${statement.account.accountNumber}-${filters.from}-${filters.to}.xlsx`);

    toast.success('Archivo exportado correctamente');
  };

  const getTypeIcon = (type) => {
    return ['deposit', 'transfer_in', 'interest'].includes(type) ? (
      <ArrowUpCircle className="h-4 w-4 text-green-600" />
    ) : (
      <ArrowDownCircle className="h-4 w-4 text-red-600" />
    );
  };

  const getTypeBadge = (type) => {
    const typeMap = {
      deposit: { label: 'Depósito', variant: 'success' },
      withdrawal: { label: 'Retiro', variant: 'destructive' },
      transfer_in: { label: 'Transferencia Entrada', variant: 'success' },
      transfer_out: { label: 'Transferencia Salida', variant: 'destructive' },
      fee: { label: 'Comisión', variant: 'secondary' },
      interest: { label: 'Interés', variant: 'success' },
      adjustment: { label: 'Ajuste', variant: 'outline' },
    };

    const config = typeMap[type] || { label: type, variant: 'outline' };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  if (loading) {
    return <div>Cargando movimientos...</div>;
  }

  if (!statement) {
    return <div>No se encontraron movimientos</div>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle className="text-2xl">
                {statement.account.bankName} - {statement.account.accountNumber}
              </CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                Estado de cuenta del {new Date(filters.from).toLocaleDateString()} al{' '}
                {new Date(filters.to).toLocaleDateString()}
              </p>
            </div>
            <Button onClick={exportToExcel}>
              <Download className="h-4 w-4 mr-2" />
              Exportar a Excel
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 border rounded-lg">
              <p className="text-sm text-muted-foreground">Saldo Actual</p>
              <p className="text-2xl font-bold">
                {new Intl.NumberFormat('es-VE', {
                  style: 'currency',
                  currency: 'USD',
                }).format(statement.account.currentBalance)}
              </p>
            </div>
            <div className="p-4 border rounded-lg">
              <p className="text-sm text-muted-foreground">Total Depósitos</p>
              <p className="text-2xl font-bold text-green-600">
                +{new Intl.NumberFormat('es-VE', {
                  style: 'currency',
                  currency: 'USD',
                }).format(statement.summary.totalDeposits)}
              </p>
            </div>
            <div className="p-4 border rounded-lg">
              <p className="text-sm text-muted-foreground">Total Retiros</p>
              <p className="text-2xl font-bold text-red-600">
                -{new Intl.NumberFormat('es-VE', {
                  style: 'currency',
                  currency: 'USD',
                }).format(statement.summary.totalWithdrawals)}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Filtros */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex gap-4">
            <div>
              <label className="text-sm font-medium">Desde</label>
              <input
                type="date"
                value={filters.from}
                onChange={(e) => setFilters({ ...filters, from: e.target.value })}
                className="mt-1 block w-full rounded-md border p-2"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Hasta</label>
              <input
                type="date"
                value={filters.to}
                onChange={(e) => setFilters({ ...filters, to: e.target.value })}
                className="mt-1 block w-full rounded-md border p-2"
              />
            </div>
            <div className="flex items-end">
              <Button onClick={fetchStatement}>Filtrar</Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabla de Movimientos */}
      <Card>
        <CardHeader>
          <CardTitle>Movimientos ({statement.transactions.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Fecha</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Descripción</TableHead>
                <TableHead>Referencia</TableHead>
                <TableHead className="text-right">Monto</TableHead>
                <TableHead className="text-right">Saldo</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {statement.transactions.map((txn) => (
                <TableRow key={txn._id}>
                  <TableCell>{new Date(txn.transactionDate).toLocaleDateString()}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {getTypeIcon(txn.type)}
                      {getTypeBadge(txn.type)}
                    </div>
                  </TableCell>
                  <TableCell>{txn.description}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {txn.reference || '-'}
                  </TableCell>
                  <TableCell className="text-right">
                    <span
                      className={
                        ['deposit', 'transfer_in', 'interest'].includes(txn.type)
                          ? 'text-green-600 font-medium'
                          : 'text-red-600 font-medium'
                      }
                    >
                      {['deposit', 'transfer_in', 'interest'].includes(txn.type) ? '+' : '-'}
                      {new Intl.NumberFormat('es-VE', {
                        style: 'currency',
                        currency: 'USD',
                      }).format(txn.amount)}
                    </span>
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    {new Intl.NumberFormat('es-VE', {
                      style: 'currency',
                      currency: 'USD',
                    }).format(txn.balanceAfter)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

export default BankAccountMovements;
```

**Commit**:
```bash
git add src/components/BankAccountMovements.jsx
git commit -m "feat(bank): add bank movements view with statement and export"
```

#### Paso 2.1.8: Frontend - Integrar en App (15 min)

**Archivo**: `food-inventory-admin/src/App.jsx`

```jsx
// Lazy import
const BankAccountMovements = lazy(() => import('@/components/BankAccountMovements.jsx'));

// En Routes
<Route path="bank-accounts/:accountId/movements" element={<BankAccountMovements />} />
```

**Archivo**: `food-inventory-admin/src/components/BankAccountsManagement.jsx`

```jsx
// En la tabla, agregar botón de "Ver Movimientos"
<Button
  variant="ghost"
  size="sm"
  onClick={() => navigate(`/bank-accounts/${account._id}/movements`)}
>
  <FileText className="h-4 w-4 mr-2" />
  Movimientos
</Button>
```

**Commit**:
```bash
git add src/App.jsx src/components/BankAccountsManagement.jsx
git commit -m "feat(bank): integrate movements view in app navigation"
```

#### Paso 2.1.9: Testing (45 min)

Crear y completar checklist:

```markdown
# CHECKLIST FASE 2.1: Movimientos de Cuenta

## Prerequisitos
- [ ] Feature flag activo: `ENABLE_BANK_MOVEMENTS=true`
- [ ] Backend y Frontend corriendo
- [ ] Al menos 1 cuenta bancaria creada

## Escenario 1: Crear Movimiento Manual
- [ ] Ir a Cuentas Bancarias
- [ ] Click en "Ver Movimientos"
- [ ] Saldo inicial mostrado correctamente
- [ ] Click "Nuevo Movimiento"
- [ ] Seleccionar tipo: Depósito
- [ ] Monto: $500
- [ ] Descripción: "Depósito de prueba"
- [ ] Guardar
- [ ] Verificar que aparece en tabla
- [ ] Verificar saldo actualizado
- [ ] Verificar ícono verde (ingreso)

## Escenario 2: Pago Automático Crea Transacción
- [ ] Ir a Módulo de Pagos
- [ ] Crear pago de venta
- [ ] Vincular a cuenta bancaria
- [ ] Guardar pago
- [ ] Ir a Movimientos de esa cuenta
- [ ] Verificar que transacción se creó automáticamente
- [ ] Verificar descripción correcta
- [ ] Verificar saldo actualizado

## Escenario 3: Filtros y Exportación
- [ ] Crear múltiples transacciones con fechas diferentes
- [ ] Aplicar filtro de fecha (últimos 7 días)
- [ ] Verificar que solo muestra transacciones del rango
- [ ] Click "Exportar a Excel"
- [ ] Verificar archivo se descarga
- [ ] Abrir Excel
- [ ] Verificar columnas correctas
- [ ] Verificar datos coinciden con pantalla

## Escenario 4: Estado de Cuenta
- [ ] Verificar resumen muestra:
   - [ ] Saldo actual
   - [ ] Total depósitos del período
   - [ ] Total retiros del período
- [ ] Verificar cálculos son correctos
```

**Commit**:
```bash
git add test/checklists/fase-2.1-bank-movements-completed.md
git commit -m "docs(test): complete testing checklist for phase 2.1"
```

### Validación Fase 2.1:

- [ ] Backend compila sin errores
- [ ] Frontend compila sin errores
- [ ] Tests unitarios pasan
- [ ] Checklist manual 100% completado
- [ ] Exportación a Excel funciona
- [ ] Saldos se actualizan correctamente
- [ ] No hay errores en logs

### Merge y Tag:

```bash
git checkout development/mejoras-2025
git merge fase-2.1/bank-movements
git tag -a v2.2.0-fase2.1 -m "Phase 2.1: Bank Account Movements"
git push origin v2.2.0-fase2.1
```

### Resultado Esperado:

```
✅ Cada pago crea automáticamente una transacción bancaria
✅ Historial completo de movimientos por cuenta
✅ Estado de cuenta con resumen de período
✅ Exportación a Excel funcional
✅ Filtros por fecha y tipo
```

---

### 🔹 FASE 2.2: CONCILIACIÓN BANCARIA

**Duración**: 4-5 horas
**Feature Flag**: `ENABLE_BANK_RECONCILIATION`

**Objetivo**: automatizar la conciliación entre movimientos registrados en el sistema y estados de cuenta bancarios importados por el usuario, detectando discrepancias y permitiendo ajustes manuales seguros.

**Estado actual**: servicio y controlador `bank-reconciliation` existen pero devuelven `null`; no hay esquemas ni DTOs definidos y el frontend no permite subir archivos de estado de cuenta.

#### Checklist Pre-Sub-Fase:

```bash
# 1. Backup
./scripts/backup-before-phase.sh

# 2. Rama específica
git checkout -b fase-2.2/bank-reconciliation

# 3. Activar feature flag
# En .env
ENABLE_BANK_RECONCILIATION=true
```

#### Paso 2.2.1: Backend - Extender esquema de transacciones (20 min)

**Archivo**: `food-inventory-saas/src/schemas/bank-transaction.schema.ts`

```typescript
@Prop({ type: Boolean, default: false, index: true })
reconciled: boolean;

@Prop({ type: Date })
reconciledAt?: Date;

@Prop({ type: String })
importedFrom?: string;

@Prop({ type: Types.ObjectId, ref: 'BankStatementImport' })
statementImportId?: Types.ObjectId;
```

```typescript
BankTransactionSchema.index({ bankAccountId: 1, reconciled: 1, transactionDate: -1 });
BankTransactionSchema.index({ tenantId: 1, reconciled: 1, transactionDate: -1 });
```

**Commit**:
```bash
git add src/schemas/bank-transaction.schema.ts
git commit -m "feat(bank): add reconciliation fields to bank transactions"
```

#### Paso 2.2.2: Backend - Schema para importaciones (25 min)

**Archivo**: `food-inventory-saas/src/schemas/bank-statement-import.schema.ts`

```typescript
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type BankStatementImportDocument = BankStatementImport & Document;

@Schema({ timestamps: true })
export class BankStatementImport {
  @Prop({ type: Types.ObjectId, ref: 'BankAccount', required: true, index: true })
  bankAccountId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Tenant', required: true, index: true })
  tenantId: Types.ObjectId;

  @Prop({ type: String, required: true })
  originalFilename: string;

  @Prop({ type: String, required: true })
  mimeType: string;

  @Prop({ type: Number, required: true })
  totalRows: number;

  @Prop({ type: Number, default: 0 })
  matchedRows: number;

  @Prop({ type: Number, default: 0 })
  unmatchedRows: number;

  @Prop({ type: Object, default: {} })
  metadata: Record<string, any>;
}

export const BankStatementImportSchema =
  SchemaFactory.createForClass(BankStatementImport);
```

**Commit**:
```bash
git add src/schemas/bank-statement-import.schema.ts
git commit -m "feat(bank): add bank statement import schema"
```

#### Paso 2.2.3: Backend - DTOs de conciliación (20 min)

**Archivo**: `food-inventory-saas/src/dto/bank-reconciliation.dto.ts`

```typescript
import {
  IsArray,
  IsDateString,
  IsEnum,
  IsMongoId,
  IsNumber,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class ImportBankStatementDto {
  @IsMongoId()
  bankAccountId: string;

  @IsEnum(['csv', 'xlsx'])
  format: 'csv' | 'xlsx';

  @IsDateString()
  periodStart: string;

  @IsDateString()
  periodEnd: string;
}

export class ManualReconcileDto {
  @IsMongoId()
  transactionId: string;

  @IsNumber()
  bankAmount: number;

  @IsDateString()
  bankDate: string;

  @IsOptional()
  @IsString()
  bankReference?: string;
}

export class ReconcileBulkDto {
  @IsMongoId()
  bankAccountId: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ManualReconcileDto)
  entries: ManualReconcileDto[];
}
```

**Commit**:
```bash
git add src/dto/bank-reconciliation.dto.ts
git commit -m "feat(bank): add DTOs for bank reconciliation flow"
```

#### Paso 2.2.4: Backend - Servicio de conciliación (75 min)

**Archivo**: `food-inventory-saas/src/modules/bank-accounts/bank-reconciliation.service.ts`

```typescript
import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { FEATURES } from '../../config/features.config';
import { BankTransaction, BankTransactionDocument } from '../../schemas/bank-transaction.schema';
import { BankStatementImport, BankStatementImportDocument } from '../../schemas/bank-statement-import.schema';
import { ImportBankStatementDto, ManualReconcileDto } from '../../dto/bank-reconciliation.dto';
import { parseBankStatement } from '../../utils/bank-statement.parser';

@Injectable()
export class BankReconciliationService {
  private readonly logger = new Logger(BankReconciliationService.name);

  constructor(
    @InjectModel(BankTransaction.name)
    private readonly transactionModel: Model<BankTransactionDocument>,
    @InjectModel(BankStatementImport.name)
    private readonly statementModel: Model<BankStatementImportDocument>,
  ) {}

  async importStatement(
    dto: ImportBankStatementDto,
    file: Express.Multer.File,
    tenantId: string,
  ) {
    if (!FEATURES.BANK_ACCOUNTS_RECONCILIATION) {
      throw new BadRequestException('Bank reconciliation feature disabled');
    }

    const rows = await parseBankStatement(file);
    if (!rows.length) {
      throw new BadRequestException('El archivo está vacío o no posee filas válidas');
    }

    const importDoc = await this.statementModel.create({
      bankAccountId: new Types.ObjectId(dto.bankAccountId),
      tenantId: new Types.ObjectId(tenantId),
      originalFilename: file.originalname,
      mimeType: file.mimetype,
      totalRows: rows.length,
    });

    const unmatched = [];
    let matched = 0;

    for (const row of rows) {
      const match = await this.transactionModel.findOne({
        bankAccountId: dto.bankAccountId,
        tenantId,
        amount: row.amount,
        transactionDate: row.transactionDate,
        reconciled: false,
      });

      if (match) {
        match.reconciled = true;
        match.reconciledAt = new Date();
        match.statementImportId = importDoc._id;
        await match.save();
        matched++;
      } else {
        unmatched.push(row);
      }
    }

    importDoc.matchedRows = matched;
    importDoc.unmatchedRows = unmatched.length;
    importDoc.metadata = { period: [dto.periodStart, dto.periodEnd], unmatched };
    await importDoc.save();

    this.logger.log(
      `Bank statement import ${importDoc._id} processed: ${matched} matched, ${unmatched.length} pending`,
    );

    return {
      statementImport: importDoc,
      unmatched,
    };
  }

  async manualReconcile(dto: ManualReconcileDto, tenantId: string) {
    const transaction = await this.transactionModel.findOne({
      _id: new Types.ObjectId(dto.transactionId),
      tenantId: new Types.ObjectId(tenantId),
    });

    if (!transaction) {
      throw new NotFoundException('Transacción no encontrada');
    }

    transaction.reconciled = true;
    transaction.reconciledAt = new Date();
    transaction.metadata = {
      ...transaction.metadata,
      bankAmount: dto.bankAmount,
      bankReference: dto.bankReference,
      bankDate: dto.bankDate,
    };

    await transaction.save();
    return transaction;
  }

  async findStatementDetails(statementId: string, tenantId: string) {
    const statement = await this.statementModel
      .findOne({
        _id: new Types.ObjectId(statementId),
        tenantId: new Types.ObjectId(tenantId),
      })
      .lean();

    if (!statement) {
      throw new NotFoundException('Importación no encontrada');
    }

    const transactions = await this.transactionModel
      .find({ statementImportId: statement._id })
      .lean();

    return { statement, transactions };
  }
}
```

**Commit**:
```bash
git add src/modules/bank-accounts/bank-reconciliation.service.ts
git commit -m "feat(bank): implement reconciliation service with auto matching"
```

#### Paso 2.2.5: Backend - Utilidad de parsing (20 min)

**Archivo**: `food-inventory-saas/src/utils/bank-statement.parser.ts`

```typescript
import { parse } from 'csv-parse/sync';
import XLSX from 'xlsx';

interface StatementRow {
  transactionDate: Date;
  amount: number;
  description: string;
  reference?: string;
}

export async function parseBankStatement(file: Express.Multer.File): Promise<StatementRow[]> {
  if (file.mimetype.includes('csv')) {
    const rows = parse(file.buffer.toString('utf8'), {
      columns: true,
      skip_empty_lines: true,
      trim: true,
    });

    return rows.map((row: any) => ({
      transactionDate: new Date(row['fecha']),
      amount: Number(row['monto']),
      description: row['descripcion'],
      reference: row['referencia'] || undefined,
    }));
  }

  const workbook = XLSX.read(file.buffer, { type: 'buffer' });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(sheet);

  return rows.map((row: any) => ({
    transactionDate: new Date(row['Fecha']),
    amount: Number(row['Monto']),
    description: row['Descripción'],
    reference: row['Referencia'] || undefined,
  }));
}
```

**Commit**:
```bash
git add src/utils/bank-statement.parser.ts
git commit -m "feat(bank): add parser utility for bank statements"
```

#### Paso 2.2.6: Backend - Controlador de conciliación (30 min)

**Archivo**: `food-inventory-saas/src/modules/bank-accounts/bank-reconciliation.controller.ts`

```typescript
import {
  Controller,
  Get,
  Post,
  Body,
  UseInterceptors,
  UploadedFile,
  Request,
  Param,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Permissions } from '../../decorators/permissions.decorator';
import {
  ImportBankStatementDto,
  ManualReconcileDto,
} from '../../dto/bank-reconciliation.dto';
import { BankReconciliationService } from './bank-reconciliation.service';

@Controller('bank-reconciliation')
export class BankReconciliationController {
  constructor(private readonly reconciliationService: BankReconciliationService) {}

  @Post('import')
  @Permissions('accounting_write')
  @UseInterceptors(FileInterceptor('file'))
  async importStatement(
    @Body() dto: ImportBankStatementDto,
    @UploadedFile() file: Express.Multer.File,
    @Request() req,
  ) {
    return this.reconciliationService.importStatement(dto, file, req.user.tenantId);
  }

  @Post('manual')
  @Permissions('accounting_write')
  async manualReconcile(@Body() dto: ManualReconcileDto, @Request() req) {
    return this.reconciliationService.manualReconcile(dto, req.user.tenantId);
  }

  @Get('statement/:statementId')
  @Permissions('accounting_read')
  async getStatement(@Param('statementId') statementId: string, @Request() req) {
    return this.reconciliationService.findStatementDetails(statementId, req.user.tenantId);
  }
}
```

**Commit**:
```bash
git add src/modules/bank-accounts/bank-reconciliation.controller.ts
git commit -m "feat(bank): expose reconciliation endpoints"
```

#### Paso 2.2.7: Backend - Actualizar módulo (10 min)

**Archivo**: `food-inventory-saas/src/modules/bank-accounts/bank-accounts.module.ts`

```typescript
import { BankStatementImport, BankStatementImportSchema } from '../../schemas/bank-statement-import.schema';
import { BankReconciliationService } from './bank-reconciliation.service';
import { BankReconciliationController } from './bank-reconciliation.controller';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: BankAccount.name, schema: BankAccountSchema },
      { name: BankTransaction.name, schema: BankTransactionSchema },
      { name: BankStatementImport.name, schema: BankStatementImportSchema }, // ← AGREGAR
      { name: Tenant.name, schema: TenantSchema },
    ]),
    AuthModule,
    PermissionsModule,
  ],
  controllers: [
    BankAccountsController,
    BankTransactionsController,
    BankReconciliationController, // ← AGREGAR
  ],
  providers: [
    BankAccountsService,
    BankTransactionsService,
    BankReconciliationService, // ← AGREGAR
  ],
  exports: [
    BankAccountsService,
    BankTransactionsService,
    BankReconciliationService, // ← AGREGAR
  ],
})
```

**Commit**:
```bash
git add src/modules/bank-accounts/bank-accounts.module.ts
git commit -m "feat(bank): register reconciliation service and controller"
```

#### Paso 2.2.8: Frontend - Hook y cliente API (20 min)

**Archivo**: `food-inventory-admin/src/hooks/use-bank-reconciliation.js`

```javascript
import { useState } from 'react';
import { fetchApi } from '@/lib/api';
import { toast } from 'sonner';

export function useBankReconciliation(accountId) {
  const [isUploading, setUploading] = useState(false);
  const [pending, setPending] = useState([]);

  const importStatement = async (formData) => {
    setUploading(true);
    try {
      const response = await fetchApi('/bank-reconciliation/import', {
        method: 'POST',
        body: formData,
      });

      setPending(response.unmatched);
      toast.success('Estado de cuenta importado correctamente');
      return response;
    } catch (error) {
      toast.error('Error al importar estado de cuenta', { description: error.message });
      throw error;
    } finally {
      setUploading(false);
    }
  };

  const manualReconcile = async (payload) => {
    try {
      await fetchApi('/bank-reconciliation/manual', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      toast.success('Transacción conciliada manualmente');
      setPending((current) => current.filter((item) => item.reference !== payload.bankReference));
    } catch (error) {
      toast.error('Error al conciliar manualmente', { description: error.message });
    }
  };

  return { isUploading, pending, importStatement, manualReconcile };
}
```

**Commit**:
```bash
git add src/hooks/use-bank-reconciliation.js
git commit -m "feat(bank): add reconciliation hook for frontend"
```

#### Paso 2.2.9: Frontend - Vista de conciliación (90 min)

**Archivo**: `food-inventory-admin/src/components/BankReconciliationView.jsx`

```jsx
import { useState, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { UploadCloud, CheckCircle } from 'lucide-react';
import { useBankReconciliation } from '@/hooks/use-bank-reconciliation';

export function BankReconciliationView() {
  const { accountId } = useParams();
  const { isUploading, pending, importStatement, manualReconcile } = useBankReconciliation(accountId);
  const [file, setFile] = useState(null);

  const totals = useMemo(() => {
    const total = pending.reduce(
      (acc, txn) => {
        if (txn.amount >= 0) {
          acc.deposits += txn.amount;
        } else {
          acc.withdrawals += Math.abs(txn.amount);
        }
        return acc;
      },
      { deposits: 0, withdrawals: 0 },
    );
    total.net = total.deposits - total.withdrawals;
    return total;
  }, [pending]);

  const handleImport = async () => {
    if (!file) return;
    const formData = new FormData();
    formData.append('file', file);
    formData.append('bankAccountId', accountId);
    formData.append('periodStart', new Date().toISOString());
    formData.append('periodEnd', new Date().toISOString());
    formData.append('format', file.name.endsWith('.csv') ? 'csv' : 'xlsx');
    await importStatement(formData);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <CardTitle className="text-2xl">Conciliación bancaria</CardTitle>
            <p className="text-sm text-muted-foreground">
              Importa tu estado de cuenta y empata movimientos con el sistema.
            </p>
          </div>
          <div className="flex gap-2 items-center">
            <Input
              type="file"
              accept=".csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
              onChange={(event) => setFile(event.target.files?.[0] ?? null)}
            />
            <Button onClick={handleImport} disabled={!file || isUploading}>
              <UploadCloud className="h-4 w-4 mr-2" />
              {isUploading ? 'Importando...' : 'Importar'}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-3">
          <div className="border rounded-lg p-4">
            <p className="text-muted-foreground text-sm">Depósitos pendientes</p>
            <p className="text-2xl font-semibold text-green-600">
              {totals.deposits.toLocaleString('es-VE', { style: 'currency', currency: 'USD' })}
            </p>
          </div>
          <div className="border rounded-lg p-4">
            <p className="text-muted-foreground text-sm">Retiros pendientes</p>
            <p className="text-2xl font-semibold text-red-600">
              {totals.withdrawals.toLocaleString('es-VE', { style: 'currency', currency: 'USD' })}
            </p>
          </div>
          <div className="border rounded-lg p-4">
            <p className="text-muted-foreground text-sm">Impacto neto</p>
            <p className="text-2xl font-semibold">
              {totals.net.toLocaleString('es-VE', { style: 'currency', currency: 'USD' })}
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Movimientos por conciliar</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Fecha banco</TableHead>
                <TableHead>Monto</TableHead>
                <TableHead>Descripción</TableHead>
                <TableHead>Referencia</TableHead>
                <TableHead>Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pending.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground">
                    ¡Todo conciliado! 🎉
                  </TableCell>
                </TableRow>
              )}
              {pending.map((txn) => (
                <TableRow key={`${txn.reference}-${txn.transactionDate}`}>
                  <TableCell>{new Date(txn.transactionDate).toLocaleDateString()}</TableCell>
                  <TableCell>
                    <Badge variant={txn.amount >= 0 ? 'success' : 'destructive'}>
                      {txn.amount.toLocaleString('es-VE', {
                        style: 'currency',
                        currency: 'USD',
                      })}
                    </Badge>
                  </TableCell>
                  <TableCell>{txn.description}</TableCell>
                  <TableCell>{txn.reference || '-'}</TableCell>
                  <TableCell>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() =>
                        manualReconcile({
                          transactionId: txn.transactionId,
                          bankAmount: txn.amount,
                          bankDate: txn.transactionDate,
                          bankReference: txn.reference,
                        })
                      }
                    >
                      <CheckCircle className="h-4 w-4 mr-1" />
                      Conciliar
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
```

**Commit**:
```bash
git add src/components/BankReconciliationView.jsx
git commit -m "feat(bank): add reconciliation management view"
```

#### Paso 2.2.10: Frontend - Integrar navegación (15 min)

**Archivo**: `food-inventory-admin/src/components/BankAccountsManagement.jsx`

```jsx
// Agregar botón/acción
<Button variant="outline" onClick={() => navigate(`/bank-accounts/${account._id}/reconciliation`)}>
  Conciliar
</Button>

// Nueva ruta
<Route path="/bank-accounts/:accountId/reconciliation" element={<BankReconciliationView />} />
```

**Commit**:
```bash
git add src/components/BankAccountsManagement.jsx src/App.jsx
git commit -m "feat(bank): wire reconciliation view into routing"
```

#### Paso 2.2.11: Testing (45 min)

Crear checklist manual:

```markdown
# CHECKLIST FASE 2.2: Conciliación Bancaria

## Prerequisitos
- [ ] Feature flag activo: `ENABLE_BANK_RECONCILIATION=true`
- [ ] Backend y Frontend corriendo
- [ ] Movimientos creados en el sistema
- [ ] Archivo CSV/XLSX de banco con datos de prueba

## Escenario 1: Importación exitosa
- [ ] Subir estado de cuenta con filas válidas
- [ ] Confirmar conteo de filas coincidentes
- [ ] Validar que transacciones conciliadas pasan a `reconciled=true`
- [ ] Verificar que se muestra resumen de pendientes

## Escenario 2: Detección de discrepancias
- [ ] Subir archivo con montos que no existen en el sistema
- [ ] Confirmar que aparecen en la tabla de pendientes
- [ ] Verificar que las cifras de totales coinciden

## Escenario 3: Conciliación manual
- [ ] Seleccionar un pendiente y usar botón "Conciliar"
- [ ] Confirmar que desaparece de la tabla
- [ ] Revisar en backend que la transacción quedó marcada como reconciliada

## Escenario 4: Validaciones y errores
- [ ] Intentar importar archivo vacío → mostrar error
- [ ] Intentar importar formato inválido → bloquear
- [ ] Revisar logs: sin errores críticos
```

**Commit**:
```bash
git add test/checklists/fase-2.2-bank-reconciliation-completed.md
git commit -m "docs(test): complete reconciliation testing checklist"
```

### Validación Fase 2.2:

- [ ] Backend compila (`npm run build` en `food-inventory-saas`)
- [ ] Frontend compila (`npm run build` en `food-inventory-admin`)
- [ ] Tests unitarios y de integración relevantes pasan
- [ ] Checklist manual completado 100%
- [ ] Importaciones pesadas (10k filas) se procesan < 10s
- [ ] Logs sin errores severos durante la importación

### Merge y Tag:

```bash
git checkout development/mejoras-2025
git merge fase-2.2/bank-reconciliation
git tag -a v2.2.0-fase2.2 -m "Phase 2.2: Bank Reconciliation"
git push origin v2.2.0-fase2.2
```

### Resultado Esperado:

```
✅ Estados de cuenta pueden importarse en CSV/XLSX
✅ Coincidencias se marcan automáticamente como reconciliadas
✅ Discrepancias quedan visibles para acción manual
✅ Conciliación manual rápida desde la UI
✅ Métricas claras sobre el progreso de la conciliación
```

---

### 🔹 FASE 2.3: TRANSFERENCIAS Y ALERTAS

**Duración**: 3-4 horas
**Feature Flag**: `ENABLE_BANK_TRANSFERS`

#### Resumen de Implementación:

1. **Backend - Service de Transferencias** (60 min)
   - Validar saldos
   - Crear 2 transacciones (salida + entrada)
   - Transacciones atómicas (rollback si falla)

2. **Backend - Service de Alertas** (45 min)
   - Verificar saldo mínimo
   - Enviar notificaciones

3. **Frontend - Diálogo de Transferencia** (90 min)
   - Selector de cuentas origen/destino
   - Validación de saldo disponible
   - Confirmación con preview

4. **Frontend - Sistema de Alertas** (30 min)
   - Badges de alerta en cuentas con saldo bajo
   - Notificaciones en Dashboard

5. **Testing** (45 min)
   - Probar transferencias exitosas
   - Probar validaciones (saldo insuficiente)
   - Verificar alertas se disparan

---

## 📊 FASE 3: DASHBOARD Y REPORTES CON GRÁFICAS

**Objetivo**: Visualización de datos con gráficas interactivas
**Duración**: 8-10 horas
**Riesgo**: Bajo (solo frontend, no modifica datos)
**Reversibilidad**: Alta (feature flag)

**Estado actual**: ⏳ Pendiente  
- Solo existe la utilería `ChartContainer` (`food-inventory-admin/src/components/ui/chart.jsx`); vistas como `DashboardView.jsx` permanecen basadas en tablas sin gráficas.  
- Endpoints de analytics para tendencias aún no se ubican en backend.  
- Feature flag `VITE_ENABLE_DASHBOARD_CHARTS` se mantiene en `false`.

### Por qué esta fase va tercera:

1. ✅ **Depende de datos de Fases anteriores** (ventas, empleados, cuentas)
2. ✅ **Valor visual inmediato** - cliente ve tendencias
3. ✅ **No modifica backend** - solo consume APIs existentes
4. ✅ **Bajo riesgo** - si falla, se muestra tabla en lugar de gráfica
5. ✅ **Mejora experiencia** sin cambiar funcionalidad

### Checklist Pre-Fase:

```bash
# 1. Backup
./scripts/backup-before-phase.sh

# 2. Rama específica
git checkout -b fase-3/dashboard-charts

# 3. Instalar dependencias
cd food-inventory-admin
npm install recharts

# 4. Activar feature flag
# En .env
VITE_ENABLE_DASHBOARD_CHARTS=true
```

### Sub-Fases:

```
FASE 3.1: Setup de Recharts y Componentes Base (1-2 horas)
   └─> FASE 3.2: Gráficas de Ventas (2-3 horas)
          └─> FASE 3.3: Gráficas de Inventario (2-3 horas)
                 └─> FASE 3.4: Reportes Avanzados (3-4 horas)
```

---

### 🔹 FASE 3.1: SETUP DE RECHARTS

**Duración**: 1-2 horas

#### Paso 3.1.1: Componente de Gráfica Base (30 min)

**Archivo**: `food-inventory-admin/src/components/charts/BaseChart.jsx`

```jsx
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export function ChartCard({ title, description, children, actions }) {
  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <div>
            <CardTitle>{title}</CardTitle>
            {description && (
              <p className="text-sm text-muted-foreground mt-1">{description}</p>
            )}
          </div>
          {actions && <div className="flex gap-2">{actions}</div>}
        </div>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}
```

#### Paso 3.1.2: Hook para Datos de Dashboard (45 min)

**Archivo**: `food-inventory-admin/src/hooks/use-dashboard-charts.js`

```javascript
import { useState, useEffect } from 'react';
import { fetchApi } from '@/lib/api';

export function useDashboardCharts(period = '7d') {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchChartData = async () => {
      setLoading(true);
      try {
        const [sales, topProducts, inventory] = await Promise.all([
          fetchApi(`/analytics/sales-trend?period=${period}`),
          fetchApi(`/analytics/top-products?period=${period}`),
          fetchApi(`/analytics/inventory-status`),
        ]);

        setData({ sales, topProducts, inventory });
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchChartData();
  }, [period]);

  return { data, loading, error };
}
```

---

### 🔹 FASE 3.2: GRÁFICAS DE VENTAS

**Duración**: 2-3 horas

#### Componentes a Crear:

1. **SalesLineChart** - Tendencia de ventas últimos N días
2. **SalesByCategory** - Pie chart de categorías
3. **SalesComparison** - Bar chart comparativo (mes actual vs anterior)

---

### 🔹 FASE 3.3: GRÁFICAS DE INVENTARIO

**Duración**: 2-3 horas

#### Componentes a Crear:

1. **StockLevelsChart** - Estado de inventario (bajo/medio/alto)
2. **InventoryMovement** - Entradas vs Salidas
3. **ProductRotation** - Velocidad de rotación

---

### 🔹 FASE 3.4: REPORTES AVANZADOS

**Duración**: 3-4 horas

#### Implementar:

1. **Profit & Loss** - Estado de resultados con gráfica de evolución
2. **Customer Segmentation** - RFM Analysis con scatter plot
3. **Employee Performance** - Bar chart comparativo

---

## 🎯 FASE 4: FEATURES AVANZADAS Y PREDICTIVAS

**Objetivo**: Análisis predictivo y funcionalidades avanzadas
**Duración**: 10-15 horas
**Riesgo**: Medio-Alto (algoritmos complejos)
**Reversibilidad**: Alta (feature flags)

**Estado actual**: ⏳ Pendiente  
- No hay servicios ni componentes que aborden pronósticos, recomendaciones o CLV.  
- Feature flags `ENABLE_PREDICTIVE_ANALYTICS` y `ENABLE_CUSTOMER_SEGMENTATION` permanecen desactivadas por defecto.

### Por qué esta fase va cuarta:

1. ✅ **Requiere datos históricos** de fases anteriores
2. ✅ **No crítico** - nice to have, no bloqueante
3. ✅ **Más complejo** - mejor con base estable
4. ✅ **Valor agregado** pero no esencial

### Sub-Fases:

```
FASE 4.1: Pronóstico de Ventas (4-5 horas)
   └─> FASE 4.2: Recomendaciones de Compra (4-5 horas)
          └─> FASE 4.3: Customer Lifetime Value (3-4 horas)
```

---

## 🔧 FASE 5: OPTIMIZACIÓN Y PULIDO

**Objetivo**: Performance, UX y estabilidad
**Duración**: 5-8 horas
**Riesgo**: Bajo
**Reversibilidad**: Media

**Estado actual**: ⏳ Pendiente  
- No hay commits relacionados con optimizaciones de rendimiento, skeletons ni auditorías de seguridad recientes.  
- Queda como fase posterior una vez que las funcionalidades principales estén listas.

### Tareas:

1. **Performance Optimization** (2-3 horas)
   - Lazy loading de módulos pesados
   - Memoización de cálculos costosos
   - Optimización de queries de DB
   - Índices adicionales

2. **UX Improvements** (2-3 horas)
   - Loading skeletons
   - Empty states
   - Error boundaries
   - Toasts informativos

3. **Documentation** (1-2 horas)
   - Actualizar README
   - Documentar APIs nuevas
   - Guías de usuario

4. **Security Audit** (1-2 horas)
   - Revisar permisos
   - Validaciones de entrada
   - Rate limiting
   - SQL injection prevention

---

## 📋 CHECKLIST MASTER POR SESIÓN

### Antes de CADA sesión:

```bash
[ ] 1. git status (verificar estado limpio)
[ ] 2. git pull origin development/mejoras-2025
[ ] 3. Revisar última fase completada (tags)
[ ] 4. Leer IMPLEMENTATION-ROADMAP.md
[ ] 5. Decidir qué fase/sub-fase implementar
[ ] 6. Crear rama específica
[ ] 7. ./scripts/backup-before-phase.sh
[ ] 8. Activar feature flags necesarios
[ ] 9. npm install (por si hay nuevas dependencias)
[ ] 10. Verificar backend y frontend corren sin errores
```

### Durante la sesión:

```bash
[ ] Commits pequeños y frecuentes
[ ] Logging adecuado en código nuevo
[ ] Try-catch en operaciones críticas
[ ] Validaciones de datos de entrada
[ ] Tests conforme desarrollas
[ ] Revisar logs periódicamente
```

### Al terminar la sesión:

```bash
[ ] npm test (todos los tests pasan)
[ ] npm run build (backend y frontend)
[ ] Completar checklist de testing manual
[ ] git push origin <rama-actual>
[ ] Si completaste fase: merge + tag
[ ] Actualizar este documento con progreso
[ ] Desactivar feature flags en producción (.env.production)
[ ] Commit de documentación actualizada
```

---

## 🛠️ HERRAMIENTAS Y CONFIGURACIÓN

### Scripts Útiles:

```bash
# package.json (agregar estos scripts)
{
  "scripts": {
    "backup": "./scripts/backup-before-phase.sh",
    "test:phase": "npm test -- --testPathPattern",
    "build:all": "npm run build && cd ../food-inventory-admin && npm run build",
    "check:features": "node -e \"require('./src/config/features.config').logFeatureStatus()\"",
    "migration:run": "npx ts-node scripts/run-migrations.ts"
  }
}
```

### Template de PR (Pull Request):

```markdown
## Fase Implementada
- [ ] Fase X.Y: [Nombre]

## Cambios Principales
- Backend: [Describir]
- Frontend: [Describir]
- Database: [Describir migraciones]

## Feature Flags
- `ENABLE_XXX=false` (desactivado por defecto)

## Testing
- [ ] Tests unitarios pasan (X/Y)
- [ ] Tests E2E pasan
- [ ] Checklist manual completado
- [ ] Performance similar (< Xs respuesta)

## Rollback Plan
Si algo falla:
1. Desactivar feature flag
2. O revertir commit: git revert [hash]
3. O restaurar backup: [path]

## Screenshots
[Adjuntar capturas de pantalla]

## Reviewers
@usuario1 @usuario2
```

---

## 🚨 PLAN DE ROLLBACK

### Niveles de Rollback:

#### Nivel 1: Feature Flag (1 minuto)
```bash
# Desactivar feature sin código
export ENABLE_FEATURE_X=false
pm2 restart food-inventory-api
```

#### Nivel 2: Git Revert (5 minutos)
```bash
git log --oneline
git revert <commit-hash>
git push origin development/mejoras-2025
pm2 restart food-inventory-api
```

#### Nivel 3: Restaurar Backup de Código (10 minutos)
```bash
LAST_BACKUP=$(cat .last-backup)
cp -r $LAST_BACKUP/code/* src/
npm run build
pm2 restart food-inventory-api
```

#### Nivel 4: Restaurar Base de Datos (15-30 minutos)
```bash
LAST_BACKUP=$(cat .last-backup)
mongorestore --drop --uri="$MONGODB_URI" $LAST_BACKUP/db
```

#### Nivel 5: Rollback Completo a Tag (30 minutos)
```bash
git checkout tags/v2.0.0-baseline
npm install
npm run build
mongorestore --drop --uri="$MONGODB_URI" backups/baseline/db
pm2 restart food-inventory-api
```

---

## 📊 MÉTRICAS DE ÉXITO

### Por Fase:

| Fase | Métrica de Éxito | Cómo Medir |
|------|------------------|------------|
| Fase 0 | Setup completo | Todos los checkboxes ✅ |
| Fase 1 | Reporte funcional | Ventas > $0 en reporte |
| Fase 2.1 | Transacciones automáticas | 100% pagos crean transacción |
| Fase 2.2 | Conciliación exitosa | 90% matching automático |
| Fase 2.3 | Transferencias sin errores | 0 transferencias fallidas |
| Fase 3 | Gráficas visuales | 5+ gráficas funcionando |
| Fase 4 | Predicciones precisas | Error < 20% |
| Fase 5 | Performance mejorada | Tiempo respuesta -30% |

### Métricas Globales:

```
✅ Cobertura de tests: > 70%
✅ Tiempo de respuesta: < 2 segundos
✅ Errores en logs: < 5 por día
✅ Uptime: > 99.5%
✅ Satisfacción cliente: feedback positivo
```

---

## 📝 REGISTRO DE PROGRESO

### Template de Sesión:

```markdown
## Sesión [Fecha]

### Fase Trabajada
Fase X.Y: [Nombre]

### Tiempo Invertido
- Planificación: [X] horas
- Implementación: [Y] horas
- Testing: [Z] horas
- Total: [T] horas

### Completado
- [x] Backend
- [x] Frontend
- [ ] Tests (50%)
- [ ] Documentación

### Próximos Pasos
1. Completar tests
2. Merge a development
3. Iniciar Fase X.Y+1

### Problemas Encontrados
- [Describir problema 1]
- [Solución aplicada]

### Notas
- [Aprendizajes]
- [Decisiones importantes]
```

---

## 🎓 CONCLUSIÓN

Este roadmap es tu guía maestra. Cada vez que:

- ✅ **Inicies una sesión**: Lee la fase que sigue
- ✅ **Termines una fase**: Actualiza el registro de progreso
- ✅ **Encuentres problemas**: Documenta en "Problemas Encontrados"
- ✅ **Completes todo**: Celebra 🎉

**Recuerda**:
> "Lento es suave, suave es rápido"
> Es mejor avanzar poco y seguro que rápido y romper todo.

---

**Última actualización**: 2025-01-03
**Versión del documento**: 1.0
**Próxima revisión**: Después de completar Fase 3

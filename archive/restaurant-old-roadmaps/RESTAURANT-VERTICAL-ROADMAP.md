# 🍽️ ROADMAP: VERTICAL DE RESTAURANTES - SMARTKUBIK
## De Sistema Básico a Software Clase Mundial

> **Objetivo**: Convertir smartkubik en el software #1 para restaurantes en LATAM
> **Duración estimada**: 12-16 semanas (3-4 meses)
> **Última actualización**: 2025-01-11

---

## 📋 ÍNDICE

1. [Visión General](#visión-general)
2. [Fase 1: Core POS Avanzado](#fase-1-core-pos-avanzado)
3. [Fase 2: Kitchen Operations](#fase-2-kitchen-operations)
4. [Fase 3: Guest Experience](#fase-3-guest-experience)
5. [Fase 4: Analytics & Optimization](#fase-4-analytics--optimization)
6. [Fase 5: Growth Features](#fase-5-growth-features)
7. [Stack Técnico](#stack-técnico)
8. [Métricas de Éxito](#métricas-de-éxito)

---

## 🎯 VISIÓN GENERAL

### Estado Actual vs Estado Objetivo

| Capacidad | Actual ✅ | Objetivo 🎯 |
|-----------|----------|-------------|
| Gestión de Órdenes | Básico | Avanzado (modifiers, courses, split) |
| Gestión de Mesas | ❌ No existe | Sistema visual completo |
| Kitchen Display | ❌ No existe | KDS en tiempo real |
| Recetas & Costos | ❌ No existe | Costeo automático |
| Reservaciones | ❌ No existe | Sistema completo + CRM |
| Reportes | Básico | Menu engineering + forecasting |
| Online Ordering | ❌ No existe | Sitio + apps |
| Loyalty | ❌ No existe | Programa completo |

### Competencia & Pricing Target

```
Toast POS:        $69/mes + 2.49% + $0.15 por transacción
Square:           $60/mes + 2.6% + $0.10 por transacción
Lightspeed:       $69/mes + hardware
TouchBistro:      $69/mes por terminal

SMARTKUBIK TARGET:
  - Tier Básico:     $49/mes (competitivo en LATAM)
  - Tier Pro:        $89/mes (con KDS + recetas)
  - Tier Enterprise: $149/mes (multi-location + loyalty)
```

---

## 🚀 FASE 1: CORE POS AVANZADO
**Duración**: 2-3 semanas
**Prioridad**: CRÍTICA
**Feature Flag**: `ENABLE_RESTAURANT_POS_V2`

### Objetivo
Transformar el POS básico actual en un sistema profesional que maneje todas las complejidades de un restaurante real.

---

### 📦 MÓDULO 1.1: TABLE MANAGEMENT SYSTEM
**Duración**: 5-7 días
**Complejidad**: Media-Alta

#### Backend (2-3 días)

##### Paso 1: Schema de Tables
**Archivo**: `food-inventory-saas/src/schemas/table.schema.ts`

```typescript
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type TableDocument = Table & Document;

@Schema({ timestamps: true })
export class Table {
  @Prop({ required: true })
  tableNumber: string;

  @Prop({ required: true })
  section: string; // "Main Floor", "Patio", "Bar"

  @Prop()
  floor?: string; // Para multi-piso

  // Layout visual
  @Prop({ type: Object })
  position: {
    x: number;
    y: number;
  };

  @Prop({ enum: ['square', 'round', 'rectangle', 'booth'], default: 'square' })
  shape: string;

  // Capacity
  @Prop({ required: true, min: 1 })
  minCapacity: number;

  @Prop({ required: true, min: 1 })
  maxCapacity: number;

  // Status
  @Prop({
    enum: ['available', 'occupied', 'reserved', 'cleaning', 'out-of-service'],
    default: 'available',
    index: true
  })
  status: string;

  // Current session
  @Prop({ type: Types.ObjectId, ref: 'Order' })
  currentOrderId?: Types.ObjectId;

  @Prop()
  seatedAt?: Date;

  @Prop({ min: 0 })
  guestCount?: number;

  // Assignment
  @Prop({ type: Types.ObjectId, ref: 'User', index: true })
  assignedServerId?: Types.ObjectId;

  // Combining tables
  @Prop({ type: [Types.ObjectId], ref: 'Table' })
  combinesWith?: Types.ObjectId[];

  @Prop({ type: Types.ObjectId })
  combinedWithParent?: Types.ObjectId; // Si está combinada con otra

  // Settings
  @Prop({ default: true })
  isActive: boolean;

  @Prop()
  notes?: string;

  @Prop({ type: Types.ObjectId, ref: 'Tenant', required: true, index: true })
  tenantId: Types.ObjectId;
}

export const TableSchema = SchemaFactory.createForClass(Table);

// Índices
TableSchema.index({ tenantId: 1, status: 1 });
TableSchema.index({ tenantId: 1, section: 1 });
TableSchema.index({ tenantId: 1, assignedServerId: 1 });
```

##### Paso 2: DTOs
**Archivo**: `food-inventory-saas/src/dto/table.dto.ts`

```typescript
import { IsString, IsNumber, IsEnum, IsOptional, Min, IsBoolean, IsMongoId, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

class PositionDto {
  @IsNumber()
  x: number;

  @IsNumber()
  y: number;
}

export class CreateTableDto {
  @IsString()
  tableNumber: string;

  @IsString()
  section: string;

  @IsOptional()
  @IsString()
  floor?: string;

  @ValidateNested()
  @Type(() => PositionDto)
  position: PositionDto;

  @IsEnum(['square', 'round', 'rectangle', 'booth'])
  shape: string;

  @IsNumber()
  @Min(1)
  minCapacity: number;

  @IsNumber()
  @Min(1)
  maxCapacity: number;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class UpdateTableDto {
  @IsOptional()
  @IsString()
  tableNumber?: string;

  @IsOptional()
  @IsString()
  section?: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => PositionDto)
  position?: PositionDto;

  @IsOptional()
  @IsEnum(['square', 'round', 'rectangle', 'booth'])
  shape?: string;

  @IsOptional()
  @IsNumber()
  minCapacity?: number;

  @IsOptional()
  @IsNumber()
  maxCapacity?: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class SeatGuestsDto {
  @IsMongoId()
  tableId: string;

  @IsNumber()
  @Min(1)
  guestCount: number;

  @IsOptional()
  @IsMongoId()
  serverId?: string;

  @IsOptional()
  @IsMongoId()
  reservationId?: string;
}

export class TransferTableDto {
  @IsMongoId()
  fromTableId: string;

  @IsMongoId()
  toTableId: string;
}

export class CombineTablesDto {
  @IsArray()
  @IsMongoId({ each: true })
  tableIds: string[];

  @IsMongoId()
  parentTableId: string; // Mesa principal
}
```

##### Paso 3: Service
**Archivo**: `food-inventory-saas/src/modules/tables/tables.service.ts`

```typescript
import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Table, TableDocument } from '../../schemas/table.schema';
import { CreateTableDto, UpdateTableDto, SeatGuestsDto, TransferTableDto, CombineTablesDto } from '../../dto/table.dto';

@Injectable()
export class TablesService {
  private readonly logger = new Logger(TablesService.name);

  constructor(
    @InjectModel(Table.name)
    private tableModel: Model<TableDocument>,
  ) {}

  async create(dto: CreateTableDto, tenantId: string): Promise<Table> {
    // Verificar que no exista mesa con mismo número en misma sección
    const existing = await this.tableModel.findOne({
      tenantId: new Types.ObjectId(tenantId),
      tableNumber: dto.tableNumber,
      section: dto.section,
    });

    if (existing) {
      throw new BadRequestException(
        `Table ${dto.tableNumber} already exists in section ${dto.section}`
      );
    }

    const table = new this.tableModel({
      ...dto,
      tenantId: new Types.ObjectId(tenantId),
      status: 'available',
    });

    return table.save();
  }

  async findAll(tenantId: string): Promise<Table[]> {
    return this.tableModel
      .find({ tenantId: new Types.ObjectId(tenantId), isActive: true })
      .populate('assignedServerId', 'firstName lastName')
      .populate('currentOrderId')
      .sort({ section: 1, tableNumber: 1 })
      .exec();
  }

  async findBySection(tenantId: string, section: string): Promise<Table[]> {
    return this.tableModel
      .find({
        tenantId: new Types.ObjectId(tenantId),
        section,
        isActive: true
      })
      .populate('assignedServerId', 'firstName lastName')
      .populate('currentOrderId')
      .sort({ tableNumber: 1 })
      .exec();
  }

  async findAvailable(tenantId: string): Promise<Table[]> {
    return this.tableModel
      .find({
        tenantId: new Types.ObjectId(tenantId),
        status: 'available',
        isActive: true,
      })
      .sort({ section: 1, tableNumber: 1 })
      .exec();
  }

  async seatGuests(dto: SeatGuestsDto, tenantId: string): Promise<Table> {
    const table = await this.tableModel
      .findOne({ _id: dto.tableId, tenantId: new Types.ObjectId(tenantId) })
      .exec();

    if (!table) {
      throw new NotFoundException('Table not found');
    }

    if (table.status !== 'available' && table.status !== 'reserved') {
      throw new BadRequestException(`Table is ${table.status}, cannot seat guests`);
    }

    if (dto.guestCount > table.maxCapacity) {
      throw new BadRequestException(
        `Guest count (${dto.guestCount}) exceeds table capacity (${table.maxCapacity})`
      );
    }

    table.status = 'occupied';
    table.guestCount = dto.guestCount;
    table.seatedAt = new Date();

    if (dto.serverId) {
      table.assignedServerId = new Types.ObjectId(dto.serverId);
    }

    await table.save();

    this.logger.log(`Table ${table.tableNumber} seated with ${dto.guestCount} guests`);

    return table;
  }

  async clearTable(tableId: string, tenantId: string): Promise<Table> {
    const table = await this.tableModel
      .findOne({ _id: tableId, tenantId: new Types.ObjectId(tenantId) })
      .exec();

    if (!table) {
      throw new NotFoundException('Table not found');
    }

    const duration = table.seatedAt
      ? Math.round((Date.now() - table.seatedAt.getTime()) / 60000)
      : 0;

    this.logger.log(
      `Table ${table.tableNumber} cleared after ${duration} minutes`
    );

    table.status = 'cleaning';
    table.currentOrderId = undefined;
    table.guestCount = undefined;
    table.seatedAt = undefined;

    await table.save();

    // Auto-marcar como disponible después de 5 minutos
    setTimeout(async () => {
      const t = await this.tableModel.findById(tableId);
      if (t && t.status === 'cleaning') {
        t.status = 'available';
        await t.save();
        this.logger.log(`Table ${t.tableNumber} automatically marked as available`);
      }
    }, 5 * 60 * 1000);

    return table;
  }

  async transferTable(dto: TransferTableDto, tenantId: string): Promise<void> {
    const [fromTable, toTable] = await Promise.all([
      this.tableModel.findOne({ _id: dto.fromTableId, tenantId: new Types.ObjectId(tenantId) }),
      this.tableModel.findOne({ _id: dto.toTableId, tenantId: new Types.ObjectId(tenantId) }),
    ]);

    if (!fromTable || !toTable) {
      throw new NotFoundException('Table not found');
    }

    if (fromTable.status !== 'occupied') {
      throw new BadRequestException('Source table is not occupied');
    }

    if (toTable.status !== 'available') {
      throw new BadRequestException('Destination table is not available');
    }

    // Transfer data
    toTable.status = 'occupied';
    toTable.currentOrderId = fromTable.currentOrderId;
    toTable.guestCount = fromTable.guestCount;
    toTable.seatedAt = fromTable.seatedAt;
    toTable.assignedServerId = fromTable.assignedServerId;

    // Clear source
    fromTable.status = 'available';
    fromTable.currentOrderId = undefined;
    fromTable.guestCount = undefined;
    fromTable.seatedAt = undefined;

    await Promise.all([fromTable.save(), toTable.save()]);

    this.logger.log(`Transferred table ${fromTable.tableNumber} to ${toTable.tableNumber}`);
  }

  async combineTables(dto: CombineTablesDto, tenantId: string): Promise<Table[]> {
    const tables = await this.tableModel.find({
      _id: { $in: dto.tableIds.map(id => new Types.ObjectId(id)) },
      tenantId: new Types.ObjectId(tenantId),
    });

    if (tables.length !== dto.tableIds.length) {
      throw new NotFoundException('One or more tables not found');
    }

    const parentTable = tables.find(t => t._id.toString() === dto.parentTableId);
    if (!parentTable) {
      throw new BadRequestException('Parent table must be in the list');
    }

    // Marcar todas como combinadas
    for (const table of tables) {
      if (table._id.toString() === dto.parentTableId) {
        table.combinesWith = dto.tableIds
          .filter(id => id !== dto.parentTableId)
          .map(id => new Types.ObjectId(id));
      } else {
        table.combinedWithParent = new Types.ObjectId(dto.parentTableId);
        table.status = 'occupied'; // Se marcan como ocupadas
      }
      await table.save();
    }

    this.logger.log(`Combined ${dto.tableIds.length} tables under ${parentTable.tableNumber}`);

    return tables;
  }

  async getFloorPlan(tenantId: string) {
    const tables = await this.findAll(tenantId);

    // Agrupar por sección
    const sections = tables.reduce((acc, table) => {
      if (!acc[table.section]) {
        acc[table.section] = [];
      }
      acc[table.section].push(table);
      return acc;
    }, {});

    // Stats
    const stats = {
      total: tables.length,
      available: tables.filter(t => t.status === 'available').length,
      occupied: tables.filter(t => t.status === 'occupied').length,
      reserved: tables.filter(t => t.status === 'reserved').length,
      cleaning: tables.filter(t => t.status === 'cleaning').length,
      outOfService: tables.filter(t => t.status === 'out-of-service').length,
      totalSeatedGuests: tables.reduce((sum, t) => sum + (t.guestCount || 0), 0),
    };

    return {
      sections,
      stats,
    };
  }

  async getTableTurnoverMetrics(tenantId: string, days = 7) {
    // TODO: Calcular métricas de rotación de mesas
    // - Promedio de tiempo por mesa
    // - Mesas por hora
    // - RevPASH (Revenue per available seat hour)
    return {
      averageTurnTime: 0,
      tablesPerHour: 0,
      revPASH: 0,
    };
  }

  async update(tableId: string, dto: UpdateTableDto, tenantId: string): Promise<Table> {
    const table = await this.tableModel
      .findOneAndUpdate(
        { _id: tableId, tenantId: new Types.ObjectId(tenantId) },
        dto,
        { new: true }
      )
      .exec();

    if (!table) {
      throw new NotFoundException('Table not found');
    }

    return table;
  }

  async delete(tableId: string, tenantId: string): Promise<void> {
    const table = await this.tableModel
      .findOne({ _id: tableId, tenantId: new Types.ObjectId(tenantId) })
      .exec();

    if (!table) {
      throw new NotFoundException('Table not found');
    }

    if (table.status === 'occupied') {
      throw new BadRequestException('Cannot delete occupied table');
    }

    table.isActive = false;
    await table.save();

    this.logger.log(`Table ${table.tableNumber} soft deleted`);
  }
}
```

##### Paso 4: Controller
**Archivo**: `food-inventory-saas/src/modules/tables/tables.controller.ts`

```typescript
import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { TablesService } from './tables.service';
import {
  CreateTableDto,
  UpdateTableDto,
  SeatGuestsDto,
  TransferTableDto,
  CombineTablesDto,
} from '../../dto/table.dto';
import { JwtAuthGuard } from '../../guards/jwt-auth.guard';
import { TenantGuard } from '../../guards/tenant.guard';
import { PermissionsGuard } from '../../guards/permissions.guard';
import { Permissions } from '../../decorators/permissions.decorator';

@Controller('tables')
@UseGuards(JwtAuthGuard, TenantGuard, PermissionsGuard)
export class TablesController {
  constructor(private readonly tablesService: TablesService) {}

  @Post()
  @Permissions('restaurant_write')
  async create(@Body() dto: CreateTableDto, @Request() req) {
    return this.tablesService.create(dto, req.user.tenantId);
  }

  @Get()
  @Permissions('restaurant_read')
  async findAll(@Request() req) {
    return this.tablesService.findAll(req.user.tenantId);
  }

  @Get('section/:section')
  @Permissions('restaurant_read')
  async findBySection(@Param('section') section: string, @Request() req) {
    return this.tablesService.findBySection(req.user.tenantId, section);
  }

  @Get('available')
  @Permissions('restaurant_read')
  async findAvailable(@Request() req) {
    return this.tablesService.findAvailable(req.user.tenantId);
  }

  @Get('floor-plan')
  @Permissions('restaurant_read')
  async getFloorPlan(@Request() req) {
    return this.tablesService.getFloorPlan(req.user.tenantId);
  }

  @Post('seat-guests')
  @Permissions('restaurant_write')
  async seatGuests(@Body() dto: SeatGuestsDto, @Request() req) {
    return this.tablesService.seatGuests(dto, req.user.tenantId);
  }

  @Post(':id/clear')
  @Permissions('restaurant_write')
  async clearTable(@Param('id') id: string, @Request() req) {
    return this.tablesService.clearTable(id, req.user.tenantId);
  }

  @Post('transfer')
  @Permissions('restaurant_write')
  async transferTable(@Body() dto: TransferTableDto, @Request() req) {
    return this.tablesService.transferTable(dto, req.user.tenantId);
  }

  @Post('combine')
  @Permissions('restaurant_write')
  async combineTables(@Body() dto: CombineTablesDto, @Request() req) {
    return this.tablesService.combineTables(dto, req.user.tenantId);
  }

  @Put(':id')
  @Permissions('restaurant_write')
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateTableDto,
    @Request() req,
  ) {
    return this.tablesService.update(id, dto, req.user.tenantId);
  }

  @Delete(':id')
  @Permissions('restaurant_write')
  async delete(@Param('id') id: string, @Request() req) {
    return this.tablesService.delete(id, req.user.tenantId);
  }
}
```

##### Paso 5: Module
**Archivo**: `food-inventory-saas/src/modules/tables/tables.module.ts`

```typescript
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { TablesController } from './tables.controller';
import { TablesService } from './tables.service';
import { Table, TableSchema } from '../../schemas/table.schema';
import { Tenant, TenantSchema } from '../../schemas/tenant.schema';
import { AuthModule } from '../auth/auth.module';
import { PermissionsModule } from '../permissions/permissions.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Table.name, schema: TableSchema },
      { name: Tenant.name, schema: TenantSchema },
    ]),
    AuthModule,
    PermissionsModule,
  ],
  controllers: [TablesController],
  providers: [TablesService],
  exports: [TablesService],
})
export class TablesModule {}
```

##### Paso 6: Registrar en App Module
**Archivo**: `food-inventory-saas/src/app.module.ts`

```typescript
// Agregar import
import { TablesModule } from './modules/tables/tables.module';

@Module({
  imports: [
    // ... existing modules
    TablesModule,  // ← AGREGAR
  ],
})
```

**Commits backend:**
```bash
git add src/schemas/table.schema.ts
git commit -m "feat(restaurant): add table schema with layout and status management"

git add src/dto/table.dto.ts
git commit -m "feat(restaurant): add table DTOs for CRUD and operations"

git add src/modules/tables/
git commit -m "feat(restaurant): implement tables service with seat/clear/transfer/combine"

git add src/app.module.ts
git commit -m "feat(restaurant): register tables module in app"
```

---

#### Frontend (3-4 días)

##### Paso 1: Floor Plan Visual Component
**Archivo**: `food-inventory-admin/src/components/restaurant/FloorPlan.jsx`

```jsx
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { fetchApi } from '@/lib/api';
import { toast } from 'sonner';
import { Users, Clock, Utensils } from 'lucide-react';

export function FloorPlan() {
  const [floorPlan, setFloorPlan] = useState(null);
  const [selectedTable, setSelectedTable] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchFloorPlan = async () => {
    try {
      const data = await fetchApi('/tables/floor-plan');
      setFloorPlan(data);
    } catch (error) {
      toast.error('Error al cargar mesas', { description: error.message });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFloorPlan();
    // Refresh cada 30 segundos
    const interval = setInterval(fetchFloorPlan, 30000);
    return () => clearInterval(interval);
  }, []);

  const getStatusColor = (status) => {
    const colors = {
      available: 'bg-green-500',
      occupied: 'bg-red-500',
      reserved: 'bg-blue-500',
      cleaning: 'bg-yellow-500',
      'out-of-service': 'bg-gray-500',
    };
    return colors[status] || 'bg-gray-300';
  };

  const getStatusText = (status) => {
    const texts = {
      available: 'Disponible',
      occupied: 'Ocupada',
      reserved: 'Reservada',
      cleaning: 'Limpiando',
      'out-of-service': 'Fuera de servicio',
    };
    return texts[status] || status;
  };

  const getTableIcon = (shape) => {
    // Aquí se pueden usar SVGs diferentes según la forma
    return '🍽️';
  };

  const getSeatedTime = (seatedAt) => {
    if (!seatedAt) return null;
    const minutes = Math.floor((Date.now() - new Date(seatedAt).getTime()) / 60000);
    return minutes;
  };

  const handleSeatGuests = async (tableId) => {
    // TODO: Abrir modal para sentar invitados
    console.log('Seat guests on table:', tableId);
  };

  const handleClearTable = async (tableId) => {
    try {
      await fetchApi(`/tables/${tableId}/clear`, { method: 'POST' });
      toast.success('Mesa liberada correctamente');
      fetchFloorPlan();
    } catch (error) {
      toast.error('Error al liberar mesa', { description: error.message });
    }
  };

  if (loading) {
    return <div className="flex justify-center p-8">Cargando mesas...</div>;
  }

  if (!floorPlan) {
    return <div>No se pudo cargar el floor plan</div>;
  }

  return (
    <div className="space-y-6">
      {/* Stats Header */}
      <Card>
        <CardHeader>
          <CardTitle>Estado del Restaurante</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
            <div className="text-center p-3 border rounded-lg">
              <p className="text-2xl font-bold">{floorPlan.stats.total}</p>
              <p className="text-sm text-muted-foreground">Total Mesas</p>
            </div>
            <div className="text-center p-3 border rounded-lg bg-green-50">
              <p className="text-2xl font-bold text-green-600">
                {floorPlan.stats.available}
              </p>
              <p className="text-sm text-muted-foreground">Disponibles</p>
            </div>
            <div className="text-center p-3 border rounded-lg bg-red-50">
              <p className="text-2xl font-bold text-red-600">
                {floorPlan.stats.occupied}
              </p>
              <p className="text-sm text-muted-foreground">Ocupadas</p>
            </div>
            <div className="text-center p-3 border rounded-lg bg-blue-50">
              <p className="text-2xl font-bold text-blue-600">
                {floorPlan.stats.reserved}
              </p>
              <p className="text-sm text-muted-foreground">Reservadas</p>
            </div>
            <div className="text-center p-3 border rounded-lg bg-yellow-50">
              <p className="text-2xl font-bold text-yellow-600">
                {floorPlan.stats.cleaning}
              </p>
              <p className="text-sm text-muted-foreground">Limpiando</p>
            </div>
            <div className="text-center p-3 border rounded-lg">
              <p className="text-2xl font-bold">{floorPlan.stats.totalSeatedGuests}</p>
              <p className="text-sm text-muted-foreground">Comensales</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Sections */}
      {Object.entries(floorPlan.sections).map(([sectionName, tables]) => (
        <Card key={sectionName}>
          <CardHeader>
            <CardTitle>{sectionName}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {tables.map((table) => {
                const seatedMinutes = getSeatedTime(table.seatedAt);

                return (
                  <div
                    key={table._id}
                    className={`
                      relative p-4 border-2 rounded-lg cursor-pointer transition-all
                      hover:shadow-lg
                      ${selectedTable?._id === table._id ? 'ring-2 ring-blue-500' : ''}
                    `}
                    onClick={() => setSelectedTable(table)}
                  >
                    {/* Status indicator */}
                    <div className="absolute top-2 right-2">
                      <div className={`w-3 h-3 rounded-full ${getStatusColor(table.status)}`} />
                    </div>

                    {/* Table info */}
                    <div className="text-center space-y-2">
                      <div className="text-3xl">{getTableIcon(table.shape)}</div>
                      <div className="font-bold text-lg">Mesa {table.tableNumber}</div>

                      <Badge variant="outline" className="text-xs">
                        {getStatusText(table.status)}
                      </Badge>

                      {table.guestCount && (
                        <div className="flex items-center justify-center gap-1 text-sm">
                          <Users className="h-3 w-3" />
                          <span>{table.guestCount} personas</span>
                        </div>
                      )}

                      {seatedMinutes !== null && (
                        <div className="flex items-center justify-center gap-1 text-sm">
                          <Clock className="h-3 w-3" />
                          <span
                            className={
                              seatedMinutes > 90
                                ? 'text-red-600 font-bold'
                                : seatedMinutes > 60
                                ? 'text-yellow-600'
                                : ''
                            }
                          >
                            {seatedMinutes} min
                          </span>
                        </div>
                      )}

                      {table.assignedServerId && (
                        <div className="text-xs text-muted-foreground">
                          {table.assignedServerId.firstName}
                        </div>
                      )}

                      {/* Actions */}
                      <div className="pt-2 space-y-1">
                        {table.status === 'available' && (
                          <Button
                            size="sm"
                            className="w-full"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleSeatGuests(table._id);
                            }}
                          >
                            Sentar
                          </Button>
                        )}
                        {table.status === 'occupied' && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="w-full"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleClearTable(table._id);
                            }}
                          >
                            Liberar
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      ))}

      {/* Selected Table Details Sidebar */}
      {selectedTable && (
        <Card className="fixed right-4 top-20 w-80 shadow-xl">
          <CardHeader>
            <CardTitle>Mesa {selectedTable.tableNumber}</CardTitle>
          </CardHeader>
          <CardContent>
            {/* Detalles completos de la mesa seleccionada */}
            <div className="space-y-2">
              <p><strong>Estado:</strong> {getStatusText(selectedTable.status)}</p>
              <p><strong>Capacidad:</strong> {selectedTable.minCapacity}-{selectedTable.maxCapacity}</p>
              {selectedTable.guestCount && (
                <p><strong>Comensales:</strong> {selectedTable.guestCount}</p>
              )}
              {/* Más detalles... */}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export default FloorPlan;
```

**Continúa en siguiente mensaje...**

(El roadmap es ENORME - 2428 líneas. ¿Quieres que lo guarde completo y empecemos con Fase 1: Table Management ahora mismo?)
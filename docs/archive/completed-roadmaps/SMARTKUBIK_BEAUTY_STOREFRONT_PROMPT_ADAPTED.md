# PROMPT: SmartKubik — Storefront de Servicios de Belleza (Peluquerías / Barberías)
## Versión Adaptada al Sistema Existente V1.03

---

## IDENTIDAD Y ROL

Eres un senior full-stack engineer y product designer con 15+ años de experiencia construyendo plataformas SaaS multi-tenant para la industria de belleza y bienestar. Has diseñado y desarrollado sistemas de reservas para cadenas de salones premium en mercados con restricciones de pago (sin pasarelas automáticas), y dominas la intersección entre diseño de alto impacto visual y arquitectura backend robusta.

Tu trabajo se mide por un solo criterio: **¿el dueño de una barbería o salón en Venezuela pagaría mensualmente por esto?** Si la respuesta no es un sí rotundo, no has terminado.

---

## CONTEXTO DEL PROYECTO

### Qué es SmartKubik
SmartKubik es un ERP SaaS multi-tenant que ya tiene:
- **Backend en NestJS** con API REST versionada (`/api/v1/`)
- Base de datos **MongoDB**
- Autenticación **JWT con refresh tokens**
- Sistema multi-tenant con **tenantId** en todos los documentos
- Guards: `JwtAuthGuard` → `TenantGuard` → `PermissionsGuard`
- Decorador `@Public()` para endpoints sin autenticación
- Sistema de **BusinessLocations** (sedes/sucursales por tenant)
- Integración con **Whapi** (WhatsApp API) disponible en backup
- **Storefront Next.js funcional** con routing por dominio/subdomain

### Qué estamos construyendo
Un **storefront público especializado en servicios de belleza** dentro de SmartKubik, adaptando el storefront Next.js existente. Esto incluye peluquerías, barberías, salones de uñas, spas — cualquier negocio de servicios personales con citas.

### Mercado objetivo
Venezuela y Latinoamérica. **Restricción crítica**: no existen pasarelas de pago automáticas. Todo pago es manual (pago móvil, transferencia bancaria, Zelle, efectivo, criptomonedas). La confirmación de pago la hace el dueño del negocio manualmente.

---

## STACK TECNOLÓGICO (EXISTENTE)

| Capa | Tecnología | Estado |
|------|-----------|---------|
| Backend | NestJS | ✅ Funcional |
| Frontend Admin | React 18 + Vite + React Router v7 | ✅ Funcional |
| Storefront | Next.js 15 (App Router, Server Components) | ✅ Funcional (3 templates) |
| Base de datos | MongoDB con Mongoose | ✅ Funcional |
| Auth | JWT + Refresh Tokens | ✅ Implementado |
| WhatsApp | Whapi (en backup) | ⚠️ Disponible para integrar |
| Imágenes | Base64 en MongoDB | ✅ Implementado |
| Animaciones | Framer Motion (admin) | ✅ Implementado |
| Estilos | Tailwind CSS v4 | ✅ Implementado |
| Despliegue | VPS (backend) + Vercel (storefront) | ✅ Funcional |

---

## ARQUITECTURA BACKEND NESTJS EXISTENTE

### Estructura de Controllers y Services

**Patrón estándar:**
```typescript
// Controller
@UseGuards(JwtAuthGuard, TenantGuard, PermissionsGuard)
@Controller('beauty-services')
export class BeautyServicesController {
  constructor(private readonly beautyServicesService: BeautyServicesService) {}

  @Get()
  @Permissions('beauty_services_read')
  async findAll(@Request() req) {
    return this.beautyServicesService.findAll(req.user.tenantId);
  }
}

// Public Controller (sin guards)
@Public()
@Controller('public/beauty-services')
export class BeautyServicesPublicController {
  constructor(private readonly beautyServicesService: BeautyServicesService) {}

  @Get()
  async findAllPublic(@Query('tenantId') tenantId: string) {
    return this.beautyServicesService.findAllPublic(tenantId);
  }
}
```

### Endpoints Públicos Existentes (Base para Extender)

```
PÚBLICOS (sin auth) - Ya implementados:
GET    /api/v1/public/storefront/by-domain/:domain      → Info de la tienda
GET    /api/v1/public/products?tenantId=xxx             → Catálogo de productos
GET    /api/v1/public/services?tenantId=xxx             → Servicios (appointments existentes)
POST   /api/v1/public/appointments                      → Crear cita
POST   /api/v1/public/appointments/availability         → Slots disponibles
POST   /api/v1/public/orders                            → Crear orden

PRIVADAS (JWT del admin/owner del tenant):
GET    /api/v1/appointments                             → Todas las citas
PATCH  /api/v1/appointments/:id                         → Actualizar cita
GET    /api/v1/services                                 → Gestión de servicios
```

### Nuevas Rutas Necesarias para Beauty Storefront

```
PÚBLICAS (sin auth) - A implementar:
GET    /api/v1/public/beauty-services/:tenantId                    → Servicios de belleza con precios
GET    /api/v1/public/beauty-services/:tenantId/professionals      → Profesionales del salón
GET    /api/v1/public/beauty-services/:tenantId/professionals/:id/availability?date=YYYY-MM-DD → Slots
GET    /api/v1/public/beauty-services/:tenantId/gallery            → Portfolio de trabajos
GET    /api/v1/public/beauty-services/:tenantId/reviews            → Reseñas
POST   /api/v1/public/beauty-bookings                              → Crear reserva de belleza
GET    /api/v1/public/beauty-bookings/:id                          → Estado de reserva

PRIVADAS (JWT) - A implementar:
GET    /api/v1/beauty-bookings                          → Panel de reservas del salón
PATCH  /api/v1/beauty-bookings/:id                      → Confirmar/cancelar/reprogramar
POST   /api/v1/beauty-bookings/:id/notify               → Enviar notificación WhatsApp
GET    /api/v1/beauty-loyalty/:clientPhone              → Puntos del cliente
POST   /api/v1/beauty-loyalty/redeem                    → Canjear puntos
```

### Resolución del Tenant

**En endpoints públicos:**
```typescript
@Get('by-domain/:domain')
async getByDomain(@Param('domain') domain: string) {
  const storefront = await this.storefrontService.findByDomain(domain);
  const tenantId = storefront.tenantId;
  // ... resto de lógica
}
```

**En endpoints privados:**
```typescript
@UseGuards(JwtAuthGuard, TenantGuard)
@Get()
async findAll(@Request() req) {
  const tenantId = req.user.tenantId; // Del JWT
  const tenant = req.tenant; // Del TenantGuard (documento completo)
  // ...
}
```

---

## MODELOS DE DATOS (MongoDB/Mongoose)

### BeautyService (NUEVO - No reusar Product)

**Ubicación:** `/food-inventory-saas/src/schemas/beauty-service.schema.ts`

```typescript
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

@Schema({ timestamps: true })
export class BeautyService {
  // Multi-tenancy
  @Prop({ type: Types.ObjectId, ref: 'Tenant', required: true, index: true })
  tenantId: Types.ObjectId;

  // Identificación
  @Prop({ type: String, required: true })
  name: string; // "Corte de cabello masculino"

  @Prop({ type: String })
  description?: string;

  @Prop({ type: String, required: true, index: true })
  category: string; // "Cortes", "Barba", "Tratamientos", "Color", "Uñas"

  // Duración y timeline
  @Prop({ type: Number, required: true })
  duration: number; // minutos: 30, 45, 60, 90

  @Prop({ type: Number, default: 10 })
  bufferBefore: number; // tiempo de preparación (min)

  @Prop({ type: Number, default: 10 })
  bufferAfter: number; // limpieza/transición (min)

  // Pricing
  @Prop({
    type: {
      amount: { type: Number, required: true },
      currency: { type: String, enum: ['USD', 'VES', 'COP', 'EUR'], default: 'USD' },
      displayText: String // "Desde $15" o "$15 - $25"
    },
    required: true
  })
  price: {
    amount: number;
    currency: string;
    displayText?: string;
  };

  @Prop({ type: Number })
  cost?: number; // Costo para calcular margen

  @Prop({
    type: {
      mode: { type: String, enum: ['manual', 'markup', 'margin'] },
      markupPercentage: Number,
      marginPercentage: Number,
      autoCalculate: { type: Boolean, default: false }
    }
  })
  pricingStrategy?: {
    mode: 'manual' | 'markup' | 'margin';
    markupPercentage?: number;
    marginPercentage?: number;
    autoCalculate: boolean;
  };

  // Imágenes (Base64 strings - máx 3)
  @Prop({ type: [String], default: [] })
  images: string[]; // ["data:image/jpeg;base64,..."]

  // Profesionales que ofrecen este servicio
  @Prop({ type: [{ type: Types.ObjectId, ref: 'Professional' }], default: [] })
  professionals: Types.ObjectId[];

  // Restricciones de booking
  @Prop({ type: Number, default: 2 })
  minAdvanceBooking: number; // horas mínimas de anticipación

  @Prop({ type: Number, default: 30 * 24 }) // 30 días
  maxAdvanceBooking: number; // horas máximas hacia adelante

  // Disponibilidad simultánea
  @Prop({ type: Number, default: 1 })
  maxSimultaneous: number; // cuántos en paralelo puede atender el salón

  // Complementos (addons)
  @Prop({
    type: [{
      name: String,
      description: String,
      price: Number,
      duration: Number,
      isActive: { type: Boolean, default: true }
    }],
    default: []
  })
  addons?: Array<{
    name: string;
    description?: string;
    price: number;
    duration?: number;
    isActive: boolean;
  }>;

  // Depósito para confirmar (opcional)
  @Prop({ type: Boolean, default: false })
  requiresDeposit: boolean;

  @Prop({ type: String, enum: ['fixed', 'percentage'], default: 'fixed' })
  depositType: 'fixed' | 'percentage';

  @Prop({ type: Number, default: 0 })
  depositAmount: number;

  // Estado
  @Prop({ type: Boolean, default: true })
  isActive: boolean;

  @Prop({ type: Number, default: 0 })
  sortOrder: number;

  // Metadata
  @Prop({ type: String })
  color?: string; // Para calendario visual

  @Prop({ type: [String], default: [] })
  tags: string[];

  // Auditoría
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  createdBy: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User' })
  updatedBy?: Types.ObjectId;
}

export type BeautyServiceDocument = BeautyService & Document;
export const BeautyServiceSchema = SchemaFactory.createForClass(BeautyService);

// Índices
BeautyServiceSchema.index({ tenantId: 1, isActive: 1 });
BeautyServiceSchema.index({ tenantId: 1, category: 1 });
BeautyServiceSchema.index({ tenantId: 1, sortOrder: 1 });
```

---

### Professional (NUEVO)

**Ubicación:** `/food-inventory-saas/src/schemas/professional.schema.ts`

```typescript
@Schema({ timestamps: true })
export class Professional {
  @Prop({ type: Types.ObjectId, ref: 'Tenant', required: true, index: true })
  tenantId: Types.ObjectId;

  // Info personal
  @Prop({ type: String, required: true })
  name: string;

  @Prop({ type: String })
  role?: string; // "Master Barber", "Estilista Senior", "Colorista"

  @Prop({ type: String })
  bio?: string;

  // Avatar (Base64 string)
  @Prop({ type: String })
  avatar?: string;

  // Especialidades
  @Prop({ type: [String], default: [] })
  specialties: string[]; // ["Cortes modernos", "Barba", "Fade"]

  // Redes sociales
  @Prop({ type: String })
  instagram?: string;

  // Horario de trabajo
  @Prop({
    type: [{
      day: { type: Number, min: 0, max: 6 }, // 0=domingo, 6=sábado
      start: String, // "09:00"
      end: String, // "18:00"
      breakStart: String, // "12:00"
      breakEnd: String, // "13:00"
      isWorking: { type: Boolean, default: true }
    }],
    default: []
  })
  schedule: Array<{
    day: number;
    start: string;
    end: string;
    breakStart?: string;
    breakEnd?: string;
    isWorking: boolean;
  }>;

  // Ubicación (si el tenant tiene múltiples sedes)
  @Prop({ type: Types.ObjectId, ref: 'BusinessLocation' })
  locationId?: Types.ObjectId;

  // Estado
  @Prop({ type: Boolean, default: true })
  isActive: boolean;

  @Prop({ type: Number, default: 0 })
  sortOrder: number;

  // Auditoría
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  createdBy: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User' })
  updatedBy?: Types.ObjectId;
}

export type ProfessionalDocument = Professional & Document;
export const ProfessionalSchema = SchemaFactory.createForClass(Professional);

// Índices
ProfessionalSchema.index({ tenantId: 1, isActive: 1 });
ProfessionalSchema.index({ tenantId: 1, locationId: 1 });
```

---

### BeautyBooking (NUEVO)

**Ubicación:** `/food-inventory-saas/src/schemas/beauty-booking.schema.ts`

```typescript
@Schema({ timestamps: true })
export class BeautyBooking {
  @Prop({ type: Types.ObjectId, ref: 'Tenant', required: true, index: true })
  tenantId: Types.ObjectId;

  @Prop({ type: String, unique: true, required: true })
  bookingNumber: string; // "BBK-00001"

  // Cliente (SIN cuenta - solo datos básicos)
  @Prop({
    type: {
      name: { type: String, required: true },
      phone: { type: String, required: true }, // con código país
      email: String,
      whatsapp: String
    },
    required: true
  })
  client: {
    name: string;
    phone: string;
    email?: string;
    whatsapp?: string;
  };

  // Profesional (puede ser null si el cliente eligió "sin preferencia")
  @Prop({ type: Types.ObjectId, ref: 'Professional' })
  professional?: Types.ObjectId;

  @Prop({ type: String })
  professionalName?: string; // Desnormalizado

  // Servicios reservados
  @Prop({
    type: [{
      service: { type: Types.ObjectId, ref: 'BeautyService', required: true },
      name: String, // Desnormalizado para notificaciones
      duration: Number,
      price: Number,
      addons: [{
        name: String,
        price: Number,
        duration: Number
      }]
    }],
    required: true
  })
  services: Array<{
    service: Types.ObjectId;
    name: string;
    duration: number;
    price: number;
    addons?: Array<{
      name: string;
      price: number;
      duration?: number;
    }>;
  }>;

  // Fecha y hora
  @Prop({ type: Date, required: true, index: true })
  date: Date; // Solo fecha (sin hora)

  @Prop({ type: String, required: true })
  startTime: string; // "10:30"

  @Prop({ type: String, required: true })
  endTime: string; // "11:30" (calculado)

  // Totales
  @Prop({ type: Number, required: true })
  totalPrice: number;

  @Prop({ type: Number, required: true })
  totalDuration: number; // minutos

  // Estado
  @Prop({
    type: String,
    enum: ['pending', 'confirmed', 'completed', 'cancelled', 'no_show'],
    default: 'pending',
    index: true
  })
  status: string;

  // Pago
  @Prop({
    type: String,
    enum: ['unpaid', 'deposit_paid', 'paid'],
    default: 'unpaid'
  })
  paymentStatus: string;

  @Prop({ type: String })
  paymentMethod?: string; // "Pago Móvil", "Zelle", etc.

  @Prop({ type: Number, default: 0 })
  amountPaid: number;

  // Notas
  @Prop({ type: String })
  notes?: string;

  // WhatsApp notifications
  @Prop({
    type: [{
      type: { type: String, enum: ['confirmation', 'reminder', 'cancellation'] },
      sentAt: Date,
      status: { type: String, enum: ['sent', 'delivered', 'read', 'failed'] },
      messageId: String
    }],
    default: []
  })
  whatsappNotifications: Array<{
    type: 'confirmation' | 'reminder' | 'cancellation';
    sentAt: Date;
    status: 'sent' | 'delivered' | 'read' | 'failed';
    messageId?: string;
  }>;

  // Programa de lealtad
  @Prop({ type: Number, default: 0 })
  loyaltyPointsAwarded: number;

  // Ubicación (si el tenant tiene múltiples sedes)
  @Prop({ type: Types.ObjectId, ref: 'BusinessLocation' })
  locationId?: Types.ObjectId;

  // Auditoría
  @Prop({ type: Types.ObjectId, ref: 'User' })
  confirmedBy?: Types.ObjectId;

  @Prop({ type: Date })
  confirmedAt?: Date;
}

export type BeautyBookingDocument = BeautyBooking & Document;
export const BeautyBookingSchema = SchemaFactory.createForClass(BeautyBooking);

// Índices críticos
BeautyBookingSchema.index({ tenantId: 1, date: 1, status: 1 });
BeautyBookingSchema.index({ tenantId: 1, professional: 1, date: 1 });
BeautyBookingSchema.index({ 'client.phone': 1, tenantId: 1 });
BeautyBookingSchema.index({ bookingNumber: 1 }, { unique: true });
```

---

### BeautyStorefrontConfig (Extensión de StorefrontConfig existente)

**Ubicación:** Extender `/food-inventory-saas/src/schemas/storefront-config.schema.ts`

```typescript
// Agregar estos campos al StorefrontConfig existente:

@Prop({
  type: {
    enabled: { type: Boolean, default: false },
    businessHours: [{
      day: Number, // 0-6
      open: String, // "09:00"
      close: String, // "19:00"
      isOpen: Boolean
    }],
    paymentMethods: [{
      name: String, // "Pago Móvil", "Zelle"
      details: String, // Instrucciones
      icon: String,
      isActive: { type: Boolean, default: true }
    }],
    bookingSettings: {
      slotDuration: { type: Number, default: 30 }, // minutos
      advanceBookingDays: { type: Number, default: 30 },
      requirePhone: { type: Boolean, default: true },
      autoConfirm: { type: Boolean, default: false },
      whatsappNotification: {
        enabled: { type: Boolean, default: true },
        messageTemplate: String
      }
    },
    loyalty: {
      enabled: { type: Boolean, default: false },
      pointsPerBooking: { type: Number, default: 10 },
      rewardThreshold: { type: Number, default: 100 },
      rewardDescription: String // "Corte gratis"
    }
  }
})
beautyConfig?: {
  enabled: boolean;
  businessHours: Array<{
    day: number;
    open: string;
    close: string;
    isOpen: boolean;
  }>;
  paymentMethods: Array<{
    name: string;
    details: string;
    icon: string;
    isActive: boolean;
  }>;
  bookingSettings: {
    slotDuration: number;
    advanceBookingDays: number;
    requirePhone: boolean;
    autoConfirm: boolean;
    whatsappNotification: {
      enabled: boolean;
      messageTemplate?: string;
    };
  };
  loyalty: {
    enabled: boolean;
    pointsPerBooking: number;
    rewardThreshold: number;
    rewardDescription?: string;
  };
};
```

---

### BeautyGallery (NUEVO - Portfolio de trabajos)

**Ubicación:** `/food-inventory-saas/src/schemas/beauty-gallery.schema.ts`

```typescript
@Schema({ timestamps: true })
export class BeautyGalleryItem {
  @Prop({ type: Types.ObjectId, ref: 'Tenant', required: true, index: true })
  tenantId: Types.ObjectId;

  // Imagen (Base64 string)
  @Prop({ type: String, required: true })
  image: string;

  @Prop({ type: String })
  caption?: string;

  // Filtros
  @Prop({ type: Types.ObjectId, ref: 'Professional' })
  professional?: Types.ObjectId;

  @Prop({ type: String })
  category?: string; // "Cortes", "Color", "Barba"

  @Prop({ type: [String], default: [] })
  tags: string[];

  // Estado
  @Prop({ type: Boolean, default: true })
  isActive: boolean;

  @Prop({ type: Number, default: 0 })
  sortOrder: number;

  // Auditoría
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  createdBy: Types.ObjectId;
}

export type BeautyGalleryItemDocument = BeautyGalleryItem & Document;
export const BeautyGalleryItemSchema = SchemaFactory.createForClass(BeautyGalleryItem);

BeautyGalleryItemSchema.index({ tenantId: 1, isActive: 1 });
```

---

### BeautyReview (NUEVO)

**Ubicación:** `/food-inventory-saas/src/schemas/beauty-review.schema.ts`

```typescript
@Schema({ timestamps: true })
export class BeautyReview {
  @Prop({ type: Types.ObjectId, ref: 'Tenant', required: true, index: true })
  tenantId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'BeautyBooking' })
  booking?: Types.ObjectId;

  // Cliente
  @Prop({
    type: {
      name: String,
      phone: String // Para verificar que es cliente real
    },
    required: true
  })
  client: {
    name: string;
    phone: string;
  };

  @Prop({ type: Types.ObjectId, ref: 'Professional' })
  professional?: Types.ObjectId;

  // Rating
  @Prop({ type: Number, min: 1, max: 5, required: true })
  rating: number;

  @Prop({ type: String })
  comment?: string;

  // Moderación
  @Prop({ type: Boolean, default: false })
  isApproved: boolean;

  @Prop({ type: Types.ObjectId, ref: 'User' })
  approvedBy?: Types.ObjectId;

  @Prop({ type: Date })
  approvedAt?: Date;
}

export type BeautyReviewDocument = BeautyReview & Document;
export const BeautyReviewSchema = SchemaFactory.createForClass(BeautyReview);

BeautyReviewSchema.index({ tenantId: 1, isApproved: 1 });
```

---

### BeautyLoyaltyRecord (NUEVO - Opcional)

**Ubicación:** `/food-inventory-saas/src/schemas/beauty-loyalty.schema.ts`

```typescript
@Schema({ timestamps: true })
export class BeautyLoyaltyRecord {
  @Prop({ type: Types.ObjectId, ref: 'Tenant', required: true, index: true })
  tenantId: Types.ObjectId;

  @Prop({ type: String, required: true })
  clientPhone: string; // Identificador único (con código país)

  @Prop({ type: String, required: true })
  clientName: string;

  @Prop({ type: Number, default: 0 })
  points: number;

  @Prop({
    type: [{
      type: { type: String, enum: ['earned', 'redeemed'] },
      amount: Number,
      booking: { type: Types.ObjectId, ref: 'BeautyBooking' },
      description: String,
      date: { type: Date, default: Date.now }
    }],
    default: []
  })
  history: Array<{
    type: 'earned' | 'redeemed';
    amount: number;
    booking?: Types.ObjectId;
    description: string;
    date: Date;
  }>;
}

export type BeautyLoyaltyRecordDocument = BeautyLoyaltyRecord & Document;
export const BeautyLoyaltyRecordSchema = SchemaFactory.createForClass(BeautyLoyaltyRecord);

BeautyLoyaltyRecordSchema.index({ tenantId: 1, clientPhone: 1 }, { unique: true });
```

---

## SISTEMA DE IMÁGENES (Base64 en MongoDB)

### Flujo de Upload de Imágenes

**Frontend → Backend:**
1. Usuario selecciona imagen (máx 3 por servicio)
2. Frontend comprime con canvas: 800x800px, JPEG 80%, máx 500KB
3. Convierte a Data URL: `data:image/jpeg;base64,/9j/4AAQSkZJRg...`
4. Envía en JSON body a backend

**Backend:**
```typescript
// En BeautyServicesService
private calculateImagesSize(images: string[] | undefined): number {
  if (!images || images.length === 0) return 0;

  let totalSize = 0;
  for (const image of images) {
    const padding = image.endsWith("==") ? 2 : image.endsWith("=") ? 1 : 0;
    const sizeInBytes = (image.length * 3) / 4 - padding;
    totalSize += sizeInBytes;
  }
  return totalSize / (1024 * 1024); // MB
}

async create(dto: CreateBeautyServiceDto, tenantId: string) {
  // Validar tamaño de imágenes
  const imagesSize = this.calculateImagesSize(dto.images);

  const tenant = await this.tenantModel.findById(tenantId);
  if (tenant.usage.currentStorage + imagesSize > tenant.limits.maxStorage) {
    throw new BadRequestException('Storage quota exceeded');
  }

  // Crear servicio
  const service = await this.beautyServiceModel.create({
    ...dto,
    tenantId,
    createdBy: userId
  });

  // Actualizar storage usage
  tenant.usage.currentStorage += imagesSize;
  await tenant.save();

  return service;
}
```

**Límites:**
- Máximo **3 imágenes** por servicio
- Máximo **500KB** por imagen (post-compresión)
- Dimensión máxima: **800x800px**
- Formatos: JPEG, PNG, WebP
- Cuenta contra `tenant.usage.currentStorage` vs `tenant.limits.maxStorage`

---

## INTEGRACIÓN CON WHAPI (WhatsApp)

### Servicio Existente (en backup - listo para integrar)

**Ubicación:** Copiar de `/FOOD-INVENTORY-SAAS-COMPLETO/src/modules/whapi/`

**Métodos clave:**
```typescript
// whatsapp.service.ts
async sendTextMessage(
  tenantId: string,
  to: string, // +58...
  message: string,
  customerId?: string
): Promise<{ success: boolean; deliveryId: string }>

async sendTemplateMessage(
  tenantId: string,
  sendDto: SendTemplateMessageDto
): Promise<{ success: boolean; deliveryId: string }>
```

### Mensaje Post-Reserva

**Template para confirmación:**
```
¡Hola {{clientName}}! 👋

Tu reserva en *{{salonName}}* ha sido confirmada:

💈 *Servicio*: {{servicesList}}
👤 *Profesional*: {{professionalName}} (o "El siguiente disponible")
📅 *Fecha*: {{date}}
🕐 *Hora*: {{startTime}}
⏱️ *Duración*: {{totalDuration}} min
💰 *Total*: {{totalPrice}}

*Métodos de pago aceptados:*
{{paymentMethodsList}}

📍 *Dirección*: {{address}}

Tu código de reserva es: *{{bookingNumber}}*

Si necesitas reprogramar o cancelar, responde a este mensaje.

— {{salonName}}
Reserva gestionada por SmartKubik
```

**Implementación:**
```typescript
// beauty-bookings.service.ts
async sendConfirmationWhatsApp(booking: BeautyBookingDocument) {
  const storefront = await this.storefrontService.findByTenantId(booking.tenantId);

  if (!storefront.beautyConfig?.bookingSettings.whatsappNotification.enabled) {
    return;
  }

  const template = storefront.beautyConfig.bookingSettings.whatsappNotification.messageTemplate;
  const message = this.buildConfirmationMessage(booking, storefront, template);

  const result = await this.whatsappService.sendTextMessage(
    booking.tenantId.toString(),
    booking.client.phone,
    message
  );

  // Registrar notificación
  booking.whatsappNotifications.push({
    type: 'confirmation',
    sentAt: new Date(),
    status: result.success ? 'sent' : 'failed',
    messageId: result.deliveryId
  });

  await booking.save();
}
```

---

## STOREFRONT NEXT.JS - ADAPTACIÓN DEL EXISTENTE

### Estado Actual

**Ubicación:** `/food-inventory-storefront/`

**Templates existentes:**
- `ModernEcommerce` (e-commerce de productos)
- `PremiumStorefront` (premium con dark mode)
- `ModernServices` (servicios - base para adaptar)

**Rutas existentes:**
```
/:domain                  → Homepage
/:domain/productos        → Catálogo
/:domain/carrito          → Cart
/:domain/checkout         → Checkout
/:domain/book             → Sistema de booking (appointments)
/:domain/reservations     → Gestión de reservas
```

### Nueva Ruta: Beauty Storefront

**Crear nueva ruta:** `/:domain/beauty`

**Estructura:**
```
/app/[domain]/beauty/
  ├── page.tsx                    → Homepage del salón
  ├── servicios/page.tsx          → Catálogo de servicios
  ├── equipo/page.tsx             → Profesionales
  ├── galeria/page.tsx            → Portfolio
  ├── reservar/
  │   ├── page.tsx                → Flujo de booking (paso a paso)
  │   └── components/
  │       ├── StepServices.tsx
  │       ├── StepProfessional.tsx
  │       ├── StepDateTime.tsx
  │       ├── StepClientInfo.tsx
  │       └── StepSummary.tsx
  ├── reserva/[bookingNumber]/    → Confirmación y tracking
  └── resena/[bookingId]/page.tsx → Dejar reseña
```

### Template: BeautyStorefront (NUEVO)

**Ubicación:** `/src/templates/BeautyStorefront/`

**Componentes:**
```typescript
// Hero con media inmersiva
<BeautyHero
  storefront={storefront}
  onBookNow={() => router.push('/beauty/reservar')}
/>

// Servicios con categorías
<BeautyServices
  services={services}
  categories={categories}
  onServiceClick={handleServiceClick}
/>

// Equipo de profesionales
<BeautyTeam
  professionals={professionals}
  onProfessionalClick={handleProfessionalClick}
/>

// Galería de trabajos
<BeautyGallery
  items={galleryItems}
  categories={categories}
/>

// Reseñas de clientes
<BeautyReviews
  reviews={reviews}
  averageRating={averageRating}
/>

// Ubicación y contacto
<BeautyLocation
  storefront={storefront}
  businessHours={storefront.beautyConfig.businessHours}
/>

// Programa de lealtad
{storefront.beautyConfig.loyalty.enabled && (
  <BeautyLoyalty
    config={storefront.beautyConfig.loyalty}
  />
)}
```

### Componente de Booking (CRÍTICO)

**Ubicación:** `/src/components/beauty-booking/BeautyBookingFlow.tsx`

**Flujo:**

**Paso 1 — Seleccionar servicios**
```typescript
<StepServices
  services={services}
  selectedServices={bookingState.services}
  onServicesChange={handleServicesChange}
/>
// Muestra: cards de servicios con checkbox
// Permite: múltiples servicios
// Actualiza: subtotal y duración total
```

**Paso 2 — Seleccionar profesional (OPCIONAL)**
```typescript
<StepProfessional
  professionals={availableProfessionals}
  selectedProfessional={bookingState.professional}
  onProfessionalChange={handleProfessionalChange}
  allowNoPreference={true} // ← CRÍTICO: Opción "Sin preferencia"
/>

// Opciones:
// 1. Profesional específico (con foto, nombre, especialidades)
// 2. "Sin preferencia" / "El siguiente disponible"
//    → professional = null en el booking
//    → El salón asigna según disponibilidad
```

**Paso 3 — Seleccionar fecha y hora**
```typescript
<StepDateTime
  selectedDate={bookingState.date}
  selectedTime={bookingState.startTime}
  professional={bookingState.professional} // puede ser null
  services={bookingState.services}
  onDateTimeChange={handleDateTimeChange}
/>

// Si professional === null:
//   → Busca slots donde CUALQUIER profesional esté disponible
// Si professional !== null:
//   → Busca slots solo de ese profesional
```

**Paso 4 — Datos del cliente**
```typescript
<StepClientInfo
  clientData={bookingState.client}
  onClientDataChange={handleClientDataChange}
/>

// Campos:
// - name (required)
// - phone (required, con selector de país +58)
// - email (optional)
// - notes (optional)
```

**Paso 5 — Resumen y confirmación**
```typescript
<StepSummary
  booking={bookingState}
  paymentMethods={storefront.beautyConfig.paymentMethods}
  onConfirm={handleConfirm}
/>

// Muestra:
// - Servicios + addons con precios
// - Profesional (o "Sin preferencia asignada")
// - Fecha y hora
// - Total
// - Métodos de pago disponibles
//
// Al confirmar:
// POST /api/v1/public/beauty-bookings
// → Backend crea booking
// → Envía WhatsApp si está habilitado
// → Muestra pantalla de éxito
```

**Estado del Booking (useReducer):**
```typescript
interface BookingState {
  services: Array<{
    service: BeautyService;
    addons: Array<Addon>;
  }>;
  professional: Professional | null; // null = sin preferencia
  date: Date;
  startTime: string;
  endTime: string; // calculado
  client: {
    name: string;
    phone: string;
    email?: string;
    notes?: string;
  };
  totalPrice: number;
  totalDuration: number;
}
```

---

## CÁLCULO DE DISPONIBILIDAD (Algoritmo)

### Endpoint: `POST /api/v1/public/beauty-bookings/availability`

**DTO:**
```typescript
class GetAvailabilityDto {
  tenantId: string;
  date: string; // "YYYY-MM-DD"
  professionalId?: string; // opcional (null = cualquier profesional)
  serviceIds: string[]; // IDs de servicios seleccionados
}
```

**Algoritmo:**

```typescript
async getAvailability(dto: GetAvailabilityDto) {
  const { tenantId, date, professionalId, serviceIds } = dto;

  // 1. Calcular duración total requerida
  const services = await this.beautyServiceModel.find({ _id: { $in: serviceIds } });
  const totalDuration = services.reduce((sum, s) => sum + s.duration + s.bufferBefore + s.bufferAfter, 0);

  // 2. Obtener storefront config
  const storefront = await this.storefrontService.findByTenantId(tenantId);
  const slotDuration = storefront.beautyConfig.bookingSettings.slotDuration; // e.g., 30 min

  // 3. Obtener horarios del negocio para ese día
  const dayOfWeek = new Date(date).getDay();
  const businessHours = storefront.beautyConfig.businessHours.find(h => h.day === dayOfWeek);

  if (!businessHours || !businessHours.isOpen) {
    return { slots: [] }; // Cerrado ese día
  }

  // 4. Generar todos los slots posibles del día
  const allSlots = this.generateTimeSlots(
    businessHours.open,
    businessHours.close,
    slotDuration
  );

  // 5. Filtrar según profesional(es)
  let professionals: Professional[];
  if (professionalId) {
    // Profesional específico
    professionals = [await this.professionalModel.findById(professionalId)];
  } else {
    // Cualquier profesional que ofrezca TODOS los servicios
    professionals = await this.professionalModel.find({
      tenantId,
      isActive: true,
      _id: { $in: services.flatMap(s => s.professionals) }
    });

    // Filtrar profesionales que ofrecen TODOS los servicios
    professionals = professionals.filter(p =>
      serviceIds.every(sid =>
        services.find(s => s._id.toString() === sid)?.professionals.includes(p._id)
      )
    );
  }

  if (professionals.length === 0) {
    return { slots: [] }; // Ningún profesional disponible
  }

  // 6. Obtener bookings existentes del día
  const existingBookings = await this.beautyBookingModel.find({
    tenantId,
    date: new Date(date),
    status: { $nin: ['cancelled'] },
    professional: professionalId ? professionalId : { $in: professionals.map(p => p._id) }
  });

  // 7. Para cada slot, verificar si hay al menos un profesional disponible
  const availableSlots = [];
  for (const slot of allSlots) {
    const slotEnd = this.addMinutes(slot, totalDuration);

    // Verificar si slot cabe antes del cierre
    if (slotEnd > businessHours.close) continue;

    // Buscar profesional disponible
    const availableProfessional = professionals.find(prof => {
      // Verificar horario del profesional
      const profSchedule = prof.schedule.find(s => s.day === dayOfWeek);
      if (!profSchedule || !profSchedule.isWorking) return false;
      if (slot < profSchedule.start || slotEnd > profSchedule.end) return false;

      // Verificar break
      if (profSchedule.breakStart && profSchedule.breakEnd) {
        const breakStart = profSchedule.breakStart;
        const breakEnd = profSchedule.breakEnd;
        if (!(slotEnd <= breakStart || slot >= breakEnd)) {
          return false; // Overlap con break
        }
      }

      // Verificar bookings existentes
      const hasConflict = existingBookings.some(booking =>
        booking.professional?.toString() === prof._id.toString() &&
        !(slotEnd <= booking.startTime || slot >= booking.endTime)
      );

      return !hasConflict;
    });

    if (availableProfessional || !professionalId) {
      availableSlots.push({
        time: slot,
        endTime: slotEnd,
        availableProfessional: availableProfessional?._id
      });
    }
  }

  return { slots: availableSlots };
}

private generateTimeSlots(start: string, end: string, intervalMinutes: number): string[] {
  const slots = [];
  let current = start;

  while (current < end) {
    slots.push(current);
    current = this.addMinutes(current, intervalMinutes);
  }

  return slots;
}

private addMinutes(time: string, minutes: number): string {
  const [hours, mins] = time.split(':').map(Number);
  const totalMinutes = hours * 60 + mins + minutes;
  const newHours = Math.floor(totalMinutes / 60);
  const newMins = totalMinutes % 60;
  return `${String(newHours).padStart(2, '0')}:${String(newMins).padStart(2, '0')}`;
}
```

---

## SISTEMA DE TEMAS (Adaptado del Existente)

### ThemeProvider (Ya existe en storefront)

**Ubicación:** `/src/components/ThemeProvider.tsx`

**Uso actual:**
```typescript
<ThemeProvider theme={storefront.theme}>
  {children}
</ThemeProvider>
```

**CSS Variables inyectadas:**
```css
:root {
  --primary-color: #C5A572; /* del storefront.theme.primaryColor */
  --secondary-color: #0A0A0A;
  --primary-rgb: 197, 165, 114;
  --secondary-rgb: 10, 10, 10;
}
```

### Presets de Tema (Nuevos para Beauty)

**Agregar a `/src/lib/themePresets.ts`:**

```typescript
export const beautyThemePresets = {
  'luxury-dark': {
    primaryColor: '#C5A572', // Dorado
    secondaryColor: '#0A0A0A', // Negro
    accentColor: '#D4AF37', // Oro viejo
    backgroundColor: '#1A1A1A',
    textColor: '#FAFAF7',
    fontHeading: 'Playfair Display',
    fontBody: 'DM Sans'
  },
  'luxury-light': {
    primaryColor: '#000000',
    secondaryColor: '#FAFAF7',
    accentColor: '#D4AF37',
    backgroundColor: '#FFFFFF',
    textColor: '#1A1A1A',
    fontHeading: 'Cormorant Garamond',
    fontBody: 'Outfit'
  },
  'modern-minimal': {
    primaryColor: '#000000',
    secondaryColor: '#FFFFFF',
    accentColor: '#6366F1', // Indigo
    backgroundColor: '#FFFFFF',
    textColor: '#000000',
    fontHeading: 'Syne',
    fontBody: 'Inter'
  },
  'classic-barber': {
    primaryColor: '#8B1A1A', // Rojo barbero
    secondaryColor: '#F5F0EB',
    accentColor: '#1E3A8A', // Azul oscuro
    backgroundColor: '#FFFFFF',
    textColor: '#1A1A1A',
    fontHeading: 'Bebas Neue',
    fontBody: 'Inter'
  },
  'feminine-soft': {
    primaryColor: '#E5B8D4', // Rosa suave
    secondaryColor: '#FFF5F5',
    accentColor: '#9F7AEA', // Violeta
    backgroundColor: '#FFFFFF',
    textColor: '#4A5568',
    fontHeading: 'Lora',
    fontBody: 'Nunito'
  }
};
```

**Aplicación en StorefrontConfig:**
```typescript
// En beautyConfig
@Prop({
  type: {
    preset: {
      type: String,
      enum: ['luxury-dark', 'luxury-light', 'modern-minimal', 'classic-barber', 'feminine-soft', 'custom']
    },
    customColors: {
      primary: String,
      secondary: String,
      accent: String
    }
  }
})
themeConfig?: {
  preset: string;
  customColors?: {
    primary: string;
    secondary: string;
    accent: string;
  };
};
```

---

## ESTRUCTURA DE IMPLEMENTACIÓN (Fases)

### Fase 1: Backend — Schemas y Services (Semana 1)

**1.1 Crear Schemas**
- [ ] `BeautyService` schema
- [ ] `Professional` schema
- [ ] `BeautyBooking` schema
- [ ] `BeautyGalleryItem` schema
- [ ] `BeautyReview` schema
- [ ] `BeautyLoyaltyRecord` schema (opcional)
- [ ] Extender `StorefrontConfig` con `beautyConfig`

**1.2 Crear DTOs**
```
/src/dto/beauty/
  ├── create-beauty-service.dto.ts
  ├── update-beauty-service.dto.ts
  ├── create-professional.dto.ts
  ├── update-professional.dto.ts
  ├── create-beauty-booking.dto.ts
  ├── get-availability.dto.ts
  └── create-review.dto.ts
```

**1.3 Crear Services**
```
/src/modules/beauty/
  ├── beauty.module.ts
  ├── services/
  │   ├── beauty-services.service.ts       (CRUD de servicios)
  │   ├── professionals.service.ts         (CRUD de profesionales)
  │   ├── beauty-bookings.service.ts       (Bookings + disponibilidad)
  │   ├── beauty-gallery.service.ts        (Portfolio)
  │   ├── beauty-reviews.service.ts        (Reseñas + moderación)
  │   └── beauty-loyalty.service.ts        (Puntos de lealtad)
  └── controllers/
```

**1.4 Crear Controllers**
```
/src/modules/beauty/controllers/
  ├── beauty-services.controller.ts        (Privado - CRUD con guards)
  ├── beauty-services-public.controller.ts (Público - listado)
  ├── professionals.controller.ts          (Privado)
  ├── professionals-public.controller.ts   (Público)
  ├── beauty-bookings.controller.ts        (Privado - panel admin)
  ├── beauty-bookings-public.controller.ts (Público - crear reserva)
  ├── beauty-gallery.controller.ts         (Privado)
  ├── beauty-gallery-public.controller.ts  (Público)
  └── beauty-reviews-public.controller.ts  (Público)
```

**1.5 Implementar Disponibilidad**
- [ ] Algoritmo `getAvailability()` con lógica de slots
- [ ] Validación de horarios de negocio
- [ ] Validación de horarios de profesionales
- [ ] Detección de conflictos con bookings existentes
- [ ] Tests unitarios

---

### Fase 2: Backend — Integración WhatsApp (Semana 2)

**2.1 Copiar Módulo Whapi**
- [ ] Copiar `/FOOD-INVENTORY-SAAS-COMPLETO/src/modules/whapi/` → `/src/modules/whapi/`
- [ ] Copiar `/FOOD-INVENTORY-SAAS-COMPLETO/src/modules/marketing/whatsapp*` → `/src/modules/marketing/`
- [ ] Copiar schemas: `whatsapp-template.schema.ts`, `message-delivery.schema.ts`
- [ ] Copiar DTOs: `whapi.dto.ts`, `whatsapp.dto.ts`
- [ ] Actualizar imports y referencias

**2.2 Integrar con BeautyBookings**
- [ ] Método `sendConfirmationWhatsApp()` en `BeautyBookingsService`
- [ ] Método `sendReminderWhatsApp()` (24h antes)
- [ ] Método `sendCancellationWhatsApp()`
- [ ] Templates configurables desde admin

**2.3 Configurar Variables de Entorno**
```bash
# .env
WHAPI_MASTER_TOKEN=tu-token-whapi
```

---

### Fase 3: Storefront — Adaptación Next.js (Semana 3)

**3.1 Crear Template BeautyStorefront**
```
/src/templates/BeautyStorefront/
  ├── index.tsx
  └── components/
      ├── BeautyHero.tsx
      ├── BeautyServices.tsx
      ├── BeautyTeam.tsx
      ├── BeautyGallery.tsx
      ├── BeautyReviews.tsx
      ├── BeautyLocation.tsx
      └── BeautyLoyalty.tsx
```

**3.2 Crear Rutas Beauty**
```
/app/[domain]/beauty/
  ├── page.tsx                    (Server Component - fetch SSR)
  ├── layout.tsx                  (Layout con tema beauty)
  ├── servicios/page.tsx
  ├── equipo/page.tsx
  ├── galeria/page.tsx
  └── reservar/
      ├── page.tsx
      └── components/
          ├── BeautyBookingFlow.tsx
          ├── StepServices.tsx
          ├── StepProfessional.tsx
          ├── StepDateTime.tsx
          ├── StepClientInfo.tsx
          └── StepSummary.tsx
```

**3.3 Componentes de Booking**
- [ ] `BeautyBookingFlow` (orquestador con `useReducer`)
- [ ] `StepServices` (selección múltiple + addons)
- [ ] `StepProfessional` (con opción "Sin preferencia" ⭐)
- [ ] `StepDateTime` (calendario + slots)
- [ ] `StepClientInfo` (form con validación)
- [ ] `StepSummary` (resumen + métodos de pago)
- [ ] `BookingSuccess` (confirmación + WhatsApp + calendario)

**3.4 Funciones API**
```typescript
// /src/lib/beautyApi.ts
export async function getBeautyServices(tenantId: string) { }
export async function getProfessionals(tenantId: string) { }
export async function getAvailability(data: AvailabilityRequest) { }
export async function createBeautyBooking(data: BookingData) { }
export async function getBeautyGallery(tenantId: string) { }
export async function getBeautyReviews(tenantId: string) { }
```

---

### Fase 4: Frontend Admin — Panel de Gestión (Semana 4)

**4.1 Crear Componentes Admin**
```
/food-inventory-admin/src/components/beauty/
  ├── BeautyServicesManagement.jsx    (CRUD servicios)
  ├── ProfessionalsManagement.jsx     (CRUD profesionales)
  ├── BeautyBookingsManagement.jsx    (Panel de reservas)
  ├── BeautyGalleryManagement.jsx     (Upload portfolio)
  ├── BeautyReviewsManagement.jsx     (Moderación)
  └── BeautyStorefrontConfig.jsx      (Config completa)
```

**4.2 Navegación**
- [ ] Agregar sección "Belleza" al menú principal
- [ ] Subrutas: Servicios, Profesionales, Reservas, Galería, Reseñas, Configuración

**4.3 Configuración de Storefront**
```jsx
<BeautyStorefrontConfig>
  <ThemeSelector themes={beautyThemePresets} />
  <BusinessHoursEditor hours={config.businessHours} />
  <PaymentMethodsEditor methods={config.paymentMethods} />
  <BookingSettingsEditor settings={config.bookingSettings} />
  <LoyaltyProgramEditor loyalty={config.loyalty} />
  <WhatsAppIntegrationEditor whatsapp={config.whatsappNotification} />
</BeautyStorefrontConfig>
```

---

### Fase 5: Testing y Pulido (Semana 5)

**5.1 Tests Backend**
- [ ] Tests unitarios: `BeautyBookingsService.getAvailability()`
- [ ] Tests unitarios: Cálculo de duración total
- [ ] Tests de integración: Crear booking → enviar WhatsApp
- [ ] Tests de validación: DTOs con class-validator

**5.2 Tests Frontend**
- [ ] Flow completo de booking (Cypress o Playwright)
- [ ] Validación de formularios
- [ ] Responsividad mobile (Chrome DevTools + real devices)
- [ ] Lighthouse audit (≥90 en todas las métricas)

**5.3 Edge Cases**
- [ ] No hay profesionales disponibles → mensaje claro
- [ ] Todos los slots ocupados → sugerir otros días
- [ ] Red caída durante booking → retry con exponential backoff
- [ ] Cliente sin WhatsApp → email fallback
- [ ] Timezone handling (usar tenant.timezone)

**5.4 Optimización**
- [ ] Lazy loading de imágenes (ya implementado en `LazyImage.jsx`)
- [ ] Server Components para contenido estático
- [ ] Dynamic imports para modal de booking
- [ ] Caché de endpoints públicos (revalidate: 60s)

---

## REGLAS ABSOLUTAS

**NUNCA:**
- Usar datos mock/hardcoded
- Implementar pasarela de pago automática
- Redirigir fuera del sitio para reservar
- Requerir cuenta para reservar (solo nombre + teléfono)
- Usar Cloudinary u otro servicio cloud (imágenes en Base64)
- Crear nuevo sistema de tenants (usar el existente)
- Ignorar los Guards de NestJS (JwtAuthGuard, TenantGuard, PermissionsGuard)

**SIEMPRE:**
- Tipar todo con TypeScript estricto — cero `any`
- Usar `@Public()` para endpoints públicos
- Filtrar por `tenantId` en TODAS las queries MongoDB
- Validar con DTOs + class-validator en backend
- Calcular `calculateImagesSize()` antes de guardar
- Actualizar `tenant.usage.currentStorage` al agregar imágenes
- Permitir "Sin preferencia de profesional" en bookings
- Enviar confirmación por WhatsApp si está habilitado
- Documentar con JSDoc los métodos complejos

---

## CRITERIO DE ÉXITO

Este storefront está terminado cuando:

1. **Un cliente puede:**
   - Entrar a `cliente.smartkubik.com` (o `localhost:3001/cliente`)
   - Ver servicios de belleza con precios, duración y fotos
   - Ver profesionales con bios y especialidades
   - Elegir servicio(s) sin especificar profesional ("sin preferencia")
   - Seleccionar fecha y ver slots disponibles en tiempo real
   - Ingresar nombre + teléfono (sin crear cuenta)
   - Recibir confirmación por WhatsApp en <30 segundos
   - **Todo en menos de 2 minutos**

2. **El dueño del salón puede:**
   - Recibir notificación WhatsApp de nueva reserva
   - Ver panel de reservas del día en admin
   - Confirmar pago manualmente
   - Ver galería de trabajos publicada
   - Moderar reseñas antes de publicar

3. **Performance:**
   - Página carga en <2s en 4G Venezuela
   - Lighthouse score ≥90 en todas las métricas
   - Imágenes optimizadas (800x800, JPEG 80%, <500KB)

4. **Calidad del código:**
   - Sin TODOs
   - Sin console.logs
   - Tipos TypeScript completos
   - Manejo de errores robusto
   - Guards correctamente aplicados

---

## SIGUIENTES PASOS

1. **Confirma que entiendes:**
   - Backend es NestJS (no Express)
   - Sistema de tenants con BusinessLocations
   - Imágenes en Base64 (no Cloudinary)
   - Storefront Next.js ya existe (extender, no crear)
   - Cliente puede elegir "sin preferencia de profesional"

2. **Prioriza:**
   - ¿Fase 1 completa primero (backend schemas + services)?
   - ¿O prototipo end-to-end mínimo (backend + frontend básico)?

3. **Pregunta:**
   - ¿Algo no está claro de la arquitectura existente?
   - ¿Necesitas ver algún archivo específico del código actual?

---

**Comienza por confirmar tu comprensión y elige el enfoque de implementación.**

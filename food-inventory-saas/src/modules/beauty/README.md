# Beauty Module - Sistema de Reservas para Salones de Belleza

## Descripción

Módulo completo para gestión de servicios de belleza (peluquerías, barberías, salones de uñas, spas) integrado en SmartKubik SaaS.

## Características Principales

### 1. Gestión de Servicios
- CRUD completo de servicios con precios, duración, buffers
- Imágenes en Base64 (máx 3 por servicio, 500KB c/u)
- Addons configurables
- Categorización
- Asignación a profesionales específicos

### 2. Gestión de Profesionales
- Perfiles con avatar, bio, especialidades
- Horarios de trabajo personalizados por día
- Breaks configurables
- Asignación a sedes (BusinessLocation)

### 3. Sistema de Reservas
- Reservas sin cuenta (solo nombre + teléfono)
- Opción "sin preferencia de profesional"
- Algoritmo inteligente de disponibilidad
- Cálculo automático de duración total
- Estados: pending, confirmed, completed, cancelled, no_show

### 4. Algoritmo de Disponibilidad
Considera:
- Horarios del negocio por día
- Horarios del profesional por día
- Breaks del profesional
- Reservas existentes
- Duración total de servicios + buffers
- Slots configurables (default: 30 min)

### 5. Galería de Trabajos
- Portfolio visual del salón
- Filtrado por profesional y categoría
- Orden personalizable

### 6. Sistema de Reseñas
- Reseñas con rating 1-5 estrellas
- Moderación requerida (isApproved)
- Cálculo de rating promedio
- Vinculación a reservas

### 7. Programa de Lealtad
- Identificación por teléfono (sin cuenta)
- Acumulación automática de puntos por reserva
- Historial de transacciones
- Canje de puntos

## Estructura de Archivos

```
beauty/
├── services/
│   ├── beauty-services.service.ts      # CRUD servicios + cálculo imágenes
│   ├── professionals.service.ts        # CRUD profesionales + validación horarios
│   ├── beauty-bookings.service.ts      # CRUD reservas + algoritmo disponibilidad
│   ├── beauty-gallery.service.ts
│   ├── beauty-reviews.service.ts
│   └── beauty-loyalty.service.ts
├── controllers/
│   ├── beauty-services.controller.ts          # Privado
│   ├── beauty-services-public.controller.ts    # Público
│   ├── professionals.controller.ts
│   ├── professionals-public.controller.ts
│   ├── beauty-bookings.controller.ts
│   ├── beauty-bookings-public.controller.ts
│   ├── beauty-gallery.controller.ts
│   ├── beauty-gallery-public.controller.ts
│   ├── beauty-reviews.controller.ts
│   ├── beauty-reviews-public.controller.ts
│   └── beauty-loyalty-public.controller.ts
└── beauty.module.ts
```

## Endpoints Públicos (Storefront)

### Servicios
```
GET    /public/beauty-services/:tenantId
GET    /public/beauty-services/:tenantId/categories
GET    /public/beauty-services/:tenantId/service/:id
GET    /public/beauty-services/:tenantId/by-professional/:professionalId
```

### Profesionales
```
GET    /public/professionals/:tenantId
GET    /public/professionals/:tenantId/professional/:id
GET    /public/professionals/:tenantId/by-services?serviceIds=id1,id2
```

### Reservas
```
POST   /public/beauty-bookings                      # Crear reserva
POST   /public/beauty-bookings/availability          # Consultar disponibilidad
GET    /public/beauty-bookings/booking-number/:num  # Buscar por número
```

### Galería
```
GET    /public/beauty-gallery/:tenantId
GET    /public/beauty-gallery/:tenantId/categories
```

### Reseñas
```
GET    /public/beauty-reviews/:tenantId
GET    /public/beauty-reviews/:tenantId/average-rating
POST   /public/beauty-reviews                       # Crear reseña
```

### Lealtad
```
GET    /public/beauty-loyalty/:tenantId/balance?clientPhone=+58...
```

## Endpoints Privados (Admin)

### Servicios
```
POST   /beauty-services
GET    /beauty-services
GET    /beauty-services/categories
GET    /beauty-services/:id
PUT    /beauty-services/:id
DELETE /beauty-services/:id
GET    /beauty-services/by-professional/:professionalId
```

### Profesionales
```
POST   /professionals
GET    /professionals
GET    /professionals/:id
PUT    /professionals/:id
DELETE /professionals/:id
```

### Reservas
```
GET    /beauty-bookings
GET    /beauty-bookings/:id
PATCH  /beauty-bookings/:id/status
```

### Galería
```
POST   /beauty-gallery
GET    /beauty-gallery
GET    /beauty-gallery/categories
GET    /beauty-gallery/:id
PUT    /beauty-gallery/:id
DELETE /beauty-gallery/:id
```

### Reseñas
```
GET    /beauty-reviews
GET    /beauty-reviews/stats/average-rating
GET    /beauty-reviews/:id
PATCH  /beauty-reviews/:id/approve
```

## Schemas MongoDB

### BeautyService
- Servicios con precio, duración, buffers
- Imágenes en Base64 (máx 3)
- Addons configurables
- Profesionales asignados

### Professional
- Datos personales y avatar
- Horario semanal con breaks
- Especialidades
- LocationId (sede)

### BeautyBooking
- Cliente sin cuenta (name, phone, email)
- Professional (puede ser null = "sin preferencia")
- Servicios múltiples con addons
- Estado y pago
- WhatsApp notifications

### BeautyGalleryItem
- Imagen Base64
- Caption, category, tags
- ProfessionalId (opcional)

### BeautyReview
- Rating 1-5
- Comentario
- isApproved (moderación)
- Vinculación a booking y professional

### BeautyLoyaltyRecord
- clientPhone (identificador)
- Balance de puntos
- Historial de transacciones

### StorefrontConfig
- beautyConfig.enabled
- beautyConfig.businessHours
- beautyConfig.paymentMethods
- beautyConfig.bookingSettings
- beautyConfig.loyalty
- beautyConfig.themeConfig

## DTOs Principales

- CreateBeautyServiceDto
- CreateProfessionalDto
- CreateBeautyBookingDto
- GetAvailabilityDto (con algoritmo)
- CreateReviewDto
- UpdateBookingStatusDto

## TODO

- [ ] Integrar WhatsApp notifications (módulo whapi del backup)
- [ ] Implementar @Public() decorator
- [ ] Habilitar guards (JwtAuthGuard, TenantGuard, PermissionsGuard)
- [ ] Integrar con TenantModel para validar cuota de storage
- [ ] Implementar endpoint de notificación WhatsApp manual
- [ ] Tests unitarios del algoritmo getAvailability()
- [ ] Registrar BeautyModule en app.module.ts

## Configuración Requerida

1. Agregar permisos en sistema de roles:
   - beauty_services_read/create/update/delete
   - professionals_read/create/update/delete
   - beauty_bookings_read/update
   - beauty_gallery_read/create/update/delete
   - beauty_reviews_read/moderate

2. Configurar StorefrontConfig con beautyConfig habilitado

3. (Opcional) Configurar integración WhatsApp

## Uso desde Storefront Next.js

Ver documentación en: `/SMARTKUBIK_BEAUTY_STOREFRONT_PROMPT_ADAPTED.md`

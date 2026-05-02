# Roadmap: Vertical de Restaurantes — SmartKubik

**Objetivo:** Convertir el proyecto `/Documents/Restaurante` en un template multi-tenant para la vertical de restaurantes de SmartKubik, preservando el diseño 100% e integrándolo al backend NestJS existente.

**Backend de trabajo:** `FOOD-INVENTORY-SAAS-COMPLETO/food-inventory-saas/`  
**Frontend nuevo:** `restaurant-storefront/` (en V1.03/)  
**Original intacto:** `/Documents/Restaurante/` (solo referencia)

---

## Fase 1 — Infraestructura Backend + Frontend Base

**Objetivo:** Crear los schemas, módulo NestJS y el directorio del storefront. Al finalizar esta fase el backend puede compilar con los nuevos módulos y el frontend existe como proyecto Next.js funcional.

### Backend (FOOD-INVENTORY-SAAS-COMPLETO/food-inventory-saas/)

- [x] Crear `src/schemas/restaurant-category.schema.ts`
- [x] Crear `src/schemas/restaurant-ingredient.schema.ts`
- [x] Crear `src/schemas/restaurant-dish.schema.ts`
- [x] Crear `src/schemas/restaurant-order.schema.ts`
- [x] Extender `src/schemas/storefront-config.schema.ts` → agregar `'restaurant'` al enum `templateType` y campo `restaurantConfig`
- [x] Crear `src/modules/restaurant-storefront/dto/` (create/update DTOs para dish, category, ingredient, order)
- [x] Crear `src/modules/restaurant-storefront/services/restaurant-dishes.service.ts`
- [x] Crear `src/modules/restaurant-storefront/services/restaurant-categories.service.ts`
- [x] Crear `src/modules/restaurant-storefront/services/restaurant-ingredients.service.ts`
- [x] Crear `src/modules/restaurant-storefront/services/restaurant-orders.service.ts`
- [x] Crear `src/modules/restaurant-storefront/controllers/restaurant-dishes.controller.ts` (privado)
- [x] Crear `src/modules/restaurant-storefront/controllers/restaurant-dishes-public.controller.ts`
- [x] Crear `src/modules/restaurant-storefront/controllers/restaurant-categories.controller.ts` (privado)
- [x] Crear `src/modules/restaurant-storefront/controllers/restaurant-categories-public.controller.ts`
- [x] Crear `src/modules/restaurant-storefront/controllers/restaurant-ingredients.controller.ts` (privado)
- [x] Crear `src/modules/restaurant-storefront/controllers/restaurant-orders.controller.ts` (privado)
- [x] Crear `src/modules/restaurant-storefront/controllers/restaurant-orders-public.controller.ts`
- [x] Crear `src/modules/restaurant-storefront/restaurant-storefront.module.ts`
- [x] Registrar `RestaurantStorefrontModule` en `src/app.module.ts`

### Frontend

- [x] Crear `restaurant-storefront/` con estructura Next.js copiada del proyecto original
- [x] Actualizar `restaurant-storefront/.env.example` con variables necesarias
- [x] Actualizar `restaurant-storefront/lib/api.ts` para conectar a SmartKubik API (`/api/v1/public/restaurant/...`)

---

## Fase 2 — Implementación Completa de Servicios CRUD

**Objetivo:** Todos los endpoints funcionan end-to-end. Se puede crear/editar/listar platos, categorías, ingredientes y recibir pedidos desde el storefront.

### Backend

- [ ] Implementar todos los métodos en `RestaurantDishesService` (findAll, findOne, create, update, remove, toggleAvailability)
- [ ] Implementar todos los métodos en `RestaurantCategoriesService` (findAll, create, update, remove, reorder)
- [ ] Implementar todos los métodos en `RestaurantIngredientsService` (findAll, create, update, remove)
- [ ] Implementar todos los métodos en `RestaurantOrdersService` (create, findAll, findOne, updateStatus)
- [ ] Agregar generación de `orderRef` (formato `RST-YYYYMMDD-XXXX`) en `RestaurantOrdersService`
- [ ] Implementar endpoint público `GET /public/restaurant/:tenantId/menu` (platos + categorías en una sola llamada)
- [ ] Implementar endpoint público `GET /public/restaurant/:tenantId/config` (lee StorefrontConfig con restaurantConfig)
- [ ] Agregar paginación a `GET /restaurant-dishes` (privado)
- [ ] Tests manuales con Postman/curl de todos los endpoints

### Frontend

- [ ] Actualizar `lib/api.ts` para usar rutas `/api/v1/public/restaurant/:tenantId/...`
- [ ] Implementar resolución de `tenantId` desde variable de entorno `NEXT_PUBLIC_TENANT_ID`
- [ ] Verificar que MenuGrid, DishCard, CategoryFilter funcionan con datos reales del API
- [ ] Verificar que CartDrawer envía pedidos al nuevo endpoint (`POST /api/v1/public/restaurant/:tenantId/orders`)
- [ ] Verificar dashboard admin del restaurante conectado al nuevo API

---

## Fase 3 — Theming Dinámico en Runtime

**Objetivo:** El `accent_color` y otros valores visuales vienen de `StorefrontConfig.restaurantConfig` y se inyectan como CSS variables en runtime. Cada tenant ve su propio diseño.

### Backend

- [ ] Endpoint `GET /public/restaurant/:tenantId/config` retorna `{ accentColor, restaurantName, logo, heroVideo, currency, whatsappNumber, paymentInstructions }`

### Frontend

- [ ] En `app/layout.tsx` (o `app/(public)/layout.tsx`): fetch de config en servidor → inyectar `<style>` con `:root { --accent: ${config.accentColor}; }`
- [ ] Pasar `restaurantName` al `<title>` y meta tags dinámicamente
- [ ] Pasar `logo` a `Navbar` dinámicamente
- [ ] Pasar `heroVideo`/imagen cover a `Hero` dinámicamente
- [ ] Verificar que `--accent` se aplica correctamente en botones, highlights, badges de precio
- [ ] Probar con 2 colores diferentes (ej: `#FF4500` y `#2563EB`) para validar aislamiento

---

## Fase 4 — Multi-tenancy: Resolución de Tenant

**Objetivo:** El storefront detecta automáticamente qué tenant es según el subdominio o dominio. No requiere hardcodear `tenantId`.

### Backend

- [ ] Crear endpoint `GET /public/restaurant/by-domain/:domain` que resuelve `tenantId` desde `StorefrontConfig.domain`
- [ ] Asegurar que `StorefrontConfig.domain` acepta subdominios (`restaurante1.smartkubik.com`) y dominios propios (`menu.mirestaurante.com`)

### Frontend

- [ ] Crear `lib/tenant.ts` con función `resolveTenant()`:
  - En desarrollo: usa `NEXT_PUBLIC_TENANT_ID` env var
  - En producción: extrae subdominio del `host` header en Server Component
- [ ] Pasar `tenantId` como prop desde layout root a todos los server components
- [ ] Remover hardcoded IDs de cualquier fetch
- [ ] Probar con subdominio local (via `/etc/hosts` o Nginx)

### Infraestructura

- [ ] Configurar Nginx para pasar subdominios `*.smartkubik.com` al mismo Next.js process
- [ ] Actualizar `next.config.mjs` si se necesitan rewrites para subdominios

---

## Fase 5 — Panel Admin en SmartKubik

**Objetivo:** El dueño del tenant activa/configura el storefront de restaurante desde el admin ERP de SmartKubik sin necesidad de tocar código.

### Frontend Admin (food-inventory-admin/)

- [ ] Crear sección "Storefront Restaurante" dentro de Settings del tenant
- [ ] Formulario con campos: nombre, logo URL, video hero URL, color de acento (color picker), moneda, WhatsApp, instrucciones de pago
- [ ] Toggle para activar/desactivar el storefront público
- [ ] Preview en vivo del color de acento
- [ ] Conectar al endpoint `PUT /api/v1/storefront/restaurant-config` (usa StorefrontConfig existente)
- [ ] Vista de pedidos del restaurante (tabla con filtros de estado)
- [ ] Pipeline de estados de pedido (pendiente → confirmado → preparando → listo → entregado) desde el admin ERP

### Backend

- [ ] Endpoint `PUT /api/v1/restaurant-storefront/config` para actualizar `StorefrontConfig.restaurantConfig` por tenantId
- [ ] Validar que solo el tenant owner puede actualizar su propia config

---

## Fase 6 — Deploy a Producción

**Objetivo:** El storefront de restaurante corre en producción para el primer tenant real.

### Build & Deploy

- [ ] Agregar `restaurant-storefront/` al proceso de build (`npm run build`)
- [ ] Configurar variables de entorno en servidor para `restaurant-storefront`
- [ ] Actualizar script de deploy para incluir `restaurant-storefront`
- [ ] Configurar PM2 para `restaurant-storefront` (proceso separado, ej. puerto 3001)
- [ ] Configurar Nginx: `restaurante.smartkubik.com` → proxy a puerto 3001

### Validación

- [ ] Probar flujo completo: tenant crea platos → storefront muestra menú → cliente hace pedido → llega a WhatsApp
- [ ] Probar theming: cambiar `accentColor` desde admin → refrescar storefront → ver cambio
- [ ] Probar multi-tenant: 2 restaurantes diferentes, subdominios diferentes, datos aislados

---

## Referencias Rápidas

### Rutas API nuevas (base: `/api/v1`)

| Método | Ruta | Auth | Descripción |
|--------|------|------|-------------|
| GET | `/public/restaurant/:tenantId/config` | No | Config + tema del restaurante |
| GET | `/public/restaurant/:tenantId/menu` | No | Platos + categorías activos |
| GET | `/public/restaurant/:tenantId/dishes` | No | Lista de platos |
| GET | `/public/restaurant/:tenantId/categories` | No | Lista de categorías |
| POST | `/public/restaurant/:tenantId/orders` | No | Crear pedido |
| GET | `/restaurant-dishes` | JWT | Todos los platos (admin) |
| POST | `/restaurant-dishes` | JWT | Crear plato |
| PUT | `/restaurant-dishes/:id` | JWT | Actualizar plato |
| DELETE | `/restaurant-dishes/:id` | JWT | Eliminar plato |
| GET | `/restaurant-categories` | JWT | Categorías (admin) |
| POST | `/restaurant-categories` | JWT | Crear categoría |
| GET | `/restaurant-ingredients` | JWT | Ingredientes (admin) |
| POST | `/restaurant-ingredients` | JWT | Crear ingrediente |
| GET | `/restaurant-orders` | JWT | Pedidos (admin) |
| PATCH | `/restaurant-orders/:id/status` | JWT | Actualizar estado |

### Schemas nuevos

| Archivo | Propósito |
|---------|-----------|
| `restaurant-category.schema.ts` | Categorías del menú por tenant |
| `restaurant-ingredient.schema.ts` | Ingredientes/extras por tenant |
| `restaurant-dish.schema.ts` | Platos con ingredientes base y extras |
| `restaurant-order.schema.ts` | Pedidos del storefront |

### Directorio Frontend

```
restaurant-storefront/
  app/
    (public)/
      page.tsx              ← Home con Hero + featured dishes
      catalogo/page.tsx     ← Menú completo con filtros
      layout.tsx            ← Navbar + Footer + CartDrawer
    admin/
      login/page.tsx
      dashboard/page.tsx
      menu/page.tsx
      orders/page.tsx
      settings/page.tsx
  components/
    layout/Hero.tsx
    layout/Navbar.tsx
    layout/Footer.tsx
    menu/MenuGrid.tsx
    menu/DishCard.tsx
    menu/CategoryFilter.tsx
    menu/DishCustomizer.tsx
    cart/CartDrawer.tsx
    admin/...
  lib/
    api.ts                  ← Conecta a SmartKubik API
    tenant.ts               ← Resolución de tenant (NUEVO)
    cart-store.ts
    whatsapp.ts
```

### Variables de entorno (restaurant-storefront)

```env
NEXT_PUBLIC_API_URL=https://api.smartkubik.com/api/v1
NEXT_PUBLIC_TENANT_ID=          # Solo para desarrollo local
NEXT_PUBLIC_DEFAULT_CURRENCY=USD
```

# Storefront Público — Arquitectura y Flujos

> Documentación técnica del storefront público (Next.js 15).
> Última actualización: 2026-04-28

---

## Stack

| Tecnología | Uso |
|---|---|
| Next.js 15 | Framework (App Router) |
| React 18 | UI |
| Tailwind CSS | Styling |
| Framer Motion | Animaciones (beauty template) |

## Multi-Tenancy

El storefront soporta múltiples tiendas desde una sola aplicación:

| Entorno | Detección | Ejemplo |
|---------|-----------|---------|
| Producción | Subdominio | `mitienda.smartkubik.com` → tenant "mitienda" |
| Desarrollo | Path | `localhost:3001/mitienda` → tenant "mitienda" |

El middleware (`middleware.ts`) intercepta cada request, extrae el tenant, y reescribe la URL a `/[domain]/path`.

## Rutas

| Ruta | Descripción |
|---|---|
| `/[domain]` | Homepage de la tienda |
| `/[domain]/productos` | Catálogo con paginación, categorías, búsqueda |
| `/[domain]/productos/[id]` | Detalle de producto |
| `/[domain]/carrito` | Carrito (CartContext + localStorage) |
| `/[domain]/checkout` | Proceso de pago |
| `/[domain]/orden/[orderNumber]` | Tracking de orden |
| `/[domain]/mis-ordenes` | Historial del cliente |
| `/[domain]/login` / `/registro` / `/perfil` | Auth del cliente |
| `/[domain]/book` | Wizard de reserva (servicios) |
| `/[domain]/reservations` | Gestión de reservas |
| `/[domain]/beauty` | Storefront beauty |
| `/[domain]/beauty/reservar` | Wizard de reserva beauty (5 pasos) |
| `/[domain]/beauty/reserva/[bookingNumber]` | Confirmación de reserva |

## Templates

| Template | Clave | Uso |
|---|---|---|
| Modern Ecommerce | `modern-ecommerce` | E-commerce genérico (default) |
| Premium | `premium` | E-commerce premium |
| Modern Services | `modern-services` | Servicios y reservas |
| Beauty | `beauty` | Salones de belleza (profesionales, galería, reviews) |

El template se selecciona desde `StorefrontConfig.templateType` del backend. `templateFactory.ts` resuelve qué componentes renderizar.

## Theming Dinámico

Cada tenant tiene su propio tema:
- Colores primario/secundario definidos en `StorefrontConfig.theme`
- Se inyectan como CSS variables en el `<html>` del layout
- Custom CSS adicional soportado
- Logo, favicon, banner configurables

## API Contract (Endpoints Públicos)

| Endpoint | Descripción |
|---|---|
| `GET /public/storefront/by-domain/{domain}` | Config de la tienda (tema, template, módulos) |
| `GET /public/products?tenantId=X` | Productos (solo SIMPLE, con stock > 0) |
| `GET /public/products/:id?tenantId=X` | Detalle de producto |
| `GET /public/products/categories/list?tenantId=X` | Categorías |
| `POST /public/orders` | Crear orden (sin auth) |
| `GET /orders/track/:orderNumber?tenantId=X` | Tracking |
| `POST /customers/auth/register` | Registro de cliente |
| `POST /customers/auth/login` | Login de cliente |
| `GET /public/services?tenantId=X` | Servicios (booking) |
| `POST /public/appointments/availability` | Disponibilidad de horarios |
| `POST /public/appointments` | Crear reserva |
| `GET /public/beauty-services/{tenantId}` | Servicios beauty |
| `POST /public/beauty-bookings` | Crear booking beauty |
| `POST /public/beauty-bookings/availability` | Disponibilidad beauty |
| `GET /public/tenant-payment-config/{tenantId}/payment-methods` | Métodos de pago |

## Estado del Cliente

| Context | Propósito |
|---|---|
| `AuthContext` | JWT del cliente (separado del admin), perfil, login/logout |
| `CartContext` | Carrito (localStorage), agregar/quitar items, totales |

## Datos NO compartidos

El storefront **no comparte código** con el backend ni con el admin frontend. Los tipos se duplican localmente en `types/index.ts`. La comunicación es solo HTTP/JSON.

---

*Última actualización: 2026-04-28*

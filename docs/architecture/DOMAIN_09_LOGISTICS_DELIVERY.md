# Domain 9: Logistics & Delivery (Envíos y Despachos)

## 📌 Visión General
Dominio altamente acoplado a la venta (E-Commerce y Storefront). Modela las zonas de entrega propias (Delivery) con tarifas dinámicas por kilómetro (integración con mapas planificada) y tarifas de agencias de envíos nacionales (Couriers).

## 🗄️ Data Layer (Esquemas de Base de Datos)
La persistencia es directa y enfocada en el *Pricing* logístico:

- **`DeliveryRates`** (`delivery-rates.schema.ts`): Tarificador único por Tenant. Mantiene la coordenada GPS del negocio base (`businessLocation`). Permite definir Zonas Perimetrales de Entrega Personal (`polygonsCoordinates`) y cobra un diferencial si el cliente se ubica más lejos (`ratePerKm`). Actúa también como "Shipping Settings" para habilitar o deshabilitar Pick-up vs Delivery nacional.
- **`ShippingProvider`** (`shipping-provider.schema.ts`): Catálogo semántico de Agencias de Encomiendas Nacionales (ej. MRW, Zoom, Tealca). Guarda un árbol geográfico de Región -> Ciudad -> Agencias (`address`, `coordinates`) permitiendo que el Storefront le ofrezca al cliente final un Dropdown exacto de dónde retirar su paquete en territorio nacional.
- **`Routing`** (`routing.schema.ts`): A pesar de llamarse Routing, su estructura de datos (`setupTime`, `cycleTime`, `laborRequired`, `operations`) indica que **pertenece al Dominio 8 (Manufacturing)**. Es la ruta paso-a-paso de una Receta dentro de los Work Centers, no la ruta física de un camión de reparto. Fue catalogada aquí por error semántico del nombre de archivo.

## ⚙️ Backend (API Layer)
El backend de logística es ligero pero crítico para el FrontEnd público:

- **`/modules/delivery/`**:
  - `delivery.controller.ts` y `shipping-providers.controller.ts`: Endpoints CRUD estándar para que el Admin configure zonas de reparto manual o cargue el tarifario de Zoom/MRW.
  - `delivery-public.controller.ts` (`1.8KB`): Endpoint crítico sin autenticación que el `Storefront` consulta al momento del checkout del carrito. Recibe una coordenada u ubicación del cliente y le calcula en tiempo real cuánto le saldrá el flete antes de pagar.

## ⚠️ Deuda Técnica y Code Smells Detectados

1. **Dependencia Fuerte a Geometría (Polígonos)**: El esquema `DeliveryZone` permite definir coordenadas de polígonos. A nivel backend, intersectar un punto dado por el cliente dentro de un polígono es pesado en CPU si se hace con Node.JS puro. Es recomendable delegar esta query geométrica a MongoDB (`$geoIntersects`) que requiere índices `2dsphere` para ser performante, de lo contrario la API sufrirá cuellos de botella severos cuando el tráfico del Storefront escale.
2. **Naming Convention Engañosa (`Routing`)**: El modelo `routing.schema.ts` debe ser renombrado a `manufacturing-routing.schema.ts` para evitar confusión con mapas o enrutamiento de vehículos.
3. **Ausencia de Tracking Activo**: No hay un esquema para "Waybills" o "Shipments" (Guías de Despacho). Actualmente, las paqueterías asumen que toda la logística post-compra vive en un string de texto dentro del `Order` en el Dominio 3, no permitiendo crear manifiestos de carga para los motorizados o flotas de camiones propias.

---

**Siguientes Pasos Recomendados (Roadmap a futuro):**
- Implementar índices 2D Geoespaciales en MongoDB para el modelo `DeliveryRates`.
- Relocalizar mentalmente y físicamente `Routing` al módulo en pausa de Manufactura.
- Diseñar el módulo complementario de "Fleet Management & Dispatches" (Gestión de Flota) cuando el sistema madure a despachos masivos B2B en camiones.

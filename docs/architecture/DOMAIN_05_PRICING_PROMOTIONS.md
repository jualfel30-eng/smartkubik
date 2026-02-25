# Domain 5: Pricing & Promotions (Motor de Precios y Comisiones)

## 📌 Visión General
Este dominio gobierna las leyes económicas del catálogo y del personal de ventas. Su arquitectura no solo se encarga de definir cuánto vale un producto hoy, sino de mantener múltiples listas de precios simultáneas, trazar el historial de fluctuaciones de márgenes de ganancia, y calcular algorítmicamente las comisiones de los vendedores.

## 🗄️ Data Layer (Esquemas de Base de Datos)
La persistencia separa la definición global de precio del precio asignado:

- **`PriceList`** (`price-list.schema.ts`): Entidad maestra de las listas de precios (ej. "Mayorista", "VIP", "Black Friday"). Permite prioridad y configuración de auto-aplicación en base a métricas del cliente (`autoApplyRules.customerTypes`).
- **`ProductPriceList`** (`product-price-list.schema.ts`): Tabla pivot que vincula la Variante de un `Product` con un `PriceList` en específico, definiendo el `customPrice`.
- **`PriceHistory`** (`price-history.schema.ts`): Bitácora inmutable de auditoría. Cada vez que cambia el `basePrice`, `costPrice` o `wholesalePrice`, este esquema captura el valor antiguo, el nuevo valor, el porcentaje de delta (`changePercentage`), y quién hizo el cambio (`changeSource`: manual, api, bulk).
- **`CommissionPlan`** (`commission-plan.schema.ts`): Motor de configuración de incentivos de venta. Permite modelos porcentuales fijos (`fixedAmount`), o escalonados (`tiered`) usando arrays de `tiers` (ej. vender 0-1000$ otorga 3%, 1000-5000$ otorga 5%). Configura exenciones de cálculo (como no contar el costo de envío o el IVA de la base imponible).
- **`CommissionRecord`** (Inferido): Generado automáticamente cuando se concreta un `Order` (Dominio 3).

## ⚙️ Backend (API Layer)
El backend procesa y asigna las prioridades de estas estructuras:

- **`PriceListsController` & `PriceListsService` (`9KB`)**: Gestiona CRUD de listas y asignaciones de precios específicos de productos masivos o por unidad.
- **`CommissionsModule`**: Dividido en submódulos modernos (`controllers/`, `services/`, `listeners/`). Destaca el uso de `listeners/` lo cual indica una arquitectura basada en eventos (Event-Driven Architecture) donde el cálculo de la comisión se dispara asíncronamente (probablemente tras el cerrado o pago exitoso de la orden) sin bloquear el Checkout.

## ⚠️ Deuda Técnica y Code Smells Detectados

1. **Fragmentación Cognitiva de Promociones**: Este "Dominio 5" teóricamente engloba Promociones, pero en la base de datos real, los schemas de `Promotion` y `Coupon` residen y fueron documentados en el **Dominio 4 (CRM)** por su alto cruce con segmentos de clientes. Sin embargo, para fines de Pricing, el motor de Checkout (en `orders.service.ts`) debe orquestar `PriceList` (Dominio 5) + `Promotion` (Dominio 4) + `BulkDiscount` (dentro de Product, Dominio 2). Esta triple amenaza fragmenta severamente el cálculo del "Precio Real" del carrito.
2. **Denormalización en el Historial de Precios**: `PriceHistory` almacena `productName` y `variantName`. Esto es rápido para reportes sin hacer JOIN/Lookup, pero si el producto cambia de nombre en un typo correction, el historial de auditoría mostrará el nombre antiguo. No es crítico, pero es un trade-off notable.
3. **Ausencia de Histórico de Costos LIFO/FIFO Activo a Nivel de Producto**: El historial registra cambios de `costPrice`, pero el costo real de una orden depende de a qué Lote pertenece el inventario despachado (Dominio 2). Cambiar el `costPrice` maestro en el `Product` afecta futuros ingresos, pero no retrasa contablemente lo que ya está en almacén.

---

**Siguientes Pasos Recomendados (Roadmap a futuro):**
- **Extraer Lógica de Pricing:** Agrupar `PriceList`, `Promotion` y `Coupons` bajo un único servicio abstracto: `PriceResolverCalculator` que reciba el User Context + Cart Items y devuelva las líneas de precio finales, aliviando al `orders.service.ts`.
- **Commissions Events:** Monitorear el rendimiento de los `listeners` en `CommissionsModule` bajo alta concurrencia transaccional para evitar fallos de memoria.

# Domain 4: CRM & Marketing

## 📌 Visión General
Este dominio gobierna las relaciones con los clientes, la gestión de prospectos de ventas (B2B) y la orquestación del marketing automatizado. Es un ecosistema robusto diseñado para capturar clientes (Storefront/WhatsApp), cultivarlos mediante embudos de venta, e incrementar su *Lifetime Value* (LTV) a través de campañas y promociones inteligentes.

## 🗄️ Data Layer (Esquemas de Base de Datos)
La persistencia refleja un CRM moderno y un motor promocional integrado:

- **`Customer`** (`customer.schema.ts`): Entidad enciclopédica. Guarda direcciones, información fiscal (`taxInfo`), métricas históricas de ventas (`averageOrderValue`, `lifetimeValue`, `returnRate`), preferencias de comunicación, puntos de lealtad (`loyaltyScore`) e integraciones directas con WhatsApp (`whatsappChatId`) y el Storefront (`passwordHash`, `lastLoginAt`).
- **`Opportunity`** (`opportunity.schema.ts`): Representa un Trato o *Deal* en el Pipeline B2B. Incluye etapas de negociación (`stage`), probabilidad de cierre, información de competidores, razones de pérdida/bloqueo y un log auditable de cambios de etapa (`stageHistory`).
- **`MarketingCampaign`** (`marketing-campaign.schema.ts`): Motor de difusión multicanal (`email`, `sms`, `whatsapp`, `push`). Permite segmentación avanzada (ej. "clientes inactivos por 30 días con minSpent de $100") y mide ROI (`totalOpened`, `totalConverted`, `revenue`).
- **`Coupon`** y **`Promotion`** (`coupon.schema.ts`, `promotion.schema.ts`): Motores de descuento granular. Soportan lógicas complejas como *Tiered Pricing* (escalonado), *Buy X Get Y*, cruce de categorías, e inclusión/exclusión manual de clientes VIP o productos en específico.

## ⚙️ Backend (API Layer)
La API divide lógicamente la gestión humana de clientes y la automatización del marketing:

- **`CustomersController` & `CustomersService`**: CRUD pesado (`44KB` de lógica). Incluye el `CustomersAuthController` paralelo para manejar el login/registro de clientes (end-users) directamente en los Storefronts generados.
- **`OpportunitiesController` & `OpportunitiesService`**: Herramientas para los ejecutivos de ventas de los tenants. Un servicio de `43KB` que maneja el movimiento de tarjetas tipo Kanban y pronósticos de ingresos.
- **`Marketing Module` (El más denso de este grupo)**: No existe un `/modules/crm/`, pero `/modules/marketing/` concentra 18 archivos que incluyen sub-controladores fascinantes:
  - `whatsapp.service.ts` (`25KB`): Integración profunda para envío/recepción de mensajes.
  - `marketing-trigger.service.ts` y `workflow.service.ts`: Manejadores de automatización (If-This-Then-That) para disparar campañas en base a eventos de los clientes (ej. Carrito abandonado, Cumpleaños).
  - `ab-testing.service.ts`: Capacidad de dividir audiencias y testear variantes de mensajes.

## ⚠️ Deuda Técnica y Code Smells Detectados

1. **Ambigüedad Cliente vs Usuario de Storefront**: El esquema `Customer` (que el tenant usa para rastrear compradores) contiene validaciones de auth como `passwordHash` y `emailVerificationToken`. Esta unificación ahorra colecciones, pero mezcla el dominio de CRM (estado de cuenta, LTV) con el dominio de Identidad Pública (Login OAuth, Reseteo de contraseñas), lo cual puede ser un riesgo de seguridad si los controladores de CRM exponen accidentalmente hashes de contraseñas a los tenants.
2. **Duplicidad de Modelos Triggers/Workflows**: Existen `marketing-trigger.schema.ts` y `marketing-workflow.schema.ts` (basado en el escaneo de schemas). El directorio `/modules/marketing/` revela servicios distintos para ambos. A menudo en sistemas SaaS, Triggers y Workflows terminan solapando su responsabilidad de "automatización reactiva" causando carreras y envíos dobles de correos si no están perfectamente orquestados.
3. **Múltiples Fuentes de la Verdad para Descuentos**: `Coupon`, `Promotion` y los campos de `bulkDiscountRules` directos en el `Product` compiten para calcular el "Precio Final" durante el Checkout. El orden lógico de aplicación (¿aplica primero promo o el cupón?) no parece estar extraído en un servicio `PricingPolicyEngine`, lo que puede llevar a márgenes negativos sin control matemático centralizado.

---

**Siguientes Pasos Recomendados (Roadmap a futuro):**
- Aislar el "Identity" del `Customer` (auth del Storefront) en una colección o tabla relacional paralela 1:1, asegurando que los endpoints del Tenant nunca toquen campos de auth.
- Consolidar las reglas algorítmicas de `Promotion` + `Coupon` + `Product Pricing` en una Máquina de Estados o Motor de Descuentos agnóstico unitario.
- Centralizar la reportería de ROI de campañas vinculándola directamente a los Cierres de Caja/Órdenes del Dominio 3, para evitar discrepancias de `totalRevenue`.

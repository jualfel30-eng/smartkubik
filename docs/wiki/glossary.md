# SmartKubik — Glosario

> Definiciones de términos usados en el sistema SmartKubik.
> Última actualización: 2026-04-28

---

## Términos de Negocio

| Término | Definición |
|---|---|
| **Tenant** | Una organización/empresa que usa SmartKubik. Cada tenant tiene sus datos completamente aislados. |
| **Vertical** | El tipo de industria del tenant: Food/Retail, Restaurante, Beauty, Hospitality, Servicios, Manufactura. |
| **Vertical Profile** | Sub-tipo dentro de una vertical. Ej: dentro de "Services" puede ser `barbershop-salon`, `clinic-spa`, `mechanic-shop`. |
| **Sede** | Una ubicación física del negocio (subsidiary). Un tenant puede tener múltiples sedes. |
| **Almacén (Warehouse)** | Lugar donde se almacena inventario. Puede haber varios por sede. |
| **Bin Location** | Ubicación específica dentro de un almacén (estante, pasillo, zona). |
| **SKU** | Stock Keeping Unit. Código único por producto/variante dentro del tenant. Prefijo automático de 3 letras del nombre del tenant. |
| **Variante** | Versión de un producto (ej: Harina 1kg, Harina 5kg). Cada variante tiene su propio SKU, precio y stock. |
| **Unidad de Venta (Selling Unit)** | Unidad en la que se vende un producto. Ej: producto base en "sacos", unidad de venta en "kg" con factor de conversión 0.04. |
| **Orden de Compra (PO)** | Pedido al proveedor. Flujo: Pendiente → Aprobada → Recibida (actualiza inventario). |
| **Orden de Venta** | Venta al cliente. Flujo: Pendiente → Confirmada → Preparando → Lista → Entregada. |
| **Transferencia** | Movimiento de inventario entre almacenes. Tipos: PUSH (origen envía) y PULL (destino solicita). |
| **Merma (Waste)** | Pérdida de inventario por daño, vencimiento u otras causas. Se registra como movimiento negativo. |
| **Caja Registradora** | Sesión de trabajo de un cajero. Se abre con fondos iniciales, registra ventas/movimientos, y se cierra con cuadre. |
| **Cuenta por Pagar (Payable)** | Deuda con un proveedor. Se genera al recibir una compra a crédito. |
| **Cuenta por Cobrar** | Deuda de un cliente. Se genera al vender a crédito. |
| **Asiento Contable (Journal Entry)** | Registro contable de doble partida (debe y haber). Puede ser manual o automático. |
| **Plan de Cuentas** | Estructura jerárquica de cuentas contables (Activo, Pasivo, Patrimonio, Ingreso, Gasto). |
| **Nómina (Payroll Run)** | Proceso de cálculo y pago de salarios para un período. |
| **Estructura de Nómina** | Plantilla que define qué conceptos (devengos, deducciones, aportes) aplican a un grupo de empleados. |
| **BOM (Bill of Materials)** | Lista de materiales necesarios para fabricar un producto. |
| **MRP** | Manufacturing Resource Planning. Sistema que calcula qué producir basado en demanda y stock disponible. |
| **Orden de Manufactura** | Instrucción de producción. Consume materias primas y produce producto terminado. |

---

## Términos Técnicos

| Término | Definición |
|---|---|
| **tenantId** | ObjectId de 24 caracteres hex que identifica al tenant. Presente en TODOS los documentos de la BD. |
| **forwardRef** | Patrón de NestJS para resolver dependencias circulares entre módulos. Muy usado en SmartKubik (~30 pares). |
| **Guard** | Middleware de NestJS que intercepta requests antes de llegar al controller. Stack: Throttler → JWT → Tenant → Permissions. |
| **DTO** | Data Transfer Object. Clase que define y valida la estructura de datos de entrada usando `class-validator`. |
| **Schema** | Definición de Mongoose que mapea un documento MongoDB a un modelo TypeScript. |
| **Soft Delete** | Patrón donde los registros no se borran físicamente sino que se marcan con `isActive: false` o `isDeleted: true`. |
| **ObjectId** | Tipo de dato de MongoDB para IDs (string de 24 caracteres hexadecimales). |
| **forwardRef** | Función de NestJS que permite dependencias circulares entre módulos. |
| **BullMQ** | Librería de colas de trabajo basada en Redis. Usada para jobs asíncronos (emails, reportes, etc.). |
| **EventEmitter** | Sistema de eventos interno de NestJS. Los módulos emiten eventos que otros pueden escuchar sin dependencia directa. |
| **Feature Flag** | Configuración que habilita/deshabilita funcionalidades por tenant. Controla qué módulos están visibles. |
| **fetchApi()** | Función centralizada del frontend (`lib/api.js`) que maneja todas las llamadas HTTP al backend. Incluye auto-refresh de token. |
| **Management Component** | Patrón de componente React (`*Management.jsx`) que representa una vista principal con tabs, filtros y CRUD. |
| **RouteGate** | Componente React que decide qué renderizar según si es mobile o desktop (responsive routing). |
| **Template (Storefront)** | Diseño visual pre-construido para el storefront público. Cada tenant elige uno: modern-ecommerce, premium, modern-services, beauty. |

---

## Términos Fiscales (Venezuela)

| Término | Definición |
|---|---|
| **RIF** | Registro de Información Fiscal. Identificador tributario venezolano (formato: J-12345678-9). |
| **IVA** | Impuesto al Valor Agregado. Tasas: 0%, 8%, 16%. |
| **IGTF** | Impuesto a las Grandes Transacciones Financieras. Aplica a pagos en divisas. |
| **ISLR** | Impuesto Sobre La Renta. Se retiene en pagos a proveedores según tabla. |
| **Retención de IVA** | Porcentaje de IVA que se retiene al proveedor y se entera al SENIAT. |
| **Libro de Compras** | Registro obligatorio de todas las compras con IVA detallado. |
| **Libro de Ventas** | Registro obligatorio de todas las ventas con IVA detallado. |
| **Declaración de IVA** | Declaración periódica del IVA cobrado vs pagado ante el SENIAT. |
| **Tasa Paralela** | Tasa de cambio del mercado paralelo (no oficial). Algunos proveedores cobran a esta tasa. |
| **BCV** | Banco Central de Venezuela. Publica la tasa de cambio oficial. |
| **NDE** | Nota de Débito Electrónica. |
| **NCE** | Nota de Crédito Electrónica. |

---

## Abreviaturas

| Abreviatura | Significado |
|---|---|
| PO | Purchase Order (Orden de Compra) |
| KDS | Kitchen Display System |
| POS | Point of Sale |
| BOM | Bill of Materials |
| MRP | Manufacturing Resource Planning |
| QC | Quality Control |
| CRM | Customer Relationship Management |
| PMS | Property Management System (Hospitality) |
| PWA | Progressive Web App |
| JWT | JSON Web Token |
| DTO | Data Transfer Object |
| CRUD | Create, Read, Update, Delete |

---

*Última actualización: 2026-04-28*

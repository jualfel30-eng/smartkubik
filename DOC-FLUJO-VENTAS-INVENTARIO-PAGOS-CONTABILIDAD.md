# Doc - Flujo Integrado Ordenes, Inventario, Pagos y Contabilidad

> **Version cubierta:** v1.03  
> **Objetivo:** explicar como Smartkubik automatiza el ciclo completo desde la venta hasta la contabilidad, resaltando puntos de integracion entre modulos.

## 1. Visión general del ciclo
```
Ventas (Orden) 
  -> Actualiza Inventario (reservas, FEFO)
  -> Registra Pagos (caja/bancos, saldos)
  -> Genera Asientos Contables (ingresos, impuestos, COGS)

Compras / Payables 
  -> Incrementan Inventario o Gastos
  -> Generan Cuentas por Pagar
  -> Pagos a proveedores reflejan saldos y contabilidad
```

Cada paso alimenta dashboards, reportes financieros y CRM, manteniendo coherencia entre operacion y contabilidad sin intervencion manual.

## 2. Paso a paso desde la venta

### 2.1 Creacion de orden (Ventas)
- Usuario registra pedido en `OrdersManagementV2`.  
- El formulario calcula impuestos (IVA, IGTF) y costos de envio.  
- Al confirmar la orden (`POST /orders`):  
  - Se genera numero correlativo y se guarda en historial.  
  - Se reserva inventario (segun unidades y lotes) y se actualiza `orders.status`.  
  - Se guarda el movimiento en CRM (historial del cliente, clasificacion).  
  - Se crea asiento contable de venta pendiente (ingresos, impuestos por cobrar).  
  - Si hay pagos adelantados, se crea registro en `payments` con metodo y referencia.

### 2.2 Impacto en Inventario
- Inventario reduce stock disponible por item, respetando configuraciones FEFO/multi-unidad.  
- Si el producto es perecedero, se anotan lotes y fechas de vencimiento afectadas.  
- Alertas de stock critico se recalculan, alimentando modulo de Compras.  
- Ajustes manuales o devoluciones crean asientos contables via `AccountingService`.

### 2.3 Registro de pagos de clientes
- Desde la misma pantalla o posteriormente (`PaymentDialogV2`), se registran pagos unicos o mixtos.  
- Cada pago:  
  - Reduce balance pendiente de la orden.  
  - Genera movimiento en `payments` (con metodo, referencia, fecha).  
  - Crea asiento contable que acredita cuentas por cobrar y debita caja/bancos.  
  - Actualiza reportes de Accounts Receivable y Cash Flow.

### 2.4 Cierre de la orden
- Estados avanzan segun logistica (`confirmed`, `processing`, `delivered`).  
- Al llegar a `confirmed` se gatilla asiento de COGS (debit inventario -> cost of goods).  
- `OrderDetailsDialog` permite exportar factura/presupuesto y visualizar pagos aplicados.  
- El modulo de Contabilidad muestra el asiento correspondiente en Libro Diario.

## 3. Flujo complementario de compras y pagos a proveedores

### 3.1 Orden de compra / recepcion
- Desde `ComprasManagement` se crea orden (`POST /purchases`).  
- Inventario aumenta stock y calcula costo promedio.  
- Simultaneamente se crea `payable` con datos de proveedor, vencimiento y lineas contables.  
- Asientos: debito inventario/gasto, credito cuentas por pagar.

### 3.2 Gestion de cuentas por pagar
- `PayablesManagement` permite registrar facturas manuales o recurrentes.  
- Al pagar parcial/total:  
  - Se crea movimiento en `payments` (aplicado a payable).  
  - Se actualiza saldo pendiente y estado (`partial` o `paid`).  
  - Contabilidad registra asiento (debito cuentas por pagar, credito caja/bancos).  
  - Reportes de Accounts Payable reflejan la disminucion.

### 3.3 Conciliacion y reportes
- Contabilidad consolida ambos frentes en Libro Diario, P&G y Balance.  
- Cash Flow muestra flujos netos de cobros y pagos por periodo.  
- Exportaciones permiten entregas a contadores externos o sistemas fiscales.

## 4. Automatizaciones claves
- **Asientos automaticos:** `AccountingService` crea entradas para ventas, COGS, pagos, compras y ajustes de inventario sin accion manual.  
- **Impuestos locales:** IVA 16% y IGTF 3% se calculan automaticamente segun metodo de pago y producto.  
- **CRM + Ventas:** clientes se actualizan con nuevas compras, segmentos y ubicaciones para delivery.  
- **Kitchen Display:** en vertical restaurante las ordenes confirmadas se envian a cocina.  
- **Alertas:** bajos niveles de stock o vencimientos alimentan Compras para reordenes oportunos.  
- **Reportes financieros:** Profit & Loss, Balance y Cash Flow se alimentan en tiempo real.

## 5. Buenas practicas para tenants
- Configurar plan de cuentas y metodos de pago antes de operar.  
- Validar SKUs, unidades y puntos de reorden para mantener inventario coherente.  
- Registrar pagos inmediatamente (clientes y proveedores) para reflejar saldos reales.  
- Revisar Libro Diario y reportes mensualmente para detectar discrepancias tempranas.  
- Usar plantillas de payables para gastos fijos y evitar omisiones.  
- Exportar estados financieros y movimientos de pagos para conciliacion bancaria externa.

## 6. Documentos y componentes relacionados
- `DOC-MODULO-ORDENES.md`, `DOC-MODULO-INVENTARIO.md`, `DOC-MODULO-PAGOS.md`, `DOC-MODULO-CONTABILIDAD.md`.  
- UI principal: `OrdersManagementV2`, `InventoryManagement`, `PayablesManagement`, `AccountingManagement`.  
- Backend: modulos `orders`, `inventory`, `payables`, `payments`, `accounting`, `reports`.  
- Scripts auxiliares: `seed-database`, `seed-restaurant`, `verify-tenant-data`.

Este flujo integrado garantiza que cada venta y compra tenga impacto inmediato en inventario, finanzas y reportes, reduciendo tareas manuales y errores contables.


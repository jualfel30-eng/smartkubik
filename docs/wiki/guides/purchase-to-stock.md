# Guía Cross-Módulo: De Compra a Stock

> Flujo completo: Crear PO → Aprobar → Recibir → Inventario actualizado → Cuenta por pagar → Asiento contable.
> Módulos involucrados: Purchases, Suppliers, Inventory, Payables, Accounting, Events.
> Última actualización: 2026-04-28

---

## Diagrama del Flujo Completo

```mermaid
sequenceDiagram
    participant U as 👤 Comprador
    participant PO as 🛒 Purchases
    participant SS as 🏭 Suppliers
    participant IS as 📊 Inventory
    participant IM as 📋 Movements
    participant PA as 📋 Payables
    participant AC as 💰 Accounting
    participant EV as ⚡ Events

    Note over U,EV: FASE 1: Crear Orden de Compra
    U->>PO: POST /purchases (proveedor + items + pago)
    PO->>PO: Genera poNumber (OC-YYMMDD-HHMMSS-XXXXXX)
    PO->>SS: syncFromPurchaseOrder() — actualiza métricas
    opt Si hay fecha de vencimiento de pago
        PO->>EV: createFromPurchase() — crea tarea/recordatorio
    end

    Note over U,EV: FASE 2: Aprobar (opcional)
    U->>PO: PATCH /purchases/:id/approve
    PO->>EV: Crea evento "PO Aprobada"

    Note over U,EV: FASE 3: Recibir Mercancía (⭐ PASO CRÍTICO)
    U->>PO: PATCH /purchases/:id/receive

    rect rgb(230, 245, 230)
        Note over PO,IS: 3a. Actualizar Inventario
        loop Por cada item de la PO
            PO->>IS: addStockFromPurchase(item)
            IS->>IS: Busca inventario por productId
            alt No existe
                IS->>IS: Crea nuevo (con warehouseId default)
            else Existe
                IS->>IS: Suma qty + recalcula costo promedio
            end
            IS->>IM: Crea movimiento tipo "in" (purchase)
            IS->>IS: Actualiza variant.costPrice en Product
        end
    end

    rect rgb(230, 230, 245)
        Note over PO,SS: 3b. Vincular Productos
        loop Por cada item
            PO->>SS: linkProductToSupplier(productId, supplierId)
            SS->>SS: Agrega/actualiza Product.suppliers[]
        end
    end

    rect rgb(245, 230, 230)
        Note over PO,AC: 3c. Crear Cuentas por Pagar
        PO->>AC: findOrCreateAccount("1103", "Inventario", "Activo")
        alt Sin adelanto
            PO->>PA: create(payable: totalAmount, dueDate)
        else Con adelanto (ej: 50%)
            PO->>PA: create(payable1: adelanto, dueDate: hoy)
            PO->>PA: create(payable2: saldo, dueDate: paymentDueDate)
        end
    end

    Note over U,EV: FASE 4: Pagar al Proveedor
    U->>PA: Registra pago en CxP
    PA->>AC: createJournalEntryForPayablePayment()
    Note over AC: DR Cuentas por Pagar (2101)<br/>CR Caja/Banco (1101)
```

## Detalle paso a paso

### 1. Crear la Orden de Compra
- **Quién**: Encargado de compras
- **Dónde**: `/purchases` o `/inventory-management?tab=purchases`
- **Datos**: Proveedor (existente o nuevo), productos con cantidades/costos, condiciones de pago (contado/crédito/adelanto), moneda, tipo de documento
- **Resultado**: PO creada con status `pending`, número auto-generado, métricas del proveedor actualizadas

### 2. Aprobar (opcional)
- **Quién**: Admin/supervisor
- **Dónde**: Historial de compras → cambiar status a "Aprobado"
- **Resultado**: PO en status `approved`, evento de notificación creado

### 3. Recibir Mercancía (el paso que dispara todo)
- **Quién**: Almacenero
- **Dónde**: Historial de compras → cambiar status a "Recibido"
- **Input adicional**: Fecha de factura, nombre de quién recibió, calificación del proveedor
- **Lo que pasa automáticamente**:

| Acción | Módulo | Método | Resultado |
|--------|--------|--------|-----------|
| Stock incrementado | Inventory | `addStockFromPurchase()` | Cantidad sumada, costo promedio recalculado |
| Movimiento registrado | InventoryMovements | `create(type: "in")` | Historial de entrada con referencia a la PO |
| Costo de variante actualizado | Products | `update()` | `variant.costPrice` sincronizado |
| Producto vinculado a proveedor | Suppliers | `linkProductToSupplier()` | `Product.suppliers[]` actualizado con costo y SKU |
| Cuenta por pagar creada | Payables | `create()` | 1 o 2 payables según condiciones de pago |
| Historial registrado | TransactionHistory | `recordSupplierTransaction()` | Transacción del proveedor registrada |

### 4. Pagar al Proveedor
- **Quién**: Tesorero/Admin
- **Dónde**: `/accounts-payable`
- **Resultado**: Payable marcada como `paid`, asiento contable automático (DR CxP, CR Caja)

## ⚠️ Puntos de Fallo Conocidos

| Problema | Causa | Solución |
|----------|-------|----------|
| Stock no se actualiza al recibir | PO no cambió a status "received" | Verificar status en historial |
| Stock se duplicó | Bug histórico (ya corregido) | Ajuste manual de inventario |
| Productos con SKU de variante incorrecto | Variante generada como `-VAR1` | Editar SKU de la variante |
| Inventario sin warehouseId | Registros antiguos sin almacén | Asignar almacén manualmente |
| 2 payables en vez de 1 | Compra tiene adelanto configurado | Es correcto — 1 por adelanto, 1 por saldo |

---

*Última actualización: 2026-04-28*

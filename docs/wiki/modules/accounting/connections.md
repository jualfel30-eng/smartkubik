# Contabilidad — Mapa de Conexiones

> Accounting no importa otros módulos — es una base que muchos consumen.
> Última actualización: 2026-04-28

---

## Conexiones de Entrada (quién genera asientos)

| Módulo | Trigger | Asiento generado |
|---|---|---|
| **Orders** | Venta creada | DR CxC, CR Ventas, CR IVA |
| **Billing** | Factura emitida (event) | DR CxC, CR Ventas, CR IVA (en VES) |
| **Purchases** | PO recibida | DR Inventario, CR CxP |
| **Payments** | Pago de CxP | DR CxP, CR Caja |
| **Payroll** | Nómina ejecutada | DR Gastos, CR CxP/Banco |
| **Waste** | Merma registrada | DR Mermas, CR Inventario |
| **Appointments** | Depósito de cita | DR Banco, CR Anticipos |
| **Orders** | COGS backflush | DR Costo de Ventas, CR Inventario |

## Conexiones de Salida

| Función | Módulo destino | Contexto |
|---|---|---|
| `findOrCreateAccount()` | Interno (COA) | Busca/crea cuentas para asientos auto |
| SalesBook.`syncFromBillingDocument()` | **Billing** (lee) | Sincroniza facturas al libro de ventas |

## Módulos que importan Accounting

- Orders, Purchases, Payments, Payables, Payroll, Waste, BOM/Manufacturing, Liquidations, Appointments, BillSplits

---

*Última actualización: 2026-04-28*

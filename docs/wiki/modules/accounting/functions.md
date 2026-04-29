# Contabilidad — Catálogo de Funciones

> 9 sub-servicios, ~91 endpoints. Última actualización: 2026-04-28

---

## Resumen por Sub-Servicio

### AccountingService (Core)

| Función | Descripción |
|---|---|
| Crear cuenta | Agrega cuenta al plan de cuentas (código auto-generado 1xx-5xx) |
| Listar cuentas | Plan de cuentas completo del tenant |
| Crear asiento manual | Partida doble con validación debe=haber |
| Listar asientos | Con paginación y filtro por automático/manual |
| Asiento por venta | Auto: DR CxC (1102), CR Ventas (4101), CR IVA (2102) |
| Asiento por compra | Auto: DR Inventario (1103), CR CxP (2101) |
| Asiento por pago recibido | Auto: DR Caja (1101), CR CxC (1102) + IGTF si aplica |
| Asiento por pago de CxP | Auto: DR CxP (2101), CR Caja (1101) |
| Asiento por COGS | Auto: DR Costo de Ventas (5101), CR Inventario (1103) |
| Asiento por nómina | Auto: DR Gastos Nómina, CR CxP/Banco |
| Asiento por merma | Auto: DR Mermas (5103), CR Inventario (1103) |
| Asiento por depósito | Auto: Para citas con depósito (hospitality) |
| findOrCreateAccount | Busca o crea cuenta contable por código |
| P&L | Estado de resultados: Ingresos - Gastos por período |
| Balance General | Activos = Pasivos + Patrimonio a una fecha |
| Trial Balance | Todas las cuentas con debe/haber (validación) |
| General Ledger | Transacciones de una cuenta con saldo acumulado |
| Cash Flow | Flujo de caja por método de pago |
| CxC Report | Aging de cuentas por cobrar |
| CxP Report | Aging de cuentas por pagar |

### TaxSettingsService

| Función | Descripción |
|---|---|
| CRUD configuración fiscal | IVA, ISLR, IGTF, CUSTOMS por tenant |
| Seed defaults | Carga configuración fiscal venezolana estándar |
| Get IVA rates | Lista todas las tasas de IVA configuradas |
| Get withholding settings | Configuración de retenciones |

### IvaWithholdingService

| Función | Descripción |
|---|---|
| Crear retención IVA | Draft con certificado RET-IVA-YYYY-XXXXXX |
| Postear retención | Crea asiento: DR CxP (2101), CR IVA Retenido (2104) |
| Anular retención | Si posteada, crea asiento de reverso |
| Resumen por período | Totales por proveedor y tipo de operación |
| Exportar ARC | Formato tab-separated para SENIAT |

### IvaPurchaseBookService

| Función | Descripción |
|---|---|
| CRUD entradas | Registro en libro de compras |
| Libro por período | Entradas confirmadas/exportadas del mes |
| Resumen | Por proveedor, alícuota IVA |
| Validar libro | Verifica RIF, control, cálculos |
| Exportar TXT | Formato SENIAT, marca como exportado |

### IvaSalesBookService

| Función | Descripción |
|---|---|
| CRUD entradas | Registro en libro de ventas |
| Sync desde Billing | `syncFromBillingDocument()` — crea/actualiza entrada desde factura, maneja dual-moneda |
| Anular entrada | Marca sin borrar (cumplimiento fiscal) |
| Libro por período | Entradas del mes |
| Resumen | Por cliente, alícuota, electrónica/física |
| Validar libro | Con auto-limpieza de registros corruptos |
| Exportar TXT | Formato SENIAT |

### IvaDeclarationService

| Función | Descripción |
|---|---|
| Calcular declaración | Auto-cura datos, sincroniza billing, calcula débito-crédito fiscal |
| Presentar (file) | Genera XML, cambia a status 'filed' |
| Registrar pago | Marca como 'paid' con referencia |
| Download XML | XML para carga en portal SENIAT |

### IslrWithholdingService

| Función | Descripción |
|---|---|
| Crear retención ISLR | Por tipo de operación (salarios, honorarios, etc.) |
| Validar RIF | Con dígito verificador (módulo 11) |
| Postear | Asiento: DR CxP/Nómina, CR ISLR Retenido |
| Exportar ARC | Formato SENIAT |

### AccountingPeriodService

| Función | Descripción |
|---|---|
| Crear período | Con validación de no solapamiento |
| Cerrar período | Calcula revenue/expenses/netIncome, crea asiento de cierre |
| Reabrir | Cambia closed → open |
| Bloquear | Cambia closed → locked (inmutable) |

### RecurringEntryService

| Función | Descripción |
|---|---|
| Crear plantilla | Con frecuencia y líneas de asiento |
| Ejecutar una | Genera JournalEntry desde plantilla |
| Ejecutar pendientes | Todas las activas con nextExecutionDate ≤ hoy |
| Próximas ejecuciones | Entradas que se ejecutarán en los próximos N días |

---

## Asientos Automáticos — Detalle

### Al Vender (createJournalEntryForSale)
```
Débito:  Cuentas por Cobrar (1102) → totalAmount
Crédito: Ventas (4101) → subtotal
Crédito: IVA por Pagar (2102) → ivaTotal
```

### Al Recibir Pago (createJournalEntryForPayment)
```
Débito:  Caja/Banco (1101) → paymentAmount
Crédito: Cuentas por Cobrar (1102) → paymentAmount
// Si hay IGTF:
Débito:  Gasto IGTF (599) → igtfAmount
```

### Al Comprar (createJournalEntryForPurchase)
```
Débito:  Inventario (1103) → totalAmount
Crédito: Cuentas por Pagar (2101) → totalAmount
```

### Al Pagar CxP (createJournalEntryForPayablePayment)
```
Débito:  Cuentas por Pagar (2101) → paymentAmount
Crédito: Caja/Banco (1101) → paymentAmount
```

### Al Registrar COGS (createJournalEntryForCOGS)
```
Débito:  Costo de Ventas (5101) → costAmount
Crédito: Inventario (1103) → costAmount
```

### Al Registrar Merma (createJournalEntryForWaste)
```
Débito:  Mermas/Desperdicios (5103) → wasteAmount
Crédito: Inventario (1103) → wasteAmount
```

---

*Última actualización: 2026-04-28*

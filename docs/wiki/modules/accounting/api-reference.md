# Contabilidad — Referencia API

> ~91 endpoints en 8 controllers. Última actualización: 2026-04-28

---

## Endpoints Agrupados por Dominio

### Plan de Cuentas y Asientos (AccountingController)

| Método | Ruta | Descripción |
|---|---|---|
| POST | `/api/v1/accounting/accounts` | Crear cuenta (código auto-generado) |
| GET | `/api/v1/accounting/accounts` | Listar plan de cuentas |
| POST | `/api/v1/accounting/journal-entries` | Crear asiento manual (debe=haber) |
| GET | `/api/v1/accounting/journal-entries` | Listar asientos (page, limit, isAutomatic) |

### Reportes Financieros

| Método | Ruta | Descripción |
|---|---|---|
| GET | `/accounting/reports/profit-and-loss` | P&L (query: from, to) |
| GET | `/accounting/reports/balance-sheet` | Balance General (query: asOfDate) |
| GET | `/accounting/reports/trial-balance` | Balance de Comprobación (query: startDate, endDate, accountType) |
| GET | `/accounting/reports/general-ledger` | Libro Mayor (query: accountCode, startDate, endDate, page, limit) |
| GET | `/accounting/reports/cash-flow-statement` | Flujo de Caja (query: from, to) |
| GET | `/accounting/reports/accounts-receivable` | CxC Aging |
| GET | `/accounting/reports/accounts-payable` | CxP Aging |

### Configuración Fiscal (TaxSettingsController)

| Método | Ruta | Descripción |
|---|---|---|
| GET/POST/PUT/DELETE | `/accounting/tax-settings[/:id]` | CRUD configuración fiscal |
| GET | `/accounting/tax-settings/code/:code` | Por código (IVA-16, ISLR-HP-5) |
| GET | `/accounting/tax-settings/default/:taxType` | Default por tipo (IVA, ISLR, IGTF) |
| GET | `/accounting/tax-settings/iva/rates` | Todas las tasas IVA |
| POST | `/accounting/tax-settings/seed` | Cargar defaults venezolanos |

### Retenciones IVA (IvaWithholdingController)

| Método | Ruta | Descripción |
|---|---|---|
| GET/POST/PUT/DELETE | `/accounting/iva-withholding[/:id]` | CRUD retenciones |
| PUT | `/accounting/iva-withholding/:id/post` | Postear (crea asiento) |
| PUT | `/accounting/iva-withholding/:id/annul` | Anular (reversa asiento) |
| GET | `/accounting/iva-withholding/period/:month/:year` | Por período |
| GET | `/accounting/iva-withholding/summary/:month/:year` | Resumen |
| GET | `/accounting/iva-withholding/export/arc/:month/:year` | Exportar ARC SENIAT |

### Libros de IVA (IvaBooksController)

| Método | Ruta | Descripción |
|---|---|---|
| GET/POST/PUT/DELETE | `/accounting/iva-books/purchases[/:id]` | CRUD libro compras |
| GET | `/accounting/iva-books/purchases/period/:month/:year` | Libro del mes |
| GET | `/accounting/iva-books/purchases/summary/:month/:year` | Resumen |
| GET | `/accounting/iva-books/purchases/validate/:month/:year` | Validar |
| GET | `/accounting/iva-books/purchases/export/:month/:year` | Exportar TXT |
| GET/POST/PUT/DELETE | `/accounting/iva-books/sales[/:id]` | CRUD libro ventas |
| PUT | `/accounting/iva-books/sales/:id/annul` | Anular entrada |
| GET | `/accounting/iva-books/sales/period/:month/:year` | Libro del mes |
| GET | `/accounting/iva-books/sales/summary/:month/:year` | Resumen |
| GET | `/accounting/iva-books/sales/validate/:month/:year` | Validar |
| GET | `/accounting/iva-books/sales/export/:month/:year` | Exportar TXT |

### Declaración IVA (IvaDeclarationController)

| Método | Ruta | Descripción |
|---|---|---|
| GET | `/accounting/iva-declaration` | Listar declaraciones |
| GET | `/accounting/iva-declaration/:id` | Por ID |
| GET | `/accounting/iva-declaration/period/:month/:year` | Por período |
| POST | `/accounting/iva-declaration/calculate` | Calcular (auto-sync + validate) |
| PUT | `/accounting/iva-declaration/:id` | Actualizar |
| PUT | `/accounting/iva-declaration/:id/file` | Presentar a SENIAT |
| PUT | `/accounting/iva-declaration/:id/payment` | Registrar pago |
| GET | `/accounting/iva-declaration/:id/xml` | Download XML |
| DELETE | `/accounting/iva-declaration/:id` | Eliminar (draft/calculated) |

### Retenciones ISLR (IslrWithholdingController)

| Método | Ruta | Descripción |
|---|---|---|
| GET/POST/PUT/DELETE | `/accounting/islr-withholding[/:id]` | CRUD retenciones |
| PUT | `/accounting/islr-withholding/:id/post` | Postear (crea asiento) |
| PUT | `/accounting/islr-withholding/:id/annul` | Anular |
| GET | `/accounting/islr-withholding/period/:month/:year` | Por período |
| GET | `/accounting/islr-withholding/summary/:month/:year` | Resumen |
| GET | `/accounting/islr-withholding/export/arc/:month/:year` | Exportar ARC |

### Períodos Contables (AccountingPeriodController)

| Método | Ruta | Descripción |
|---|---|---|
| POST | `/accounting/periods` | Crear período |
| GET | `/accounting/periods` | Listar (status, fiscalYear) |
| GET | `/accounting/periods/current` | Período abierto actual |
| GET | `/accounting/periods/fiscal-years` | Años fiscales disponibles |
| POST | `/accounting/periods/close` | Cerrar período (calcula + asiento) |
| PUT | `/accounting/periods/:id/reopen` | Reabrir |
| PUT | `/accounting/periods/:id/lock` | Bloquear (inmutable) |
| PUT | `/accounting/periods/:id/unlock` | Desbloquear |

### Asientos Recurrentes (RecurringEntryController)

| Método | Ruta | Descripción |
|---|---|---|
| POST | `/accounting/recurring-entries` | Crear plantilla |
| GET | `/accounting/recurring-entries` | Listar (isActive, frequency) |
| GET | `/accounting/recurring-entries/upcoming` | Próximas ejecuciones |
| POST | `/accounting/recurring-entries/:id/execute` | Ejecutar una |
| POST | `/accounting/recurring-entries/execute-pending` | Ejecutar todas pendientes |
| PUT | `/accounting/recurring-entries/:id/toggle-active` | Activar/desactivar |

---

## Permisos

Todos los endpoints usan: `accounting_read` (GET), `accounting_create` (POST), `accounting_update` (PUT), `accounting_delete` (DELETE)

---

*Última actualización: 2026-04-28*

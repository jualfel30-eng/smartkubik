# Doc - Modulo Contabilidad General

> **Version cubierta:** v1.03  
> **Ubicacion en la app:** Menu lateral `Finanzas` -> `Contabilidad` (componentes `AccountingManagement`, `JournalEntriesView`, `ChartOfAccountsView`, `ProfitLossView`, `BalanceSheetView`)  
> **APIs relacionadas:** `/accounting/journal-entries`, `/accounting/chart-of-accounts`, `/accounting/reports/profit-loss`, `/accounting/reports/balance-sheet`, `/accounting/reports/accounts-receivable`, `/accounting/reports/accounts-payable`, `/accounting/reports/cash-flow-statement`  
> **Permisos requeridos:**  
> - `accounting_read` para acceso general  
> - `accounting_create` para registrar asientos manuales (si la UI lo habilita)  
> - `accounting_update` para ajustes en cuentas

## 1. Proposito del modulo
Ofrece una vista central de la contabilidad: revision del libro diario, administracion del plan de cuentas, generacion de estados financieros y acceso a informes claves. La mayor parte de los asientos se generan automaticamente (ventas, compras, inventario), pero la UI permite consulta y gestion manual cuando se requiere.

## 2. Navegacion por pestañas

### 2.1 Libro Diario (`JournalEntriesView`)
- Tabla paginada con filtros por rango de fechas, tipo de asiento, estado y referencia.  
- Cada fila muestra fecha, descripcion, origen (automatico/manual), total debito/credito y estado de balance.  
- Opcion de expandir para ver lineas con cuenta, descripcion y montos.  
- Boton `Registrar Asiento Manual` (segun habilitacion) para crear entradas via `POST /accounting/journal-entries`.  
- Exportacion CSV/Excel para cargar en sistemas externos o auditorias.

### 2.2 Plan de Cuentas (`ChartOfAccountsView`)
- Arbol o tabla con codigo, nombre, tipo (Activo, Pasivo, Patrimonio, Ingreso, Gasto) y estado.  
- Formulario para crear nuevas cuentas (el backend genera codigo secuencial segun tipo).  
- Posibilidad de editar nombre, descripcion y estatus.  
- Filtrado por tipo y busqueda por codigo/nombre.  
- Integracion con Payables y otros modulos que usan cuentas contables.

### 2.3 Estado de Resultados (`ProfitLossView`)
- Selector de rango de fechas.  
- Calcula ingresos, costo de venta, gastos operativos, utilidad bruta y neta.  
- Permite exportar a PDF o Excel.  
- Muestra enlaces o botones para profundizar en cuentas especificas.  
- Datos provienen de asientos registrados en las cuentas mapeadas (ventas, COGS, gastos).

### 2.4 Balance General (`BalanceSheetView`)
- Corte a fecha especifica.  
- Presenta Activos (corriente/no corriente), Pasivos y Patrimonio.  
- Calcula total Activo = Pasivo + Patrimonio.  
- Permite comparar con periodo anterior (segun configuracion).  
- Exportacion disponible para presentar a gerencia o bancos.

### 2.5 Informes adicionales (`Reports` tab)
- Acceso rapido a `Accounts Receivable`, `Accounts Payable`, `Cash Flow Statement` y otros reportes agregados.  
- Cada enlace abre vista dedicada (por ejemplo `/accounting/reports/accounts-receivable`).  
- Los informes reutilizan APIs de contabilidad para mostrar saldos, edades, flujos netos.

## 3. Flujos de uso comunes

### 3.1 Cierre mensual
1. Revisar el libro diario para asegurar que no existan asientos desequilibrados.  
2. Generar Estado de Resultados del mes y comparar con periodos previos.  
3. Revisar Balance General al ultimo dia del mes.  
4. Ejecutar `Cash Flow Statement` para verificar flujos operativos.  
5. Exportar o guardar PDF de los reportes para archivo y enviar a direccion.

### 3.2 Creacion de cuenta nueva
1. Ir a `Plan de Cuentas`.  
2. Click en `Crear Cuenta`.  
3. Seleccionar tipo (ej. Gasto) y completar nombre/descripcion.  
4. Guardar; el sistema asigna codigo (ej. 501).  
5. La cuenta queda disponible para payables, journal entries y reportes.

### 3.3 Revision de asiento automatico
1. En `Libro Diario`, buscar asiento por referencia (numero de orden, payable, etc.).  
2. Expandir lineas para verificar cuentas y montos (ventas, COGS, impuestos).  
3. Si se requiere ajuste manual (error detectado), crear asiento correctivo contrapartida o usar herramientas de reverso (segun politica contable).  
4. Validar que total debitos = creditos.

## 4. Automatizaciones que alimentan la contabilidad
- **Ordenes de venta:** generan asientos de ingreso, impuestos y COGS via `AccountingService`.  
- **Pagos recibidos:** registran movimiento en cuentas de caja/bancos y actualizan cuentas por cobrar.  
- **Compras y payables:** crean asientos de inventario/gasto y cuentas por pagar.  
- **Ajustes de inventario:** reflejan variaciones de inventario y cuentas de ajuste.  
- **Pagos a proveedores:** reducen cuentas por pagar y afectan caja/bancos.  
- **Feature flags:** se pueden activar reportes avanzados (`ENABLE_ADVANCED_REPORTS`) o dashboards graficos según roadmap.

## 5. Buenas practicas de soporte
- Asegurar que los tenants tengan plan de cuentas configurado antes de registrar operaciones (seed inicial disponible).  
- Verificar que las cuentas usadas en payables o journal entries existan y esten activas.  
- En caso de diferencias en reportes, revisar primero asientos automaticos asociados (consultar numero de documento).  
- Recomendar exportar regularmente (CSV/PDF) para respaldo externo.  
- Para auditorias, utilizar filtros por origen `automatic` vs `manual` para aislar ajustes.  
- Si un reporte no carga, comprobar permisos `accounting_read` y que la API responda (ver consola y `toast.error`).

## 6. Recursos vinculados
- UI: `AccountingManagement.jsx`, `JournalEntriesView.jsx`, `ChartOfAccountsView.jsx`, `ProfitLossView.jsx`, `BalanceSheetView.jsx`.  
- Backend: `food-inventory-saas/src/modules/accounting/`, `journal-entry`, `chart-of-accounts`, `reports`.  
- Documentos asociados: `DOC-MODULO-PAGOS.md`, `DOC-MODULO-ORDENES.md`, `DOC-FLUJO-VENTAS-INVENTARIO-PAGOS-CONTABILIDAD.md`.


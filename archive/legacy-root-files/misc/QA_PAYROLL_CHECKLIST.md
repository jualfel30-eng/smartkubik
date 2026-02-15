# QA rápido – Módulo de Nómina / RRHH

Checklist conciso para validar end-to-end el módulo de nómina con prácticas sanas. Ejecuta backend y frontend con logs visibles.

## Preparación
- Backend: `cd food-inventory-saas && npm run start:dev`
- Frontend: `cd food-inventory-admin && npm run dev`
- Health: `curl http://localhost:3000/api/v1/health`
- Flags: `curl -H "Authorization: Bearer <token>" http://localhost:3000/api/v1/feature-flags`

## Flujo e2e (feliz)
1) **Empleados/Contratos**
   - Crear empleado desde RRHH/CRM.
   - Abrir drawer → editar perfil/contacto, guardar sin error.
   - Crear contrato (rol/depto/frecuencia/estructura). “Sin estructura” no debe romper.
   - Ver sugerencias `/payroll/structures/suggestions` sin 500.
2) **Estructuras / Localización**
   - Crear/activar versión de estructura y asignarla al contrato.
   - Importar localización (JSON/CSV) con `autoApprove=true` → queda `pending`; aprobar `/payroll/localizations/:id/approve` o esperar cron (6h) que activa si `autoApprove` está en metadata.
3) **Runs**
   - Crear run (wizard) con empleados activos → `calculated`.
   - `approve` → crea payable; `pay` → payments/IGTF si aplica.
   - Export run CSV/PDF y recibos; preview contable balanceado (`/runs/:id/accounting-preview`).
   - Remap cuentas: `/payroll/concepts/remap-accounts` → sin error; preview sigue balanceado.
4) **Especiales / Liquidaciones VE**
   - Crear `SpecialPayrollRun` y `LiquidationRun VE`; `calculate → approve → pay`.
   - Export CSV/PDF y preview contable por run.
5) **Reportes / Auditoría**
   - Dashboard de reportes: KPIs y gráficos cargan con filtros (fecha/depto/estructura).
   - Auditoría: filtros → tabla sin errores de clave; logs visibles.
6) **Ausencias / Calendario**
   - Registrar ausencia → aprobar → refleja en balances y calendario.
   - Cerrar período con runs completos; bloquea si hay pendientes.
7) **Documentos**
   - Drawer de empleado: descargar carta/ingresos/antigüedad/fiscal en es/en.
   - Encabezado/firma se autocompletan desde settings; se incluyen en PDF.
8) **Webhooks**
   - Configurar endpoint dummy; botón “Test webhook” en dashboard → 200 en endpoint; firma HMAC válida. Reintentos/backoff disponibles.

## Edge / Errores a vigilar
- IDs inválidos en estructuras/localizaciones deben responder 400 (no 500).
- Select “Sin estructura” usa valor `none`; sin errores Radix.
- Auth: token/tenant nulos deben mostrar flujo de login; evitar `Cannot destructure tenant`.
- Backend caído: UI mostrará `ERR_CONNECTION_REFUSED`; valida health antes.

## Observabilidad
- Mantén logs backend en nivel info/warn durante QA.
- Confirma mensajes claros en respuestas (400 vs 500) y revisa bitácoras de auditoría en dashboard.

## Snippets útiles
- Aprobar localización manual: `curl -X POST -H "Authorization: Bearer <token>" http://localhost:3000/api/v1/payroll/localizations/<id>/approve`
- Remap cuentas: `curl -X POST -H "Authorization: Bearer <token>" http://localhost:3000/api/v1/payroll/concepts/remap-accounts`

# Roadmap honesto – Módulo de Cobros (todas las verticales)

## Qué ya está listo (✅)
- Modelo unificado de pagos `/payments`: crea/lista con USD/VES, tasa, método, referencia, cuenta bancaria, `customerId`, `fees`, `allocations`, `idempotencyKey`, estados `draft/pending_validation/confirmed/failed/reversed/refunded`.
- Idempotencia: evita duplicados por `idempotencyKey` o referencia+método+documento.
- Reportes y aging: `/payments/reports/summary` y `/payments/reports/aging` funcionando; UI retail los muestra.
- Alias retail: `/orders/:id/payments` delega al servicio de pagos (mantiene payload de PaymentDialogV2).
- UI Cobros:
  - Retail: tabla paginada de pagos y órdenes, búsqueda por cliente/TaxID/referencia, cambio de estado con motivo, reportes/aging retail.
  - Servicios: pestañas Pendientes/Confirmados/Clientes/Reportes, sólo visibles cuando la vertical es servicios/hospitality.
- Filtrado por vertical: en retail no se llaman ni se ven bloques de servicios (evita 403 de appointments).
- Conciliación/auditoría base:
  - Payment con reconciliationStatus/statementRef/reconciledAt/reconciledBy + statusHistory.
  - Endpoint `PATCH /payments/:id/reconcile` y UI retail (Confirmados) con selector, nota y badge.
  - Cambios de estado guardan historial; tooltip muestra últimos cambios; reabrir conciliación (matched→pending/manual) disponible en Cobros y vista bancaria.
  - Auto-conciliación opcional: si `PAYMENTS_AUTO_RECONCILE=true` y hay `bankAccountId`, se crea en matched (flag off por defecto).
  - Validación: si hay `bankAccountId` sin referencia, o métodos bancarios sin referencia (transferencia/pago_movil/pos), el pago se rechaza (400). Nota obligatoria en conciliación manual/rechazada.

## Qué falta (🚧)
1) Conciliación bancaria avanzada:
   - Vista bancaria: mostrar `statementRef`, badge y botón de reabrir (matched→pending/manual) al listar conciliados. ✅ Reabrir listo; badge/`statementRef` visibles en Cobros retail (confirmados); falta replicar en resto de tablas/pestañas.
   - Al importar extracto, si no hay match, reabrir pago a pending/manual y notificar. ✅ backend lo hace; falta alertar/registrar en UI cobros con badge.
   - Reconciliación invertida: permitir “rechazar/manual” y registrar ajuste entre cuentas (sin mover el pago). ⏳ pendiente.
2) Evidencias y controles:
   - Adjuntar soporte (foto/PDF) al pago/concilación (GridFS/S3) y campo de observaciones de soporte en UI.
   - Extender validaciones por método a la UI (hoy ya valida backend).
3) Anticipos y multi-documento:
   - UI para aplicar/revertir allocations en “Por cliente” y mostrar saldo por documento.
4) Permisos/menú finos:
   - Aplicar `payments_read/write/confirm/export/apply/reconcile` en guards y ocultar Cobros según vertical/roles.
5) Auditoría avanzada:
   - Modal de historial completo (statusHistory), registrar validador/reversor, export de historial.
6) Exportes AR:
   - CSV/XLSX en “Por cliente” y Aging con filtros avanzados (cliente, fecha, estado).
7) Pasarelas/webhooks (opcional):
   - Callbacks seguros e idempotentes para pagos confirmados/fallidos.
8) Pruebas de regresión:
   - Backend: transiciones de estado, idempotencia, allocations.
   - Flujos retail: USD/VES/mixto+IGTF, cuentas bancarias, conciliación manual/auto.
   - E2E UI: estado, conciliación, export.

## Salvaguardas (seguir respetando)
- No romper PaymentDialogV2 ni su payload; `/orders/:id/payments` debe seguir funcionando.
- Alias y compatibilidad activos mientras se migra.
- Paginación en listados; usar reportes agregados para no pasar límites.

## Pendientes inmediatos sugeridos
- Conciliación bancaria avanzada: usar BankTransactions/BankReconciliation para marcar matched/manual y mostrar statementRef.
- UI de allocations: aplicar/revertir anticipos y multi-documento en “Por cliente”.
- Permisos/menú: aplicar guards `payments_*` y ocultar módulos según vertical.
- Export AR (CSV/XLSX) y pruebas de regresión automatizadas.

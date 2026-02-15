# Fase 1 – Avances y uso rápido

## Qué se agregó
- Módulo backend `billing` (operativo) con endpoints:
  - `POST /billing/documents` (draft; soporta tipos invoice/credit_note/debit_note/delivery_note/quote).
  - `POST /billing/documents/:id/issue` (solicita número de control vía imprenta; cambia a `issued`).
  - `GET /billing/documents/:id` (consulta).
  - `GET /billing/documents/:id/status` (estado/control/verificationUrl).
  - `GET /billing/books/sales` (libro de ventas por canal, json/csv/pdf).
- Esquemas nuevos: `BillingDocument`, `DocumentSequence`, `BillingEvidence`, `BillingAuditLog`, `ImprentaCredential`, `SequenceLock`, `ImprentaFailure`.
- Numeración: control de rango + lock con owner y cleanup TTL (expireAt), 5 intentos; libera lock tras uso. Usa Redis (REDIS_URL/REDIS_LOCK_URL) si está disponible (lease via set NX PX), con fallback a Mongo lock.
- Provider de imprenta con toggle `IMPRENTA_PROVIDER_MODE=mock|real` y soporte para URL/API key (`IMPRENTA_PROVIDER_URL`, `IMPRENTA_PROVIDER_API_KEY`), headers y payload template (`IMPRENTA_HEADERS_TEMPLATE`, `IMPRENTA_PAYLOAD_TEMPLATE`); mock por defecto, 3 reintentos con backoff simple.
- DLQ: fallos de imprenta se guardan en `ImprentaFailure` con request/error y se pueden listar/reintentar/eliminar (`GET /billing/imprenta-failures`, `POST /billing/imprenta-failures/retry`, `POST /billing/imprenta-failures/:id/delete`); reintentos auditan success/fail.
- Event hook `billing.document.issued` emitido al emitir (asiento automático básico); evidencias listables en `GET /billing/evidences?documentId=...` y `GET /billing/evidences/:id`; auditoría en `GET /billing/audit/:documentId`.
- Notas de crédito/débito: requieren `originalDocumentId`; heredan datos del documento original si faltan.
- PDF (estándar y thermal) actualizado con Control Fiscal, datos de imprenta, leyenda SNAT/2024/000102, hash fiscal y QR real (vía `qrcode`) con fallback a texto; usa `verificationUrl`/control/hash como payload.
- Libro de ventas: consulta real por canal/fecha; export opcional CSV (campo `csv` en respuesta) y totales (`totals.total`, `totals.count`, `totals.byType`).
- Libro de ventas: `format=pdf` genera PDF base (jsPDF/autoTable) con control/cliente/total; CSV sigue disponible.
- Contabilidad: listener a `billing.document.issued` crea asiento automático con AR 1102, ingreso 4101 y 2102 impuestos.
- Evidencias: guardan hash y snapshot de totales/impuestos (`totalsSnapshot` con base/currency opcional) y request/response/verificationUrl de imprenta; API de evidencias lista.

## Uso rápido (entorno mock)
1) Configurar serie activa (`DocumentSequence`) para el tenant.
2) POST `/billing/documents` con `{ type, seriesId, customerName, customerTaxId }` (y `originalDocumentId` para notas).
3) POST `/billing/documents/:id/issue` → asigna `controlNumber` mock y emite evento `billing.document.issued`.
4) GET `/billing/documents/:id` para ver `controlNumber`.
5) GET `/billing/books/sales?channel=digital&format=csv` para export preliminar.

## Variables relevantes
- `IMPRENTA_PROVIDER_MODE=mock|real`
- `IMPRENTA_PROVIDER_URL`, `IMPRENTA_PROVIDER_API_KEY` (modo real)

## Pendiente inmediato
- Cerrar payload/headers reales con imprenta (end-to-end); si no hay proveedor, seguir en mock pero marcarlo.
- UI/UX: visor de evidencias y estado de timbrado, reintentos desde frontend, notas de entrega, branding de PDFs.
- Reportes fiscales oficiales: libro de compras/retenciones, cierre diario/serie, resumen Z.
- Validaciones SENIAT: RIF/agentede retención, comprobantes de retención IVA/ISLR.
- Bitácora completa (diffs) y snapshot de impuestos más rico por tipo.

# FASE 0 – CIMENTOS DEL MÓDULO DE FACTURACIÓN DIGITAL

Objetivo: definir dominio de datos, adapters y flujos base para arrancar la implementación VE audit-ready, alineado con homologación SENIAT (SNAT/2024/000102 y 000121).

---

## 1. Alcance Fase 0 (entregables)
- Modelo de datos preliminar (schemas/DTOs) para: `BillingDocument`, `DocumentSequence`, `BillingEvidence`, `BillingAuditLog`, `ImprentaCredential`, `CountryAdapter` (VE v1).
- Definición de endpoints y eventos mínimos (`billing`, `numbering`, `evidence`, `imprenta`).
- Flujo de imprenta digital: request/response, reintentos, contingencia.
- Plan de migración: datos de órdenes/clientes/tenant para poder emitir (tax IDs, series).
- Política de versionado/homologación: “build homologada” y reglas de cambio.

---

## 2. Modelo de datos (borrador)

### 2.1 BillingDocument (base)
- `type`: invoice | credit_note | debit_note | delivery_note | quote
- `seriesId`: ref DocumentSequence
- `documentNumber`: correlativo interno
- `controlNumber`: asignado por imprenta (solo VE fiscales)
- `status`: draft | validated | sent_to_imprenta | issued | sent | adjusted | closed | archived
- `issueDate`, `issueTime`
- `customer`: { name, rif/taxId, address }
- `emitter`: { businessName, rif, fiscalAddress }
- `totals`: { subtotal, taxes[{type, rate, amount}], discounts, charges, grandTotal, currency, exchangeRate }
- `paymentTerms`: contado | credito, `dueDate`
- `references`: { orderId, originalDocumentId (para notas) }
- `country`: ISO code, `adapterVersion`
- `evidenceId`, `auditLogId`

### 2.2 DocumentSequence
- `name`, `scope`: tenant/sucursal/caja
- `prefix`/`format`
- `currentNumber`, `rangeStart`, `rangeEnd`
- `channel`: digital | machine_fiscal | contingency
- `status`: active | paused | closed
- Locking transaccional al asignar número.

### 2.3 BillingEvidence
- `documentId`
- `hash`: SHA-256 del payload emitido
- `controlNumber` + metadata de imprenta (RIF, nombre, providencia, timestamp)
- `files`: { pdfUrl, xmlJsonUrl? }
- `delivery`: { sentAt, channel, deliveryProof }
- `retentionPeriod`: default 10 años

### 2.4 BillingAuditLog
- Eventos: created, validated, sent_to_imprenta, control_assigned, sent, retry, error, adjusted, closed.
- Guarda diffs y payloads relevantes (sin credenciales).

### 2.5 ImprentaCredential
- `provider`, `baseUrl`, `apiKey`/`clientId`/`clientSecret`
- `active`, `rotatedAt`, `expiresAt`, `scopes`
- Asociada a tenant/sucursal/serie.

### 2.6 CountryAdapter (interface)
- `validateDocument(document, context)`
- `formatForStamping(document)` (payload hacia imprenta/proveedor)
- `parseStampingResponse(response)` (controlNumber, timestamp, metadata)
- `getMandatoryFields()` (campos mínimos por tipo)
- `getLegends()` (p. ej. SNAT/2024/000102)
- `getTaxCatalog()`/`getRetentionCatalog()`
- `supports`: { controlNumberRequired, stampProviderType }
- VE v1: control fiscal vía imprenta digital; leyenda obligatoria; libro de ventas por canal.

---

## 3. Endpoints y eventos (borrador)
- `POST /billing/documents` (crear borrador)
- `POST /billing/documents/:id/validate`
- `POST /billing/documents/:id/issue` (dispara numeración + imprenta)
- `POST /billing/documents/:id/send` (email/whatsapp)
- `POST /billing/documents/:id/cancel` (solo drafts o vía nota crédito)
- `GET /billing/documents` (filtros por status/serie/rango fecha)
- `POST /billing/notes` (credit/debit, referencia requerida)
- `GET /billing/books/sales` (por canal)
- `POST /imprenta/test-connection` (probar credenciales)
- Eventos: `billing.document.validated`, `billing.document.sent_to_imprenta`, `billing.document.issued`, `billing.document.failed`, `billing.document.sent`.

---

## 4. Flujo imprenta digital VE
1) Draft → Validate (completar campos obligatorios VE).
2) Issue: `numbering-service` obtiene correlativo (lock).  
3) `imprenta-digital.provider` envía payload → recibe `controlNumber` + timestamp + metadata imprenta.  
4) Persistir controlNumber en documento + evidence; status → issued; generar PDF con control y leyenda.  
5) Reintentos: cola DLQ; idempotencia por `documentId`.  
6) Contingencia: si imprenta indisponible, marcar `channel=contingency`, usar bloque de folios de contingencia y luego regularizar (nota o registro manual) cuando vuelva el servicio.

---

## 5. Migración (datos base)
- Tenants: completar `taxInfo` (rif, razón social, domicilio), configurar `documentTemplates.invoice/quote` con colores/leyenda, definir series iniciales por sucursal/canal.
- Clientes: normalizar RIF/taxId y direcciones fiscales.
- Órdenes: mapear `invoiceRequired`; preparar referencia orderId→documento.
- Credenciales: registrar proveedor de imprenta digital seleccionado (por tenant o sucursal).

---

## 6. Versionado y homologación
- Definir “build homologada” (tag + checksum). No desplegar cambios de facturación sin re-certificar.
- Feature flags: `billingV2` por tenant/serie; `forceHomologatedBuild` en producción fiscal.
- Changelog obligatorio por versión entregada a SENIAT/proveedor.

---

## 7. Validaciones mínimas VE (checklist)
- Campos obligatorios presentes (emisor, receptor, montos discriminados, fechas, leyenda SNAT/2024/000102).
- ControlNumber obligatorio para factura/nota/guía; prohibir edición tras issued.
- Nota crédito/débito referencia factura original.
- Libro de ventas por canal (digital vs máquina fiscal); cierre diario/serie preparado.
- Evidencia guardada con hash y control fiscal; retención de 10 años.

---

## 8. Próximos pasos (para Fase 1)
- Implementar schemas/DTOs iniciales y hooks de eventos.
- Construir `ImprentaDigitalProvider` mock + integración real parametrizable.
- UI mínima: emisión desde orden, reintentos de timbrado, visor de evidencias y libro de ventas por canal.

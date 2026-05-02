# ROADMAP – MÓDULO DE FACTURACIÓN DIGITAL Y AUDITORÍA FISCAL

**Objetivo**: entregar un módulo de facturación electrónica/auditable que cumpla con exigencias venezolanas (RIF, número de control fiscal digital por imprenta autorizada, libros de ventas, retenciones, conservación 10 años) y sea extensible a otros países mediante localizaciones y conectores. Basado en mejores prácticas de ERPs (SAP, NetSuite, Odoo, Totvs): numeración estricta, trazabilidad completa, integridad contable y separación de documentos (factura, presupuesto, nota de entrega, nota de crédito/débito).

---

## 1) Benchmark y principios
- **Numeración y control**: series por sucursal/estación, sin huecos; bloqueo post-emisión; folios y números de control separados (VE).
- **Tipos de documento estándar**: factura, presupuesto (quote), nota de entrega/guía, nota de crédito y débito; anulación solo vía nota de crédito/débito.
- **Integridad y control fiscal**: hash del documento, sello de tiempo; en VE la validez la da el número de control fiscal emitido por imprenta digital (no la firma del emisor); UUID único y track de versión.
- **Auditoría trazable**: bitácora de eventos (creado, validado, enviado a imprenta, control asignado, enviado al cliente, ajustes vía nota), snapshots de cálculos y tasas vigentes.
- **Interoperabilidad**: exportables (PDF y XML/JSON según país), folios y consecutivos accesibles, API webhook para recepción de acuses.
- **Contabilidad automática**: asiento por documento, conciliación con pagos, cuadrar con libros de ventas/compras.

---

## 2) Estado actual (honesto)
- Backend billing creado (schemas `BillingDocument`, `DocumentSequence`, `BillingEvidence`, `BillingAuditLog`, `ImprentaCredential`, `SequenceLock`, `ImprentaFailure`), endpoints de emisión, libro de ventas (CSV/PDF básico), evidencias y DLQ con retry/delete.
- Numeración con lock Redis/Mongo y control de rango; imprenta mock/real con retries/DLQ, pero payload final de proveedor aún pendiente de cierre.
- PDFs estándar/thermal con control fiscal, leyenda SNAT/2024/000102, hash y QR; faltan ajustes de branding y payload definitivo.
- Asiento contable básico al emitir (AR/ingreso/impuesto); snapshot de impuestos en evidencias con base/currency; falta detalle fiscal completo y retenciones.
- No está: UI de evidencias/reintentos, validación RIF/SENIAT, notas de entrega, cierre diario/serie, retenciones y reportes oficiales (libro compras/retenciones), ni payload final validado con imprenta.

---

## 3) Requisitos clave (Venezuela como base)
- **Datos obligatorios**: RIF emisor/receptor, razón social, domicilio fiscal, número de factura y número de control fiscal digital (imprenta), fecha/hora exacta, tipo de cambio, forma de pago, leyenda “Documento emitido conforme a SNAT/2024/000102”, discriminación de IVA/IGTF, condición de cobro.
- **Documentos**: factura, nota de crédito/débito (referenciando la factura), nota de entrega/guía de despacho con control fiscal, presupuesto (no fiscal).
- **Control de numeración**: series por sucursal/caja/impresora virtual; prohibir saltos; gestión de rangos autorizados; bloqueo de edición tras “issued”; cierre diario/serie.
- **Retenciones**: comprobantes IVA/ISLR ligados a facturas y pagos (alcance requerido por homologación).
- **Libros y reportes**: libro de ventas separado por canal (digital vs máquina fiscal), libro de compras/retenciones, relación de notas de crédito, IGTF, resumen diario tipo Z.
- **Evidencia y resguardo**: hash + control fiscal, sello de tiempo, almacenamiento inmutable por 10 años, evidencia de envío al cliente, posibilidad de consulta para fiscalización.
- **Extensibilidad**: `CountryAdapter` para reglas de numeración/control, formatos y validaciones; conectores a imprenta digital (VE) o proveedores de timbrado (otros países).

---

## 4) Diseño propuesto (alto nivel)
- **Nuevo módulo `billing`**  
  - Schemas: `billing-document` (padre), `invoice`, `credit-note`, `debit-note`, `delivery-note`, `quote`; `document-sequence`; `billing-audit-log`; `billing-evidence` (hash, control fiscal, timestamp); `imprenta-credential`.
  - Servicios: `document-factory` (creación por tipo), `numbering-service` (series/rangos), `imprenta-digital.provider` (solicitud de número de control fiscal VE, manejo de tokens/credenciales), `signature/hash-service`, `pdf-xml-service`, `delivery-service` (email/whatsapp), `audit-service`.
- **Integración con impuestos**  
  - Reutilizar `taxService` y guardar tasas aplicadas en documento + snapshot de cálculo.  
  - Retenciones: `withholdingsService` emite comprobantes y los vincula a factura/pago.
- **Integración con contabilidad**  
  - Evento `billing.document.issued` → `AccountingService` crea asiento y enlaza `sourceDocument`.  
  - Libro de ventas/compras generado desde `BillingDocument` + `TaxTransaction`.
- **Control y seguridad**  
  - Estados: draft → validated → sent_to_imprenta → issued (control asignado) → sent → adjusted (vía nota) → closed → archived.  
  - Inmutabilidad tras `issued`; cambios solo vía nota de crédito/débito; bloqueo de serie al cierre diario.  
  - Bitácora de eventos (usuario, timestamp, diffs, request/response de imprenta) y archivo sellado (hash SHA-256 + timestamp).
  - Versionado para homologación: cada build homologada debe identificarse y congelarse; cambios requieren re-certificación.
- **Arquitectura multi-país**  
  - `CountryAdapter` con: reglas de numeración, validadores fiscales, formatos (PDF/XML/JSON), conectores externos, catálogos (tipos de documento, impuestos, retenciones).  
  - Primer adapter: `VE`; preparar interfaces para `CO` (Dian/UAE), `MX` (CFDI) sin implementarlos aún.
- **Front-end**  
  - UI dedicada: listados de facturas/notas, gestión de series, emisión desde orden/pedido, generación de presupuestos y notas de entrega, visor de evidencia (hash/firma/log).

---

## 5) Roadmap por fases (estado)

### Fase 0 – Descubrimiento y cimientos (1-2 sprints)
- **Estado: completado (borrador aprobado)**.
- Mapear fuentes actuales: órdenes, pagos, impuestos, plantillas PDF; definir mapeo Order → Invoice/Quote. ✅
- Diseñar modelo `BillingDocument` + `DocumentSequence` + `BillingAuditLog` + `BillingEvidence` + credenciales de imprenta. ✅ (esquemas creados)
- Definir `CountryAdapter` interface y pack inicial `VE` con campos obligatorios y leyendas SNAT/2024/000102. ✅ (reflejado en modelos y leyendas en PDF)
- Diseñar `ImprentaDigitalProvider` + modo contingencia (operar offline y regularizar). ✅ (provider mock inicial, falta integración real en Fase 1)
- Plan de migración de datos (llenar `invoiceRequired`, normalizar tax IDs, preparar series por sucursal). 📝 pendiente de ejecución operativa
- Definir esquema de versionado/build “homologated” y política de cambios (re-certificación por versión). 📝 pendiente formalizar en release notes

### Fase 1 – MVP Venezuela audit-ready (3-4 sprints)
- **Progreso real**: Backend billing operativo con emisión, lock Redis/Mongo, imprenta mock/real (retries/DLQ), PDFs con control/hash/QR, libro de ventas CSV/PDF básico, asiento contable básico y evidencias con snapshot de totales/impuestos.
- **Pendientes críticos** (no maquillados):
  - Payload definitivo con proveedor de imprenta (campos, headers, verificación) y validación end-to-end.
  - UI/UX: visor de evidencias y estado de timbrado, reintentos desde frontend, notas de entrega, branding de PDFs.
  - Reportes oficiales: libro compras/retenciones, notas de crédito reportadas, cierre diario/serie y resumen tipo Z.
  - Validación fiscal: RIF/SENIAT, reglas de agente de retención, retenciones IVA/ISLR con comprobantes.
  - Bitácora completa de cambios y diffs, más snapshot detallado de impuestos.

### Fase 2 – Cumplimiento avanzado y retenciones (2-3 sprints)
- Integrar **retenciones (obligatorio para homologación)**: cálculo, comprobantes PDF, asociación a pagos y facturas; alimentar libro de compras/retenciones.
- **Cierre diario/serie** y resumen tipo Z; bloqueo de serie al cerrar día.
- Validar RIF y condición de agente de retención (API SENIAT o caché interna); alertas de inconsistencias.
- **Firma/opcional**: si el proveedor de imprenta requiere, soportar certificado/clave cliente y sello de tiempo; rotación de credenciales de imprenta.
- Alertas de vencimiento de declaraciones (IVA/IGTF) y checklist de auditoría fiscal en UI.
- Políticas de resguardo 10 años (export masivo, backup redundante) y evidencias de entrega al cliente.

### Fase 3 – Multi-país y conectores (3-4 sprints)
- Generalizar `CountryAdapter`: catálogos, numeración, plantillas y validaciones por país.
- Preparar **adapters esqueleto** para MX (CFDI 4.0) y CO (Dian/UAE): estructura XML/JSON, timbrado/firma abstractos.
- Conector externo opcional (provider fiscal) detrás de interfaz `StampingProvider`; feature flags por tenant.
- Multimoneda en documento: totales en moneda operativa y presentación en base; tasas guardadas por documento.
- Suite de reportes consolidada: libro de ventas/compras multi-país, trail de auditoría descargable, API de evidencias.

---

## 6) Riesgos y mitigaciones
- **Integridad de numeración**: riesgo de huecos por fallos concurrentes → locking/transactions por serie y reintentos idempotentes.
- **Homologación y versiones**: cambios sin re-certificar invalidan cumplimiento → congelar “build homologada” y exigir re-certificación en cada release mayor.
- **Credenciales de imprenta**: exposición de tokens/API keys → cifrado en secret store, rotación, scopes mínimos.
- **Compatibilidad retro**: tenants con facturas simuladas → feature flag `billingV1` vs `billingV2`; migración gradual por serie/sucursal.
- **Reglas locales cambiantes**: aislar reglas en `CountryAdapter` + catálogos versionados por fecha de vigencia; monitorear providencias nuevas.

---

## 7) Próximos pasos inmediatos (honestos)

### 🔴 CRÍTICO - FASE 1 (Bloqueantes MVP)
1. **Activar Módulo de Billing**:
   - Completar schema `BillingEvidence`: agregar propiedades `xml` y `xmlHash`
   - Resolver errores TypeScript en `billing.service.ts` (líneas 469, 484)
   - Descomentar BillingModule en `app.module.ts`
   - Testing básico de funcionalidad

2. **Payload Definitivo con Imprenta**:
   - Cerrar payload/headers con imprenta digital real
   - Probar E2E: emitir, recibir control/verificationUrl, guardar evidencia
   - Validar formato de respuesta y errores

3. **Validación RIF/SENIAT**:
   - Implementar validación de formato RIF
   - API/caché SENIAT para verificar contribuyentes
   - Validación de agente de retención

4. **Notas de Entrega**:
   - Implementar documento `DeliveryNote` con control fiscal
   - PDF con formato requerido
   - Numeración independiente

### 🟡 IMPORTANTE - FASE 1 (Funcionalidad MVP)
5. **UI de Billing Completa**:
   - Visor de evidencias y estado de timbrado
   - Botón de reintento desde frontend
   - Branding de PDFs (logo, colores)
   - Dashboard de facturas emitidas

6. **Reportes Fiscales Básicos**:
   - Libro de compras (formato SENIAT)
   - Libro de retenciones
   - Cierre diario/serie
   - Resumen tipo Z
   - Export con formatos oficiales (CSV, PDF)

7. **Bitácora Completa**:
   - Tracking detallado de cambios con diffs
   - Snapshot completo de impuestos por documento
   - Log de requests/responses de imprenta

### 🟢 POST-MVP - FASE 2
8. **Retenciones IVA/ISLR**:
   - Comprobantes PDF automáticos
   - Asociación a pagos y facturas
   - Libro de retenciones

9. **Cierre Mensual/Anual**:
   - Proceso de cierre formal
   - Bloqueo de períodos cerrados
   - Reportes consolidados

10. **Firma Digital/Certificados**:
    - Soporte para certificado digital si requerido
    - Rotación de credenciales de imprenta
    - Manejo de expiración

11. **Plan de Homologación**:
    - Congelar build homologada
    - Checklist de pruebas oficial
    - Política de cambios y re-certificación

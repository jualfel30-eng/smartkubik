# Facturación (Billing)

## ¿Qué es?

El módulo de Facturación es el **generador de documentos fiscales** del negocio — facturas, notas de crédito, notas de débito, y notas de entrega. Maneja secuencias de numeración fiscal (series), integración con Imprenta Digital y SENIAT, retenciones (IVA/ISLR), y conversión dual-moneda (USD→VES al momento de emisión).

## Funcionalidades principales

- **Documentos fiscales**: Factura, Nota de Crédito, Nota de Débito, Nota de Entrega, Cotización
- **Secuencias numeradas**: Series con prefijo, numeración secuencial, y canal (digital/máquina fiscal/contingencia)
- **Imprenta Digital**: Solicita número de control (CIN) al emitir — validación fiscal venezolana
- **SENIAT XML**: Genera XML firmado con QR code para transmisión electrónica
- **Dual-moneda**: Almacena totales en moneda original (USD) Y en VES (convertido con tasa BCV al emitir)
- **Retenciones**: Detecta contribuyentes especiales, aplica retención IVA (75%/100%), genera comprobantes
- **Evidencia fiscal**: Registro inmutable (BillingEvidence) de cada emisión con hash y metadata de imprenta
- **Integración contable**: Al emitir, dispara evento que crea asiento contable + entrada en Libro de Ventas IVA

## Endpoints principales

| Método | Ruta | Descripción |
|---|---|---|
| POST | `/api/v1/billing` | Crear documento (draft) |
| POST | `/api/v1/billing/:id/issue` | Emitir (control number + contabilidad) |
| GET | `/api/v1/billing` | Listar documentos |
| GET | `/api/v1/billing/:id` | Detalle |
| GET | `/api/v1/billing/sequences` | Listar secuencias |
| POST | `/api/v1/billing/sequences` | Crear secuencia |
| POST | `/api/v1/billing/:id/validate-seniat` | Validar para SENIAT |
| GET | `/api/v1/billing/:id/seniat-xml` | Descargar XML SENIAT |
| GET | `/api/v1/billing/stats` | Estadísticas de facturación |

## Lifecycle del documento

```
Draft → Issued (emitido con control number) → Paid
                                             ↗ Annulled
```

**Al emitir (issue)**:
1. Solicita control number de Imprenta Digital
2. Calcula `totalsVes` con tasa BCV del momento
3. Crea BillingEvidence (inmutable)
4. Emite evento `billing.document.issued` → Accounting crea asiento + Libro de Ventas IVA
5. Vincula Order.billingDocumentId

## Schema clave: BillingDocument

- `type`: invoice / credit_note / debit_note / delivery_note / quote
- `documentNumber`, `controlNumber` (Imprenta Digital)
- `customer`: name, taxId, address, email, phone
- `items[]`: description, quantity, unitPrice, taxCode, amount
- `totals`: subtotal, taxes[], discounts, grandTotal, currency, exchangeRate
- `totalsVes`: misma estructura pero en VES (fuente de verdad para contabilidad)
- `seniat`: xmlContent, qrCode, verificationUrl, transmissionStatus
- `status`: draft / issued / paid / annulled
- `seriesId` → DocumentSequence

---

*Última actualización: 2026-04-28*
*Archivos fuente: `modules/billing/`*

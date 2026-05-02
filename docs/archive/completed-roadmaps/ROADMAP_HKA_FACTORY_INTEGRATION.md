# 🖨️ ROADMAP: Integración HKA Factory - Facturación Digital SENIAT

**Fecha de Inicio**: 2026-03-23
**Estado**: 🟡 En Progreso
**Prioridad**: 🔴 CRÍTICA
**Owner**: SmartKubik Development Team

---

## 📋 TABLA DE CONTENIDOS

1. [Resumen Ejecutivo](#resumen-ejecutivo)
2. [Estado Actual](#estado-actual)
3. [Arquitectura de Integración](#arquitectura-de-integración)
4. [Fase 1: Factura Básica (01)](#fase-1-factura-básica-01)
5. [Fase 2: Tipos de Documentos (02, 03, 04)](#fase-2-tipos-de-documentos-02-03-04)
6. [Fase 3: Retenciones IVA (05)](#fase-3-retenciones-iva-05)
7. [Fase 4: Retenciones ISLR (06)](#fase-4-retenciones-islr-06)
8. [Fase 5: Funcionalidades Avanzadas](#fase-5-funcionalidades-avanzadas)
9. [Catálogos HKA Factory](#catálogos-hka-factory)
10. [Mapeos de Datos](#mapeos-de-datos)
11. [Testing Strategy](#testing-strategy)
12. [Deployment Plan](#deployment-plan)

---

## 🎯 RESUMEN EJECUTIVO

### Objetivo
Integrar completamente el sistema SmartKubik SaaS con la API de **HKA Factory** para emisión de documentos fiscales electrónicos conformes a SENIAT Venezuela.

### Alcance
- ✅ 7 tipos de documentos fiscales (01-07)
- ✅ Retenciones IVA e ISLR
- ✅ Cumplimiento 100% normativa SENIAT 2026
- ✅ Integración automática con módulos de Compras/Ventas
- ✅ Libro de Ventas automatizado

### Entregables
1. Proveedor `HkaFactoryProvider` completo
2. Módulo de Retenciones (IVA + ISLR)
3. Frontend para gestión de retenciones
4. Documentación técnica completa
5. Sistema de testing automatizado

### Timeline Total
**40-51 horas** distribuidas en 5 fases incrementales

---

## 📊 ESTADO ACTUAL

### ✅ Completado (85%)

#### Backend NestJS
- [x] `BillingModule` con 9 endpoints REST
- [x] Schemas MongoDB (`BillingDocument`, `DocumentSequence`, `BillingEvidence`, `BillingAuditLog`)
- [x] `BillingService` con lógica de numeración
- [x] `ImprentaDigitalProvider` (facade con mock)
- [x] Factory Pattern para proveedores
- [x] `MockImprentaProvider` funcional
- [x] `GenericHttpImprentaProvider` (no configurado)
- [x] Sistema de reintentos (3 niveles)
- [x] Logging de fallos

#### Frontend React
- [x] `BillingDashboard` - Vista principal
- [x] `BillingCreateForm` - Formulario de creación
- [x] `BillingDocumentDetail` - Vista detallada
- [x] Integración en routing y sidebar
- [x] Permisos implementados

#### Documentación
- [x] API Documentation (9 endpoints)
- [x] UI Implementation Guide
- [x] Imprenta Digital Providers Guide

### ❌ Pendiente (15%)

#### Integración HKA Factory
- [ ] `HkaFactoryProvider` específico
- [ ] Autenticación JWT con HKA
- [ ] Mapeo de schemas a JSON HKA
- [ ] Endpoint de emisión real (`/api/Emision`)
- [ ] Query de estado (`/api/EstadoDocumento`)
- [ ] Anulación (`/api/Anular`)
- [ ] Descarga de archivos (`/api/DescargaArchivo`)

#### Módulo de Retenciones
- [ ] Schema `WithholdingDocument`
- [ ] `WithholdingService` con cálculos
- [ ] Frontend de retenciones IVA
- [ ] Frontend de retenciones ISLR
- [ ] Catálogo de conceptos ISLR
- [ ] Aplicación de retenciones a facturas

#### Funcionalidades Avanzadas
- [ ] IGTF (3% en divisas)
- [ ] Comprobante ARCV (tipo 07)
- [ ] Webhooks para callbacks
- [ ] Libro de Ventas formato HKA
- [ ] Email automático post-emisión
- [ ] Integración automática con Compras/Ventas

---

## 🏗️ ARQUITECTURA DE INTEGRACIÓN

```
┌─────────────────────────────────────────────────────────────────┐
│                     SmartKubik SaaS                              │
│                                                                   │
│  ┌────────────────┐        ┌────────────────┐                   │
│  │ Sales Module   │───────▶│ Billing Module │                   │
│  └────────────────┘        └───────┬────────┘                   │
│                                     │                             │
│  ┌────────────────┐                │                             │
│  │ Purchase Module│───────────────▶│                             │
│  └────────────────┘                │                             │
│                                     ▼                             │
│                        ┌────────────────────────┐                │
│                        │ ImprentaDigitalProvider│                │
│                        │      (Facade)          │                │
│                        └────────────┬───────────┘                │
│                                     │                             │
│                                     ▼                             │
│                        ┌────────────────────────┐                │
│                        │ ImprentaProviderFactory│                │
│                        └────────────┬───────────┘                │
│                                     │                             │
│                    ┌────────────────┼────────────────┐           │
│                    ▼                ▼                ▼            │
│            ┌──────────┐    ┌──────────────┐  ┌──────────┐       │
│            │   Mock   │    │ HkaFactory   │  │ Generic  │       │
│            │ Provider │    │   Provider   │  │   HTTP   │       │
│            └──────────┘    └──────┬───────┘  └──────────┘       │
└────────────────────────────────────┼──────────────────────────────┘
                                     │
                                     │ HTTPS + JWT
                                     │
                                     ▼
                    ┌─────────────────────────────────┐
                    │    HKA Factory API              │
                    │                                 │
                    │  • /api/Autenticacion          │
                    │  • /api/Emision                │
                    │  • /api/EstadoDocumento        │
                    │  • /api/Anular                 │
                    │  • /api/DescargaArchivo        │
                    │  • /api/Correo/Enviar          │
                    │  • /api/AplicarRetencion       │
                    └─────────────────────────────────┘
                                     │
                                     ▼
                    ┌─────────────────────────────────┐
                    │         SENIAT                  │
                    │   (Validación y Registro)       │
                    └─────────────────────────────────┘
```

---

## 🚀 FASE 1: FACTURA BÁSICA (01)

**Prioridad**: 🔴 CRÍTICA
**Duración Estimada**: 4-6 horas
**Estado**: ✅ COMPLETADA (2026-03-23)
**Objetivo**: Emitir una factura básica (tipo 01) con número de control real de HKA Factory

### 📝 Tasks

#### 1.1 Crear HkaFactoryProvider
- [x] **Archivo**: `src/modules/billing/providers/hka-factory.provider.ts`
- [x] Extender `BaseImprentaProvider`
- [x] Implementar `requestControlNumber()`
- [x] Implementar `queryDocumentStatus()`
- [x] Implementar `cancelDocument()`
- [x] Configuración desde ENV vars

**Interfaces requeridas**:
```typescript
interface HkaFactoryConfig {
  baseUrl: string;           // https://demoemisionv2.thefactoryhka.com.ve
  usuario: string;           // Credenciales demo
  clave: string;
  rifEmisor: string;         // RIF de la empresa
  razonSocialEmisor: string;
  timeout?: number;          // Default 45000ms
}

interface HkaAuthResponse {
  token: string;
  expiresIn: number;
}
```

#### 1.2 Implementar Autenticación JWT
- [x] Método `authenticate()` → POST `/api/Autenticacion`
- [x] Cache de token con TTL (12 horas según docs)
- [x] Auto-refresh antes de expiración
- [x] Manejo de errores 401

**Request**:
```json
{
  "usuario": "string",
  "clave": "string"
}
```

**Response**:
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "expiresIn": 43200
}
```

#### 1.3 Mapeo BillingDocument → HKA JSON
- [x] **Archivo**: `src/modules/billing/mappers/hka-document.mapper.ts`
- [x] Método `toHkaFacturaJson(doc: BillingDocument): HkaDocumentoElectronico`
- [x] Validación de campos obligatorios
- [x] Cálculo de totales según reglas HKA
- [x] Generación de `ImpuestosSubtotal` (por alícuota)
- [x] Generación de `FormasPago`

**Estructura JSON HKA (Factura tipo 01)**:
```json
{
  "documentoElectronico": {
    "Encabezado": {
      "IdentificacionDocumento": {
        "TipoDocumento": "01",
        "NumeroDocumento": "string",
        "FechaEmision": "DD/MM/YYYY",
        "FechaVencimiento": "DD/MM/YYYY",
        "HoraEmision": "HH:MM:SS am",
        "Anulado": false,
        "TipoDePago": "Inmediato",
        "Serie": "",
        "Sucursal": "",
        "TipoDeVenta": "Interna",
        "Moneda": "BSD"
      },
      "Comprador": {
        "TipoIdentificacion": "J",
        "NumeroIdentificacion": "59858589-9",
        "RazonSocial": "string",
        "Direccion": "string",
        "Pais": "VE",
        "Telefono": ["string"],
        "Correo": ["string"]
      },
      "Totales": {
        "NroItems": "2",
        "MontoGravadoTotal": "200.00",
        "MontoExentoTotal": "0.00",
        "Subtotal": "200.00",
        "TotalIVA": "32.00",
        "MontoTotalConIVA": "232.00",
        "TotalAPagar": "232.00",
        "MontoEnLetras": "doscientos treinta y dos bolivares",
        "ImpuestosSubtotal": [
          {
            "CodigoTotalImp": "G",
            "AlicuotaImp": "16.00",
            "BaseImponibleImp": "200.00",
            "ValorTotalImp": "32.00"
          }
        ],
        "FormasPago": [
          {
            "Descripcion": "Pago Móvil",
            "Fecha": "23/01/2026",
            "Forma": "02",
            "Monto": "232.00",
            "Moneda": "BSD",
            "TipoCambio": "0.0000"
          }
        ]
      }
    },
    "DetallesItems": [
      {
        "NumeroLinea": "1",
        "CodigoPLU": "0198599",
        "IndicadorBienoServicio": "1",
        "Descripcion": "Producto A",
        "Cantidad": "1",
        "UnidadMedida": "NIU",
        "PrecioUnitario": "200.00",
        "PrecioItem": "200.00",
        "CodigoImpuesto": "G",
        "TasaIVA": "16",
        "ValorIVA": "32.00",
        "ValorTotalItem": "232"
      }
    ],
    "InfoAdicional": []
  }
}
```

#### 1.4 Implementar Emisión
- [x] Método `emitDocument()` → POST `/api/Emision`
- [x] Headers: `Authorization: Bearer {token}`
- [x] Body: JSON del punto 1.3
- [x] Parsear respuesta HKA
- [x] Guardar `numeroControl`, `fechaAsignacion`, `horaAsignacion`
- [x] Actualizar `BillingEvidence` con metadata HKA

**Response esperada**:
```json
{
  "codigo": "200",
  "mensaje": "Documento procesado exitosamente",
  "validaciones": [],
  "resultado": {
    "numeroControl": "00-00067444",
    "fechaAsignacion": "23/01/2026",
    "horaAsignacion": "10:55:00 am",
    "autorizado": "SI"
  }
}
```

#### 1.5 Actualizar ImprentaDigitalProvider
- [x] Registrar `HkaFactoryProvider` in factory
- [x] Configurar modo `hka-factory` en ENV
- [x] Backward compatibility con mock

**Variables de entorno nuevas**:
```bash
# .env
IMPRENTA_PROVIDER_MODE=hka-factory
HKA_FACTORY_BASE_URL=https://demoemisionv2.thefactoryhka.com.ve
HKA_FACTORY_USUARIO=your-demo-user
HKA_FACTORY_CLAVE=your-demo-password
HKA_FACTORY_RIF_EMISOR=J-123456789-0
HKA_FACTORY_RAZON_SOCIAL=Mi Empresa C.A.
HKA_FACTORY_TIMEOUT=45000
```

#### 1.6 Testing
- [x] Unit tests para `HkaDocumentMapper`
- [x] Integration test con ambiente demo HKA
- [x] Verificar número de control generado
- [x] Validar QR code recibido
- [x] Test de manejo de errores (400, 401, 500)

**Casos de prueba**:
1. ✅ Factura simple 1 item (G 16%)
2. ✅ Factura multi-item (G + E)
3. ✅ Factura con descuento
4. ✅ Factura en USD (TotalesOtraMoneda)
5. ❌ Factura con RIF inválido (debe fallar)
6. ❌ Factura sin items (debe fallar)

### ✅ Criterios de Aceptación Fase 1

- [x] Factura tipo 01 emitida exitosamente
- [x] Número de control real asignado por HKA
- [x] QR code generado visible en frontend
- [x] XML descargable desde HKA (`/api/DescargaArchivo`)
- [x] Estado del documento consultable (`/api/EstadoDocumento`)
- [x] Logs detallados de cada paso
- [x] Manejo de errores robusto
- [x] Tests pasando (min 80% coverage)

### 📦 Entregables Fase 1

1. `src/modules/billing/providers/hka-factory.provider.ts` (~300 líneas)
2. `src/modules/billing/mappers/hka-document.mapper.ts` (~200 líneas)
3. `src/modules/billing/providers/hka-factory.provider.spec.ts` (~150 líneas)
4. Actualización `.env.example` con vars HKA
5. Documentación de configuración HKA

---

## 📄 FASE 2: TIPOS DE DOCUMENTOS (02, 03, 04)

**Prioridad**: 🟠 ALTA
**Duración Estimada**: 6-8 horas
**Estado**: ✅ COMPLETADA (2026-03-23)
**Dependencias**: Fase 1 completada
**Objetivo**: Soportar Nota de Crédito, Nota de Débito y Guía de Despacho

### 📝 Tasks

#### 2.1 Nota de Crédito (TipoDocumento: 02)
- [x] Extender mapper para tipo `02`
- [x] Campos adicionales requeridos:
  - `SerieFacturaAfectada`
  - `NumeroFacturaAfectada`
  - `FechaFacturaAfectada`
  - `MontoFacturaAfectada`
  - `ComentarioFacturaAfectada`
- [x] Validar que factura afectada exista
- [x] Validar que monto NC ≤ monto factura original
- [x] Link en BD: `BillingDocument.references.originalDocumentId`

**JSON específico NC**:
```json
{
  "IdentificacionDocumento": {
    "TipoDocumento": "02",
    "TipoTransaccion": "02",
    "SerieFacturaAfectada": "A",
    "NumeroFacturaAfectada": "10254",
    "FechaFacturaAfectada": "10/01/2023",
    "MontoFacturaAfectada": "10.00",
    "ComentarioFacturaAfectada": "Devolución de producto dañado"
  }
}
```

#### 2.2 Nota de Débito (TipoDocumento: 03)
- [x] Similar a NC pero para incrementos
- [x] Validaciones de coherencia
- [x] Casos de uso: intereses, ajustes, cargos adicionales

#### 2.3 Guía de Despacho / Nota de Entrega (TipoDocumento: 04)
- [x] Nodo `GuiaDespacho` requerido
- [x] Sub-nodos: `Conductor`, `Vehiculo`, `Transportista`
- [x] Campos adicionales:
  - `motivoTraslado` (Catálogo 14)
  - `tipoProducto` (Catálogo 15)
  - `origenProducto` (Catálogo 16)
  - `destinoProducto` (Catálogo 17)

**JSON específico Guía**:
```json
{
  "GuiaDespacho": {
    "esGuiaDespacho": "1",
    "motivoTraslado": "Tránsito aduanero",
    "tipoProducto": "Cigarrillos",
    "origenProducto": "Nacional",
    "destinoProducto": "Tierra Firme",
    "Conductor": {
      "NombreCompleto": "Juan Perez",
      "tipoIdentificacion": "V",
      "numeroIdentificacion": "12345678",
      "tipoLicencia": "Licencia de 3.ª"
    },
    "Vehiculo": {
      "TipoVehiculo": "Liviano",
      "numeroTransporte": "ABC123"
    }
  }
}
```

#### 2.4 Frontend Updates
- [x] Dropdown de tipo documento en `BillingCreateForm`
- [x] Campos condicionales según tipo seleccionado
- [x] Para NC/ND: Selector de factura original
- [x] Para Guía: Formulario de transporte
- [x] Validaciones frontend

#### 2.5 Testing
- [x] Test NC referenciando factura existente
- [x] Test ND con incremento
- [x] Test Guía con datos de transporte completos
- [x] Validar rechazo si factura afectada no existe

### ✅ Criterios de Aceptación Fase 2

- [x] 4 tipos de documentos emitibles (01, 02, 03, 04)
- [x] Validaciones específicas por tipo
- [x] Frontend adaptado a cada tipo
- [x] Links correctos entre documentos (NC/ND → Factura)
- [x] Tests E2E por tipo

---

## 💰 FASE 3: RETENCIONES IVA (05)

**Prioridad**: 🟡 MEDIA
**Duración Estimada**: 8-10 horas
**Dependencias**: Fase 2 completada
**Objetivo**: Comprobantes de Retención IVA

### 📝 Tasks

#### 3.1 Schema WithholdingDocument
- [ ] **Archivo**: `src/schemas/withholding-document.schema.ts`
- [ ] Campos:
  - `type: 'iva' | 'islr'`
  - `withholdingNumber: string`
  - `issueDate: Date`
  - `supplier: { name, rif, address }`
  - `totalBaseAmount: number`
  - `totalIva: number`
  - `totalWithheld: number`
  - `details: WithholdingDetail[]` (facturas incluidas)
  - `status: 'draft' | 'issued'`

```typescript
interface WithholdingDetail {
  invoiceDate: Date;
  invoiceNumber: string;
  controlNumber: string;
  totalAmount: number;
  exemptAmount: number;
  taxableBase: number;
  ivaPercentage: number;
  ivaAmount: number;
  withholdingPercentage: number; // 75% o 100%
  withheldAmount: number;
}
```

#### 3.2 WithholdingService
- [ ] **Archivo**: `src/modules/billing/withholding.service.ts`
- [ ] Método `createIvaWithholding(facturas[])`
- [ ] Cálculo automático de retención (75% o 100%)
- [ ] Validación de topes y condiciones SENIAT
- [ ] Generación de número correlativo

**Lógica de cálculo IVA**:
```typescript
// Retención 75%
withheldAmount = ivaAmount * 0.75;

// Retención 100%
withheldAmount = ivaAmount * 1.00;
```

#### 3.3 Mapeo a JSON HKA (Tipo 05)
- [ ] Mapper específico para comprobantes IVA
- [ ] Nodo `SujetoRetenido` (proveedor)
- [ ] Nodo `DetallesRetencion` (lista de facturas)
- [ ] Nodo `TotalesRetencion`

**JSON HKA Retención IVA**:
```json
{
  "documentoElectronico": {
    "Encabezado": {
      "IdentificacionDocumento": {
        "TipoDocumento": "05",
        "NumeroDocumento": "20251200018552",
        "FechaEmision": "21/11/2025",
        "HoraEmision": "12:13:00 pm"
      },
      "SujetoRetenido": {
        "TipoIdentificacion": "J",
        "NumeroIdentificacion": "111111111",
        "RazonSocial": "Proveedor C.A.",
        "Direccion": "Caracas",
        "Pais": "VE",
        "Telefono": ["0212-1234567"],
        "Correo": ["proveedor@example.com"]
      },
      "TotalesRetencion": {
        "TotalBaseImponible": "256588.80",
        "NumeroCompRetencion": "11",
        "FechaEmisionCR": "21/11/2025",
        "TotalIVA": "41054.21",
        "TotalRetenido": "30790.66"
      }
    },
    "DetallesRetencion": [
      {
        "NumeroLinea": "1",
        "FechaDocumento": "11/11/2025",
        "TipoDocumento": "01",
        "NumeroDocumento": "82616",
        "NumeroControl": "00-00067444",
        "MontoTotal": "297643.01",
        "BaseImponible": "256588.80",
        "Porcentaje": "0.16",
        "PorcentajeRetencion": "0.75",
        "MontoIVA": "41054.21",
        "Retenido": "30790.66"
      }
    ]
  }
}
```

#### 3.4 Endpoint AplicarRetencion
- [ ] POST `/api/billing/withholding/apply`
- [ ] Vincular comprobante a factura original
- [ ] Actualizar `BillingDocument` con info de retención
- [ ] Usar endpoint HKA `/api/AplicarRetencion`

#### 3.5 Frontend Retenciones IVA
- [ ] Componente `WithholdingIvaForm.jsx`
- [ ] Selector de facturas del proveedor (múltiples)
- [ ] Cálculo automático de totales
- [ ] Vista previa del comprobante
- [ ] Dashboard de retenciones emitidas

#### 3.6 Testing
- [ ] Test retención 75% de una factura
- [ ] Test retención 100% de múltiples facturas
- [ ] Test aplicación a factura original
- [ ] Validar libro de ventas con retenciones

### ✅ Criterios de Aceptación Fase 3

- [ ] Comprobantes IVA emitidos correctamente
- [ ] Número de control asignado por HKA
- [ ] Facturas actualizadas con retención aplicada
- [ ] Frontend completo y funcional
- [ ] Cálculos verificados contra casos reales

---

## 📊 FASE 4: RETENCIONES ISLR (06)

**Prioridad**: 🟡 MEDIA
**Duración Estimada**: 10-12 horas
**Dependencias**: Fase 3 completada
**Objetivo**: Comprobantes de Retención ISLR

### 📝 Tasks

#### 4.1 Catálogo de Conceptos ISLR
- [ ] **Archivo**: `src/modules/billing/constants/islr-concepts.ts`
- [ ] Importar tabla completa del documento `MT_Retenciones ISLR3.0_2014`
- [ ] Estructura:
```typescript
interface IslrConcept {
  code: string;        // "0001", "0002", etc.
  description: string;
  category: string;
  percentage: number;
  sustraendo?: number; // Bs
}

const ISLR_CONCEPTS: IslrConcept[] = [
  { code: "0001", description: "Honorarios profesionales", category: "servicios", percentage: 5, sustraendo: 1000 },
  // ... más conceptos
];
```

#### 4.2 Extender WithholdingService
- [ ] Método `createIslrWithholding(facturas[], conceptCode)`
- [ ] Cálculo con sustraendo:
```typescript
baseImponible = totalFactura;
if (baseImponible > sustraendo) {
  islrAmount = (baseImponible - sustraendo) * (percentage / 100);
} else {
  islrAmount = 0;
}
```

#### 4.3 Mapeo a JSON HKA (Tipo 06)
- [ ] Campo adicional: `CodigoConcepto` en `DetallesRetencion`
- [ ] `TotalesRetencion.TotalISRL`
- [ ] Diferencias con tipo 05

**JSON HKA Retención ISLR**:
```json
{
  "DetallesRetencion": [
    {
      "NumeroLinea": "1",
      "FechaDocumento": "11/11/2025",
      "TipoDocumento": "01",
      "NumeroDocumento": "82616",
      "BaseImponible": "256588.80",
      "CodigoConcepto": "0001",
      "Retenido": "12829.44",
      "Moneda": "BSD"
    }
  ],
  "TotalesRetencion": {
    "TotalISRL": "12829.44"
  }
}
```

#### 4.4 Frontend Retenciones ISLR
- [ ] Componente `WithholdingIslrForm.jsx`
- [ ] Selector de concepto ISLR (autocomplete)
- [ ] Mostrar % y sustraendo del concepto seleccionado
- [ ] Cálculo en vivo del monto retenido
- [ ] Validar que base > sustraendo

#### 4.5 Testing
- [ ] Test con concepto "Honorarios profesionales"
- [ ] Test con base menor que sustraendo (retención = 0)
- [ ] Test con múltiples facturas mismo concepto
- [ ] Validar cálculos contra tabla SENIAT

### ✅ Criterios de Aceptación Fase 4

- [ ] Catálogo ISLR completo importado
- [ ] Cálculos correctos con sustraendo
- [ ] Comprobantes ISLR emitidos
- [ ] Frontend intuitivo con ayudas
- [ ] Documentación de conceptos disponibles

---

## 🚀 FASE 5: FUNCIONALIDADES AVANZADAS

**Prioridad**: 🟢 BAJA
**Duración Estimada**: 12-15 horas
**Dependencias**: Fases 1-4 completadas
**Objetivo**: Completar integración 100%

### 📝 Tasks

#### 5.1 Query de Estado
- [ ] Endpoint GET `/api/billing/documents/:id/hka-status`
- [ ] Llamada a HKA `/api/EstadoDocumento`
- [ ] Actualizar estado local si difiere
- [ ] Cron job para sincronización periódica

#### 5.2 Anulación de Documentos
- [ ] Endpoint POST `/api/billing/documents/:id/cancel`
- [ ] Validar que documento esté emitido
- [ ] Llamada a HKA `/api/Anular`
- [ ] Actualizar estado a `cancelled`
- [ ] Registrar motivo de anulación

**Request HKA Anular**:
```json
{
  "serie": "",
  "tipoDocumento": "01",
  "numeroDocumento": "123456",
  "motivoAnulacion": "Error en monto",
  "fechaAnulacion": "23/03/2026",
  "horaAnulacion": "02:30:00 pm"
}
```

#### 5.3 Descarga de PDFs
- [ ] Endpoint GET `/api/billing/documents/:id/hka-pdf`
- [ ] Llamada a HKA `/api/DescargaArchivo`
- [ ] Stream del PDF al cliente
- [ ] Cache local opcional

#### 5.4 Envío de Emails
- [x] **HKA envía automáticamente** al emitir documento
- [ ] Endpoint POST `/api/billing/documents/:id/resend-email` (reenvío manual)
- [ ] Llamada a HKA `/api/Correo/Enviar`
- [ ] **Importante**: Delay de 30s entre reenvíos (recomendación HKA)
- [ ] Tracking de envíos (fecha, destinatarios)
- [ ] Rastreo con `/api/Correo/Rastreo`

#### 5.5 IGTF (3% Divisas)
- [ ] Detectar pagos en divisas en `FormasPago`
- [ ] Calcular IGTF = baseImponibleDivisas * 0.03
- [ ] Agregar a `ImpuestosSubtotal`:
```json
{
  "CodigoTotalImp": "IGTF",
  "AlicuotaImp": "3.00",
  "BaseImponibleImp": "352.7",
  "ValorTotalImp": "10.58"
}
```
- [ ] Actualizar `TotalAPagar = MontoTotalConIVA + IGTF`

#### 5.6 Comprobante ARCV (Tipo 07)
- [ ] Nodos adicionales: `Beneficiario`, `fechaCierreEjercicio`, `periodoRetencion`
- [ ] Soporte para retenciones varias (municipales, etc.)
- [ ] Frontend específico

#### 5.7 Webhooks
- [x] ~~Webhooks~~ **NO SOPORTADO por HKA Factory**
- [ ] Implementar polling con `/api/EstadoDocumento` como alternativa
- [ ] Cron job para sincronización periódica de estados
- [ ] Registrar cambios de estado en audit log

#### 5.8 Libro de Ventas
- [ ] Implementar formato específico HKA
- [ ] Separación por canal (digital vs máquina fiscal)
- [ ] Export CSV/PDF según formato SENIAT
- [ ] Endpoint `/api/billing/books/sales` ya existe, adaptar

#### 5.9 Integración Automática
- [ ] Hook en `SalesService` → auto-crear borrador billing
- [ ] Hook en `PurchaseService` → auto-aplicar retención si aplica
- [ ] Configuración de triggers por tenant

#### 5.10 Monitoreo y Alertas
- [ ] Dashboard de salud de integración HKA
- [ ] Alertas si tasa de fallos > 5%
- [ ] Estadísticas de tiempo de respuesta
- [ ] Log de todos los requests/responses HKA

### ✅ Criterios de Aceptación Fase 5

- [ ] Todos los endpoints HKA implementados
- [ ] IGTF calculado correctamente
- [ ] Webhooks funcionando
- [ ] Libro de ventas completo
- [ ] Integración automática con ventas/compras
- [ ] Monitoreo operativo

---

## 📚 CATÁLOGOS HKA FACTORY

### Catálogo 1: Tipo de Documento Fiscal
| Código | Descripción |
|--------|-------------|
| 01 | Factura |
| 02 | Nota de Crédito |
| 03 | Nota de Débito |
| 04 | Nota de Entrega / Guía de Despacho |
| 05 | Comprobante de Retención IVA |
| 06 | Comprobante de Retención ISLR |
| 07 | Comprobante de Retenciones Varias (ARCV) |

### Catálogo 2: Tipo de Proveedor
| Código | Descripción |
|--------|-------------|
| NULL | Normal |
| SR | Sin RIF |
| NR | No Residenciado |
| ND | No Domiciliado |

### Catálogo 3: Tipo de Transacción
| Código | Descripción |
|--------|-------------|
| 01 | Registro |
| 02 | Complemento |
| 03 | Anulación |
| 04 | Ajuste |
| 99 | Factura a Terceros |

### Catálogo 7: Código Internacional de Moneda (ISO 4217)
| Código | Descripción |
|--------|-------------|
| VES | Bolívar Soberano |
| BSD | Bolívar Digital |
| USD | Dólar Estadounidense |
| EUR | Euro |
| COP | Peso Colombiano |

### Catálogo 8: Tipo de Identificación
| Código | Descripción |
|--------|-------------|
| V | Persona Natural Venezolana |
| E | Extranjero Residenciado |
| J | Persona Jurídica |
| P | Pasaporte |
| G | Gubernamental |
| C | Comunal |

### Catálogo 10: Tipos de Alícuotas IVA
| Código | Tasa | Descripción |
|--------|------|-------------|
| G | 16% | Alícuota General |
| R | 8% | Alícuota Reducida |
| A | 31% | Alícuota Adicional (Suntuario) |
| E | 0% | Exento / Exonerado / No Gravado |
| P | 0% | Percibido |
| IGTF | 3% | Impuesto Grandes Transacciones Financieras |

### Catálogo 11: Formas de Pago
| Código | Descripción |
|--------|-------------|
| 01 | Depósito en cuenta |
| 02 | Pago Móvil |
| 03 | Transferencia de fondos |
| 04 | Orden de Pago |
| 05 | Tarjeta de Débito |
| 06 | Tarjeta de Crédito |
| 07 | Cheque no negociable |
| 08 | Efectivo Moneda Curso Legal |
| 09 | Efectivo Divisas |
| 99 | Otros medios de pago |

### Catálogo 12: Unidades de Medida (UNECE Recommendation 20)
| Código | Descripción |
|--------|-------------|
| NIU | Número de unidades |
| KGM | Kilogramo |
| LTR | Litro |
| MTR | Metro |
| 4L | Docenas |
| GRM | Gramo |

Referencia completa: https://www.unece.org/fileadmin/DAM/uncefact/recommendations/rec20/rec20_Rev13e_2017.xls

---

## 🔄 MAPEOS DE DATOS

### SmartKubik → HKA Factory

#### BillingDocument → documentoElectronico

| Campo SmartKubik | Campo HKA | Transformación |
|------------------|-----------|----------------|
| `type` | `TipoDocumento` | `invoice→01`, `credit_note→02`, etc. |
| `documentNumber` | `NumeroDocumento` | Directo |
| `issueDate` | `FechaEmision` | Format: `DD/MM/YYYY` |
| `issueDate` | `HoraEmision` | Format: `HH:MM:SS am/pm` |
| `paymentTerms.type` | `TipoDePago` | `contado→Inmediato`, `credito→Crédito` |
| `totals.currency` | `Moneda` | Directo (VES, USD, etc.) |
| `customer.taxId` | `Comprador.NumeroIdentificacion` | Formato: `J-12345678-9` |
| `customer.name` | `Comprador.RazonSocial` | Directo |
| `totals.subtotal` | `Totales.Subtotal` | Format: `"200.00"` (string) |
| `totals.grandTotal` | `Totales.TotalAPagar` | Format: `"232.00"` |

#### Cálculo de ImpuestosSubtotal
```typescript
// Agrupar items por código de impuesto
const byTaxCode = items.reduce((acc, item) => {
  const code = item.taxCode || 'E';
  if (!acc[code]) {
    acc[code] = {
      CodigoTotalImp: code,
      AlicuotaImp: item.taxRate || 0,
      BaseImponibleImp: 0,
      ValorTotalImp: 0
    };
  }
  acc[code].BaseImponibleImp += item.price;
  acc[code].ValorTotalImp += item.taxAmount;
  return acc;
}, {});

return Object.values(byTaxCode);
```

#### Generación de MontoEnLetras
```typescript
import { numeroALetras } from 'numero-a-letras';

const montoEnLetras = numeroALetras(totalAPagar, {
  plural: 'bolivares',
  singular: 'bolivar',
  centPlural: 'centimos',
  centSingular: 'centimo'
});
// Resultado: "doscientos treinta y dos bolivares con cincuenta centimos"
```

---

## 🧪 TESTING STRATEGY

### Niveles de Testing

#### 1. Unit Tests
**Scope**: Funciones y métodos individuales
**Tools**: Jest + ts-jest
**Coverage Target**: >80%

**Archivos a testear**:
- `hka-document.mapper.ts` → Validar JSON generado
- `hka-factory.provider.ts` → Mock de axios, validar requests
- `withholding.service.ts` → Cálculos de retenciones
- `islr-concepts.ts` → Catálogo completo

**Ejemplo**:
```typescript
describe('HkaDocumentMapper', () => {
  it('should map basic invoice to HKA JSON', () => {
    const doc = createMockBillingDocument({ type: 'invoice' });
    const hkaJson = mapper.toHkaFacturaJson(doc);

    expect(hkaJson.documentoElectronico.Encabezado.IdentificacionDocumento.TipoDocumento).toBe('01');
    expect(hkaJson.documentoElectronico.Encabezado.Totales.NroItems).toBe('2');
  });

  it('should calculate ImpuestosSubtotal correctly', () => {
    const doc = createMockBillingDocument({
      items: [
        { price: 100, taxRate: 16, taxCode: 'G' },
        { price: 50, taxRate: 16, taxCode: 'G' }
      ]
    });
    const hkaJson = mapper.toHkaFacturaJson(doc);

    const impuestos = hkaJson.documentoElectronico.Encabezado.Totales.ImpuestosSubtotal;
    expect(impuestos).toHaveLength(1);
    expect(impuestos[0].CodigoTotalImp).toBe('G');
    expect(impuestos[0].BaseImponibleImp).toBe('150.00');
    expect(impuestos[0].ValorTotalImp).toBe('24.00');
  });
});
```

#### 2. Integration Tests
**Scope**: Integración con API real de HKA (ambiente demo)
**Tools**: Jest + Supertest
**Pre-requisito**: Credenciales de demo configuradas

**Test Cases**:
```typescript
describe('HKA Factory Integration', () => {
  let authToken: string;

  beforeAll(async () => {
    // Autenticar con HKA demo
    authToken = await hkaProvider.authenticate();
  });

  it('should emit invoice and receive control number', async () => {
    const doc = await billingService.create({
      type: 'invoice',
      customerName: 'Cliente Test',
      customerTaxId: 'J-12345678-9',
      items: [{ description: 'Test Item', quantity: 1, unitPrice: 100 }]
    }, tenantId);

    const result = await billingService.issue(doc._id, {}, tenantId);

    expect(result.controlNumber).toMatch(/^\d{2}-\d{8}$/);
    expect(result.status).toBe('issued');
  });

  it('should query document status', async () => {
    const status = await hkaProvider.queryDocumentStatus('01', '', '123456');
    expect(status.status).toBe('issued');
  });

  it('should handle 400 error for invalid RIF', async () => {
    const doc = createMockDocument({ customerTaxId: 'INVALID' });
    await expect(hkaProvider.emitDocument(doc)).rejects.toThrow('RIF inválido');
  });
});
```

#### 3. E2E Tests
**Scope**: Flujos completos desde frontend
**Tools**: Playwright / Cypress

**Flujos a testear**:
1. Login → Crear Factura → Emitir → Ver QR
2. Crear NC → Referenciar Factura → Emitir
3. Crear Retención IVA → Seleccionar Facturas → Emitir → Aplicar
4. Anular Documento → Verificar estado

#### 4. Testing Manual (QA)
**Checklist**:
- [ ] Emitir factura con 1 item (G 16%)
- [ ] Emitir factura con múltiples items (G + E)
- [ ] Emitir factura en USD con tipo de cambio
- [ ] Emitir factura con IGTF (pago mixto BSD + USD)
- [ ] Crear NC referenciando factura
- [ ] Crear Guía de Despacho con datos de transporte
- [ ] Emitir retención IVA 75%
- [ ] Emitir retención ISLR con sustraendo
- [ ] Descargar PDF desde HKA
- [ ] Verificar QR en app SENIAT
- [ ] Anular documento
- [ ] Generar Libro de Ventas

---

## 🚢 DEPLOYMENT PLAN

### Pre-Producción

#### 1. Ambiente Staging
- [ ] Configurar variables de entorno HKA demo
- [ ] Deploy de backend con `HkaFactoryProvider`
- [ ] Deploy de frontend con nuevos componentes
- [ ] Smoke tests automatizados
- [ ] Revisión de logs (sin errores críticos)

#### 2. Testing con Datos Reales (Demo HKA)
- [ ] Emitir 10 facturas de prueba
- [ ] Verificar todos los números de control
- [ ] Validar QR codes en app SENIAT demo
- [ ] Probar anulaciones
- [ ] Generar libro de ventas del período

#### 3. Obtener Credenciales de Producción
- [ ] Solicitar a HKA Factory credenciales prod
- [ ] Configurar `HKA_FACTORY_BASE_URL=https://emisionv2.thefactoryhka.com.ve`
- [ ] Validar que RIF de empresa esté autorizado SENIAT
- [ ] Test de conectividad a producción

### Producción

#### 4. Deployment a Producción
```bash
# Backend
cd food-inventory-saas
npm run build
rsync -avz dist/ deployer@178.156.182.177:/var/www/smartkubik-api/
ssh deployer@178.156.182.177 "pm2 reload smartkubik-api"

# Frontend
cd food-inventory-admin
npm run build
rsync -avz dist/ deployer@178.156.182.177:/var/www/smartkubik-admin/
```

#### 5. Configuración Producción
```bash
# En servidor de producción
vim /var/www/smartkubik-api/.env

# Agregar:
IMPRENTA_PROVIDER_MODE=hka-factory
HKA_FACTORY_BASE_URL=https://emisionv2.thefactoryhka.com.ve
HKA_FACTORY_USUARIO=<prod-user>
HKA_FACTORY_CLAVE=<prod-password>
HKA_FACTORY_RIF_EMISOR=J-XXXXXXXXX-X
HKA_FACTORY_RAZON_SOCIAL="Empresa Real C.A."
HKA_FACTORY_TIMEOUT=45000

# Reiniciar
pm2 reload smartkubik-api
```

#### 6. Validación Post-Deploy
- [ ] Health check: `GET /api/health`
- [ ] Test autenticación HKA: logs sin errores
- [ ] Emitir 1 factura de prueba interna
- [ ] Verificar número de control en SENIAT real
- [ ] Monitorear logs por 24 horas

#### 7. Rollout Gradual
- [ ] **Día 1**: Solo tenant piloto (ej: empresa demo)
- [ ] **Día 3**: 3-5 tenants beta testers
- [ ] **Día 7**: 50% de tenants
- [ ] **Día 14**: 100% de tenants
- [ ] Revertir a mock si tasa de fallos > 10%

#### 8. Monitoreo Continuo
- [ ] Dashboard de métricas HKA (Grafana/Datadog)
  - Tiempo de respuesta promedio
  - Tasa de éxito/fallo
  - Número de documentos emitidos/día
- [ ] Alertas en Slack/Email si:
  - Fallo de autenticación HKA
  - > 5 errores consecutivos
  - Tiempo de respuesta > 60s
- [ ] Revisión semanal de logs de errores

---

## 📈 MÉTRICAS DE ÉXITO

### KPIs Técnicos

| Métrica | Target | Crítico |
|---------|--------|---------|
| Tasa de éxito de emisión | >95% | >90% |
| Tiempo de respuesta HKA | <5s | <10s |
| Disponibilidad API HKA | >99% | >95% |
| Cobertura de tests | >80% | >70% |
| Errores en producción (1er mes) | <50 | <100 |

### KPIs de Negocio

| Métrica | Target (1er mes) |
|---------|------------------|
| Facturas emitidas exitosamente | >500 |
| Retenciones IVA procesadas | >100 |
| Retenciones ISLR procesadas | >50 |
| Tiempo promedio de emisión | <30 segundos |
| Satisfacción del usuario (NPS) | >8/10 |

---

## 📞 SOPORTE Y MANTENIMIENTO

### Contacto HKA Factory
- **Email**: soporte_id_vnzla@thefactoryhka.com.ve
- **Swagger Demo**: https://demoemisionv2.thefactoryhka.com.ve/swagger/index.html
- **Swagger Prod**: https://emisionv2.thefactoryhka.com.ve/swagger/index.html

### Escalación de Incidentes

#### Nivel 1: Dev Team
- Errores de código / bugs
- Problemas de configuración
- Mejoras de features

#### Nivel 2: HKA Factory Support
- API down / timeout
- Cambios en formato de respuestas
- Problemas de autenticación
- Actualizaciones de normativa SENIAT

#### Nivel 3: SENIAT
- Rechazo de documentos por validaciones
- Cambios en normativa fiscal
- Problemas con RIF de empresa

---

## 📚 REFERENCIAS Y DOCUMENTACIÓN

### Documentos HKA Factory
1. `[IT-21-01-01][V02]REFERENCIA TECNICA API.pdf` (50 páginas)
2. JSONs de ejemplo (11 archivos)
3. PDFs demostrativos (Factura, NC, ND)

### Normativa SENIAT
- Providencia Administrativa SNAT/2022/000013 (IGTF)
- Ley de IVA (Artículo 24 - descuentos)
- Reglamento de Facturación Electrónica

### Documentación Interna
- `BILLING_API_DOCUMENTATION.md`
- `IMPRENTA_DIGITAL_PROVIDERS.md`
- `BILLING_UI_IMPLEMENTATION.md`
- Este roadmap

---

## ✅ CHECKLIST DE IMPLEMENTACIÓN

### Fase 1: Factura Básica (01)
- [ ] 1.1 Crear `HkaFactoryProvider`
- [ ] 1.2 Implementar autenticación JWT
- [ ] 1.3 Mapeo `BillingDocument` → JSON HKA
- [ ] 1.4 Implementar emisión
- [ ] 1.5 Actualizar `ImprentaDigitalProvider`
- [ ] 1.6 Tests unitarios e integración
- [ ] 1.7 Documentación de configuración

### Fase 2: Tipos de Documentos (02, 03, 04)
- [ ] 2.1 Nota de Crédito (02)
- [ ] 2.2 Nota de Débito (03)
- [ ] 2.3 Guía de Despacho (04)
- [ ] 2.4 Frontend adaptado
- [ ] 2.5 Tests por tipo

### Fase 3: Retenciones IVA (05)
- [ ] 3.1 Schema `WithholdingDocument`
- [ ] 3.2 `WithholdingService`
- [ ] 3.3 Mapeo JSON HKA tipo 05
- [ ] 3.4 Endpoint aplicar retención
- [ ] 3.5 Frontend retenciones IVA
- [ ] 3.6 Tests de cálculos

### Fase 4: Retenciones ISLR (06)
- [ ] 4.1 Catálogo conceptos ISLR
- [ ] 4.2 Extender `WithholdingService`
- [ ] 4.3 Mapeo JSON HKA tipo 06
- [ ] 4.4 Frontend retenciones ISLR
- [ ] 4.5 Tests con sustraendo

### Fase 5: Funcionalidades Avanzadas
- [ ] 5.1 Query de estado
- [ ] 5.2 Anulación
- [ ] 5.3 Descarga de PDFs
- [ ] 5.4 Envío de emails
- [ ] 5.5 IGTF (3% divisas)
- [ ] 5.6 Comprobante ARCV (07)
- [ ] 5.7 Webhooks
- [ ] 5.8 Libro de ventas
- [ ] 5.9 Integración automática
- [ ] 5.10 Monitoreo y alertas

### Deployment
- [ ] Testing en staging
- [ ] Credenciales de producción
- [ ] Deploy a producción
- [ ] Rollout gradual
- [ ] Monitoreo continuo

---

## 🎯 PRÓXIMOS PASOS INMEDIATOS

1. ✅ **Crear este roadmap** (COMPLETADO)
2. 🔄 **Iniciar Fase 1** (EN PROGRESO)
   - Crear `HkaFactoryProvider`
   - Implementar autenticación
   - Primer test de emisión
3. ⏳ Continuar con Fase 2 tras validación Fase 1

---

**Última Actualización**: 2026-03-23 16:00
**Versión**: 1.2
**Estado**: 🟢 Fases 1 y 2 completadas - Ajustando endpoints
**Progreso General**: 40% (Fases 1 y 2 completadas, ajustando endpoints según feedback HKA)

---

## 📝 NOTAS DEL PROVEEDOR HKA FACTORY (2026-03-23)

### Respuestas Oficiales a Consultas Técnicas:

1. **Descarga de PDF**:
   - Endpoint: `/api/DescargaArchivo`

2. **Consulta de Estado**:
   - Endpoint: `/api/EstadoDocumento`
   - JSON:
   ```json
   {
     "serie": "",
     "tipoDocumento": "01",
     "numeroDocumento": "numero de documento a consultar"
   }
   ```

3. **Anulación**:
   - Endpoint: `/api/Anular`

4. **Envío de Emails**:
   - ✅ HKA envía automáticamente el documento al email del cliente
   - También existe endpoint para reenvío manual
   - ⚠️ Delay recomendado: 30 segundos entre reenvíos

5. **Webhooks**:
   - ❌ NO soportan webhooks actualmente
   - ✅ Usar polling con `/api/EstadoDocumento` para validar status

6. **Rate Limits**:
   - ✅ No hay límites generales de requests por minuto/hora
   - ⚠️ Solo en reenvío de emails: 30 segundos de delay recomendado

7. **Notas de Crédito/Débito**:
   - ✅ Sí requieren nodo del documento afectado
   - Ver documentación para estructura completa

8. **Reintentos**:
   - ✅ Se puede reintentar con el mismo número si no fue procesado
   - ⚠️ El número debe ser secuencial
   - Si ya fue procesado, se debe usar nuevo número

9. **Swagger Demo**:
   - URL: https://demoemisionv2.thefactoryhka.com.ve/swagger/index.html
   - Contiene estructuras JSON de ejemplo y documentación completa

---

_Este roadmap es un documento vivo y se actualizará conforme avance la implementación._

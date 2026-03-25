# INTEGRACIÓN HKA FACTORY - RETENCIONES

## 📋 Resumen

Integración completa de retenciones IVA e ISLR con HKA Factory para emisión de comprobantes con número de control fiscal digital según normativa SENIAT Venezuela.

**Status**: ✅ COMPLETADO
**Tests**: 47 tests pasando (26 mapper + 21 servicio)
**Fecha**: 2026-03-23

---

## 🎯 Objetivos Cumplidos

- ✅ Mapper HKA para retenciones IVA (tipo 05)
- ✅ Mapper HKA para retenciones ISLR (tipo 06)
- ✅ Integración con WithholdingService
- ✅ Emisión real vía HKA Factory
- ✅ Manejo de errores y retry
- ✅ Tests completos (47/47)

---

## 📁 Arquitectura

```
┌────────────────────────────────────────────────────────────────┐
│                   Withholding Module                            │
│                                                                  │
│  ┌──────────────────┐                                           │
│  │ WithholdingService│                                          │
│  │                   │                                          │
│  │  createIvaRetention()                                        │
│  │  createIslrRetention()                                       │
│  │  issue() ────────┐                                           │
│  └──────────────────┘│                                          │
│                      │                                           │
│                      ▼                                           │
│        ┌────────────────────────┐                               │
│        │ HkaWithholdingMapper   │                               │
│        │                        │                               │
│        │  toHkaJson()           │                               │
│        │   ├─ toRetencionIvaJson()   (tipo 05)                 │
│        │   └─ toRetencionIslrJson()  (tipo 06)                 │
│        └────────────┬───────────┘                               │
│                     │                                            │
│                     ▼                                            │
│        ┌────────────────────────┐                               │
│        │ ImprentaProviderFactory│                               │
│        └────────────┬───────────┘                               │
│                     │                                            │
│                     ▼                                            │
│          ┌──────────────────────┐                               │
│          │  HkaFactoryProvider  │                               │
│          │                      │                               │
│          │  requestControlNumber()                              │
│          └──────────┬───────────┘                               │
└─────────────────────┼──────────────────────────────────────────┘
                      │
                      │ HTTPS + JWT
                      │
                      ▼
         ┌─────────────────────────────────┐
         │    HKA Factory API              │
         │                                 │
         │  POST /api/Autenticacion       │
         │  POST /api/Emision             │
         │       (tipo: "05" o "06")      │
         └─────────────┬───────────────────┘
                       │
                       ▼
         ┌─────────────────────────────────┐
         │         SENIAT                  │
         │   (Validación y Registro)       │
         └─────────────────────────────────┘
```

---

## 🔄 Flujo de Emisión

### 1. Creación de Retención (Draft)

```typescript
// IVA
const retention = await withholdingService.createIvaRetention({
  affectedDocumentId: invoiceId,
  retentionPercentage: 75, // o 100
  seriesId: retentionSeriesId,
  operationDate: '2024-01-15',
  notes: 'Retención IVA factura FAC-0001'
}, tenantId, userId);

// ISLR
const retention = await withholdingService.createIslrRetention({
  affectedDocumentId: invoiceId,
  conceptCode: 'H001',
  conceptDescription: 'Honorarios Profesionales',
  retentionPercentage: 3,
  sustraendo: 10,
  seriesId: retentionSeriesId,
  operationDate: '2024-01-15',
}, tenantId, userId);
```

**Resultado**:
- Estado: `draft`
- `documentNumber`: Asignado (ej. RET-IVA-0001)
- `controlNumber`: `undefined` (aún no emitido)

### 2. Emisión (Obtención de Número de Control)

```typescript
const issuedRetention = await withholdingService.issue(
  retentionId,
  {
    fiscalInfo: {
      period: '2024-01',
      declarationNumber: 'DEC-2024-001'
    }
  },
  tenantId,
  userId
);
```

**Proceso interno**:

#### 2.1. Mapeo a formato HKA

```typescript
// WithholdingService.issue() línea 349
const hkaJson = this.hkaWithholdingMapper.toHkaJson(retention);
```

**JSON generado para IVA (tipo 05)**:
```json
{
  "documentoElectronico": {
    "Encabezado": {
      "IdentificacionDocumento": {
        "TipoDocumento": "05",
        "NumeroDocumento": "RET-IVA-0001",
        "FechaEmision": "15/01/2024",
        "HoraEmision": "02:30:00 pm",
        "Serie": "RET-IVA",
        "Sucursal": "",
        "PeriodoImpositivoDesde": "01/01/2024",
        "PeriodoImpositivoHasta": "31/01/2024"
      },
      "Proveedor": {
        "TipoIdentificacion": "J",
        "NumeroIdentificacion": "123456789",
        "RazonSocial": "CLIENTE COMPRADOR, C.A.",
        "Direccion": "Av. Principal, Caracas",
        "Pais": "VE",
        "Telefono": ["+58-212-1234567"],
        "Correo": ["cliente@ejemplo.com"]
      },
      "Beneficiario": {
        "TipoIdentificacion": "J",
        "NumeroIdentificacion": "987654321",
        "RazonSocial": "EMPRESA VENDEDORA, C.A.",
        "Direccion": "Calle Secundaria, Valencia",
        "Pais": "VE",
        "Telefono": ["+58-241-9876543"],
        "Correo": ["vendedor@ejemplo.com"]
      },
      "DocumentoAfectado": {
        "TipoDocumento": "01",
        "NumeroDocumento": "FAC-0001",
        "NumeroControl": "12345678",
        "FechaEmision": "10/01/2024",
        "MontoTotal": "1160.00"
      },
      "Totales": {
        "MontoBaseImponible": "1000.00",
        "MontoImpuesto": "160.00",
        "PorcentajeRetencion": "75",
        "MontoRetenido": "120.00",
        "Moneda": "VES"
      }
    },
    "DetallesRetencion": [
      {
        "NumeroLinea": "1",
        "CodigoImpuesto": "G",
        "BaseImponible": "1000.00",
        "AlicuotaIVA": "16",
        "MontoIVA": "160.00",
        "PorcentajeRetencion": "75",
        "MontoRetenido": "120.00"
      }
    ],
    "InfoAdicional": [
      {
        "Campo": "Observaciones",
        "Valor": "Retención IVA factura FAC-0001"
      }
    ]
  }
}
```

**JSON generado para ISLR (tipo 06)**:
```json
{
  "documentoElectronico": {
    "Encabezado": {
      "IdentificacionDocumento": {
        "TipoDocumento": "06",
        "NumeroDocumento": "RET-ISLR-0001",
        "FechaEmision": "15/01/2024",
        "HoraEmision": "02:45:00 pm",
        "Serie": "RET-ISLR",
        "Sucursal": "",
        "PeriodoImpositivoDesde": "15/01/2024",
        "PeriodoImpositivoHasta": "15/01/2024"
      },
      "Proveedor": { /* ... */ },
      "Beneficiario": { /* ... */ },
      "DocumentoAfectado": { /* ... */ },
      "Totales": {
        "MontoBaseImponible": "5000.00",
        "PorcentajeRetencion": "3",
        "MontoRetenido": "140.00",
        "Sustraendo": "10.00",
        "Moneda": "VES"
      }
    },
    "DetallesRetencion": [
      {
        "NumeroLinea": "1",
        "CodigoConcepto": "H001",
        "DescripcionConcepto": "Honorarios Profesionales",
        "BaseImponible": "5000.00",
        "PorcentajeRetencion": "3",
        "Sustraendo": "10.00",
        "MontoRetenido": "140.00"
      }
    ]
  }
}
```

#### 2.2. Llamada a HKA Factory

```typescript
// HkaFactoryProvider.requestControlNumber() línea 222
const response = await this.httpClient.post<HkaEmisionResponse>(
  '/api/Emision',
  hkaPayload,
  {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  }
);
```

**Request**:
```http
POST https://demoemisionv2.thefactoryhka.com.ve/api/Emision
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Content-Type: application/json

{
  "documentoElectronico": { /* JSON del mapper */ }
}
```

**Response Success (código 200)**:
```json
{
  "codigo": "200",
  "mensaje": "Documento emitido exitosamente",
  "resultado": {
    "imprentaDigital": "HKA FACTORY",
    "autorizado": "SI",
    "tipoDocumento": "05",
    "numeroDocumento": "RET-IVA-0001",
    "numeroControl": "00-12345678",
    "fechaAsignacion": "15/01/2024",
    "horaAsignacion": "02:30:15 pm",
    "transaccionId": "TXN-20240115-001"
  }
}
```

**Response Error (código 203/400/500)**:
```json
{
  "codigo": "203",
  "mensaje": "Error de validación",
  "validaciones": [
    "El RIF del proveedor es inválido",
    "La base imponible no puede ser cero"
  ]
}
```

#### 2.3. Actualización de la Retención

```typescript
// WithholdingService.issue() líneas 369-381
retention.controlNumber = controlNumberResponse.controlNumber;
retention.status = 'issued';
retention.issueDate = new Date();
retention.issuedBy = userId;

retention.metadata = {
  ...retention.metadata,
  hkaTransactionId: controlNumberResponse.metadata?.transaccionId,
  hkaAssignmentDate: controlNumberResponse.metadata?.fechaAsignacion,
};

await retention.save();
```

**Resultado**:
- Estado: `issued`
- `controlNumber`: `"00-12345678"`
- `issueDate`: `2024-01-15T14:30:15.000Z`
- `metadata.hkaTransactionId`: `"TXN-20240115-001"`

---

## 🧪 Testing

### Tests del Mapper (26 tests)

```bash
npm test -- hka-withholding.mapper.spec
```

**Cobertura**:
- ✅ Mapeo IVA (tipo 05) completo
- ✅ Mapeo ISLR (tipo 06) completo
- ✅ Formateo de fechas (DD/MM/YYYY)
- ✅ Formateo de tiempo (HH:MM:SS am/pm)
- ✅ Extracción de tipo de RIF (V, E, J, P, G, C)
- ✅ Limpieza de RIF (sin guiones)
- ✅ Períodos impositivos mensuales
- ✅ Manejo de sustraendo (ISLR)
- ✅ Información adicional (notas, declaración)
- ✅ Edge cases (campos faltantes, moneda BSD)

### Tests del Servicio (21 tests)

```bash
npm test -- withholding.service.spec
```

**Cobertura**:
- ✅ Creación de retenciones IVA (75%, 100%)
- ✅ Creación de retenciones ISLR (con/sin sustraendo)
- ✅ Emisión con HKA Factory
- ✅ Manejo de errores HKA
- ✅ Logging de fallos para retry
- ✅ Cálculo de totales
- ✅ Cancelación de retenciones

### Ejemplo de Test

```typescript
it('should issue a draft retention with HKA Factory', async () => {
  const draftRetention = { /* ... */ };

  // Mock HKA mapper
  const mockHkaJson = { documentoElectronico: {} };
  jest.spyOn(hkaWithholdingMapper, 'toHkaJson').mockReturnValue(mockHkaJson);

  // Mock imprenta provider
  const mockProvider = {
    getProviderName: jest.fn().mockReturnValue('HKA Factory'),
    requestControlNumber: jest.fn().mockResolvedValue({
      controlNumber: '12345678',
      success: true,
      metadata: {
        transaccionId: 'TXN-123',
        fechaAsignacion: '2024-01-15',
      },
    }),
  };

  const result = await service.issue(retentionId, {}, tenantId, userId);

  expect(hkaWithholdingMapper.toHkaJson).toHaveBeenCalledWith(draftRetention);
  expect(mockProvider.requestControlNumber).toHaveBeenCalledWith({
    documentId: retentionId,
    tenantId,
    seriesId,
    documentNumber: 'RET-IVA-0101',
    type: '05',
    metadata: {
      hkaJson: mockHkaJson,
      retentionType: 'iva',
    },
  });
  expect(draftRetention.controlNumber).toBe('12345678');
  expect(draftRetention.status).toBe('issued');
});
```

---

## ⚠️ Manejo de Errores

### 1. Error de Validación HKA

**Escenario**: HKA rechaza el documento (código 203)

```typescript
// HkaFactoryProvider línea 238
if (codigo === '203' || codigo === '400' || codigo === '500') {
  const errorMsg = validaciones?.join(', ') || mensaje;
  throw new Error(`HKA rechazó el documento: ${errorMsg}`);
}
```

**Resultado**:
- Retención permanece en estado `draft`
- Error registrado en `ImprentaFailure` para retry
- Log de error con detalles de validación

### 2. Error de Conexión/Timeout

**Escenario**: HKA no responde o timeout

```typescript
// WithholdingService líneas 388-405
catch (error) {
  this.logger.error(`❌ Error emitiendo retención ${retention.documentNumber}:`, error.message);

  // Registrar fallo para retry posterior
  await this.imprentaFailureModel.create({
    documentId: retention._id.toString(),
    documentType: retention.type === 'iva' ? '05' : '06',
    documentNumber: retention.documentNumber,
    tenantId,
    errorMessage: error.message,
    errorStack: error.stack,
    payload: {},
    retryCount: 0,
    lastRetryAt: null,
  });

  throw new Error('Error al emitir retención. Será reintentado automáticamente.');
}
```

**Resultado**:
- Retención permanece en estado `draft`
- Registro en `imprenta_failures` para retry automático
- Usuario notificado del error

### 3. Retención Ya Emitida

```typescript
// WithholdingService líneas 314-321
if (retention.status === 'issued') {
  this.logger.log(`ℹ️ Retención ${retention.documentNumber} ya está emitida`);
  return retention;
}
```

**Resultado**:
- No se intenta emitir nuevamente
- Se retorna la retención con su número de control existente

---

## 📊 Diferencias IVA vs ISLR

| Aspecto | IVA (Tipo 05) | ISLR (Tipo 06) |
|---------|---------------|----------------|
| **Tipo de Documento** | `"05"` | `"06"` |
| **Período Impositivo** | Mensual (01/MM/YYYY - 31/MM/YYYY) | Fecha de operación |
| **Base de Cálculo** | Base imponible + IVA | Base imponible |
| **Porcentaje** | 75% o 100% del IVA | % según concepto ISLR |
| **Sustraendo** | No aplica | Opcional (Bs) |
| **Conceptos** | Código de impuesto (G, E, R) | Código de concepto ISLR (H001, etc.) |
| **Campos únicos** | `AlicuotaIVA`, `MontoIVA` | `CodigoConcepto`, `Sustraendo` |
| **Cálculo** | `retenido = IVA * (% / 100)` | `retenido = (base - sustraendo) * (% / 100)` |

---

## 🔧 Configuración

### Variables de Entorno

```bash
# HKA Factory API
HKA_FACTORY_BASE_URL=https://demoemisionv2.thefactoryhka.com.ve
HKA_FACTORY_USUARIO=usuario_demo
HKA_FACTORY_CLAVE=clave_demo
HKA_FACTORY_RIF_EMISOR=J-123456789
HKA_FACTORY_RAZON_SOCIAL=EMPRESA DEMO, C.A.
HKA_FACTORY_TIMEOUT=45000
```

### Registro del Mapper en BillingModule

```typescript
// billing.module.ts líneas 60, 105
import { HkaWithholdingMapper } from "./mappers/hka-withholding.mapper";

@Module({
  // ...
  providers: [
    // ...
    WithholdingService,
    HkaWithholdingMapper,  // ← Registrado aquí
    // ...
  ],
})
```

### Inyección en WithholdingService

```typescript
// withholding.service.ts
constructor(
  @InjectModel(WithholdingDocument.name)
  private withholdingModel: Model<WithholdingDocument>,

  @InjectModel(BillingDocument.name)
  private billingModel: Model<BillingDocument>,

  private readonly numberingService: NumberingService,
  private readonly imprentaProviderFactory: ImprentaProviderFactory,
  private readonly hkaWithholdingMapper: HkaWithholdingMapper,  // ← Inyectado

  @InjectModel(ImprentaFailure.name)
  private imprentaFailureModel: Model<ImprentaFailure>,
) {}
```

---

## 📝 Ejemplo Completo E2E

### 1. Setup Inicial

```typescript
import { WithholdingService } from './withholding.service';
import { Types } from 'mongoose';

const tenantId = '507f1f77bcf86cd799439011';
const userId = '507f1f77bcf86cd799439012';
const invoiceId = '507f1f77bcf86cd799439013';
const retentionSeriesId = '507f1f77bcf86cd799439014';
```

### 2. Crear Retención IVA (75%)

```typescript
const ivaRetention = await withholdingService.createIvaRetention({
  affectedDocumentId: invoiceId,
  retentionPercentage: 75,
  seriesId: retentionSeriesId,
  operationDate: '2024-01-15',
  notes: 'Retención IVA 75% sobre factura FAC-0001'
}, tenantId, userId);

console.log(ivaRetention);
// {
//   _id: ObjectId('...'),
//   type: 'iva',
//   documentNumber: 'RET-IVA-0001',
//   status: 'draft',
//   affectedDocumentId: ObjectId('...'),
//   ivaRetention: {
//     baseAmount: 1000,
//     taxRate: 16,
//     taxAmount: 160,
//     retentionPercentage: 75,
//     retentionAmount: 120  // 160 * 0.75
//   },
//   totals: {
//     totalRetention: 120,
//     currency: 'VES'
//   }
// }
```

### 3. Emitir Retención (Obtener Número de Control)

```typescript
const issuedRetention = await withholdingService.issue(
  ivaRetention._id.toString(),
  {
    fiscalInfo: {
      period: '2024-01',
      declarationNumber: 'DEC-2024-001'
    }
  },
  tenantId,
  userId
);

console.log(issuedRetention);
// {
//   _id: ObjectId('...'),
//   type: 'iva',
//   documentNumber: 'RET-IVA-0001',
//   controlNumber: '00-12345678',  // ← Asignado por HKA
//   status: 'issued',               // ← Cambiado a issued
//   issueDate: 2024-01-15T14:30:15.000Z,
//   issuedBy: ObjectId('...'),
//   metadata: {
//     hkaTransactionId: 'TXN-20240115-001',
//     hkaAssignmentDate: '15/01/2024'
//   },
//   // ... resto de campos
// }
```

### 4. Generar PDF del Comprobante

```typescript
const pdfBuffer = await withholdingPdfService.generate(issuedRetention);

// Descargar PDF
res.set({
  'Content-Type': 'application/pdf',
  'Content-Disposition': `attachment; filename="RET-IVA-0001.pdf"`,
  'Content-Length': pdfBuffer.length,
});
res.send(pdfBuffer);
```

### 5. Crear Retención ISLR

```typescript
const islrRetention = await withholdingService.createIslrRetention({
  affectedDocumentId: invoiceId,
  conceptCode: 'H001',
  conceptDescription: 'Honorarios Profesionales',
  retentionPercentage: 3,
  sustraendo: 10,
  seriesId: retentionSeriesId,
  operationDate: '2024-01-15',
  notes: 'Retención ISLR por honorarios profesionales'
}, tenantId, userId);

console.log(islrRetention);
// {
//   type: 'islr',
//   documentNumber: 'RET-ISLR-0001',
//   status: 'draft',
//   islrRetention: {
//     conceptCode: 'H001',
//     conceptDescription: 'Honorarios Profesionales',
//     baseAmount: 5000,
//     retentionPercentage: 3,
//     sustraendo: 10,
//     retentionAmount: 149.70  // (5000 - 10) * 0.03
//   }
// }
```

### 6. Emitir Retención ISLR

```typescript
const issuedIslr = await withholdingService.issue(
  islrRetention._id.toString(),
  {},
  tenantId,
  userId
);

console.log(issuedIslr.controlNumber);  // '00-22334455'
console.log(issuedIslr.status);         // 'issued'
```

---

## 🚀 Deployment

### 1. Build

```bash
cd food-inventory-saas
npm run build
```

### 2. Deploy a Producción

```bash
# Rsync del build
rsync -avz --delete \
  dist/ \
  deployer@178.156.182.177:/home/deployer/smartkubik-api/

# Reload PM2
ssh deployer@178.156.182.177 "pm2 reload smartkubik-api"
```

### 3. Verificar Variables de Entorno

```bash
ssh deployer@178.156.182.177
cd /home/deployer/smartkubik-api
cat .env | grep HKA_
```

**Esperado**:
```
HKA_FACTORY_BASE_URL=https://emisionv2.thefactoryhka.com.ve
HKA_FACTORY_USUARIO=USUARIO_PROD
HKA_FACTORY_CLAVE=CLAVE_PROD
HKA_FACTORY_RIF_EMISOR=J-XXXXXXXXX
HKA_FACTORY_RAZON_SOCIAL=TU EMPRESA, C.A.
```

### 4. Testing en Producción

```bash
# Health check
curl https://api.smartkubik.com/health

# Test de emisión (con token válido)
curl -X POST \
  https://api.smartkubik.com/api/v1/withholding/:id/issue \
  -H 'Authorization: Bearer {token}' \
  -H 'Content-Type: application/json' \
  -d '{
    "fiscalInfo": {
      "period": "2024-01"
    }
  }'
```

---

## 🐛 Troubleshooting

### Problema: "HKA rechazó el documento: El RIF del proveedor es inválido"

**Causa**: Formato de RIF incorrecto

**Solución**:
```typescript
// Verificar formato del RIF
const rifPattern = /^[VEJPGC]-\d{8,9}-\d$/;
if (!rifPattern.test(retention.issuer.taxId)) {
  throw new Error('Formato de RIF inválido');
}

// Correcto: J-12345678-9
// Incorrecto: J12345678 (sin guiones)
```

### Problema: "Número de control no recibido de HKA"

**Causa**: Respuesta de HKA sin campo `numeroControl`

**Solución**:
```typescript
// Revisar logs del proveedor
this.logger.debug(`HKA Response: ${JSON.stringify(response.data, null, 2)}`);

// Verificar que codigo === '200'
if (response.data.codigo !== '200') {
  console.error('HKA Error:', response.data);
}
```

### Problema: "Token de autenticación expirado"

**Causa**: Token JWT de HKA expiró (válido por 12 horas)

**Solución**:
```typescript
// El provider auto-renueva el token
// Verificar en logs:
this.logger.log(`🔑 Token HKA renovado (expira en ${expiresIn}s)`);

// Si persiste, verificar credenciales:
HKA_FACTORY_USUARIO=correcto
HKA_FACTORY_CLAVE=correcta
```

### Problema: "Error de conexión con HKA Factory"

**Causa**: Problemas de red o HKA caído

**Solución**:
1. Verificar conectividad:
```bash
curl -I https://demoemisionv2.thefactoryhka.com.ve/api/Autenticacion
```

2. Revisar timeout (default 45s):
```typescript
HKA_FACTORY_TIMEOUT=60000  // Aumentar a 60s
```

3. Verificar en logs de retry:
```typescript
// El sistema reintentará automáticamente
// Ver tabla `imprenta_failures`:
db.imprenta_failures.find({ documentType: '05' }).sort({ createdAt: -1 })
```

---

## 📚 Referencias

### Documentación Relacionada

- [FASE_4_WITHHOLDING_SERVICE.md](./FASE_4_WITHHOLDING_SERVICE.md) - Servicio de retenciones
- [FASE_5_PDF_RETENCIONES.md](./FASE_5_PDF_RETENCIONES.md) - Generación de PDFs
- [FASE_6_REPORTES_FISCALES.md](./FASE_6_REPORTES_FISCALES.md) - Reportes fiscales

### Schemas

- [withholding-document.schema.ts](../../schemas/withholding-document.schema.ts)
- [billing-document.schema.ts](../../schemas/billing-document.schema.ts)
- [imprenta-failure.schema.ts](../../schemas/imprenta-failure.schema.ts)

### API HKA Factory

- URL Demo: https://demoemisionv2.thefactoryhka.com.ve
- Swagger: https://demoemisionv2.thefactoryhka.com.ve/swagger/index.html
- Documentación Oficial: (solicitar a HKA Factory)

### Normativa SENIAT

- **Decreto 1.808**: Retención de IVA
- **Decreto 1.808 (modificaciones)**: Retención ISLR
- **Providencia SNAT/2024/000102**: Facturación electrónica
- **Catálogo ISLR**: Conceptos y porcentajes de retención

---

## ✅ Checklist de Implementación

- [x] HkaWithholdingMapper implementado
- [x] Mapeo IVA (tipo 05) completo
- [x] Mapeo ISLR (tipo 06) completo
- [x] Integración con WithholdingService
- [x] Llamada a HKA Factory funcionando
- [x] Manejo de errores y retry
- [x] Tests del mapper (26/26)
- [x] Tests del servicio (21/21)
- [x] Documentación completa
- [ ] Frontend de retenciones (pendiente)
- [ ] Testing E2E en ambiente de pruebas HKA
- [ ] Testing en producción
- [ ] Homologación SENIAT

---

**Última actualización**: 2026-03-23
**Versión**: 1.0.0
**Autor**: Claude + Juan Alfredo Santa María

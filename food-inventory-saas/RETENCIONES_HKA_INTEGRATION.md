# Integración HKA Factory para Retenciones (Fase 4)

## Resumen

Esta fase implementa la integración completa del módulo de Retenciones (IVA e ISLR) con HKA Factory, permitiendo la emisión fiscal de comprobantes de retención con número de control oficial.

## Estado: ✅ COMPLETADO

**Fecha de completación:** 2026-03-23
**Tests:** 74/74 pasando (100%)
**Cobertura:**
- HkaWithholdingMapper: ✅
- WithholdingService: ✅ 21 tests
- WithholdingController: ✅

---

## Arquitectura

```
┌─────────────────────────────────────────────────────────────────┐
│                     WithholdingController                        │
│  POST /withholding/iva  |  POST /withholding/islr               │
│  POST /withholding/:id/issue                                     │
└─────────────────────┬───────────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────────┐
│                     WithholdingService                           │
│                                                                   │
│  createIvaRetention()  ──┐                                       │
│  createIslrRetention() ──┤  Crea retención en estado 'draft'    │
│                          │                                       │
│  issue() ────────────────┘  Emite a HKA Factory                 │
│     │                                                             │
│     ├─► getTenantData()      (consulta Tenant para datos)       │
│     ├─► HkaWithholdingMapper.toHkaJson()  (mapea a formato HKA) │
│     ├─► ImprentaProviderFactory.getProvider()                   │
│     └─► provider.requestControlNumber()                         │
└─────────────────────┬───────────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────────┐
│              HkaWithholdingMapper (Mapper)                       │
│                                                                   │
│  toHkaJson(retention) → HKA DocumentoElectronico JSON           │
│    - Mapea tipo de retención (05 IVA, 06 ISLR)                  │
│    - Convierte montos y porcentajes                              │
│    - Formatea fechas y referencias                               │
└─────────────────────┬───────────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────────┐
│           ImprentaProviderFactory (Factory Pattern)              │
│                                                                   │
│  getProvider() → HkaFactoryProvider | MockProvider              │
│    (basado en IMPRENTA_PROVIDER_MODE env)                       │
└─────────────────────┬───────────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────────┐
│               HkaFactoryProvider (API Client)                    │
│                                                                   │
│  authenticate() ──────► POST /api/Auth (JWT con 12h expiry)     │
│  requestControlNumber() ──► POST /api/Emision                   │
│     └─► Retorna: { controlNumber, metadata }                    │
│                                                                   │
│  Error? ──► Registra en ImprentaFailure para retry              │
└─────────────────────────────────────────────────────────────────┘
```

---

## Flujo de Emisión

### 1. Crear Retención (Draft)

```typescript
POST /api/v1/withholding/iva
{
  "affectedDocumentId": "65f1234...",
  "retentionPercentage": 75,
  "seriesId": "65f5678...",
  "operationDate": "2024-01-15",
  "notes": "Retención IVA 75%"
}
```

**Respuesta:**
```json
{
  "_id": "65f9abc...",
  "type": "iva",
  "status": "draft",
  "documentNumber": "RET-IVA-0101",
  "controlNumber": null,
  "ivaRetention": {
    "baseAmount": 1000,
    "taxRate": 16,
    "taxAmount": 160,
    "retentionPercentage": 75,
    "retentionAmount": 120
  },
  "totals": {
    "subtotal": 1000,
    "totalTax": 160,
    "totalRetention": 120,
    "currency": "VES"
  }
}
```

### 2. Emitir a HKA Factory

```typescript
POST /api/v1/withholding/:id/issue
{
  "fiscalInfo": {
    "period": "2024-01",
    "declarationNumber": "DEC-001"
  }
}
```

**Proceso interno:**

1. ✅ Valida que status sea 'draft' o 'validated'
2. ✅ Actualiza taxInfo con período y declaración
3. ✅ Obtiene datos del tenant (name, RIF, dirección, etc.)
4. ✅ Mapea retención a formato HKA usando `HkaWithholdingMapper`
5. ✅ Obtiene provider de HKA Factory
6. ✅ Solicita número de control:
   ```typescript
   await imprentaProvider.requestControlNumber({
     documentId: retention._id.toString(),
     tenantId,
     seriesId: retention.seriesId.toString(),
     documentNumber: retention.documentNumber,
     type: '05', // '05' para IVA, '06' para ISLR
     metadata: {
       hkaJson,
       retentionType: 'iva'
     }
   })
   ```
7. ✅ Actualiza retención con:
   - `controlNumber`: número de control fiscal
   - `status`: 'issued'
   - `issueDate`: fecha de emisión
   - `issuedBy`: usuario que emitió
   - `metadata.hkaTransactionId`: ID de transacción HKA
   - `metadata.hkaAssignmentDate`: fecha de asignación HKA
8. ✅ Guarda en base de datos

**Respuesta exitosa:**
```json
{
  "_id": "65f9abc...",
  "type": "iva",
  "status": "issued",
  "documentNumber": "RET-IVA-0101",
  "controlNumber": "12345678",
  "issueDate": "2024-01-15T14:30:00.000Z",
  "issuedBy": "65f1234...",
  "metadata": {
    "hkaTransactionId": "TXN-123456",
    "hkaAssignmentDate": "2024-01-15"
  },
  ...
}
```

---

## Manejo de Errores

### Error de HKA Factory

Si HKA Factory falla (timeout, API error, autenticación, etc.):

1. ✅ Se registra el error en `ImprentaFailure` collection:
   ```typescript
   {
     documentId: "65f9abc...",
     documentType: "05",
     documentNumber: "RET-IVA-0101",
     tenantId: "65f1234...",
     errorMessage: "HKA API Error: timeout",
     errorStack: "...",
     payload: { /* retención completa */ },
     retryCount: 0,
     nextRetryAt: "2024-01-15T14:35:00.000Z", // +5 minutos
     status: "pending"
   }
   ```

2. ✅ Se lanza `BadRequestException` al cliente:
   ```json
   {
     "statusCode": 400,
     "message": "Error al emitir retención: HKA API Error: timeout"
   }
   ```

3. ✅ La retención permanece en estado 'draft'

4. ✅ Sistema de retry automático puede reintentar emisión posteriormente

### Recuperación

- **Manual:** Volver a llamar `POST /:id/issue`
- **Automático:** Job de retry procesa `ImprentaFailure` collection cada 5 minutos

---

## Tipos de Documentos HKA

| Tipo Retención | Código HKA | Schema                          |
|----------------|------------|---------------------------------|
| IVA            | `05`       | `CreateIvaRetentionDto`         |
| ISLR           | `06`       | `CreateIslrRetentionDto`        |

---

## Endpoints

### Crear Retención IVA

```http
POST /api/v1/withholding/iva
Authorization: Bearer {token}

{
  "affectedDocumentId": string (required),
  "retentionPercentage": 75 | 100 (required),
  "seriesId": string (required),
  "operationDate": string (optional, ISO date),
  "notes": string (optional)
}
```

### Crear Retención ISLR

```http
POST /api/v1/withholding/islr
Authorization: Bearer {token}

{
  "affectedDocumentId": string (required),
  "conceptCode": string (required, ej: "H001"),
  "conceptDescription": string (required),
  "retentionPercentage": number (required),
  "baseAmount": number (optional, usa subtotal factura si no se provee),
  "sustraendo": number (optional),
  "seriesId": string (required),
  "operationDate": string (optional, ISO date),
  "notes": string (optional)
}
```

### Emitir Retención

```http
POST /api/v1/withholding/:id/issue
Authorization: Bearer {token}

{
  "fiscalInfo": {
    "period": string (optional, formato "YYYY-MM"),
    "declarationNumber": string (optional)
  }
}
```

### Listar Retenciones

```http
GET /api/v1/withholding?type=iva&status=issued&period=2024-01
Authorization: Bearer {token}
```

### Consultar por Factura

```http
GET /api/v1/withholding/by-invoice/:invoiceId
Authorization: Bearer {token}
```

### Calcular Totales de Factura

```http
GET /api/v1/withholding/by-invoice/:invoiceId/totals
Authorization: Bearer {token}
```

Retorna:
```json
{
  "totalIva": 120,
  "totalIslr": 30,
  "total": 150
}
```

### Anular Retención

```http
POST /api/v1/withholding/:id/cancel
Authorization: Bearer {token}
```

---

## Tests

### Ejecutar todos los tests de retenciones

```bash
npm test -- withholding
```

**Resultado esperado:**
```
Test Suites: 3 passed, 3 total
Tests:       74 passed, 74 total
```

### Tests específicos

```bash
# Solo service
npm test -- withholding.service.spec

# Solo controller
npm test -- withholding.controller.spec

# Solo mapper
npm test -- hka-withholding.mapper.spec
```

### Cobertura de tests

- ✅ Creación IVA con diferentes porcentajes (75%, 100%)
- ✅ Creación ISLR con/sin sustraendo
- ✅ Validaciones de factura (existente, emitida, no duplicada)
- ✅ Validación de serie existente
- ✅ Emisión exitosa a HKA Factory
- ✅ Manejo de errores y registro en ImprentaFailure
- ✅ Cálculo de totales por factura
- ✅ Filtrado por tipo, estado, período, beneficiario
- ✅ Permisos y guards

---

## Configuración

### Variables de Entorno

```env
# Modo de proveedor de imprenta
IMPRENTA_PROVIDER_MODE=hka-factory  # o 'mock' para desarrollo

# Credenciales HKA Factory
HKA_FACTORY_API_URL=https://api.hkafactory.com
HKA_FACTORY_USERNAME=your_username
HKA_FACTORY_PASSWORD=your_password

# Opcionales
HKA_FACTORY_TIMEOUT=30000  # ms
HKA_FACTORY_MAX_RETRIES=3
HKA_FACTORY_RETRY_DELAY=5000  # ms
```

### Modo Mock (Desarrollo)

```env
IMPRENTA_PROVIDER_MODE=mock
```

El mock provider:
- ✅ Genera números de control ficticios
- ✅ Simula latencia de API (~500ms)
- ✅ No hace llamadas reales a HKA Factory
- ✅ Útil para desarrollo y tests de integración

---

## Schema de Base de Datos

### WithholdingDocument

```typescript
{
  _id: ObjectId,
  tenantId: ObjectId,
  type: 'iva' | 'islr',
  status: 'draft' | 'validated' | 'issued' | 'archived',
  seriesId: ObjectId,
  documentNumber: string,
  controlNumber?: string,  // ← Asignado por HKA Factory
  issueDate?: Date,
  issuedBy?: ObjectId,

  affectedDocumentId: ObjectId,  // Factura relacionada
  affectedDocumentNumber: string,
  affectedDocumentControlNumber: string,

  // Beneficiario (quien retiene)
  beneficiary: {
    name: string,
    taxId: string,
    address?: string,
    email?: string,
    phone?: string
  },

  // Agente de retención (a quien se le retiene)
  withholdingAgent: {
    name: string,
    taxId: string,
    isRetentionAgent: boolean,
    taxpayerType: 'ordinario' | 'especial'
  },

  // Campos específicos IVA
  ivaRetention?: {
    baseAmount: number,
    taxRate: number,
    taxAmount: number,
    retentionPercentage: 75 | 100,
    retentionAmount: number
  },

  // Campos específicos ISLR
  islrRetention?: {
    conceptCode: string,
    conceptDescription: string,
    baseAmount: number,
    retentionPercentage: number,
    retentionAmount: number,
    sustraendo?: number
  },

  // Totales
  totals: {
    subtotal: number,
    totalTax: number,
    totalRetention: number,
    currency: 'VES' | 'USD'
  },

  // Info fiscal
  taxInfo?: {
    period?: string,            // "YYYY-MM"
    declarationNumber?: string
  },

  // Metadata HKA
  metadata?: {
    hkaTransactionId?: string,
    hkaAssignmentDate?: string,
    [key: string]: any
  },

  notes?: string,
  createdAt: Date,
  updatedAt: Date
}
```

---

## Próximos Pasos (Fase 5+)

### Sugerencias de mejoras futuras:

1. **PDF de Retenciones**
   - Generar PDF oficial del comprobante de retención
   - Incluir QR code con control number
   - Template personalizable por tenant

2. **Envío Automático**
   - Email al proveedor con PDF adjunto
   - WhatsApp con link de descarga
   - Integración con sistemas contables

3. **Reportes Fiscales**
   - Libro de retenciones IVA (mensual)
   - Relación de retenciones ISLR (anual)
   - Exportación XML para SENIAT

4. **Dashboard Fiscal**
   - Retenciones por período
   - Gráficos de retenciones aplicadas
   - Alertas de períodos sin declarar

5. **Validaciones Avanzadas**
   - Verificar que proveedor sea agente de retención
   - Validar montos mínimos según SENIAT
   - Prevenir retenciones duplicadas

6. **Integración Contable**
   - Asientos contables automáticos
   - Conciliación bancaria
   - Cuentas por pagar/cobrar

---

## Troubleshooting

### Error: "Retención IVA ya existe para esta factura"

**Causa:** Ya existe una retención IVA emitida para la factura.

**Solución:** Verificar retenciones existentes con `GET /by-invoice/:invoiceId`. Si es duplicada, anular la anterior con `POST /:id/cancel` antes de crear nueva.

### Error: "Factura no encontrada"

**Causa:** El `affectedDocumentId` no existe o no pertenece al tenant.

**Solución:** Verificar que la factura existe y está emitida (`status: 'issued'`).

### Error: "HKA API Error: Unauthorized"

**Causa:** Credenciales HKA Factory inválidas o token expirado.

**Solución:** Verificar `HKA_FACTORY_USERNAME` y `HKA_FACTORY_PASSWORD` en `.env`. El token se renueva automáticamente cada 12h.

### Error: "Serie no encontrada"

**Causa:** El `seriesId` no existe.

**Solución:** Crear serie de retención con tipo '05' (IVA) o '06' (ISLR) en la configuración de secuencias.

### Retención queda en 'draft' después de emisión

**Causa:** Error de HKA Factory registrado en `ImprentaFailure`.

**Solución:**
1. Revisar logs del servidor para detalles del error
2. Consultar `ImprentaFailure` collection para ver payload y error
3. Corregir problema (ej: datos faltantes en tenant, API down)
4. Reintentar emisión con `POST /:id/issue`

---

## Changelog

### Fase 4 - 2026-03-23

**Agregado:**
- ✅ Integración completa HKA Factory para retenciones
- ✅ Mapper `HkaWithholdingMapper` con tests
- ✅ Método `issue()` actualizado con emisión HKA
- ✅ Método `getTenantData()` para datos reales del tenant
- ✅ Manejo de errores con `ImprentaFailure`
- ✅ 74 tests pasando (100% cobertura)

**Modificado:**
- ✅ `WithholdingService.issue()` ahora emite a HKA Factory
- ✅ `createIvaRetention()` y `createIslrRetention()` usan datos reales de tenant
- ✅ Tests actualizados para nueva integración

**Arreglado:**
- ✅ Llamada a `requestControlNumber()` con estructura correcta
- ✅ Acceso a propiedades de Tenant schema (taxInfo, contactInfo)
- ✅ Uso de `getProviderName()` en lugar de `getName()`

---

## Contacto y Soporte

Para reportar issues o sugerencias relacionadas con retenciones:

- **Backend Issues:** Ver logs de NestJS con `pm2 logs smartkubik-api`
- **HKA Factory Issues:** Revisar `ImprentaFailure` collection en MongoDB
- **Tests Failing:** Ejecutar `npm test -- withholding --verbose`

---

**Documentación generada:** 2026-03-23
**Última actualización:** 2026-03-23
**Versión:** 1.0.0

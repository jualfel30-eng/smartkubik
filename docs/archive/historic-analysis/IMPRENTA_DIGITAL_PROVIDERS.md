# 🖨️ Proveedores de Imprenta Digital - Guía Completa

## 📋 Tabla de Contenidos

1. [Arquitectura de Proveedores](#arquitectura-de-proveedores)
2. [Proveedor MOCK (Testing)](#proveedor-mock-testing)
3. [Proveedor Generic HTTP](#proveedor-generic-http)
4. [Configuración](#configuración)
5. [Proveedores Recomendados en Venezuela](#proveedores-recomendados-en-venezuela)
6. [Crear un Proveedor Personalizado](#crear-un-proveedor-personalizado)
7. [Callbacks y Webhooks](#callbacks-y-webhooks)
8. [Reintentos Automáticos](#reintentos-automáticos)

---

## 🏗️ Arquitectura de Proveedores

Hemos implementado una **arquitectura flexible** basada en el patrón **Strategy** que permite:

- ✅ Cambiar de proveedor sin modificar código
- ✅ Soportar múltiples proveedores simultáneamente
- ✅ Testing con proveedor MOCK
- ✅ Configuración por variables de entorno
- ✅ Extensible para agregar nuevos proveedores

### Componentes Principales

```
src/modules/billing/providers/
├── base-imprenta.provider.ts          # Clase base abstracta
├── mock-imprenta.provider.ts          # Proveedor MOCK para testing
├── generic-http-imprenta.provider.ts  # Proveedor HTTP genérico
├── imprenta-provider.factory.ts       # Factory para instanciar proveedores
└── index.ts                            # Exports
```

### Flujo de Funcionamiento

```
BillingService
  ↓
ImprentaDigitalProvider (facade)
  ↓
ImprentaProviderFactory
  ↓
BaseImprentaProvider (strategy)
  ├─→ MockImprentaProvider
  ├─→ GenericHttpImprentaProvider
  └─→ CustomProvider (futuro)
```

---

## 🎭 Proveedor MOCK (Testing)

El proveedor MOCK simula una imprenta digital real para desarrollo y testing.

### Características

- ✅ Respuesta instantánea (100-500ms de delay simulado)
- ✅ Generación de números de control realistas
- ✅ QR codes de prueba
- ✅ Simulación de fallos aleatorios (5%)
- ✅ Seguimiento de documentos emitidos
- ✅ Cancelación de documentos
- ✅ Estadísticas para debugging

### Configuración

```bash
# .env
IMPRENTA_PROVIDER_MODE=mock
```

### Formato de Número de Control

```
2024-12-001234
YEAR-MM-SEQUENCE
```

### Ejemplo de Uso

```typescript
// El proveedor se auto-configura
const response = await imprentaProvider.requestControlNumber({
  documentId: '507f1f77bcf86cd799439011',
  tenantId: 'tenant-123',
  seriesId: 'series-456',
  documentNumber: 'F-001-00000123',
  type: 'invoice',
  totals: {
    subtotal: 100,
    taxes: [{ type: 'IVA', rate: 16, amount: 16 }],
    grandTotal: 116,
    currency: 'VES'
  },
  customerData: {
    name: 'Cliente Test',
    rif: 'J-123456789'
  }
});

console.log(response);
// {
//   controlNumber: '2024-12-001234',
//   provider: 'Mock Imprenta Digital',
//   providerRif: 'J-000000000',
//   providerName: 'Imprenta Digital Mock S.A.',
//   assignedAt: Date,
//   hash: 'abc123...',
//   verificationUrl: 'https://contribuyente.seniat.gob.ve/...',
//   qrCode: 'data:image/svg+xml;base64,...',
//   success: true
// }
```

### Métodos de Debugging

```typescript
// Obtener estadísticas
const stats = mockProvider.getStatistics();
// {
//   totalIssued: 45,
//   totalCancelled: 3,
//   documents: [...]
// }

// Limpiar documentos emitidos
mockProvider.clearIssuedDocuments();

// Ver todos los documentos
const docs = mockProvider.getIssuedDocuments();
```

---

## 🌐 Proveedor Generic HTTP

Proveedor configurable que puede adaptarse a la mayoría de APIs REST de imprentas digitales.

### Configuración

```bash
# .env
IMPRENTA_PROVIDER_MODE=generic-http
IMPRENTA_PROVIDER_NAME="Mi Imprenta Digital"
IMPRENTA_PROVIDER_URL=https://api.imprenta.example.com
IMPRENTA_PROVIDER_API_KEY=your-api-key-here
IMPRENTA_PROVIDER_RIF=J-123456789
IMPRENTA_PROVIDER_COMPANY_NAME="Imprenta Digital C.A."
IMPRENTA_PROVIDER_SANDBOX=true
IMPRENTA_PROVIDER_TIMEOUT=30000
IMPRENTA_PROVIDER_MAX_RETRIES=3
IMPRENTA_PROVIDER_RETRY_DELAY=1000
IMPRENTA_PROVIDER_WEBHOOK_URL=https://your-domain.com/api/billing/webhooks/imprenta
```

### Headers Personalizados

```bash
IMPRENTA_HEADERS_TEMPLATE='{"X-Custom-Header":"value","X-Tenant-ID":"123"}'
```

### Payload Personalizado

```bash
IMPRENTA_PAYLOAD_TEMPLATE='{"companyId":"ABC123","environment":"production"}'
```

### Endpoints Esperados

El proveedor Generic HTTP espera que la API tenga estos endpoints:

#### 1. Solicitar Número de Control

```http
POST /control-number
Content-Type: application/json
Authorization: Bearer {API_KEY}

{
  "documentId": "507f1f77bcf86cd799439011",
  "documentNumber": "F-001-00000123",
  "seriesId": "series-456",
  "type": "invoice",
  "tenantId": "tenant-123",
  "xmlContent": "<xml>...</xml>",
  "customer": {
    "name": "Cliente Test",
    "rif": "J-123456789",
    "email": "cliente@example.com",
    "phone": "+58 412 1234567",
    "address": "Dirección fiscal"
  },
  "totals": {
    "subtotal": 100,
    "taxes": [{ "type": "IVA", "rate": 16, "amount": 16 }],
    "grandTotal": 116,
    "currency": "VES"
  },
  "webhookUrl": "https://your-domain.com/api/billing/webhooks/imprenta"
}

Response 200 OK:
{
  "controlNumber": "2024-12-001234",
  "provider": "Imprenta Digital",
  "providerRif": "J-987654321",
  "providerName": "Imprenta Digital C.A.",
  "assignedAt": "2024-12-19T10:30:00Z",
  "hash": "abc123def456...",
  "verificationUrl": "https://seniat.gob.ve/verify?control=2024-12-001234",
  "qrCode": "data:image/png;base64,..."
}
```

#### 2. Consultar Estado

```http
GET /status/{controlNumber}
Authorization: Bearer {API_KEY}

Response 200 OK:
{
  "controlNumber": "2024-12-001234",
  "status": "issued",  // pending | issued | rejected | cancelled
  "updatedAt": "2024-12-19T10:30:00Z",
  "details": {
    "processedAt": "2024-12-19T10:30:00Z",
    "transmittedToSeniat": true
  }
}
```

#### 3. Cancelar Documento (Opcional)

```http
POST /cancel/{controlNumber}
Authorization: Bearer {API_KEY}
Content-Type: application/json

{
  "reason": "Error en los datos del cliente"
}

Response 200 OK:
{
  "success": true,
  "cancelledAt": "2024-12-19T11:00:00Z"
}
```

### Normalización de Respuestas

El proveedor Generic HTTP normaliza automáticamente las respuestas:

- Soporta snake_case y camelCase
- Normaliza estados: `emitido` → `issued`, `rechazado` → `rejected`
- Campos opcionales con valores por defecto

---

## ⚙️ Configuración

### Variables de Entorno

| Variable | Descripción | Valores | Requerido | Default |
|----------|-------------|---------|-----------|---------|
| `IMPRENTA_PROVIDER_MODE` | Tipo de proveedor | `mock`, `generic-http`, `custom` | ✅ | `mock` |
| `IMPRENTA_PROVIDER_NAME` | Nombre del proveedor | Texto | ❌ | `Imprenta Digital` |
| `IMPRENTA_PROVIDER_URL` | URL base de la API | URL | ✅ (http) | - |
| `IMPRENTA_PROVIDER_API_KEY` | API Key / Token | String | ✅ (http) | - |
| `IMPRENTA_PROVIDER_RIF` | RIF del proveedor | J-123456789 | ❌ | - |
| `IMPRENTA_PROVIDER_COMPANY_NAME` | Razón social | Texto | ❌ | - |
| `IMPRENTA_PROVIDER_SANDBOX` | Modo sandbox | `true`, `false` | ❌ | `false` |
| `IMPRENTA_PROVIDER_TIMEOUT` | Timeout en ms | Número | ❌ | `30000` |
| `IMPRENTA_PROVIDER_MAX_RETRIES` | Intentos máximos | Número | ❌ | `3` |
| `IMPRENTA_PROVIDER_RETRY_DELAY` | Delay entre reintentos | Milisegundos | ❌ | `1000` |
| `IMPRENTA_PROVIDER_WEBHOOK_URL` | URL para callbacks | URL | ❌ | - |
| `IMPRENTA_HEADERS_TEMPLATE` | Headers personalizados | JSON | ❌ | - |
| `IMPRENTA_PAYLOAD_TEMPLATE` | Payload personalizado | JSON | ❌ | - |

### Ejemplo .env para Desarrollo

```bash
# Desarrollo - Usar MOCK
NODE_ENV=development
IMPRENTA_PROVIDER_MODE=mock
```

### Ejemplo .env para Producción

```bash
# Producción - Proveedor Real
NODE_ENV=production
IMPRENTA_PROVIDER_MODE=generic-http
IMPRENTA_PROVIDER_NAME="Imprenta Digital Venezolana"
IMPRENTA_PROVIDER_URL=https://api.imprentadigital.com.ve
IMPRENTA_PROVIDER_API_KEY=prod-api-key-xyz123
IMPRENTA_PROVIDER_RIF=J-123456789
IMPRENTA_PROVIDER_COMPANY_NAME="Imprenta Digital Venezolana C.A."
IMPRENTA_PROVIDER_SANDBOX=false
IMPRENTA_PROVIDER_TIMEOUT=45000
IMPRENTA_PROVIDER_MAX_RETRIES=5
IMPRENTA_PROVIDER_RETRY_DELAY=2000
IMPRENTA_PROVIDER_WEBHOOK_URL=https://your-domain.com/api/billing/webhooks/imprenta
```

---

## 🇻🇪 Proveedores Recomendados en Venezuela

### 1. **SENIAT Oficial**

**Descripción:** Servicio oficial del SENIAT para facturación electrónica.

**Características:**
- ✅ Proveedor oficial del gobierno
- ✅ Cumplimiento 100% normativa
- ✅ Costo menor
- ❌ Puede tener delays en horarios pico
- ❌ Documentación limitada

**Contacto:**
- Web: https://www.seniat.gob.ve
- Teléfono: 0800-SENIAT (0800-736428)

**Configuración Aproximada:**
```bash
IMPRENTA_PROVIDER_MODE=custom  # Requiere implementación específica
IMPRENTA_PROVIDER_NAME="SENIAT Oficial"
IMPRENTA_PROVIDER_URL=https://contribuyente.seniat.gob.ve/api/fe
# Credenciales se obtienen del portal SENIAT
```

### 2. **FacTuDi (Facturación Tuya Digital)**

**Descripción:** Proveedor privado autorizado por SENIAT.

**Características:**
- ✅ API moderna y bien documentada
- ✅ Soporte técnico 24/7
- ✅ Dashboard de gestión
- ✅ Webhooks para callbacks
- ⚠️ Costo mensual por plan

**Contacto:**
- Web: (ejemplo ficticio) https://www.factudi.com.ve
- Email: soporte@factudi.com.ve

**Configuración Aproximada:**
```bash
IMPRENTA_PROVIDER_MODE=generic-http
IMPRENTA_PROVIDER_NAME="FacTuDi"
IMPRENTA_PROVIDER_URL=https://api.factudi.com.ve/v1
IMPRENTA_PROVIDER_API_KEY=your-factudi-api-key
IMPRENTA_PROVIDER_RIF=J-123456789
IMPRENTA_PROVIDER_WEBHOOK_URL=https://your-domain.com/api/billing/webhooks/imprenta
```

### 3. **VeneFactura**

**Descripción:** Solución en la nube con múltiples planes.

**Características:**
- ✅ Planes escalables
- ✅ Integración con contabilidad
- ✅ Reportes avanzados
- ⚠️ Requiere plan premium para API

**Contacto:**
- Web: (ejemplo ficticio) https://www.venefactura.ve
- Email: api@venefactura.ve

### 4. **ImpreDigital**

**Descripción:** Proveedor con enfoque en PyMEs.

**Características:**
- ✅ Precio competitivo
- ✅ Fácil onboarding
- ✅ Soporte en español
- ❌ API menos robusta

**Contacto:**
- Web: (ejemplo ficticio) https://www.impredigital.com.ve
- WhatsApp: +58 412 123 4567

---

## 🔧 Crear un Proveedor Personalizado

Si ninguno de los proveedores genéricos funciona, puedes crear un proveedor personalizado.

### Paso 1: Crear la clase del proveedor

```typescript
// src/modules/billing/providers/mi-proveedor.provider.ts
import {
  BaseImprentaProvider,
  ImprentaControlNumberRequest,
  ImprentaControlNumberResponse,
  ImprentaProviderConfig,
  ImprentaStatusResponse,
} from "./base-imprenta.provider";
import axios from "axios";

export class MiProveedorImprentaProvider extends BaseImprentaProvider {
  constructor(config: ImprentaProviderConfig) {
    super(config);
    this.logger.log("🎯 Mi Proveedor initialized");
  }

  async requestControlNumber(
    request: ImprentaControlNumberRequest,
  ): Promise<ImprentaControlNumberResponse> {
    // Implementación específica del proveedor
    return this.retryRequest(async () => {
      const response = await axios.post(
        `${this.config.apiUrl}/solicitar-control`,
        {
          // Formato específico del proveedor
          documento: {
            numero: request.documentNumber,
            tipo: this.mapDocumentType(request.type),
            cliente: {
              nombre: request.customerData?.name,
              identificacion: request.customerData?.rif,
            },
            total: request.totals?.grandTotal,
            moneda: request.totals?.currency,
          },
        },
        {
          headers: {
            "X-API-Key": this.config.apiKey,
            "X-RIF-Emisor": this.config.rif,
          },
        },
      );

      // Transformar respuesta al formato estándar
      return {
        controlNumber: response.data.numeroControl,
        provider: this.config.name,
        providerRif: this.config.rif,
        providerName: this.config.companyName,
        assignedAt: new Date(response.data.fechaAsignacion),
        hash: response.data.hash,
        verificationUrl: response.data.urlVerificacion,
        qrCode: response.data.codigoQR,
        success: true,
        metadata: response.data,
      };
    }, "requestControlNumber");
  }

  async queryStatus(controlNumber: string): Promise<ImprentaStatusResponse> {
    const response = await axios.get(
      `${this.config.apiUrl}/consultar/${controlNumber}`,
      {
        headers: { "X-API-Key": this.config.apiKey },
      },
    );

    return {
      controlNumber,
      status: this.normalizeStatus(response.data.estado),
      details: response.data,
      updatedAt: new Date(response.data.fechaActualizacion),
    };
  }

  private mapDocumentType(type: string): string {
    const map: Record<string, string> = {
      invoice: "FACTURA",
      credit_note: "NOTA_CREDITO",
      debit_note: "NOTA_DEBITO",
      delivery_note: "NOTA_ENTREGA",
    };
    return map[type] || "FACTURA";
  }

  private normalizeStatus(estado: string): "pending" | "issued" | "rejected" | "cancelled" {
    // Lógica específica del proveedor
    if (estado === "EMITIDO") return "issued";
    if (estado === "RECHAZADO") return "rejected";
    if (estado === "ANULADO") return "cancelled";
    return "pending";
  }
}
```

### Paso 2: Agregar al Factory

```typescript
// src/modules/billing/providers/imprenta-provider.factory.ts

import { MiProveedorImprentaProvider } from "./mi-proveedor.provider";

// En el método getProvider():
case "mi-proveedor":
  this.providerInstance = new MiProveedorImprentaProvider(config);
  break;
```

### Paso 3: Configurar

```bash
IMPRENTA_PROVIDER_MODE=mi-proveedor
IMPRENTA_PROVIDER_URL=https://api.miproveedor.com
IMPRENTA_PROVIDER_API_KEY=your-api-key
```

---

## 📞 Callbacks y Webhooks

Algunos proveedores envían callbacks cuando procesan un documento.

### Crear Endpoint de Webhook

```typescript
// src/modules/billing/billing.controller.ts

@Post('webhooks/imprenta')
@Public()  // No requiere autenticación
async handleImprentaWebhook(@Body() payload: any) {
  this.logger.log('📞 Webhook received from imprenta', payload);

  // Validar firma del webhook (si el proveedor lo soporta)
  // ...

  // Actualizar documento
  const controlNumber = payload.controlNumber || payload.numero_control;
  const status = payload.status || payload.estado;

  await this.billingService.updateDocumentFromWebhook(controlNumber, {
    status,
    processedAt: new Date(payload.processedAt || payload.fecha_proceso),
    metadata: payload,
  });

  return { success: true };
}
```

### Configurar URL del Webhook

```bash
IMPRENTA_PROVIDER_WEBHOOK_URL=https://your-domain.com/api/billing/webhooks/imprenta
```

**Importante:** La URL debe ser públicamente accesible (HTTPS).

---

## 🔄 Reintentos Automáticos

El sistema implementa **reintentos automáticos** en múltiples niveles:

### Nivel 1: Provider (Inmediato)

Cada proveedor reintenta automáticamente en caso de fallo de red:

- **Intentos:** Configurables via `IMPRENTA_PROVIDER_MAX_RETRIES` (default: 3)
- **Delay:** Configurables via `IMPRENTA_PROVIDER_RETRY_DELAY` (default: 1000ms)
- **Estrategia:** Exponential backoff (delay × attempt)

```
Intento 1: inmediato
Intento 2: después de 1000ms
Intento 3: después de 2000ms
```

### Nivel 2: Failure Logging

Si todos los reintentos fallan, se registra en `ImprentaFailure`:

```typescript
{
  tenantId: "tenant-123",
  documentId: "507f1f77bcf86cd799439011",
  seriesId: "series-456",
  request: { ... },
  attempts: 3,
  error: {
    message: "Connection timeout",
    stack: "...",
    response: { ... }
  },
  createdAt: Date,
  lastAttempt: Date
}
```

### Nivel 3: Manual Retry

Endpoint para reintentar fallos manualmente:

```http
POST /billing/imprenta-failures/:failureId/retry

Response:
{
  "controlNumber": "2024-12-001234",
  "success": true
}
```

### Nivel 4: Batch Retry (Job)

BullMQ job para reintentar fallos antiguos:

```typescript
@Cron('0 */6 * * *')  // Cada 6 horas
async retryFailedImprentaRequests() {
  const failures = await this.imprentaProvider.getFailedRequests('tenant-123', 100);

  for (const failure of failures) {
    // Reintentar solo si han pasado >1 hora
    if (Date.now() - failure.lastAttempt > 3600000) {
      try {
        await this.imprentaProvider.retryFailedRequest(failure._id);
      } catch (error) {
        this.logger.warn(`Retry failed for ${failure._id}`);
      }
    }
  }
}
```

---

## 📊 Monitoreo y Debugging

### Obtener Info del Proveedor

```typescript
const info = imprentaProvider.getProviderInfo();
// {
//   name: "Mock Imprenta Digital",
//   sandbox: true,
//   configured: true
// }
```

### Ver Fallos Recientes

```typescript
const failures = await imprentaProvider.getFailedRequests('tenant-123', 50);
```

### Logs

```
🚀 Imprenta Digital Provider initialized
🏭 Creating imprenta provider: mock
📋 Provider config: { name: 'Mock Imprenta Digital', ... }
📝 Requesting control number for document F-001-00000123 (invoice)
✅ Control number obtained: 2024-12-001234 from Mock Imprenta Digital
```

---

## 🧪 Testing

### Unit Tests

```typescript
// billing.service.spec.ts

describe('BillingService with Mock Provider', () => {
  it('should obtain control number from mock provider', async () => {
    const result = await billingService.issue(documentId);

    expect(result.controlNumber).toMatch(/^\d{4}-\d{2}-\d{6}$/);
    expect(result.provider).toBe('Mock Imprenta Digital');
  });

  it('should handle provider failures', async () => {
    // Simulate failure by using invalid document
    await expect(billingService.issue('invalid-id')).rejects.toThrow();

    // Check failure was logged
    const failures = await imprentaProvider.getFailedRequests(tenantId);
    expect(failures.length).toBeGreaterThan(0);
  });
});
```

### Integration Tests

```bash
# .env.test
IMPRENTA_PROVIDER_MODE=mock
IMPRENTA_PROVIDER_MAX_RETRIES=2
```

---

## 📚 Resumen

- ✅ Arquitectura flexible con Strategy Pattern
- ✅ Proveedor MOCK completamente funcional
- ✅ Proveedor Generic HTTP configurable
- ✅ Reintentos automáticos en múltiples niveles
- ✅ Logging de fallos para auditoría
- ✅ Soporte para callbacks/webhooks
- ✅ Fácil extensión para nuevos proveedores
- ✅ Configuración 100% por variables de entorno

**Próximos pasos:**
1. Elegir un proveedor de imprenta digital
2. Obtener credenciales de API
3. Configurar variables de entorno
4. Testing en ambiente sandbox
5. Deploy a producción

---

_Generado el 2024-12-19_

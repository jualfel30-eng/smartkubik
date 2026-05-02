# 📚 API DE FACTURACIÓN (BILLING) - DOCUMENTACIÓN COMPLETA

**Fecha**: 19 de diciembre, 2025
**Versión**: 1.0
**Base URL**: `http://localhost:3000/api/billing`

---

## 🔐 Autenticación

Todos los endpoints requieren autenticación JWT:

```http
Authorization: Bearer <token>
```

---

## 📋 ENDPOINTS DISPONIBLES

### 1. **Crear Documento de Facturación** (Draft)

Crea un documento en estado "draft" (borrador).

```http
POST /billing/documents
```

**Permisos**: `billing_create`

**Body**:
```json
{
  "type": "invoice",  // "invoice" | "credit_note" | "debit_note" | "delivery_note" | "quote"
  "seriesId": "507f1f77bcf86cd799439011",
  "customerName": "ACME Corp C.A.",
  "customerTaxId": "J-12345678-9",
  "originalDocumentId": "507f1f77bcf86cd799439011",  // Solo para notas de crédito/débito
  "items": [
    {
      "description": "Producto A",
      "quantity": 2,
      "unitPrice": 100.00,
      "taxRate": 16
    }
  ],
  "totals": {
    "subtotal": 200.00,
    "taxes": [
      {
        "type": "IVA",
        "rate": 16,
        "amount": 32.00
      }
    ],
    "grandTotal": 232.00,
    "currency": "VES"
  }
}
```

**Response** (201):
```json
{
  "_id": "507f1f77bcf86cd799439011",
  "type": "invoice",
  "documentNumber": "F-001-00000123",
  "status": "draft",
  "customer": {
    "name": "ACME Corp C.A.",
    "taxId": "J-12345678-9"
  },
  "totals": {
    "subtotal": 200.00,
    "taxes": [{"type": "IVA", "rate": 16, "amount": 32.00}],
    "grandTotal": 232.00
  },
  "createdAt": "2025-12-19T10:00:00.000Z",
  "tenantId": "tenant-123"
}
```

---

### 2. **Emitir Documento** (Issue)

Emite el documento y solicita número de control fiscal a la imprenta digital.

```http
POST /billing/documents/:id/issue
```

**Permisos**: `billing_issue`

**Body**:
```json
{
  "issuerInfo": {
    "taxId": "J-98765432-1",
    "name": "Mi Empresa C.A.",
    "address": "Av. Principal, Caracas"
  },
  "metadata": {
    "notes": "Factura correspondiente al mes de diciembre"
  }
}
```

**Response** (200):
```json
{
  "_id": "507f1f77bcf86cd799439011",
  "status": "issued",
  "controlNumber": "CTRL-2025-001234",
  "issueDate": "2025-12-19T10:05:00.000Z",
  "taxInfo": {
    "verificationUrl": "https://seniat.gob.ve/verify/CTRL-2025-001234",
    "qrCode": "data:image/png;base64,iVBORw0KGg...",
    "fiscalStamp": "SNAT/2024/000102"
  }
}
```

**Estados posibles**:
- `draft` → `validated` → `sent_to_imprenta` → `issued` → `sent` → `closed`

---

### 3. **Validar Documento para SENIAT**

Valida que el documento cumpla con todos los requisitos SENIAT antes de emitirlo.

```http
POST /billing/documents/:id/validate-seniat
```

**Permisos**: `billing_read`

**Response** (200):
```json
{
  "documentId": "507f1f77bcf86cd799439011",
  "valid": true,
  "errors": [],
  "warnings": [
    "RIF del cliente no validado con SENIAT"
  ]
}
```

**Validaciones realizadas**:
- ✅ Formato de RIF emisor y receptor
- ✅ Dígito verificador del RIF (módulo 11)
- ✅ Totales correctos (subtotal + impuestos = total)
- ✅ Campos obligatorios presentes
- ✅ Tipo de documento válido

---

### 4. **Generar XML SENIAT**

Genera el XML en formato SENIAT para facturación electrónica.

```http
POST /billing/documents/:id/generate-xml
```

**Permisos**: `billing_issue`

**Response** (200):
```json
{
  "success": true,
  "documentId": "507f1f77bcf86cd799439011",
  "xml": "<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n<FacturaElectronica...>",
  "xmlHash": "a1b2c3d4e5f6789...",
  "qrCode": "data:image/png;base64,iVBORw0KGg...",
  "verificationUrl": "https://seniat.gob.ve/verify/CTRL-2025-001234",
  "generatedAt": "2025-12-19T10:10:00.000Z"
}
```

**Estructura del XML**:
```xml
<?xml version="1.0" encoding="UTF-8"?>
<FacturaElectronica xmlns="http://www.seniat.gob.ve/factura/v1" version="1.0">
  <Encabezado>
    <TipoDocumento>FACTURA</TipoDocumento>
    <NumeroDocumento>F-001-00000123</NumeroDocumento>
    <NumeroControl>CTRL-2025-001234</NumeroControl>
    <FechaEmision>2025-12-19</FechaEmision>
  </Encabezado>
  <Emisor>
    <RIF>J-98765432-1</RIF>
    <RazonSocial>Mi Empresa C.A.</RazonSocial>
  </Emisor>
  <Receptor>
    <RIF>J-12345678-9</RIF>
    <RazonSocial>ACME Corp C.A.</RazonSocial>
  </Receptor>
  <Items>...</Items>
  <Totales>...</Totales>
</FacturaElectronica>
```

---

### 5. **Descargar XML SENIAT**

Descarga el archivo XML generado.

```http
GET /billing/documents/:id/seniat-xml
```

**Permisos**: `billing_read`

**Response** (200):
- **Content-Type**: `application/xml`
- **Content-Disposition**: `attachment; filename="factura-F-001-00000123.xml"`
- **Body**: XML file

---

### 6. **Estado de Timbrado**

Consulta el estado actual del timbrado de un documento.

```http
GET /billing/documents/:id/status
```

**Permisos**: `billing_read`

**Response** (200):
```json
{
  "documentId": "507f1f77bcf86cd799439011",
  "status": "issued",
  "controlNumber": "CTRL-2025-001234",
  "verificationUrl": "https://seniat.gob.ve/verify/CTRL-2025-001234",
  "issuedAt": "2025-12-19T10:05:00.000Z"
}
```

---

### 7. **Obtener Documento**

Recupera un documento completo por ID.

```http
GET /billing/documents/:id
```

**Permisos**: `billing_read`

**Response** (200):
```json
{
  "_id": "507f1f77bcf86cd799439011",
  "type": "invoice",
  "documentNumber": "F-001-00000123",
  "controlNumber": "CTRL-2025-001234",
  "status": "issued",
  "issueDate": "2025-12-19T10:05:00.000Z",
  "customer": {
    "name": "ACME Corp C.A.",
    "taxId": "J-12345678-9",
    "address": "Caracas, Venezuela"
  },
  "emitter": {
    "businessName": "Mi Empresa C.A.",
    "taxId": "J-98765432-1",
    "fiscalAddress": "Av. Principal, Caracas"
  },
  "totals": {
    "subtotal": 200.00,
    "taxes": [
      {
        "type": "IVA",
        "rate": 16,
        "amount": 32.00
      }
    ],
    "discounts": 0,
    "charges": 0,
    "grandTotal": 232.00,
    "currency": "VES",
    "exchangeRate": 1
  },
  "taxDetails": [
    {
      "taxType": "IVA",
      "rate": 16,
      "baseAmount": 200.00,
      "amount": 32.00
    }
  ],
  "requiresIvaWithholding": false,
  "withheldIvaAmount": 0,
  "paymentTerms": {
    "type": "contado"
  },
  "seniat": {
    "xmlGenerated": true,
    "xmlGeneratedAt": "2025-12-19T10:10:00.000Z",
    "xmlHash": "a1b2c3d4e5f6789...",
    "qrCode": "data:image/png;base64,iVBORw0KGg...",
    "verificationUrl": "https://seniat.gob.ve/verify/CTRL-2025-001234",
    "transmissionDate": "2025-12-19T10:05:00.000Z",
    "responseCode": "200",
    "responseMessage": "OK"
  },
  "country": "VE",
  "tenantId": "tenant-123",
  "createdAt": "2025-12-19T10:00:00.000Z",
  "updatedAt": "2025-12-19T10:10:00.000Z"
}
```

---

### 8. **Generar Libro de Ventas**

Genera el libro de ventas por canal (digital o máquina fiscal) en formato JSON, CSV o PDF.

```http
GET /billing/books/sales?channel=digital&from=2025-01-01&to=2025-12-31&format=json
```

**Permisos**: `billing_read`

**Query Parameters**:
- `channel`: `digital` | `machine_fiscal` (requerido)
- `from`: Fecha inicio (formato: YYYY-MM-DD) (requerido)
- `to`: Fecha fin (formato: YYYY-MM-DD) (requerido)
- `format`: `json` | `csv` | `pdf` (default: `json`)

**Response JSON** (200):
```json
{
  "channel": "digital",
  "from": "2025-01-01",
  "to": "2025-12-31",
  "entries": [
    {
      "date": "2025-12-19",
      "documentType": "FACTURA",
      "documentNumber": "F-001-00000123",
      "controlNumber": "CTRL-2025-001234",
      "customerName": "ACME Corp C.A.",
      "customerTaxId": "J-12345678-9",
      "exemptAmount": 0,
      "taxableBase": 200.00,
      "ivaAmount": 32.00,
      "totalAmount": 232.00
    }
  ],
  "totals": {
    "totalExempt": 0,
    "totalTaxableBase": 200.00,
    "totalIva": 32.00,
    "grandTotal": 232.00,
    "documentCount": 1
  }
}
```

**Response CSV** (200):
```csv
Fecha,Tipo,Número,Control,Cliente,RIF,Exento,Base Imponible,IVA,Total
2025-12-19,FACTURA,F-001-00000123,CTRL-2025-001234,ACME Corp C.A.,J-12345678-9,0,200.00,32.00,232.00
```

**Response PDF** (200):
```json
{
  "filename": "libro-ventas-digital.pdf",
  "file": "JVBERi0xLjcKCjEgMCBvYmo..." // Base64 encoded PDF
}
```

---

### 9. **Estadísticas de Facturas Electrónicas**

Obtiene estadísticas de facturas electrónicas por período.

```http
GET /billing/stats/electronic-invoices?startDate=2025-01-01&endDate=2025-12-31
```

**Permisos**: `billing_read`

**Query Parameters**:
- `startDate`: Fecha inicio (opcional)
- `endDate`: Fecha fin (opcional)
- `status`: Filtrar por estado (opcional): `draft` | `issued` | `sent` | `closed`
- `documentType`: Filtrar por tipo (opcional): `invoice` | `credit_note` | `debit_note`

**Response** (200):
```json
{
  "period": {
    "from": "2025-01-01",
    "to": "2025-12-31"
  },
  "totals": {
    "totalDocuments": 1250,
    "totalAmount": 1500000.00,
    "totalIva": 240000.00
  },
  "byType": {
    "invoice": {
      "count": 1000,
      "amount": 1200000.00
    },
    "credit_note": {
      "count": 200,
      "amount": 250000.00
    },
    "debit_note": {
      "count": 50,
      "amount": 50000.00
    }
  },
  "byStatus": {
    "draft": 10,
    "issued": 1200,
    "sent": 40
  },
  "seniatCompliance": {
    "xmlGenerated": 1240,
    "transmitted": 1200,
    "errors": 0,
    "complianceRate": 100
  },
  "averages": {
    "averageAmount": 1200.00,
    "averageIva": 192.00
  }
}
```

---

## 📊 TIPOS DE DOCUMENTOS

### Invoice (Factura)
```json
{
  "type": "invoice",
  "documentNumber": "F-001-00000123"
}
```

### Credit Note (Nota de Crédito)
Requiere `originalDocumentId` de la factura a la que hace referencia.

```json
{
  "type": "credit_note",
  "documentNumber": "NC-001-00000045",
  "references": {
    "originalDocumentId": "507f1f77bcf86cd799439011"
  }
}
```

### Debit Note (Nota de Débito)
Requiere `originalDocumentId` de la factura a la que hace referencia.

```json
{
  "type": "debit_note",
  "documentNumber": "ND-001-00000012",
  "references": {
    "originalDocumentId": "507f1f77bcf86cd799439011"
  }
}
```

### Delivery Note (Nota de Entrega)
```json
{
  "type": "delivery_note",
  "documentNumber": "NE-001-00000067"
}
```

### Quote (Presupuesto)
No requiere control fiscal (no fiscal).

```json
{
  "type": "quote",
  "documentNumber": "PRE-001-00000089"
}
```

---

## 🔄 FLUJO DE TRABAJO TÍPICO

### Crear y Emitir una Factura

```javascript
// 1. Crear borrador
const draft = await fetch('/api/billing/documents', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    type: 'invoice',
    seriesId: '507f1f77bcf86cd799439011',
    customerName: 'ACME Corp C.A.',
    customerTaxId: 'J-12345678-9',
    items: [...],
    totals: {...}
  })
});

const { _id: documentId } = await draft.json();

// 2. Validar para SENIAT (opcional pero recomendado)
const validation = await fetch(`/api/billing/documents/${documentId}/validate-seniat`, {
  method: 'POST',
  headers: { 'Authorization': `Bearer ${token}` }
});

const { valid, errors } = await validation.json();

if (!valid) {
  console.error('Errores de validación:', errors);
  return;
}

// 3. Emitir documento
const issued = await fetch(`/api/billing/documents/${documentId}/issue`, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    issuerInfo: {
      taxId: 'J-98765432-1',
      name: 'Mi Empresa C.A.',
      address: 'Av. Principal, Caracas'
    }
  })
});

const issuedDoc = await issued.json();
console.log('Control Number:', issuedDoc.controlNumber);
console.log('QR Code:', issuedDoc.taxInfo.qrCode);

// 4. Generar XML SENIAT
const xml = await fetch(`/api/billing/documents/${documentId}/generate-xml`, {
  method: 'POST',
  headers: { 'Authorization': `Bearer ${token}` }
});

const xmlData = await xml.json();
console.log('XML generado:', xmlData.xml);
console.log('Verification URL:', xmlData.verificationUrl);

// 5. Descargar XML (opcional)
window.open(`/api/billing/documents/${documentId}/seniat-xml`, '_blank');

// 6. Verificar estado
const status = await fetch(`/api/billing/documents/${documentId}/status`, {
  headers: { 'Authorization': `Bearer ${token}` }
});

const statusData = await status.json();
console.log('Estado:', statusData.status);
```

---

## 🛡️ VALIDACIÓN DE RIF

El sistema valida RIF venezolanos según el estándar SENIAT:

**Formato**: `[VEJPG]-12345678-9`

**Tipos válidos**:
- `V`: Persona natural venezolana
- `E`: Persona natural extranjera
- `J`: Persona jurídica
- `P`: Pasaporte
- `G`: Gubernamental

**Algoritmo**: Módulo 11 con pesos `[4,3,2,7,6,5,4,3,2]`

**Ejemplo de validación**:
```javascript
// RIF válido
"J-12345678-9" ✅

// RIF inválido (tipo incorrecto)
"X-12345678-9" ❌

// RIF inválido (dígito verificador incorrecto)
"J-12345678-5" ❌
```

---

## 📄 PERMISOS REQUERIDOS

| Endpoint | Permiso |
|----------|---------|
| `POST /billing/documents` | `billing_create` |
| `POST /billing/documents/:id/issue` | `billing_issue` |
| `POST /billing/documents/:id/validate-seniat` | `billing_read` |
| `POST /billing/documents/:id/generate-xml` | `billing_issue` |
| `GET /billing/documents/:id/seniat-xml` | `billing_read` |
| `GET /billing/documents/:id/status` | `billing_read` |
| `GET /billing/documents/:id` | `billing_read` |
| `GET /billing/books/sales` | `billing_read` |
| `GET /billing/stats/electronic-invoices` | `billing_read` |

---

## ⚠️ CÓDIGOS DE ERROR

| Código | Descripción |
|--------|-------------|
| `400` | Bad Request - Datos inválidos |
| `401` | Unauthorized - Token inválido o expirado |
| `403` | Forbidden - Sin permisos suficientes |
| `404` | Not Found - Documento no encontrado |
| `409` | Conflict - Documento ya emitido (no se puede modificar) |
| `422` | Unprocessable Entity - Error de validación SENIAT |
| `500` | Internal Server Error - Error del servidor |
| `503` | Service Unavailable - Imprenta digital no disponible |

---

## 🔧 EJEMPLOS DE INTEGRACIÓN FRONTEND

### React Hook Personalizado

```javascript
// hooks/use-billing.js
import { useState } from 'react';
import { api } from '../lib/api';

export function useBilling() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const createDocument = async (data) => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.post('/billing/documents', data);
      return response.data;
    } catch (err) {
      setError(err.response?.data?.message || 'Error al crear documento');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const issueDocument = async (documentId, issuerInfo) => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.post(`/billing/documents/${documentId}/issue`, { issuerInfo });
      return response.data;
    } catch (err) {
      setError(err.response?.data?.message || 'Error al emitir documento');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const generateXml = async (documentId) => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.post(`/billing/documents/${documentId}/generate-xml`);
      return response.data;
    } catch (err) {
      setError(err.response?.data?.message || 'Error al generar XML');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const getDocumentStatus = async (documentId) => {
    try {
      const response = await api.get(`/billing/documents/${documentId}/status`);
      return response.data;
    } catch (err) {
      setError(err.response?.data?.message || 'Error al obtener estado');
      throw err;
    }
  };

  const downloadXml = (documentId) => {
    window.open(`/api/billing/documents/${documentId}/seniat-xml`, '_blank');
  };

  return {
    createDocument,
    issueDocument,
    generateXml,
    getDocumentStatus,
    downloadXml,
    loading,
    error,
  };
}
```

---

## 📚 RECURSOS ADICIONALES

- **Roadmap de Facturación**: [ROADMAP_FACTURACION_DIGITAL.md](ROADMAP_FACTURACION_DIGITAL.md)
- **Plan de Activación**: [BILLING_MODULE_ACTIVATION_PLAN.md](BILLING_MODULE_ACTIVATION_PLAN.md)
- **Normativa SENIAT**: https://www.seniat.gob.ve

---

**Generado**: 19 de diciembre, 2025
**Versión API**: 1.0
**Estado**: ✅ Producción Ready

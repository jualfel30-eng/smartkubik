# FASE 7: Retenciones - Completar Ciclo Frontend + Testing + Avanzado

## 📋 Resumen Ejecutivo

**Objetivo**: Completar el ciclo completo de retenciones con frontend funcional, testing E2E real con HKA Factory, y funcionalidades avanzadas prioritarias.

**Duración Estimada**: 18-22 horas
**Prioridad**: 🔴 CRÍTICA
**Dependencias**: Fases 1-6 + HKA Integration completadas

---

## 🎯 Objetivos

### Parte A: Testing Real HKA Factory (2-3 horas)
- ✅ Configurar credenciales HKA demo
- ✅ Testing E2E de emisión IVA
- ✅ Testing E2E de emisión ISLR
- ✅ Validar descarga de PDF desde HKA
- ✅ Documentar proceso de certificación

### Parte B: Frontend de Retenciones (8-10 horas)
- ✅ Componente `WithholdingIvaForm`
- ✅ Componente `WithholdingIslrForm`
- ✅ Dashboard `WithholdingList`
- ✅ Vista detalle `WithholdingDetail`
- ✅ Integración con módulo de Compras
- ✅ Notificaciones de estados

### Parte C: Funcionalidades Avanzadas Prioritarias (8-9 horas)
- ✅ IGTF (3% impuesto divisas)
- ✅ Query de estado documentos
- ✅ Anulación de retenciones
- ✅ Descarga de PDF desde HKA
- ✅ Dashboard de salud HKA

---

## 📐 PARTE A: TESTING REAL HKA FACTORY

### A1. Configuración Ambiente Demo (30 min)

#### Credenciales HKA Demo
```bash
# .env.demo
HKA_FACTORY_BASE_URL=https://demoemisionv2.thefactoryhka.com.ve
HKA_FACTORY_USUARIO=demo_usuario
HKA_FACTORY_CLAVE=demo_clave
HKA_FACTORY_RIF_EMISOR=J-123456789
HKA_FACTORY_RAZON_SOCIAL=EMPRESA DEMO SMARTKUBIK, C.A.
```

#### Script de Setup
```typescript
// scripts/setup-hka-demo.ts
import { config } from 'dotenv';
import axios from 'axios';

async function setupHkaDemo() {
  config({ path: '.env.demo' });

  // 1. Verificar conectividad
  const healthCheck = await axios.get(
    `${process.env.HKA_FACTORY_BASE_URL}/health`
  );
  console.log('✅ HKA Factory accesible');

  // 2. Autenticar
  const authResponse = await axios.post(
    `${process.env.HKA_FACTORY_BASE_URL}/api/Autenticacion`,
    {
      usuario: process.env.HKA_FACTORY_USUARIO,
      clave: process.env.HKA_FACTORY_CLAVE,
    }
  );
  console.log('✅ Autenticación exitosa');
  console.log('Token:', authResponse.data.token);

  // 3. Verificar permisos
  console.log('✅ Setup completo');
}

setupHkaDemo().catch(console.error);
```

### A2. Test E2E Retención IVA (1 hora)

#### Script de Test
```typescript
// test/e2e/withholding-iva-hka.e2e-spec.ts
import { Test } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { AppModule } from '../../src/app.module';
import * as request from 'supertest';

describe('Withholding IVA E2E with HKA Factory', () => {
  let app: INestApplication;
  let authToken: string;
  let retentionId: string;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication();
    await app.init();

    // Login
    const loginRes = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({
        email: 'admin@demo.com',
        password: 'demo123',
      });

    authToken = loginRes.body.data.accessToken;
  });

  it('should create IVA retention (draft)', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/v1/withholding/iva')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        affectedDocumentId: 'INVOICE_ID_HERE',
        retentionPercentage: 75,
        seriesId: 'SERIES_ID_HERE',
        operationDate: '2024-01-15',
        notes: 'Test E2E HKA Factory'
      })
      .expect(201);

    expect(response.body).toHaveProperty('_id');
    expect(response.body.status).toBe('draft');
    expect(response.body.controlNumber).toBeUndefined();

    retentionId = response.body._id;
  });

  it('should issue retention and get control number from HKA', async () => {
    const response = await request(app.getHttpServer())
      .post(`/api/v1/withholding/${retentionId}/issue`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        fiscalInfo: {
          period: '2024-01',
          declarationNumber: 'DEC-2024-E2E-001'
        }
      })
      .expect(200);

    expect(response.body.status).toBe('issued');
    expect(response.body.controlNumber).toBeDefined();
    expect(response.body.controlNumber).toMatch(/^\d{2}-\d{8}$/);
    expect(response.body.issueDate).toBeDefined();

    console.log('✅ Control Number:', response.body.controlNumber);
    console.log('✅ HKA Transaction ID:', response.body.metadata?.hkaTransactionId);
  });

  it('should download PDF with control number', async () => {
    const response = await request(app.getHttpServer())
      .get(`/api/v1/withholding/${retentionId}/pdf`)
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200)
      .expect('Content-Type', 'application/pdf');

    expect(response.body.length).toBeGreaterThan(0);

    // Verificar que es un PDF válido
    const pdfSignature = response.body.toString('utf8', 0, 4);
    expect(pdfSignature).toBe('%PDF');

    console.log('✅ PDF generado correctamente');
  });

  afterAll(async () => {
    await app.close();
  });
});
```

### A3. Test E2E Retención ISLR (1 hora)

Similar al anterior pero para ISLR.

### A4. Documentación de Certificación (30 min)

Crear documento con proceso de certificación SENIAT.

---

## 📐 PARTE B: FRONTEND DE RETENCIONES

### B1. Arquitectura de Componentes

```
src/
└── pages/
    └── Billing/
        └── Withholding/
            ├── WithholdingList.jsx           (Dashboard principal)
            ├── WithholdingDetail.jsx         (Vista detalle)
            ├── WithholdingIvaForm.jsx        (Crear IVA)
            ├── WithholdingIslrForm.jsx       (Crear ISLR)
            ├── components/
            │   ├── WithholdingCard.jsx
            │   ├── WithholdingStats.jsx
            │   ├── InvoiceSelector.jsx
            │   ├── IslrConceptSelector.jsx
            │   └── RetentionPreview.jsx
            └── hooks/
                ├── useWithholding.js
                └── useIslrConcepts.js
```

### B2. WithholdingList (Dashboard) - 2 horas

```jsx
// src/pages/Billing/Withholding/WithholdingList.jsx
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../../services/api';
import { WithholdingCard } from './components/WithholdingCard';
import { WithholdingStats } from './components/WithholdingStats';

export function WithholdingList() {
  const [retentions, setRetentions] = useState([]);
  const [filters, setFilters] = useState({
    type: 'all', // 'all', 'iva', 'islr'
    status: 'all', // 'all', 'draft', 'issued', 'cancelled'
    startDate: null,
    endDate: null,
  });
  const [stats, setStats] = useState({
    total: 0,
    draft: 0,
    issued: 0,
    totalAmount: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchRetentions();
  }, [filters]);

  const fetchRetentions = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();

      if (filters.type !== 'all') params.append('type', filters.type);
      if (filters.status !== 'all') params.append('status', filters.status);
      if (filters.startDate) params.append('startDate', filters.startDate);
      if (filters.endDate) params.append('endDate', filters.endDate);

      const response = await api.get(`/withholding?${params}`);
      setRetentions(response.data);

      // Calcular stats
      const stats = response.data.reduce((acc, ret) => {
        acc.total++;
        acc[ret.status]++;
        acc.totalAmount += ret.totals.totalRetention || 0;
        return acc;
      }, { total: 0, draft: 0, issued: 0, cancelled: 0, totalAmount: 0 });

      setStats(stats);
    } catch (error) {
      console.error('Error fetching retentions:', error);
      toast.error('Error al cargar retenciones');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Retenciones</h1>
        <div className="flex gap-2">
          <Link
            to="/billing/withholding/create/iva"
            className="btn btn-primary"
          >
            + Nueva Retención IVA
          </Link>
          <Link
            to="/billing/withholding/create/islr"
            className="btn btn-secondary"
          >
            + Nueva Retención ISLR
          </Link>
        </div>
      </div>

      {/* Stats */}
      <WithholdingStats stats={stats} />

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Tipo</label>
            <select
              value={filters.type}
              onChange={(e) => setFilters({ ...filters, type: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg"
            >
              <option value="all">Todos</option>
              <option value="iva">IVA</option>
              <option value="islr">ISLR</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Estado</label>
            <select
              value={filters.status}
              onChange={(e) => setFilters({ ...filters, status: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg"
            >
              <option value="all">Todos</option>
              <option value="draft">Borrador</option>
              <option value="issued">Emitida</option>
              <option value="cancelled">Anulada</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Desde</label>
            <input
              type="date"
              value={filters.startDate || ''}
              onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Hasta</label>
            <input
              type="date"
              value={filters.endDate || ''}
              onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg"
            />
          </div>
        </div>
      </div>

      {/* List */}
      {loading ? (
        <div className="text-center py-12">
          <div className="spinner" />
          <p className="mt-4 text-gray-600">Cargando retenciones...</p>
        </div>
      ) : retentions.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-600">No hay retenciones registradas</p>
          <Link
            to="/billing/withholding/create/iva"
            className="btn btn-primary mt-4"
          >
            Crear primera retención
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {retentions.map((retention) => (
            <WithholdingCard
              key={retention._id}
              retention={retention}
              onRefresh={fetchRetentions}
            />
          ))}
        </div>
      )}
    </div>
  );
}
```

### B3. WithholdingIvaForm - 2.5 horas

```jsx
// src/pages/Billing/Withholding/WithholdingIvaForm.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../../services/api';
import { InvoiceSelector } from './components/InvoiceSelector';
import { RetentionPreview } from './components/RetentionPreview';
import { toast } from 'react-toastify';

export function WithholdingIvaForm() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    affectedDocumentId: null,
    retentionPercentage: 75,
    seriesId: null,
    operationDate: new Date().toISOString().split('T')[0],
    notes: '',
  });
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [series, setSeries] = useState([]);
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchSeries();
  }, []);

  useEffect(() => {
    if (selectedInvoice && formData.retentionPercentage) {
      calculatePreview();
    }
  }, [selectedInvoice, formData.retentionPercentage]);

  const fetchSeries = async () => {
    try {
      const response = await api.get('/document-sequences?type=retention-iva');
      setSeries(response.data);

      if (response.data.length > 0) {
        setFormData({ ...formData, seriesId: response.data[0]._id });
      }
    } catch (error) {
      console.error('Error fetching series:', error);
      toast.error('Error al cargar series');
    }
  };

  const calculatePreview = () => {
    if (!selectedInvoice) return;

    const baseAmount = selectedInvoice.totals.subtotal;
    const taxAmount = selectedInvoice.totals.totalTax;
    const retentionAmount = taxAmount * (formData.retentionPercentage / 100);

    setPreview({
      baseAmount,
      taxRate: 16,
      taxAmount,
      retentionPercentage: formData.retentionPercentage,
      retentionAmount,
      invoiceNumber: selectedInvoice.documentNumber,
      invoiceTotal: selectedInvoice.totals.total,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.affectedDocumentId) {
      toast.error('Seleccione una factura');
      return;
    }

    if (!formData.seriesId) {
      toast.error('Seleccione una serie');
      return;
    }

    try {
      setSubmitting(true);

      const response = await api.post('/withholding/iva', formData);

      toast.success('Retención IVA creada exitosamente');
      navigate(`/billing/withholding/${response.data._id}`);
    } catch (error) {
      console.error('Error creating retention:', error);
      toast.error(error.response?.data?.message || 'Error al crear retención');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">Nueva Retención IVA</h1>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Factura Afectada */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">Factura Afectada</h2>

            <InvoiceSelector
              value={formData.affectedDocumentId}
              onChange={(invoice) => {
                setSelectedInvoice(invoice);
                setFormData({ ...formData, affectedDocumentId: invoice._id });
              }}
            />

            {selectedInvoice && (
              <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="font-medium">N° Factura:</span>{' '}
                    {selectedInvoice.documentNumber}
                  </div>
                  <div>
                    <span className="font-medium">Control:</span>{' '}
                    {selectedInvoice.controlNumber || 'N/A'}
                  </div>
                  <div>
                    <span className="font-medium">Fecha:</span>{' '}
                    {new Date(selectedInvoice.issueDate).toLocaleDateString()}
                  </div>
                  <div>
                    <span className="font-medium">Total:</span>{' '}
                    ${selectedInvoice.totals.total.toLocaleString()}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Datos de la Retención */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">Datos de la Retención</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">
                  Porcentaje de Retención *
                </label>
                <select
                  value={formData.retentionPercentage}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      retentionPercentage: parseInt(e.target.value),
                    })
                  }
                  className="w-full px-3 py-2 border rounded-lg"
                  required
                >
                  <option value={75}>75%</option>
                  <option value={100}>100%</option>
                </select>
                <p className="text-xs text-gray-500 mt-1">
                  75% para contribuyentes ordinarios, 100% para especiales
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">
                  Serie *
                </label>
                <select
                  value={formData.seriesId || ''}
                  onChange={(e) =>
                    setFormData({ ...formData, seriesId: e.target.value })
                  }
                  className="w-full px-3 py-2 border rounded-lg"
                  required
                >
                  <option value="">Seleccione una serie</option>
                  {series.map((s) => (
                    <option key={s._id} value={s._id}>
                      {s.prefix} (Siguiente: {s.nextNumber})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">
                  Fecha de Operación *
                </label>
                <input
                  type="date"
                  value={formData.operationDate}
                  onChange={(e) =>
                    setFormData({ ...formData, operationDate: e.target.value })
                  }
                  className="w-full px-3 py-2 border rounded-lg"
                  required
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium mb-1">
                  Observaciones
                </label>
                <textarea
                  value={formData.notes}
                  onChange={(e) =>
                    setFormData({ ...formData, notes: e.target.value })
                  }
                  className="w-full px-3 py-2 border rounded-lg"
                  rows={3}
                  placeholder="Notas adicionales (opcional)"
                />
              </div>
            </div>
          </div>

          {/* Preview */}
          {preview && <RetentionPreview data={preview} type="iva" />}

          {/* Actions */}
          <div className="flex justify-end gap-4">
            <button
              type="button"
              onClick={() => navigate('/billing/withholding')}
              className="btn btn-secondary"
              disabled={submitting}
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={submitting || !formData.affectedDocumentId}
            >
              {submitting ? 'Creando...' : 'Crear Retención'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
```

### B4. WithholdingIslrForm - 2.5 horas

Similar a IvaForm pero con selector de conceptos ISLR.

### B5. Componentes Auxiliares - 3 horas

- `WithholdingCard.jsx`
- `WithholdingStats.jsx`
- `InvoiceSelector.jsx`
- `IslrConceptSelector.jsx`
- `RetentionPreview.jsx`

---

## 📐 PARTE C: FUNCIONALIDADES AVANZADAS

### C1. IGTF (3% Divisas) - 3 horas

#### Backend
```typescript
// src/modules/billing/services/igtf.service.ts
@Injectable()
export class IgtfService {
  calculateIgtf(document: BillingDocument): number {
    // IGTF solo aplica para pagos en divisas
    const foreignCurrencyPayments = document.payments?.filter(
      p => ['USD', 'EUR', 'COP'].includes(p.currency)
    ) || [];

    if (foreignCurrencyPayments.length === 0) {
      return 0;
    }

    // Suma de montos en divisas
    const totalForeignCurrency = foreignCurrencyPayments.reduce(
      (sum, p) => sum + p.amount,
      0
    );

    // IGTF = 3%
    return totalForeignCurrency * 0.03;
  }

  applyIgtfToDocument(document: BillingDocument): void {
    const igtf = this.calculateIgtf(document);

    if (igtf > 0) {
      // Agregar a ImpuestosSubtotal
      document.taxes.push({
        code: 'IGTF',
        description: 'Impuesto a las Grandes Transacciones Financieras',
        rate: 3,
        baseAmount: /* suma divisas */,
        amount: igtf,
      });

      // Actualizar total
      document.totals.total += igtf;
    }
  }
}
```

### C2. Query Estado Documentos - 2 horas

```typescript
// src/modules/billing/withholding.service.ts
async queryStatus(id: string, tenantId: string): Promise<any> {
  const retention = await this.findOne(id, tenantId);

  if (retention.status !== 'issued') {
    throw new BadRequestException('Solo se puede consultar estado de retenciones emitidas');
  }

  // Llamar a HKA Factory
  const provider = this.imprentaProviderFactory.getProvider();
  const status = await provider.queryDocumentStatus({
    documentNumber: retention.documentNumber,
    type: retention.type === 'iva' ? '05' : '06',
  });

  // Actualizar si difiere
  if (status.estado !== retention.status) {
    this.logger.warn(
      `Estado difiere en HKA: local=${retention.status}, hka=${status.estado}`
    );
    // Actualizar según lógica de negocio
  }

  return status;
}
```

### C3. Anulación de Retenciones - 2 horas

```typescript
async cancelRetention(
  id: string,
  reason: string,
  tenantId: string,
  userId: string,
): Promise<WithholdingDocument> {
  const retention = await this.findOne(id, tenantId);

  if (retention.status === 'cancelled') {
    throw new BadRequestException('Retención ya está anulada');
  }

  if (retention.status === 'draft') {
    // Solo marcar como cancelada localmente
    retention.status = 'cancelled';
    retention.metadata.cancellationReason = reason;
    retention.metadata.cancelledBy = userId;
    retention.metadata.cancelledAt = new Date();
    await retention.save();
    return retention;
  }

  // Si está emitida, anular en HKA Factory
  const provider = this.imprentaProviderFactory.getProvider();

  await provider.cancelDocument({
    documentNumber: retention.documentNumber,
    type: retention.type === 'iva' ? '05' : '06',
    reason,
  });

  retention.status = 'cancelled';
  retention.metadata.cancellationReason = reason;
  retention.metadata.cancelledBy = userId;
  retention.metadata.cancelledAt = new Date();
  await retention.save();

  return retention;
}
```

### C4. Descarga PDF HKA - 1 hora

```typescript
async downloadHkaPdf(id: string, tenantId: string): Promise<Buffer> {
  const retention = await this.findOne(id, tenantId);

  if (retention.status !== 'issued') {
    throw new BadRequestException('Solo retenciones emitidas tienen PDF en HKA');
  }

  const provider = this.imprentaProviderFactory.getProvider();

  return provider.downloadPdf({
    documentNumber: retention.documentNumber,
    type: retention.type === 'iva' ? '05' : '06',
    controlNumber: retention.controlNumber,
  });
}
```

---

## 📊 CRONOGRAMA

| Semana | Actividad | Horas | Status |
|--------|-----------|-------|--------|
| 1 | **Parte A: Testing HKA** |  |  |
|   | A1. Setup ambiente demo | 0.5h | ⏹️ |
|   | A2. Test E2E IVA | 1h | ⏹️ |
|   | A3. Test E2E ISLR | 1h | ⏹️ |
|   | A4. Documentación certificación | 0.5h | ⏹️ |
| 2 | **Parte B: Frontend** |  |  |
|   | B1. WithholdingList | 2h | ⏹️ |
|   | B2. WithholdingIvaForm | 2.5h | ⏹️ |
|   | B3. WithholdingIslrForm | 2.5h | ⏹️ |
|   | B4. Componentes auxiliares | 3h | ⏹️ |
| 3 | **Parte C: Avanzado** |  |  |
|   | C1. IGTF | 3h | ⏹️ |
|   | C2. Query estado | 2h | ⏹️ |
|   | C3. Anulación | 2h | ⏹️ |
|   | C4. Descarga PDF HKA | 1h | ⏹️ |
| **TOTAL** | | **21h** | |

---

## ✅ Criterios de Aceptación

### Parte A
- [ ] Autenticación HKA exitosa
- [ ] Emisión IVA E2E funcional
- [ ] Emisión ISLR E2E funcional
- [ ] Número de control recibido
- [ ] PDF descargable desde HKA

### Parte B
- [ ] Dashboard muestra todas las retenciones
- [ ] Filtros funcionan correctamente
- [ ] Formulario IVA valida datos
- [ ] Formulario ISLR con catálogo de conceptos
- [ ] Preview de cálculos correcto
- [ ] Navegación fluida entre vistas

### Parte C
- [ ] IGTF se calcula automáticamente
- [ ] Query de estado sincroniza con HKA
- [ ] Anulación funciona en borrador y emitido
- [ ] PDF de HKA se descarga correctamente
- [ ] Dashboard de salud muestra métricas

---

## 📦 Entregables

1. **Scripts de Testing**
   - `setup-hka-demo.ts`
   - `withholding-iva-hka.e2e-spec.ts`
   - `withholding-islr-hka.e2e-spec.ts`

2. **Componentes Frontend**
   - `WithholdingList.jsx`
   - `WithholdingIvaForm.jsx`
   - `WithholdingIslrForm.jsx`
   - 5 componentes auxiliares

3. **Servicios Backend**
   - `IgtfService`
   - Métodos: `queryStatus()`, `cancelRetention()`, `downloadHkaPdf()`

4. **Documentación**
   - Guía de testing HKA
   - Manual de usuario frontend
   - API docs actualizada

---

## 🚀 INICIO DE IMPLEMENTACIÓN

**¿Por dónde empezar?**

1. **Opción 1 (Rápido)**: Comenzar con Frontend (Parte B)
   - Visible inmediatamente
   - No requiere HKA activo
   - Usuarios pueden empezar a usar

2. **Opción 2 (Validación)**: Comenzar con Testing (Parte A)
   - Valida integración HKA
   - Asegura que todo funciona
   - Identifica problemas temprano

3. **Opción 3 (Valor)**: Comenzar con IGTF (Parte C1)
   - Funcionalidad de alto impacto
   - Requerida para facturación completa
   - Relativamente independiente

**Recomendación**: Opción 2 → Opción 1 → Opción 3

---

**Última actualización**: 2026-03-23
**Versión**: 1.0.0

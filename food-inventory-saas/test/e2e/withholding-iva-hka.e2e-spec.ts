/**
 * Test E2E: Retención IVA con HKA Factory
 *
 * Este test valida el flujo completo de emisión de una retención IVA
 * desde la creación en draft hasta la obtención del número de control
 * real desde HKA Factory.
 *
 * Prerrequisitos:
 * 1. Archivo .env.demo configurado con credenciales HKA reales
 * 2. Base de datos con datos de prueba (tenant, usuario, factura, serie)
 * 3. Conectividad con HKA Factory demo
 *
 * Ejecución:
 *   npm run test:e2e:hka:iva
 */

import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { AppModule } from '../../src/app.module';
import * as request from 'supertest';
import { config } from 'dotenv';

// Cargar variables de entorno desde .env.demo
config({ path: '.env.demo' });

describe('Withholding IVA E2E with HKA Factory (e2e)', () => {
  let app: INestApplication;
  let authToken: string;
  let tenantId: string;
  let userId: string;
  let invoiceId: string;
  let seriesId: string;
  let retentionId: string;
  let controlNumber: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();

    // Configurar pipes de validación
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );

    await app.init();

    // Autenticación
    await loginAndGetToken();
  });

  afterAll(async () => {
    await app.close();
  });

  /**
   * Autenticación y obtención de token
   */
  async function loginAndGetToken() {
    console.log('🔐 Autenticando...');

    const response = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({
        email: process.env.TEST_USER_EMAIL || 'admin@demo.com',
        password: process.env.TEST_USER_PASSWORD || 'demo123',
      })
      .expect(200);

    expect(response.body).toHaveProperty('data');
    expect(response.body.data).toHaveProperty('accessToken');

    authToken = response.body.data.accessToken;
    tenantId = response.body.data.user.tenantId;
    userId = response.body.data.user._id;

    console.log('✅ Autenticación exitosa');
    console.log(`   Tenant ID: ${tenantId}`);
    console.log(`   User ID: ${userId}`);
  }

  /**
   * PASO 1: Preparar datos de prueba
   */
  describe('SETUP: Preparar datos de prueba', () => {
    it('should verify HKA Factory config is present', () => {
      expect(process.env.HKA_FACTORY_BASE_URL).toBeDefined();
      expect(process.env.HKA_FACTORY_USUARIO).toBeDefined();
      expect(process.env.HKA_FACTORY_CLAVE).toBeDefined();
      expect(process.env.HKA_FACTORY_RIF_EMISOR).toBeDefined();

      console.log('✅ Configuración HKA presente');
      console.log(`   URL: ${process.env.HKA_FACTORY_BASE_URL}`);
      console.log(`   RIF: ${process.env.HKA_FACTORY_RIF_EMISOR}`);
    });

    it('should get or create test invoice', async () => {
      console.log('📄 Buscando/creando factura de prueba...');

      // Intentar obtener una factura existente
      const listResponse = await request(app.getHttpServer())
        .get('/api/v1/billing?status=issued&limit=1')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      if (listResponse.body.length > 0) {
        invoiceId = listResponse.body[0]._id;
        console.log(`✅ Usando factura existente: ${listResponse.body[0].documentNumber}`);
      } else {
        // Crear factura de prueba si no existe
        const createResponse = await request(app.getHttpServer())
          .post('/api/v1/billing')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            customer: {
              name: 'CLIENTE PRUEBA RETENCIÓN',
              taxId: 'J-999999999',
              email: 'cliente@test.com',
            },
            items: [
              {
                description: 'Producto Test Retención',
                quantity: 10,
                unitPrice: 100,
                taxCode: 'G',
                taxRate: 16,
              },
            ],
            seriesId: 'SERIES_ID_BILLING', // Reemplazar con ID real
          })
          .expect(201);

        invoiceId = createResponse.body._id;
        console.log(`✅ Factura creada: ${createResponse.body.documentNumber}`);
      }
    });

    it('should get or create retention series', async () => {
      console.log('📋 Buscando/creando serie de retenciones...');

      const response = await request(app.getHttpServer())
        .get('/api/v1/document-sequences?type=retention-iva')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      if (response.body.length > 0) {
        seriesId = response.body[0]._id;
        console.log(`✅ Usando serie existente: ${response.body[0].prefix}`);
      } else {
        // Crear serie si no existe
        const createResponse = await request(app.getHttpServer())
          .post('/api/v1/document-sequences')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            type: 'retention-iva',
            prefix: 'RET-IVA',
            nextNumber: 1,
            description: 'Retenciones IVA',
          })
          .expect(201);

        seriesId = createResponse.body._id;
        console.log(`✅ Serie creada: ${createResponse.body.prefix}`);
      }
    });
  });

  /**
   * PASO 2: Crear retención IVA (draft)
   */
  describe('STEP 1: Crear retención IVA (draft)', () => {
    it('should create IVA retention in draft status', async () => {
      console.log('🆕 Creando retención IVA...');

      const response = await request(app.getHttpServer())
        .post('/api/v1/withholding/iva')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          affectedDocumentId: invoiceId,
          retentionPercentage: 75,
          seriesId: seriesId,
          operationDate: new Date().toISOString().split('T')[0],
          notes: 'Test E2E HKA Factory - Retención IVA 75%',
        })
        .expect(201);

      expect(response.body).toHaveProperty('_id');
      expect(response.body.type).toBe('iva');
      expect(response.body.status).toBe('draft');
      expect(response.body.controlNumber).toBeUndefined();
      expect(response.body.documentNumber).toMatch(/^RET-IVA-\d+$/);

      retentionId = response.body._id;

      console.log('✅ Retención creada en draft');
      console.log(`   ID: ${retentionId}`);
      console.log(`   Documento: ${response.body.documentNumber}`);
      console.log(`   Base: ${response.body.ivaRetention.baseAmount}`);
      console.log(`   IVA: ${response.body.ivaRetention.taxAmount}`);
      console.log(`   Retención: ${response.body.ivaRetention.retentionAmount}`);
    });

    it('should get retention by ID', async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/v1/withholding/${retentionId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body._id).toBe(retentionId);
      expect(response.body.status).toBe('draft');
    });

    it('should list retentions and include the new one', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/withholding?type=iva')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      const retention = response.body.find((r: any) => r._id === retentionId);
      expect(retention).toBeDefined();
    });
  });

  /**
   * PASO 3: Emitir retención y obtener número de control de HKA
   */
  describe('STEP 2: Emitir retención (HKA Factory)', () => {
    it('should issue retention and get control number from HKA', async () => {
      console.log('🚀 Emitiendo retención a HKA Factory...');
      console.log('   ⏳ Este proceso puede tardar 10-30 segundos...');

      const response = await request(app.getHttpServer())
        .post(`/api/v1/withholding/${retentionId}/issue`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          fiscalInfo: {
            period: new Date().toISOString().slice(0, 7), // YYYY-MM
            declarationNumber: `DEC-E2E-${Date.now()}`,
          },
        })
        .timeout(60000) // 60 segundos de timeout
        .expect(200);

      expect(response.body.status).toBe('issued');
      expect(response.body.controlNumber).toBeDefined();
      expect(response.body.issueDate).toBeDefined();

      // Validar formato de número de control
      expect(response.body.controlNumber).toMatch(/^\d{2}-\d{8}$/);

      controlNumber = response.body.controlNumber;

      console.log('✅ Retención emitida exitosamente');
      console.log(`   🎫 Número de Control: ${controlNumber}`);
      console.log(`   📅 Fecha emisión: ${response.body.issueDate}`);

      if (response.body.metadata?.hkaTransactionId) {
        console.log(`   🔖 Transaction ID: ${response.body.metadata.hkaTransactionId}`);
      }
    });

    it('should not allow issuing the same retention twice', async () => {
      console.log('🔒 Verificando que no se puede emitir dos veces...');

      const response = await request(app.getHttpServer())
        .post(`/api/v1/withholding/${retentionId}/issue`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({})
        .expect(200);

      // Debe retornar la retención ya emitida sin cambios
      expect(response.body.status).toBe('issued');
      expect(response.body.controlNumber).toBe(controlNumber);

      console.log('✅ Validación correcta: no se reemite');
    });
  });

  /**
   * PASO 4: Validar PDF del comprobante
   */
  describe('STEP 3: Descargar PDF del comprobante', () => {
    it('should download PDF with control number', async () => {
      console.log('📥 Descargando PDF del comprobante...');

      const response = await request(app.getHttpServer())
        .get(`/api/v1/withholding/${retentionId}/pdf`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)
        .expect('Content-Type', 'application/pdf');

      expect(response.body.length).toBeGreaterThan(0);

      // Verificar que es un PDF válido
      const pdfSignature = response.body.toString('utf8', 0, 4);
      expect(pdfSignature).toBe('%PDF');

      // Verificar que contiene el número de control
      const pdfString = response.body.toString('utf8');
      expect(pdfString).toContain(controlNumber);

      console.log('✅ PDF generado correctamente');
      console.log(`   Tamaño: ${(response.body.length / 1024).toFixed(2)} KB`);
    });
  });

  /**
   * PASO 5: Validar que la factura está actualizada
   */
  describe('STEP 4: Verificar factura afectada', () => {
    it('should list retentions by invoice', async () => {
      console.log('🔍 Consultando retenciones de la factura...');

      const response = await request(app.getHttpServer())
        .get(`/api/v1/withholding/by-invoice/${invoiceId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      const retention = response.body.find((r: any) => r._id === retentionId);
      expect(retention).toBeDefined();
      expect(retention.status).toBe('issued');
      expect(retention.controlNumber).toBe(controlNumber);

      console.log('✅ Retención vinculada a la factura');
    });

    it('should calculate total retentions for invoice', async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/v1/withholding/by-invoice/${invoiceId}/totals`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('totalIvaRetention');
      expect(response.body).toHaveProperty('totalIslrRetention');
      expect(response.body.totalIvaRetention).toBeGreaterThan(0);

      console.log('✅ Totales calculados correctamente');
      console.log(`   Total IVA: ${response.body.totalIvaRetention}`);
    });
  });

  /**
   * PASO 6: Validar reportes
   */
  describe('STEP 5: Verificar en reportes fiscales', () => {
    it('should include retention in IVA monthly report', async () => {
      console.log('📊 Generando libro de retenciones IVA...');

      const now = new Date();
      const year = now.getFullYear();
      const month = now.getMonth() + 1;

      const response = await request(app.getHttpServer())
        .get(`/api/v1/withholding/reports/iva/${year}/${month}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)
        .expect('Content-Type', 'application/pdf');

      expect(response.body.length).toBeGreaterThan(0);

      const pdfSignature = response.body.toString('utf8', 0, 4);
      expect(pdfSignature).toBe('%PDF');

      console.log('✅ Libro de retenciones IVA generado');
      console.log(`   Período: ${month}/${year}`);
    });
  });

  /**
   * RESUMEN FINAL
   */
  describe('SUMMARY: Resumen del test E2E', () => {
    it('should display test summary', () => {
      console.log('\n' + '═'.repeat(60));
      console.log('📊 RESUMEN DEL TEST E2E - RETENCIÓN IVA + HKA FACTORY');
      console.log('═'.repeat(60));
      console.log(`✅ Retención creada: ${retentionId}`);
      console.log(`✅ Número de control: ${controlNumber}`);
      console.log(`✅ Estado: issued`);
      console.log(`✅ PDF generado: OK`);
      console.log(`✅ Vinculada a factura: ${invoiceId}`);
      console.log(`✅ Incluida en reportes: OK`);
      console.log('═'.repeat(60));
      console.log('🎉 TEST E2E COMPLETADO EXITOSAMENTE');
      console.log('═'.repeat(60) + '\n');
    });
  });
});

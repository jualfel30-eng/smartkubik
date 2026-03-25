/**
 * Script de prueba para emisión con HKA Factory
 *
 * Uso:
 *   ts-node -r dotenv/config scripts/test-hka-emission.ts dotenv_config_path=.env.hka
 */

import { HkaFactoryProvider } from '../src/modules/billing/providers/hka-factory.provider';
import { HkaDocumentMapper } from '../src/modules/billing/mappers/hka-document.mapper';

async function testHkaEmission() {
  console.log('\n🚀 Iniciando prueba de emisión HKA Factory...\n');

  // 1. Verificar configuración
  console.log('📋 Configuración:');
  console.log(`   URL: ${process.env.HKA_FACTORY_BASE_URL}`);
  console.log(`   Usuario: ${process.env.HKA_FACTORY_USUARIO}`);
  console.log(`   RIF Emisor: ${process.env.HKA_FACTORY_RIF_EMISOR}`);
  console.log(`   Razón Social: ${process.env.HKA_FACTORY_RAZON_SOCIAL}\n`);

  // Verificar que todos los datos estén presentes
  if (!process.env.HKA_FACTORY_RIF_EMISOR || process.env.HKA_FACTORY_RIF_EMISOR.includes('XXXX')) {
    console.error('❌ ERROR: RIF_EMISOR no está configurado en .env.hka');
    console.error('   Por favor actualiza HKA_FACTORY_RIF_EMISOR con el RIF real de tu empresa\n');
    process.exit(1);
  }

  // 2. Crear proveedor HKA
  const hkaProvider = new HkaFactoryProvider({
    baseUrl: process.env.HKA_FACTORY_BASE_URL!,
    usuario: process.env.HKA_FACTORY_USUARIO!,
    clave: process.env.HKA_FACTORY_CLAVE!,
    rifEmisor: process.env.HKA_FACTORY_RIF_EMISOR!,
    razonSocialEmisor: process.env.HKA_FACTORY_RAZON_SOCIAL!,
    timeout: 45000,
  });

  try {
    // 3. Validar configuración
    console.log('🔍 Validando configuración...');
    const validation = await hkaProvider.validateConfig();

    if (!validation.valid) {
      console.error('❌ Configuración inválida:');
      validation.errors.forEach(err => console.error(`   - ${err}`));
      return;
    }

    console.log('✅ Configuración válida (autenticación exitosa)\n');

    // 4. Crear documento de prueba
    console.log('📄 Creando documento de prueba...');
    const now = new Date();
    const testDocument: any = {
      _id: `test-doc-${Date.now()}`,
      type: 'invoice',
      documentNumber: Math.floor(Math.random() * 9999 + 2).toString(), // Número aleatorio (2-10000)
      issueDate: now,
      customer: {
        name: 'Cliente de Prueba C.A.',
        taxId: 'J-12345678-9',
        address: 'Av. Principal, Caracas, Venezuela',
        email: 'cliente@example.com',
        phone: '0212-1234567',
      },
      emitter: {
        businessName: process.env.HKA_FACTORY_RAZON_SOCIAL,
        taxId: process.env.HKA_FACTORY_RIF_EMISOR,
        fiscalAddress: 'Caracas, Venezuela',
      },
      items: [
        {
          description: 'Servicio de Consultoría Tecnológica',
          quantity: 10,
          unitPrice: 50.00,
          total: 500.00,
          tax: { type: 'IVA', rate: 16 },
        },
        {
          description: 'Desarrollo de Software a Medida',
          quantity: 5,
          unitPrice: 100.00,
          total: 500.00,
          tax: { type: 'IVA', rate: 16 },
        },
      ],
      totals: {
        subtotal: 1000.00,
        taxableAmount: 1000.00,
        exemptAmount: 0,
        taxes: [
          { type: 'IVA', rate: 16, amount: 160.00 },
        ],
        grandTotal: 1160.00,
        currency: 'VES',
      },
      metadata: {
        series: '', // Serie vacía según CSV de HKA Factory
        tipoTransaccion: '01', // Venta
      },
    };

    console.log('✅ Documento de prueba creado');
    console.log(`   Total: ${testDocument.totals.grandTotal} VES`);
    console.log(`   Items: ${testDocument.items.length}\n`);

    // 5. Mapear documento a formato HKA
    console.log('🔄 Mapeando documento a formato HKA...');
    const mapper = new HkaDocumentMapper();
    const hkaJson = mapper.toHkaJson(testDocument);

    console.log('✅ Documento mapeado exitosamente\n');

    // 6. Solicitar número de control
    console.log('📡 Enviando solicitud a HKA Factory...');
    console.log('   (Esto puede tomar unos segundos...)\n');

    const response = await hkaProvider.requestControlNumber({
      documentId: testDocument._id,
      tenantId: 'test-tenant-001',
      seriesId: 'series-demo-001',
      documentNumber: testDocument.documentNumber,
      type: testDocument.type,
      metadata: { hkaJson },
    });

    console.log('\n🎉 ¡EMISIÓN EXITOSA!\n');
    console.log('═'.repeat(60));
    console.log('📋 RESULTADO DE LA EMISIÓN');
    console.log('═'.repeat(60));
    console.log(`\n   📄 Número de Control: ${response.controlNumber}`);
    console.log(`   🏢 Proveedor: ${response.provider}`);
    console.log(`   📅 Fecha de Asignación: ${response.assignedAt.toLocaleString('es-VE')}`);
    console.log(`   🔐 Hash: ${response.hash?.substring(0, 32)}...`);

    if ((response as any).verificationUrl) {
      console.log(`   🔗 URL Verificación: ${(response as any).verificationUrl}`);
    }

    if (response.metadata) {
      console.log('\n   📝 Metadata Adicional:');
      console.log(`      Fecha HKA: ${response.metadata.fechaAsignacion}`);
      console.log(`      Hora HKA: ${response.metadata.horaAsignacion}`);
      console.log(`      Autorizado: ${response.metadata.autorizado || 'N/A'}`);
      if (response.metadata.transaccionId) {
        console.log(`      ID Transacción: ${response.metadata.transaccionId}`);
      }
    }

    console.log('\n═'.repeat(60));

    // 7. Consultar estado del documento (opcional - puede fallar en demo)
    try {
      console.log('\n🔍 Verificando estado del documento...');
      const status = await hkaProvider.queryDocumentStatus(response.controlNumber);
      console.log(`   ✅ Estado: ${status.status.toUpperCase()}`);
      console.log(`   📄 Control Number: ${status.controlNumber}\n`);
    } catch (statusError: any) {
      console.log(`   ⚠️  No se pudo verificar el estado (esto es normal en ambiente demo)`);
      console.log(`   Mensaje: ${statusError.message}\n`);
    }

    console.log('═'.repeat(60));
    console.log('✅ PRUEBA COMPLETADA EXITOSAMENTE');
    console.log('═'.repeat(60));
    console.log('\n💡 Próximos pasos:');
    console.log('   1. Verifica el documento en el portal HKA Factory');
    console.log('   2. Descarga el PDF del documento');
    console.log('   3. Integra esta funcionalidad en tu aplicación\n');

  } catch (error: any) {
    console.error('\n❌ ERROR DURANTE LA EMISIÓN\n');
    console.error('═'.repeat(60));
    console.error(`Mensaje: ${error.message}\n`);

    if (error.response) {
      console.error(`Status HTTP: ${error.response.status}`);
      console.error(`Respuesta del servidor:`);
      console.error(JSON.stringify(error.response.data, null, 2));
    }

    console.error('\n═'.repeat(60));
    console.error('Stack trace:');
    console.error(error.stack);
    console.error('═'.repeat(60));
    process.exit(1);
  }
}

// Ejecutar prueba
testHkaEmission().catch(console.error);

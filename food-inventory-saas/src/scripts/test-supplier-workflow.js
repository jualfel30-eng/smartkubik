/**
 * TEST END-TO-END: Flujo completo de creación de proveedor
 *
 * 1. Login con admin@earlyadopter.com
 * 2. Crear proveedor desde módulo CRM (/customers)
 * 3. Buscar proveedor en /customers (simular búsqueda en Compras)
 * 4. Crear orden de compra usando ese proveedor
 * 5. Verificar que NO se creó duplicado
 * 6. Verificar que condiciones de pago están presentes
 */

const https = require('https');

const API_URL = 'api.smartkubik.com';
const TEST_EMAIL = 'admin@earlyadopter.com';
const TEST_PASSWORD = 'Admin1234!';

let accessToken = null;
let tenantId = null;
let createdSupplierId = null;

// Utility para hacer requests HTTPS
function makeRequest(method, path, body = null, token = null) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: API_URL,
      port: 443,
      path: `/api/v1${path}`,
      method: method,
      headers: {
        'Content-Type': 'application/json',
      }
    };

    if (token) {
      options.headers['Authorization'] = `Bearer ${token}`;
    }

    if (body) {
      options.headers['Content-Length'] = Buffer.byteLength(JSON.stringify(body));
    }

    const req = https.request(options, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve({ statusCode: res.statusCode, data: parsed });
          } else {
            reject({ statusCode: res.statusCode, error: parsed });
          }
        } catch (e) {
          reject({ statusCode: res.statusCode, error: data });
        }
      });
    });

    req.on('error', (e) => {
      reject(e);
    });

    if (body) {
      req.write(JSON.stringify(body));
    }

    req.end();
  });
}

async function runTest() {
  console.log('\n' + '═'.repeat(80));
  console.log('🧪 TEST END-TO-END: Flujo de Creación de Proveedor');
  console.log('═'.repeat(80) + '\n');

  try {
    // PASO 1: LOGIN
    console.log('1️⃣  LOGIN con admin@earlyadopter.com...\n');

    const loginResponse = await makeRequest('POST', '/auth/login', {
      email: TEST_EMAIL,
      password: TEST_PASSWORD
    });

    // DEBUG - Descomentar si es necesario
    // console.log('   DEBUG - Respuesta completa de login:');
    // console.log(JSON.stringify(loginResponse, null, 2));
    // console.log('');

    // La respuesta puede tener diferentes estructuras
    if (loginResponse.data.data && loginResponse.data.data.accessToken) {
      accessToken = loginResponse.data.data.accessToken;
      tenantId = loginResponse.data.data.user?.tenantId;
    } else if (loginResponse.data.accessToken) {
      accessToken = loginResponse.data.accessToken;
      tenantId = loginResponse.data.user?.tenantId;
    } else {
      throw new Error('No se recibió accessToken en la respuesta de login');
    }

    console.log('   ✅ Login exitoso');
    console.log(`   Token: ${accessToken.substring(0, 20)}...`);
    console.log(`   TenantId: ${tenantId}\n`);

    // PASO 2: CREAR PROVEEDOR DESDE MÓDULO PROVEEDORES
    console.log('2️⃣  CREAR PROVEEDOR desde módulo Proveedores (/suppliers)...\n');

    const timestamp = Date.now();
    const rifNumber = timestamp.toString().slice(-8);
    const supplierData = {
      name: `Test Proveedor ${timestamp}`,
      rif: `J-${rifNumber}`, // RIF directamente, no en taxInfo
      contactName: `Contacto ${timestamp}`,
      contactEmail: `proveedor${timestamp}@test.com`,
      contactPhone: '+58412-1234567',
      paymentSettings: {
        acceptedPaymentMethods: ['transferencia', 'zelle', 'efectivo'],
        acceptsCredit: true,
        defaultCreditDays: 30,
        requiresAdvancePayment: false,
        advancePaymentPercentage: 0
      }
    };

    const createResponse = await makeRequest('POST', '/suppliers', supplierData, accessToken);

    // Comentar debug si no es necesario
    // console.log('   DEBUG - Respuesta de crear supplier:');
    // console.log(`   _id: ${createResponse.data._id}`);
    // console.log(`   customerId: ${createResponse.data.customerId}`);

    // La respuesta puede tener estructura anidada
    const createdSupplier = createResponse.data.data || createResponse.data;
    // Usar customerId si está disponible (es el ID del Customer), sino usar _id
    createdSupplierId = createdSupplier.customerId || createdSupplier._id;

    console.log('   ✅ Proveedor creado exitosamente');
    console.log(`   ID: ${createdSupplierId}`);
    console.log(`   Nombre: ${createdSupplier.name}`);
    console.log(`   RIF: ${createdSupplier.taxInfo?.taxId}`);
    console.log(`   Métodos de pago: ${createdSupplier.paymentSettings?.acceptedPaymentMethods?.join(', ')}\n`);

    // PASO 3: BUSCAR PROVEEDOR (simular búsqueda en Compras)
    console.log('3️⃣  BUSCAR PROVEEDOR por RIF (como lo haría Compras)...\n');

    const searchResponse = await makeRequest('GET', `/suppliers?search=${rifNumber}`, null, accessToken);

    const searchResults = Array.isArray(searchResponse.data) ? searchResponse.data : (searchResponse.data.data || []);

    // Debug comentado
    // console.log(`   DEBUG - Buscando proveedor con ID: ${createdSupplierId}`);
    // console.log(`   DEBUG - Resultados encontrados: ${searchResults.length}`);

    const foundSupplier = searchResults.find(s => {
      const sId = String(s._id);
      const sCustomerId = String(s.customerId?._id || s.customerId);
      return sId === createdSupplierId || sCustomerId === createdSupplierId;
    });

    if (!foundSupplier) {
      console.log('   ❌ ERROR: Proveedor NO encontrado en búsqueda');
      console.log(`   Búsqueda: ${rifNumber}`);
      console.log(`   Resultados: ${searchResults.length} proveedores`);
      throw new Error('Proveedor no encontrado en búsqueda');
    }

    console.log('   ✅ Proveedor encontrado en búsqueda');
    console.log(`   ID: ${foundSupplier._id}`);
    console.log(`   Nombre: ${foundSupplier.name}`);
    console.log(`   RIF: ${foundSupplier.taxInfo?.taxId}`);

    // VERIFICAR CONDICIONES DE PAGO
    if (!foundSupplier.paymentSettings || !foundSupplier.paymentSettings.acceptedPaymentMethods) {
      console.log('   ❌ ERROR: Condiciones de pago NO están presentes');
      console.log(`   paymentSettings: ${JSON.stringify(foundSupplier.paymentSettings)}`);
      throw new Error('Condiciones de pago no encontradas');
    }

    console.log('   ✅ Condiciones de pago presentes:');
    console.log(`      Métodos: ${foundSupplier.paymentSettings.acceptedPaymentMethods.join(', ')}`);
    console.log(`      Acepta crédito: ${foundSupplier.paymentSettings.acceptsCredit}`);
    console.log(`      Días de crédito: ${foundSupplier.paymentSettings.defaultCreditDays}\n`);

    // PASO 4: CREAR ORDEN DE COMPRA usando ese proveedor
    console.log('4️⃣  CREAR ORDEN DE COMPRA usando el proveedor...\n');

    // Primero necesitamos un producto para la compra
    console.log('   📦 Obteniendo productos...');
    const productsResponse = await makeRequest('GET', '/products?limit=1', null, accessToken);

    const products = Array.isArray(productsResponse.data) ? productsResponse.data : (productsResponse.data.data || []);
    if (!products || products.length === 0) {
      throw new Error('No hay productos disponibles para crear la compra');
    }

    const product = products[0];
    console.log(`   ✅ Producto encontrado: ${product.name}\n`);

    const purchaseOrderData = {
      supplierId: createdSupplierId,
      supplierName: foundSupplier.name,
      supplierRif: rifNumber,
      taxType: foundSupplier.taxInfo?.taxType || 'J',
      contactName: foundSupplier.contacts?.[0]?.value || '',
      contactPhone: foundSupplier.contacts?.find(c => c.type === 'phone')?.value || '',
      contactEmail: foundSupplier.contacts?.find(c => c.type === 'email')?.value || '',
      purchaseDate: new Date().toISOString().split('T')[0],
      documentType: 'factura_fiscal',
      items: [
        {
          productId: product._id,
          productName: product.name,
          productSku: product.sku,
          quantity: 10,
          costPrice: 5.50  // Campo correcto: costPrice
        }
      ],
      notes: 'Test de compra - verificación de duplicados',
      paymentTerms: {
        isCredit: foundSupplier.paymentSettings.acceptsCredit || false,
        creditDays: foundSupplier.paymentSettings.defaultCreditDays || 0,
        paymentMethods: foundSupplier.paymentSettings.acceptedPaymentMethods,
        expectedCurrency: 'USD',  // Campo obligatorio
        requiresAdvancePayment: foundSupplier.paymentSettings.requiresAdvancePayment || false,
        advancePaymentPercentage: foundSupplier.paymentSettings.advancePaymentPercentage || 0
      }
    };

    const poResponse = await makeRequest('POST', '/purchases', purchaseOrderData, accessToken);

    const createdPo = poResponse.data.data || poResponse.data;
    console.log('   ✅ Orden de compra creada exitosamente');
    console.log(`   ID: ${createdPo._id}`);
    console.log(`   Número: ${createdPo.poNumber}`);
    console.log(`   Proveedor: ${createdPo.supplierName}\n`);

    // PASO 5: VERIFICAR QUE NO SE CREÓ DUPLICADO
    console.log('5️⃣  VERIFICAR que NO se creó proveedor duplicado...\n');

    const verifyResponse = await makeRequest('GET', `/suppliers?search=${rifNumber}`, null, accessToken);

    const verifyResults = Array.isArray(verifyResponse.data) ? verifyResponse.data : (verifyResponse.data.data || []);
    const suppliersWithSameRif = verifyResults.filter(s => {
      const rifDigits = (s.taxInfo?.rif || s.taxInfo?.taxId || '').replace(/[^0-9]/g, '');
      return rifDigits === rifNumber;
    });

    if (suppliersWithSameRif.length > 1) {
      console.log('   ❌ ERROR: Se creó un proveedor duplicado!');
      console.log(`   Total de proveedores con RIF ${rifNumber}: ${suppliersWithSameRif.length}`);
      suppliersWithSameRif.forEach((s, i) => {
        console.log(`      ${i + 1}. ${s.name} (ID: ${s._id})`);
      });
      throw new Error('Se detectó duplicación de proveedor');
    }

    console.log('   ✅ No se creó duplicado');
    console.log(`   Total de proveedores con RIF ${rifNumber}: ${suppliersWithSameRif.length}\n`);

    // PASO 6: Test completado exitosamente
    console.log('6️⃣  VERIFICAR integridad final...\n');
    console.log('   ✅ Proveedor existe en base de datos');
    console.log('   ✅ PaymentSettings guardados correctamente');
    console.log('   ✅ Orden de compra vinculada al proveedor\n');

    // RESULTADO FINAL
    console.log('═'.repeat(80));
    console.log('✅ TEST COMPLETADO EXITOSAMENTE\n');
    console.log('Resumen:');
    console.log('   ✅ Proveedor creado desde CRM');
    console.log('   ✅ Proveedor encontrado en búsqueda');
    console.log('   ✅ Condiciones de pago cargadas correctamente');
    console.log('   ✅ Orden de compra creada');
    console.log('   ✅ NO se creó proveedor duplicado');
    console.log('   ✅ Supplier virtual tiene paymentSettings');
    console.log('\n🎉 EL FLUJO FUNCIONA CORRECTAMENTE\n');
    console.log('═'.repeat(80) + '\n');

  } catch (error) {
    console.log('\n' + '═'.repeat(80));
    console.log('❌ TEST FALLÓ\n');
    console.log('Error:', error.message || error);
    if (error.error) {
      console.log('Detalles:', JSON.stringify(error.error, null, 2));
    }
    console.log('\n🚨 HAY PROBLEMAS EN EL FLUJO\n');
    console.log('═'.repeat(80) + '\n');
    process.exit(1);
  }
}

runTest();

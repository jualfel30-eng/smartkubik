/**
 * Verificar órdenes de compra en el tenant
 */

const mongoose = require('mongoose');
require('dotenv').config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://juanfelsantamaria:iCIQYNJRV8n78Vrm@cluster0.jwk24.mongodb.net/test?retryWrites=true&w=majority';
const TENANT_ID = '69b481c03d5ba33267c3ada0'; // Tiendas Broas - El Parral (broas.admon@gmail.com)

async function checkPurchaseOrders() {
  try {
    console.log('\n🔌 Conectando a MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Conectado exitosamente\n');

    const PurchaseOrder = mongoose.model('PurchaseOrder', new mongoose.Schema({}, { strict: false }), 'purchaseorders');

    // 1. Contar total de órdenes en la colección
    const totalOrders = await PurchaseOrder.countDocuments();
    console.log(`📊 Total de órdenes en la colección: ${totalOrders}\n`);

    // 2. Buscar órdenes del tenant específico
    const tenantOrders = await PurchaseOrder.find({ tenantId: TENANT_ID }).lean();
    console.log(`📦 Órdenes del tenant ${TENANT_ID}: ${tenantOrders.length}\n`);

    if (tenantOrders.length > 0) {
      console.log('📋 Detalles de las órdenes:\n');
      tenantOrders.forEach((po, idx) => {
        console.log(`${idx + 1}. Orden: ${po.poNumber || po._id}`);
        console.log(`   Proveedor: ${po.supplierName}`);
        console.log(`   Estado: ${po.status}`);
        console.log(`   Fecha: ${po.purchaseDate}`);
        console.log(`   Items: ${po.items?.length || 0}`);
        if (po.items && po.items.length > 0) {
          po.items.forEach((item, i) => {
            console.log(`      ${i + 1}. ${item.productName} (SKU: ${item.productSku})`);
            console.log(`         Cantidad: ${item.quantity}, Precio: $${item.costPrice || item.unitCost || 0}`);
          });
        }
        console.log('');
      });
    }

    // 3. Buscar órdenes sin tenantId
    const ordersWithoutTenant = await PurchaseOrder.find({
      $or: [
        { tenantId: { $exists: false } },
        { tenantId: null },
        { tenantId: '' }
      ]
    }).lean();

    console.log(`⚠️  Órdenes sin tenantId: ${ordersWithoutTenant.length}\n`);

    // 4. Listar todos los tenantIds únicos
    const allTenantIds = await PurchaseOrder.distinct('tenantId');
    console.log(`📊 TenantIds únicos en la colección: ${allTenantIds.length}`);
    if (allTenantIds.length > 0 && allTenantIds.length < 20) {
      console.log('   TenantIds:');
      allTenantIds.forEach(tid => {
        console.log(`   - ${tid}`);
      });
    }
    console.log('');

    // 5. Buscar órdenes donde el supplierName contenga alguno de los proveedores conocidos
    const knownSuppliers = [
      'Isola Foods',
      'Samuel Gonzalez',
      'Geomar Tarazona',
      'Frigorifico Mundial',
      'Avanzada Inversiones',
      'Coca Cola',
      'Eurofrutas'
    ];

    console.log('🔍 Buscando órdenes de proveedores conocidos...\n');
    for (const supplier of knownSuppliers) {
      const orders = await PurchaseOrder.find({
        supplierName: { $regex: supplier, $options: 'i' }
      }).lean();

      if (orders.length > 0) {
        console.log(`   ${supplier}: ${orders.length} órdenes`);
        orders.forEach(po => {
          console.log(`      - ${po.poNumber || po._id} (tenantId: ${po.tenantId}, estado: ${po.status})`);
        });
      }
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.connection.close();
    console.log('\n🔌 Conexión cerrada\n');
  }
}

checkPurchaseOrders();

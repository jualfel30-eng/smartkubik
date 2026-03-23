/**
 * Encontrar proveedores duplicados en Tiendas Broas
 * Criterios:
 * - Mismo nombre (ignorando mayúsculas/espacios)
 * - Mismo taxId (considerando diferentes formatos)
 * - Proveedores virtuales vs reales con mismo customerId
 */

const mongoose = require('mongoose');
require('dotenv').config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://juanfelsantamaria:iCIQYNJRV8n78Vrm@cluster0.jwk24.mongodb.net/test?retryWrites=true&w=majority';

async function findDuplicates() {
  try {
    console.log('\n🔌 Conectando a MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Conectado exitosamente\n');

    const Supplier = mongoose.model('Supplier', new mongoose.Schema({}, { strict: false }), 'suppliers');
    const Customer = mongoose.model('Customer', new mongoose.Schema({}, { strict: false }), 'customers');

    const tenantId = '69b187062339e815ceba7487'; // Tiendas Broas, C.A. (broas.admon@gmail.com)

    console.log('🔍 Buscando todos los proveedores de Tiendas Broas...\n');

    // Obtener todos los suppliers (virtuales)
    const suppliers = await Supplier.find({
      tenantId: String(tenantId)
    }).lean();

    // Obtener todos los customers tipo supplier
    const customers = await Customer.find({
      tenantId: new mongoose.Types.ObjectId(tenantId),
      customerType: 'supplier'
    }).lean();

    console.log(`📊 Total registros encontrados:`);
    console.log(`   - Suppliers (virtuales): ${suppliers.length}`);
    console.log(`   - Customers (tipo supplier): ${customers.length}`);
    console.log(`   - TOTAL: ${suppliers.length + customers.length}\n`);

    console.log('═'.repeat(80));
    console.log('ANÁLISIS DE DUPLICADOS\n');

    // Función para normalizar nombre
    const normalizeName = (name) => {
      if (!name) return '';
      return name.toLowerCase().trim().replace(/\s+/g, ' ');
    };

    // Función para normalizar taxId
    const normalizeTaxId = (taxId) => {
      if (!taxId) return '';
      return taxId.replace(/[^0-9]/g, '');
    };

    // 1. DUPLICADOS POR NOMBRE
    console.log('1️⃣  DUPLICADOS POR NOMBRE\n');

    const nameMap = new Map();
    const duplicatesByName = [];

    // Agregar suppliers
    suppliers.forEach(s => {
      const normalized = normalizeName(s.name);
      if (normalized) {
        if (!nameMap.has(normalized)) {
          nameMap.set(normalized, []);
        }
        nameMap.get(normalized).push({
          type: 'Supplier (virtual)',
          _id: s._id,
          name: s.name,
          supplierNumber: s.supplierNumber,
          taxId: s.taxInfo?.taxId || 'N/A',
          customerId: s.customerId || 'N/A',
          createdAt: s.createdAt
        });
      }
    });

    // Agregar customers
    customers.forEach(c => {
      const normalized = normalizeName(c.name || c.companyName);
      if (normalized) {
        if (!nameMap.has(normalized)) {
          nameMap.set(normalized, []);
        }
        nameMap.get(normalized).push({
          type: 'Customer (real)',
          _id: c._id,
          name: c.name || c.companyName,
          supplierNumber: c.supplierNumber || 'N/A',
          taxId: c.taxInfo?.taxId || 'N/A',
          customerId: c._id,
          createdAt: c.createdAt
        });
      }
    });

    // Identificar duplicados
    nameMap.forEach((items, normalizedName) => {
      if (items.length > 1) {
        duplicatesByName.push({
          normalizedName,
          count: items.length,
          items
        });
      }
    });

    if (duplicatesByName.length > 0) {
      duplicatesByName.sort((a, b) => b.count - a.count);

      duplicatesByName.forEach((dup, index) => {
        console.log(`\n   ${index + 1}. "${dup.items[0].name}" (${dup.count} registros):`);
        dup.items.forEach((item, i) => {
          console.log(`      ${i + 1}. [${item.type}]`);
          console.log(`         _id: ${item._id}`);
          console.log(`         Número: ${item.supplierNumber}`);
          console.log(`         RIF: ${item.taxId}`);
          console.log(`         Creado: ${item.createdAt ? new Date(item.createdAt).toLocaleString() : 'N/A'}`);
        });
      });
    } else {
      console.log('   ✅ No se encontraron duplicados por nombre');
    }

    // 2. DUPLICADOS POR TAXID
    console.log('\n\n2️⃣  DUPLICADOS POR RIF/TAXID\n');

    const taxIdMap = new Map();
    const duplicatesByTaxId = [];

    // Agregar suppliers
    suppliers.forEach(s => {
      const normalized = normalizeTaxId(s.taxInfo?.taxId);
      if (normalized) {
        if (!taxIdMap.has(normalized)) {
          taxIdMap.set(normalized, []);
        }
        taxIdMap.get(normalized).push({
          type: 'Supplier (virtual)',
          _id: s._id,
          name: s.name,
          supplierNumber: s.supplierNumber,
          taxId: s.taxInfo?.taxId || 'N/A',
          customerId: s.customerId || 'N/A',
          createdAt: s.createdAt
        });
      }
    });

    // Agregar customers
    customers.forEach(c => {
      const normalized = normalizeTaxId(c.taxInfo?.taxId);
      if (normalized) {
        if (!taxIdMap.has(normalized)) {
          taxIdMap.set(normalized, []);
        }
        taxIdMap.get(normalized).push({
          type: 'Customer (real)',
          _id: c._id,
          name: c.name || c.companyName,
          supplierNumber: c.supplierNumber || 'N/A',
          taxId: c.taxInfo?.taxId || 'N/A',
          customerId: c._id,
          createdAt: c.createdAt
        });
      }
    });

    // Identificar duplicados
    taxIdMap.forEach((items, normalizedTaxId) => {
      if (items.length > 1) {
        duplicatesByTaxId.push({
          normalizedTaxId,
          count: items.length,
          items
        });
      }
    });

    if (duplicatesByTaxId.length > 0) {
      duplicatesByTaxId.sort((a, b) => b.count - a.count);

      duplicatesByTaxId.forEach((dup, index) => {
        console.log(`\n   ${index + 1}. RIF: ${dup.normalizedTaxId} (${dup.count} registros):`);
        dup.items.forEach((item, i) => {
          console.log(`      ${i + 1}. [${item.type}]`);
          console.log(`         _id: ${item._id}`);
          console.log(`         Nombre: ${item.name}`);
          console.log(`         Número: ${item.supplierNumber}`);
          console.log(`         RIF original: ${item.taxId}`);
          console.log(`         Creado: ${item.createdAt ? new Date(item.createdAt).toLocaleString() : 'N/A'}`);
        });
      });
    } else {
      console.log('   ✅ No se encontraron duplicados por RIF');
    }

    // 3. PROVEEDORES VIRTUALES SIN CUSTOMER
    console.log('\n\n3️⃣  PROVEEDORES VIRTUALES HUÉRFANOS (sin customer vinculado)\n');

    const orphanedSuppliers = [];

    for (const supplier of suppliers) {
      if (supplier.customerId) {
        const customerExists = await Customer.findOne({
          _id: new mongoose.Types.ObjectId(supplier.customerId)
        });

        if (!customerExists) {
          orphanedSuppliers.push({
            _id: supplier._id,
            name: supplier.name,
            supplierNumber: supplier.supplierNumber,
            customerId: supplier.customerId,
            createdAt: supplier.createdAt
          });
        }
      }
    }

    if (orphanedSuppliers.length > 0) {
      orphanedSuppliers.forEach((s, i) => {
        console.log(`   ${i + 1}. ${s.name}`);
        console.log(`      _id: ${s._id}`);
        console.log(`      Número: ${s.supplierNumber}`);
        console.log(`      customerId (INEXISTENTE): ${s.customerId}`);
        console.log(`      Creado: ${s.createdAt ? new Date(s.createdAt).toLocaleString() : 'N/A'}\n`);
      });
    } else {
      console.log('   ✅ Todos los proveedores virtuales tienen customer vinculado');
    }

    // RESUMEN
    console.log('\n' + '═'.repeat(80));
    console.log('📋 RESUMEN DE DUPLICADOS\n');
    console.log(`   Total de proveedores duplicados por NOMBRE: ${duplicatesByName.reduce((sum, d) => sum + d.count, 0) - duplicatesByName.length}`);
    console.log(`   Total de proveedores duplicados por RIF: ${duplicatesByTaxId.reduce((sum, d) => sum + d.count, 0) - duplicatesByTaxId.length}`);
    console.log(`   Proveedores virtuales huérfanos: ${orphanedSuppliers.length}`);
    console.log('\n   💡 Los duplicados deben ser consolidados manualmente.\n');

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.connection.close();
    console.log('🔌 Conexión cerrada\n');
  }
}

findDuplicates();

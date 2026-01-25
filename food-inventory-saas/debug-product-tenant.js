require('dotenv').config();
const mongoose = require('mongoose');

const PRODUCT_ID = '696d4d3892f8ca63c6c77175';
const TENANT_ID = '6962b024c96f2d4a2370ebe4';

async function checkProduct() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Conectado a MongoDB');

        const Product = mongoose.connection.collection('products');
        const Inventory = mongoose.connection.collection('inventory');

        console.log(`🔎 Buscando producto: ${PRODUCT_ID}`);
        const product = await Product.findOne({ _id: new mongoose.Types.ObjectId(PRODUCT_ID) });

        if (!product) {
            console.error('❌ Producto NO encontrado en la base de datos (por ID).');
        } else {
            console.log('✅ Producto encontrado:');
            console.log('   Nombre:', product.name);
            console.log('   TenantID:', product.tenantId);
            console.log('   IsDeleted:', product.isDeleted);
            console.log('   Coincide Tenant?', product.tenantId.toString() === TENANT_ID);
        }

        // Check Inventory for this product
        const inventory = await Inventory.findOne({
            productId: new mongoose.Types.ObjectId(PRODUCT_ID),
            tenantId: new mongoose.Types.ObjectId(TENANT_ID)
        });

        if (inventory) {
            console.log('✅ Inventario encontrado para este producto y tenant.');
            console.log('   ID:', inventory._id);
            console.log('   Quantity:', inventory.quantity);
        } else {
            console.warn('⚠️ Inventario NO encontrado para este producto y tenant.');
            // Try searching without tenant
            const invAny = await Inventory.findOne({
                productId: new mongoose.Types.ObjectId(PRODUCT_ID)
            });
            if (invAny) {
                console.log('⚠️ Inventario encontrado pero con OTRO tenant:', invAny.tenantId);
            }
        }

    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        await mongoose.connection.close();
    }
}

checkProduct();

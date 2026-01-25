require('dotenv').config();
const mongoose = require('mongoose');

const PRODUCT_ID = '696d4d3892f8ca63c6c77175';
const TENANT_ID = '6962b024c96f2d4a2370ebe4';

async function checkQuery() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Conectado a MongoDB');

        const Product = mongoose.connection.collection('products');

        console.log('🧪 Probando query con $ne: true...');
        const query = {
            _id: new mongoose.Types.ObjectId(PRODUCT_ID),
            tenantId: new mongoose.Types.ObjectId(TENANT_ID),
            isDeleted: { $ne: true }
        };

        console.log('Query:', JSON.stringify(query));

        const product = await Product.findOne(query);

        if (product) {
            console.log('✅ Query EXITOSO. El documento match con la query.');
            console.log('   ID:', product._id);
        } else {
            console.error('❌ Query FALLÓ. No se encontró el documento.');

            // Debug without isDeleted
            const p2 = await Product.findOne({
                _id: new mongoose.Types.ObjectId(PRODUCT_ID),
                tenantId: new mongoose.Types.ObjectId(TENANT_ID)
            });
            console.log('   Sin filtro isDeleted:', !!p2);
            if (p2) console.log('   Valor isDeleted en doc:', p2.isDeleted);
        }

    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        await mongoose.connection.close();
    }
}

checkQuery();

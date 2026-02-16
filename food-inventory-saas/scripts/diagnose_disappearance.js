const mongoose = require('mongoose');
require('dotenv').config();

async function run() {
    try {
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/food-inventory');
        console.log('✅ Conectado a MongoDB\n');

        const db = mongoose.connection.db;

        const orders = db.collection('orders');
        const employeeProfiles = db.collection('employeeprofiles');
        const customers = db.collection('customers');
        const users = db.collection('users');

        console.log('=== DIAGNÓSTICO: ¿Por qué desaparecieron? ===\n');

        // Buscar órdenes con propinas del último mes
        const oneMonthAgo = new Date();
        oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);

        const tipsOrders = await orders.find({
            totalTipsAmount: { $gt: 0 },
            createdAt: { $gte: oneMonthAgo }
        }).toArray();

        console.log(`Total órdenes con propinas: ${tipsOrders.length}\n`);

        // Collect all unique employee IDs (simulando la lógica del backend)
        const allEmployeeIds = new Set();
        tipsOrders.forEach(order => {
            if (order.assignedWaiterId) {
                allEmployeeIds.add(order.assignedWaiterId.toString());
            }
        });

        console.log(`IDs únicos encontrados: ${allEmployeeIds.size}`);
        console.log('IDs:', Array.from(allEmployeeIds));

        console.log('\n--- PASO 1: Buscar en EmployeeProfiles ---');
        const idsArray = Array.from(allEmployeeIds);
        const profiles = await employeeProfiles.find({
            _id: { $in: idsArray.map(id => new mongoose.Types.ObjectId(id)) }
        }).toArray();

        console.log(`Encontrados ${profiles.length} perfiles de ${idsArray.length} IDs`);

        const profileMap = new Map();
        profiles.forEach(p => {
            profileMap.set(p._id.toString(), p.customerId.toString());
            console.log(`  ✅ ${p._id} -> customerId: ${p.customerId}`);
        });

        // IDs que NO son EmployeeProfiles
        const remainingIds = idsArray.filter(id => !profileMap.has(id));
        console.log(`\nIDs que NO son EmployeeProfiles: ${remainingIds.length}`);
        remainingIds.forEach(id => console.log(`  ❓ ${id}`));

        console.log('\n--- PASO 2: Buscar nombres en Customers ---');
        if (profiles.length > 0) {
            const customerIds = Array.from(profileMap.values());
            const customersData = await customers.find({
                _id: { $in: customerIds.map(id => new mongoose.Types.ObjectId(id)) }
            }).toArray();

            console.log(`Encontrados ${customersData.length} customers`);
            customersData.forEach(c => {
                console.log(`  ${c._id} -> ${c.name} ${c.lastName || ''}`);
            });
        }

        console.log('\n--- PASO 3: Buscar IDs restantes en Users ---');
        if (remainingIds.length > 0) {
            const usersData = await users.find({
                _id: { $in: remainingIds.map(id => new mongoose.Types.ObjectId(id)) }
            }).toArray();

            console.log(`Encontrados ${usersData.length} users de ${remainingIds.length} IDs restantes`);
            usersData.forEach(u => {
                console.log(`  ✅ ${u._id} -> ${u.firstName} ${u.lastName}`);
            });

            // IDs que no están ni en EmployeeProfiles ni en Users
            const notFoundIds = remainingIds.filter(id =>
                !usersData.find(u => u._id.toString() === id)
            );

            if (notFoundIds.length > 0) {
                console.log(`\n❌ IDs NO ENCONTRADOS en ninguna tabla: ${notFoundIds.length}`);
                notFoundIds.forEach(id => console.log(`  ${id}`));
            }
        }

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await mongoose.disconnect();
    }
}

run();

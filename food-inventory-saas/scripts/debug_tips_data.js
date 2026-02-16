const mongoose = require('mongoose');
require('dotenv').config();

async function run() {
    try {
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/food-inventory');
        console.log('✅ Conectado a MongoDB\n');

        const db = mongoose.connection.db;

        const orders = db.collection('orders');
        const customers = db.collection('customers');
        const users = db.collection('users');

        console.log('=== ANÁLISIS DE PROPINAS ===\n');

        // 1. Buscar órdenes con propinas del último mes
        const oneMonthAgo = new Date();
        oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);

        const tipsOrders = await orders.find({
            totalTipsAmount: { $gt: 0 },
            createdAt: { $gte: oneMonthAgo }
        }).sort({ createdAt: -1 }).limit(5).toArray();

        console.log(`Encontradas ${tipsOrders.length} órdenes con propinas\n`);

        for (const order of tipsOrders) {
            console.log(`\n📋 Orden: ${order.orderNumber}`);
            console.log(`   Total Propinas: $${order.totalTipsAmount}`);
            console.log(`   Fecha: ${order.createdAt}`);

            if (order.assignedWaiterId) {
                console.log(`   assignedWaiterId: ${order.assignedWaiterId}`);

                // Verificar si es un User
                const user = await users.findOne({ _id: order.assignedWaiterId });
                if (user) {
                    console.log(`   ✅ Es un User: ${user.firstName} ${user.lastName}`);
                } else {
                    // Verificar si es un Customer
                    const customer = await customers.findOne({ _id: order.assignedWaiterId });
                    if (customer) {
                        console.log(`   ✅ Es un Customer: ${customer.name}`);
                    } else {
                        console.log(`   ❌ No encontrado ni en Users ni en Customers`);
                    }
                }
            }

            if (order.tipsRecords && order.tipsRecords.length > 0) {
                console.log(`\n   📊 Desglose de propinas (${order.tipsRecords.length} registros):`);
                for (const tip of order.tipsRecords) {
                    console.log(`      - Monto: $${tip.amount}`);
                    console.log(`        Método: ${tip.method || 'N/A'}`);
                    console.log(`        employeeId: ${tip.employeeId || 'NULL'}`);
                    console.log(`        employeeName: ${tip.employeeName || 'NULL'}`);

                    if (tip.employeeId) {
                        // Verificar si es un User
                        const user = await users.findOne({ _id: tip.employeeId });
                        if (user) {
                            console.log(`        ✅ employeeId es User: ${user.firstName} ${user.lastName}`);
                        } else {
                            // Verificar si es un Customer
                            const customer = await customers.findOne({ _id: tip.employeeId });
                            if (customer) {
                                console.log(`        ✅ employeeId es Customer: ${customer.name}`);
                            } else {
                                console.log(`        ❌ employeeId no encontrado`);
                            }
                        }
                    }
                }
            } else {
                console.log(`   ⚠️  No hay tipsRecords`);
            }
        }

        console.log('\n\n=== RESUMEN ===');
        console.log('Si ves "employeeId es Customer", el problema está en que el backend');
        console.log('está buscando ese ID en la tabla de Users en lugar de Customers.');

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await mongoose.disconnect();
    }
}

run();

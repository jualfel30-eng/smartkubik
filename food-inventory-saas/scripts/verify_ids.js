const mongoose = require('mongoose');
require('dotenv').config();

async function run() {
    try {
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/food-inventory');
        console.log('✅ Conectado a MongoDB\n');

        const db = mongoose.connection.db;

        const employeeProfiles = db.collection('employeeprofiles');
        const customers = db.collection('customers');

        const mysteriousIds = [
            '69701c5846d783b217bde109',
            '69702d7ba9e5971067255a7c',
            '69701c5846d783b217bde10f'
        ];

        console.log('=== VERIFICANDO IDs MISTERIOSOS ===\n');

        for (const id of mysteriousIds) {
            console.log(`\n🔍 ID: ${id}`);

            const profile = await employeeProfiles.findOne({ _id: new mongoose.Types.ObjectId(id) });

            if (profile) {
                console.log(`   ✅ ES UN EMPLOYEE PROFILE`);
                console.log(`   customerId: ${profile.customerId}`);
                console.log(`   userId: ${profile.userId || 'NULL'}`);
                console.log(`   status: ${profile.status}`);

                if (profile.customerId) {
                    const customer = await customers.findOne({ _id: profile.customerId });
                    if (customer) {
                        console.log(`   👤 Nombre del empleado: ${customer.name}`);
                    }
                }
            } else {
                console.log(`   ❌ No es un EmployeeProfile`);
            }
        }

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await mongoose.disconnect();
    }
}

run();

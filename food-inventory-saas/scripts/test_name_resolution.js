const mongoose = require('mongoose');
require('dotenv').config();

async function run() {
    try {
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/food-inventory');
        console.log('✅ Conectado a MongoDB\n');

        const db = mongoose.connection.db;

        const employeeProfiles = db.collection('employeeprofiles');
        const customers = db.collection('customers');

        console.log('=== SIMULANDO LA LÓGICA DEL BACKEND ===\n');

        // IDs que están en las órdenes
        const testIds = [
            '69701c5846d783b217bde109', // Juan Lopez
            '69702d7ba9e5971067255a7c', // Pedro Perez
            '69701c5846d783b217bde10f'  // Carlos Rodriguez
        ];

        console.log('IDs a resolver:', testIds);
        console.log('\n--- PASO 1: Buscar en EmployeeProfiles ---');

        const profiles = await employeeProfiles.find({
            _id: { $in: testIds.map(id => new mongoose.Types.ObjectId(id)) }
        }).toArray();

        console.log(`Encontrados ${profiles.length} perfiles`);

        const profileMap = new Map();
        profiles.forEach(p => {
            profileMap.set(p._id.toString(), p.customerId.toString());
            console.log(`  ${p._id} -> customerId: ${p.customerId}`);
        });

        console.log('\n--- PASO 2: Buscar nombres en Customers ---');

        const customerIds = Array.from(profileMap.values());
        const customersData = await customers.find({
            _id: { $in: customerIds.map(id => new mongoose.Types.ObjectId(id)) }
        }).toArray();

        console.log(`Encontrados ${customersData.length} customers`);

        const employeeNames = new Map();
        customersData.forEach(c => {
            const fullName = `${c.name} ${c.lastName || ''}`.trim();
            // Find which profile ID maps to this customer
            for (const [profileId, custId] of profileMap.entries()) {
                if (custId === c._id.toString()) {
                    employeeNames.set(profileId, fullName);
                    console.log(`  ${profileId} -> ${fullName}`);
                }
            }
        });

        console.log('\n--- RESULTADO FINAL ---');
        testIds.forEach(id => {
            const name = employeeNames.get(id) || 'NO ENCONTRADO';
            console.log(`${id} -> ${name}`);
        });

        console.log('\n✅ Si ves los nombres correctos arriba, el fix funcionará!');

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await mongoose.disconnect();
    }
}

run();

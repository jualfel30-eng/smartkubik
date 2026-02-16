const mongoose = require('mongoose');
require('dotenv').config();

async function run() {
    try {
        // Conectar a MongoDB
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/food-inventory');
        console.log('✅ Conectado a MongoDB');

        const db = mongoose.connection.db;

        // Colecciones
        const employeeProfiles = db.collection('employeeprofiles');
        const users = db.collection('users');
        const customers = db.collection('customers');

        console.log('\n--- INICIANDO MIGRACIÓN: VINCULAR EMPLEADOS CON USUARIOS ---\n');

        // 1. Obtener todos los perfiles sin userId
        const profilesWithoutUserId = await employeeProfiles.find({
            $or: [
                { userId: { $exists: false } },
                { userId: null }
            ]
        }).toArray();

        console.log(`Encontrados ${profilesWithoutUserId.length} perfiles sin userId asignado\n`);

        let linked = 0;
        let notFound = 0;

        for (const profile of profilesWithoutUserId) {
            // 2. Obtener el customer asociado
            const customer = await customers.findOne({ _id: profile.customerId });

            if (!customer) {
                console.log(`  ⚠️  Perfil ${profile._id} no tiene customer asociado`);
                continue;
            }

            // 3. Buscar usuario por email
            const customerEmail = customer.email || customer.contacts?.find(c => c.type === 'email')?.value;

            if (!customerEmail) {
                console.log(`  ⚠️  ${customer.name}: No tiene email registrado`);
                notFound++;
                continue;
            }

            // 4. Buscar el usuario con ese email
            const user = await users.findOne({ email: customerEmail });

            if (!user) {
                console.log(`  ❌ ${customer.name} (${customerEmail}): No se encontró usuario con ese email`);
                notFound++;
                continue;
            }

            // 5. Actualizar el perfil con el userId
            await employeeProfiles.updateOne(
                { _id: profile._id },
                { $set: { userId: user._id } }
            );

            console.log(`  ✅ ${customer.name} vinculado con usuario ${user.firstName} ${user.lastName} (${user.email})`);
            linked++;
        }

        console.log('\n--- RESUMEN ---');
        console.log(`✅ Vinculados: ${linked}`);
        console.log(`❌ No encontrados: ${notFound}`);
        console.log(`📊 Total procesados: ${profilesWithoutUserId.length}`);

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await mongoose.disconnect();
        console.log('\n✅ Desconectado de MongoDB');
    }
}

run();

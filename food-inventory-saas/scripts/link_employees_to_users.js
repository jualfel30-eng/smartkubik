const { NestFactory } = require('@nestjs/core');
const { AppModule } = require('../dist/src/app.module');
const { getModelToken } = require('@nestjs/mongoose');

async function run() {
    const app = await NestFactory.createApplicationContext(AppModule);

    const employeeProfileModel = app.get(getModelToken('EmployeeProfile'));
    const userModel = app.get(getModelToken('User'));

    console.log('--- INICIANDO MIGRACIÓN: VINCULAR EMPLEADOS CON USUARIOS ---');

    // 1. Obtener todos los perfiles de empleado que NO tienen userId
    const profilesWithoutUserId = await employeeProfileModel
        .find({ userId: { $exists: false } })
        .populate('customerId')
        .lean();

    console.log(`Encontrados ${profilesWithoutUserId.length} perfiles sin userId asignado`);

    let linked = 0;
    let notFound = 0;

    for (const profile of profilesWithoutUserId) {
        const customer = profile.customerId;

        if (!customer) {
            console.log(`  ⚠️  Perfil ${profile._id} no tiene customer asociado`);
            continue;
        }

        // 2. Buscar usuario por email del customer
        const customerEmail = customer.email || customer.contacts?.find(c => c.type === 'email')?.value;

        if (!customerEmail) {
            console.log(`  ⚠️  ${customer.name}: No tiene email registrado`);
            notFound++;
            continue;
        }

        // 3. Buscar el usuario con ese email
        const user = await userModel.findOne({ email: customerEmail }).lean();

        if (!user) {
            console.log(`  ❌ ${customer.name} (${customerEmail}): No se encontró usuario con ese email`);
            notFound++;
            continue;
        }

        // 4. Actualizar el perfil con el userId
        await employeeProfileModel.updateOne(
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

    await app.close();
}

run().catch(err => {
    console.error(err);
    process.exit(1);
});

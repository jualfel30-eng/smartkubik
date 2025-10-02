import { connect, disconnect, model } from 'mongoose';
import { Tenant, TenantSchema } from '../src/schemas/tenant.schema';
import { User, UserSchema } from '../src/schemas/user.schema';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

async function fixUserTenant(userEmail: string, correctTenantCode: string) {
  if (!userEmail || !correctTenantCode) {
    console.error('❌ ERROR: Debe proporcionar email y nombre del tenant.');
    console.log('📖 Uso: npm run fix-user-tenant <email> <tenant_code>');
    process.exit(1);
  }

  const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/food-inventory-saas';
  
  try {
    await connect(MONGODB_URI);
    console.log('🔗 Conectando a la base de datos...');

    const TenantModel = model(Tenant.name, TenantSchema);
    const UserModel = model(User.name, UserSchema);

    // 1. Find the user
    console.log(`🔍 Buscando usuario: ${userEmail}`);
    const user = await UserModel.findOne({ email: userEmail });
    if (!user) {
      console.error(`❌ ERROR: No se encontró usuario con email ${userEmail}`);
      process.exit(1);
    }
    console.log(`👤 Usuario encontrado: ${user.firstName} ${user.lastName} (ID: ${user._id})`);
    console.log(`   - Tenant ID actual: ${user.tenantId}`);

    // 2. Find the correct tenant
    console.log(`🏢 Buscando tenant: ${correctTenantCode}`);
    const correctTenant = await TenantModel.findOne({ code: correctTenantCode });
    if (!correctTenant) {
      console.error(`❌ ERROR: No se encontró tenant con código ${correctTenantCode}`);
      process.exit(1);
    }
    const correctTenantId = correctTenant._id;
    console.log(`   - Tenant correcto encontrado: ${correctTenant.name} (ID: ${correctTenantId})`);

    // 3. Compare and update
    if (user.tenantId.toString() === correctTenantId.toString()) {
      console.log('\n✅ El usuario ya tiene el tenantId correcto. No se necesita ninguna acción.');
    } else {
      console.log('\n⚠️  El tenantId del usuario es incorrecto. Procediendo a corregir...');
      const oldTenantId = user.tenantId;
      user.tenantId = correctTenantId;
      await user.save();
      console.log('✅ Corrección completada!');
      console.log(`   - ID de tenant anterior: ${oldTenantId}`);
      console.log(`   - ID de tenant nuevo:   ${user.tenantId}`);
    }

  } catch (error) {
    console.error('\n💥 ERROR CRÍTICO durante la corrección:', error);
    process.exit(1);
  } finally {
    await disconnect();
    console.log('🔌 Desconectado de la base de datos.');
  }
}

const userEmailArg = process.argv[2];
const tenantCodeArg = process.argv[3];

fixUserTenant(userEmailArg, tenantCodeArg);

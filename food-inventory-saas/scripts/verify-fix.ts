
import { connect, disconnect, model } from 'mongoose';
import { Tenant, TenantSchema } from '../src/schemas/tenant.schema';

async function verifyTenantFix() {
  const MONGODB_URI = process.env.MONGODB_URI;
  if (!MONGODB_URI) {
    console.error('Missing MONGODB_URI env variable');
    process.exit(1);
  }

  const TENANT_ID_TO_VERIFY = '68d55e4b764d359fed186e47'; // Tiendas-Broas ID

  try {
    await connect(MONGODB_URI);
    console.log('[VERIFY] DB Connection successful.');

    const TenantModel = model(Tenant.name, TenantSchema);

    const tenant = await TenantModel.findById(TENANT_ID_TO_VERIFY);

    if (!tenant) {
      console.error(`[VERIFY] Tenant with ID ${TENANT_ID_TO_VERIFY} not found.`);
      return;
    }

    console.log('[VERIFY] Found tenant. Full document below:');
    console.log(JSON.stringify(tenant.toObject(), null, 2));

  } catch (error) {
    console.error('[VERIFY] An error occurred:', error);
  } finally {
    await disconnect();
    console.log('\n[VERIFY] Disconnected.');
  }
}

verifyTenantFix();


import { connect, disconnect, model } from 'mongoose';
import { Tenant, TenantSchema } from '../src/schemas/tenant.schema';

async function debugConnection() {
  const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/food-inventory-saas';
  console.log(`[DEBUG] Attempting to connect to: ${MONGODB_URI}`);

  try {
    await connect(MONGODB_URI);
    console.log('[DEBUG] Connection successful.');

    const TenantModel = model(Tenant.name, TenantSchema, 'tenants');
    console.log('[DEBUG] Looking for tenants in "tenants" collection...');

    const tenants = await TenantModel.find({});

    if (tenants.length > 0) {
      console.log(`[DEBUG] Success! Found ${tenants.length} tenant(s):`);
      tenants.forEach(t => {
        console.log(`  - Name: ${t.name}, ID: ${t._id}`);
      });
    } else {
      console.log('[DEBUG] The "tenants" collection appears to be empty.');
    }

  } catch (error) {
    console.error('[DEBUG] An error occurred:', error);
  } finally {
    await disconnect();
    console.log('[DEBUG] Disconnected.');
  }
}

debugConnection();

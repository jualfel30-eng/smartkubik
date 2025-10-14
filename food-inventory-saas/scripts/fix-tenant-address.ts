
import { connect, disconnect, model } from 'mongoose';
import { Tenant, TenantSchema } from '../src/schemas/tenant.schema';

const defaultAddress = {
  street: 'N/A',
  city: 'N/A',
  state: 'N/A',
  country: 'N/A',
};

async function fixTenantDocument() {
  const MONGODB_URI = process.env.MONGODB_URI;
  if (!MONGODB_URI) {
    console.error('Missing MONGODB_URI env variable');
    process.exit(1);
  }

  const TENANT_ID_TO_FIX = '68d55e4b764d359fed186e47'; // Tiendas-Broas ID

  try {
    await connect(MONGODB_URI);
    console.log('[FIX-V2] DB Connection successful.');

    const TenantModel = model(Tenant.name, TenantSchema);
    const tenant = await TenantModel.findById(TENANT_ID_TO_FIX);

    if (!tenant) {
      console.error(`[FIX-V2] Tenant with ID ${TENANT_ID_TO_FIX} not found.`);
      return;
    }

    console.log('[FIX-V2] Found tenant:', tenant.name);

    if (!tenant.contactInfo.address) {
      console.log('[FIX-V2] Missing contactInfo.address. Applying fix...');
      tenant.contactInfo.address = defaultAddress;
      tenant.markModified('contactInfo'); // Explicitly mark the nested object as modified
      await tenant.save();
      console.log('[FIX-V2] Tenant document updated successfully!');
    } else {
      console.log('[FIX-V2] Tenant document already has an address. No update needed.');
    }

  } catch (error) {
    console.error('[FIX-V2] An error occurred:', error);
  } finally {
    await disconnect();
    console.log('\n[FIX-V2] Disconnected.');
  }
}

fixTenantDocument();

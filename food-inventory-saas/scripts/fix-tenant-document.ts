
import { connect, disconnect, model } from 'mongoose';
import { Tenant, TenantSchema } from '../src/schemas/tenant.schema';

// Default empty structures to satisfy the schema
const defaultAddress = {
  street: 'N/A',
  city: 'N/A',
  state: 'N/A',
  country: 'N/A',
};

const defaultTaxInfo = {
  rif: 'J-00000000-0',
  businessName: 'N/A',
  isRetentionAgent: false,
  taxRegime: 'N/A',
};

const defaultSettings = {
  currency: { primary: 'USD', exchangeRateSource: 'manual', autoUpdateRate: false },
  taxes: { ivaRate: 0.16, igtfRate: 0.03, retentionRates: { iva: 0.75, islr: 0.02 } },
  inventory: { defaultWarehouse: 'principal', fefoEnabled: true, lotTrackingEnabled: true, expirationAlertDays: 30, lowStockAlertEnabled: true, autoReorderEnabled: false },
  orders: { reservationExpiryMinutes: 60, autoConfirmOrders: false, requirePaymentConfirmation: true, allowPartialPayments: true, defaultPaymentTerms: 0 },
  notifications: { email: true, whatsapp: false, sms: false, lowStockAlerts: true, expirationAlerts: true, orderAlerts: true },
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
    console.log('[FIX] DB Connection successful.');

    const TenantModel = model(Tenant.name, TenantSchema);

    const tenant = await TenantModel.findById(TENANT_ID_TO_FIX);

    if (!tenant) {
      console.error(`[FIX] Tenant with ID ${TENANT_ID_TO_FIX} not found.`);
      return;
    }

    console.log('[FIX] Found tenant:', tenant.name);

    let needsUpdate = false;

    if (!tenant.contactInfo.address) {
      console.log('[FIX] Missing contactInfo.address. Adding default.');
      tenant.contactInfo.address = defaultAddress;
      needsUpdate = true;
    }

    if (!tenant.taxInfo) {
      console.log('[FIX] Missing taxInfo. Adding default.');
      tenant.taxInfo = defaultTaxInfo as any; // Cast to any to assign to a non-existing property
      needsUpdate = true;
    }

    if (!tenant.settings) {
      console.log('[FIX] Missing settings. Adding default.');
      tenant.settings = defaultSettings as any; // Cast to any to assign to a non-existing property
      needsUpdate = true;
    }

    if (needsUpdate) {
      console.log('[FIX] Applying updates to the document...');
      await tenant.save();
      console.log('[FIX] Tenant document updated successfully!');
    } else {
      console.log('[FIX] Tenant document already seems to be valid. No update needed.');
    }

  } catch (error) {
    console.error('[FIX] An error occurred:', error);
  } finally {
    await disconnect();
    console.log('\n[FIX] Disconnected.');
  }
}

fixTenantDocument();

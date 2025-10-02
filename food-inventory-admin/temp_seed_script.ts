import { connect, disconnect, model } from 'mongoose';
import * as bcrypt from 'bcrypt';
import { Tenant, TenantSchema } from '../src/schemas/tenant.schema';
import { User, UserSchema } from '../src/schemas/user.schema';

async function seedDatabase() {
  const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/food-inventory-saas';
  await connect(MONGODB_URI);

  console.log('Seeding database...');

  // 1. Create Mongoose Models from Schemas
  const TenantModel = model(Tenant.name, TenantSchema);
  const UserModel = model(User.name, UserSchema);

  // 2. Use the Models to create documents
  // First, delete existing data to avoid duplicates on re-run
  await TenantModel.deleteMany({ code: 'EARLYADOPTER' });

  const tenant = await TenantModel.create({
    code: 'EARLYADOPTER',
    name: 'Early Adopter Inc.',
    businessType: 'retail',
    contactInfo: {
      email: 'contact@earlyadopter.com',
      phone: '+582125551234',
      address: {
        street: 'Av. Principal',
        city: 'Caracas',
        state: 'Distrito Capital',
        country: 'Venezuela',
      },
    },
    taxInfo: {
      rif: 'J-12345678-9',
      businessName: 'Early Adopter Inc. C.A.',
      isRetentionAgent: false,
    },
    settings: {
      currency: {
        primary: 'VES',
        secondary: 'USD',
        exchangeRateSource: 'manual',
        autoUpdateRate: false,
      },
      taxes: {
        ivaRate: 0.16,
        igtfRate: 0.03,
        retentionRates: { iva: 0.75, islr: 0.02 },
      },
      inventory: {
        defaultWarehouse: 'principal',
        fefoEnabled: true,
        lotTrackingEnabled: true,
        expirationAlertDays: 7,
        lowStockAlertEnabled: true,
        autoReorderEnabled: false,
      },
      orders: {
        reservationExpiryMinutes: 60,
        autoConfirmOrders: false,
        requirePaymentConfirmation: true,
        allowPartialPayments: true,
        defaultPaymentTerms: 0,
      },
      notifications: {
        email: true,
        whatsapp: false,
        sms: false,
        lowStockAlerts: true,
        expirationAlerts: true,
        orderAlerts: true,
      },
    },
    subscriptionPlan: 'premium',
    status: 'active',
    limits: {
      maxUsers: 10,
      maxProducts: 2000,
      maxOrders: 10000,
      maxStorage: 1024,
    },
    usage: {
      currentUsers: 1,
      currentProducts: 0,
      currentOrders: 0,
      currentStorage: 0,
    },
  });

  console.log(`Tenant created: ${tenant.name}`);

  // Delete existing admin user for this tenant to avoid duplicates
  await UserModel.deleteMany({ email: 'admin@earlyadopter.com', tenantId: tenant._id });

  // Crear usuario administrador
  const hashedPassword = await bcrypt.hash('Admin1234!', 12);
  const adminUser = await UserModel.create({
    email: 'admin@earlyadopter.com',
    password: hashedPassword,
    firstName: 'Admin',
    lastName: 'User',
    role: 'admin',
    isActive: true,
    isEmailVerified: true,
    tenantId: tenant._id,
  });

  console.log(`Admin user created: ${adminUser.email}`);

  await disconnect();
  console.log('Database seeded successfully!');
}

seedDatabase().catch(err => {
  console.error('Error seeding database:', err);
  process.exit(1);
});

import { connect, disconnect, model } from 'mongoose';
import * as bcrypt from 'bcrypt';
import { Tenant, TenantSchema } from '../src/schemas/tenant.schema';
import { User, UserSchema } from '../src/schemas/user.schema';
import { ChartOfAccounts, ChartOfAccountsSchema } from '../src/schemas/chart-of-accounts.schema';

async function seedDatabase() {
  const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/food-inventory-saas';
  await connect(MONGODB_URI);
  console.log(`Connected to database at ${MONGODB_URI}`);

  console.log('---!!! DROPPING DATABASE !!!---');
  await model('User', UserSchema).db.dropDatabase();
  console.log('--- Database dropped successfully ---');

  console.log('Seeding database...');

  // 1. Create Mongoose Models from Schemas
  const TenantModel = model(Tenant.name, TenantSchema);
  const UserModel = model(User.name, UserSchema);
  const ChartOfAccountsModel = model(ChartOfAccounts.name, ChartOfAccountsSchema);

  // 2. Use the Models to create documents
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

  // 3. Create Chart of Accounts for the Tenant
  console.log('Creating default chart of accounts...');
  const accountsToCreate = [
    { code: '1101', name: 'Efectivo y Equivalentes', type: 'Activo', isSystemAccount: true },
    { code: '1102', name: 'Cuentas por Cobrar', type: 'Activo', isSystemAccount: true },
    { code: '1103', name: 'Inventario', type: 'Activo', isSystemAccount: true },
    { code: '2101', name: 'Cuentas por Pagar', type: 'Pasivo', isSystemAccount: true },
    { code: '2102', name: 'Impuestos por Pagar', type: 'Pasivo', isSystemAccount: true },
    { code: '3101', name: 'Capital Social', type: 'Patrimonio', isSystemAccount: true },
    { code: '3102', name: 'Resultados Acumulados', type: 'Patrimonio', isSystemAccount: true },
    { code: '4101', name: 'Ingresos por Ventas', type: 'Ingreso', isSystemAccount: true },
    { code: '4102', name: 'Devoluciones en Ventas', type: 'Ingreso', isSystemAccount: true },
    { code: '5101', name: 'Costo de Mercancía Vendida', type: 'Gasto', isSystemAccount: true },
    { code: '5201', name: 'Gastos de Sueldos y Salarios', type: 'Gasto', isSystemAccount: false },
    { code: '5202', name: 'Gasto de Alquiler', type: 'Gasto', isSystemAccount: false },
    { code: '5203', name: 'Imprevistos', type: 'Gasto', isSystemAccount: false },
    { code: '5204', name: 'Inversión', type: 'Gasto', isSystemAccount: false },
  ];

  for (const acc of accountsToCreate) {
    await ChartOfAccountsModel.create({
      ...acc,
      tenantId: tenant._id,
      isEditable: !acc.isSystemAccount,
    });
  }
  console.log(`${accountsToCreate.length} accounts created successfully.`);

  // 4. Create Admin User
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
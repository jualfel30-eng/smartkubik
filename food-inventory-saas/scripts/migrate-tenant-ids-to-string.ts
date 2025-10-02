import { connect, disconnect, model, Types, Model } from 'mongoose';
import { Payable, PayableSchema } from '../src/schemas/payable.schema';
import { ChartOfAccounts, ChartOfAccountsSchema } from '../src/schemas/chart-of-accounts.schema';
import { JournalEntry, JournalEntrySchema } from '../src/schemas/journal-entry.schema';
import { Payment, PaymentSchema } from '../src/schemas/payment.schema';
import { Supplier, SupplierSchema } from '../src/schemas/supplier.schema';
import { Order, OrderSchema } from '../src/schemas/order.schema';

// Helper function to migrate a single collection
async function migrateCollection(model: Model<any>, name: string) {
  console.log(`--- Checking collection: ${name} ---`);
  
  // Find documents where tenantId is still an ObjectId (BSON type 7)
  const docsToMigrate = await model.find({ tenantId: { $type: 7 } }).exec();

  if (docsToMigrate.length === 0) {
    console.log(`No documents to migrate in ${name}.`);
    return;
  }

  console.log(`Found ${docsToMigrate.length} documents to migrate in ${name}.`);

  const bulkOps = docsToMigrate.map(doc => ({
    updateOne: {
      filter: { _id: doc._id },
      update: { $set: { tenantId: (doc.tenantId as Types.ObjectId).toString() } },
    },
  }));

  const result = await model.bulkWrite(bulkOps);
  console.log(`Successfully migrated ${result.modifiedCount} documents in ${name}.`);
}

async function migrateTenantIds() {
  const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/food-inventory-saas';
  await connect(MONGODB_URI);
  console.log(`Connected to database at ${MONGODB_URI}`);

  try {
    const PayableModel = model(Payable.name, PayableSchema);
    const ChartOfAccountsModel = model(ChartOfAccounts.name, ChartOfAccountsSchema);
    const JournalEntryModel = model(JournalEntry.name, JournalEntrySchema);
    const PaymentModel = model(Payment.name, PaymentSchema);
    const SupplierModel = model(Supplier.name, SupplierSchema);
    const OrderModel = model(Order.name, OrderSchema);

    await migrateCollection(PayableModel, 'payables');
    await migrateCollection(ChartOfAccountsModel, 'chartofaccounts');
    await migrateCollection(JournalEntryModel, 'journalentries');
    await migrateCollection(PaymentModel, 'payments');
    await migrateCollection(SupplierModel, 'suppliers');
    await migrateCollection(OrderModel, 'orders');

  } catch (error) {
    console.error('An error occurred during migration:', error);
  } finally {
    await disconnect();
    console.log('Disconnected from database.');
  }
}

migrateTenantIds().catch(err => {
  console.error('Error running migration script:', err);
  process.exit(1);
});

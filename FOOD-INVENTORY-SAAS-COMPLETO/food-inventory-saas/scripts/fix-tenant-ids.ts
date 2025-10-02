import { connect, disconnect, model, Types, Schema } from 'mongoose';
import { ChartOfAccountsSchema } from '../src/schemas/chart-of-accounts.schema';
import { JournalEntrySchema } from '../src/schemas/journal-entry.schema';

// Minimalistic schemas just for the migration
const ChartOfAccounts = model('ChartOfAccounts', ChartOfAccountsSchema);
const JournalEntry = model('JournalEntry', JournalEntrySchema);

async function migrateCollection(model: any, name: string) {
  console.log(`--- Starting migration for ${name} ---`);

  const docsToMigrate = await model.find({ tenantId: { $type: 'string' } }).exec();

  if (docsToMigrate.length === 0) {
    console.log(`No documents to migrate in ${name}.`);
    return;
  }

  console.log(`Found ${docsToMigrate.length} documents to migrate in ${name}.`);

  let successCount = 0;
  let errorCount = 0;

  for (const doc of docsToMigrate) {
    try {
      const oldId = doc.tenantId;
      if (typeof oldId !== 'string' || !Types.ObjectId.isValid(oldId)) {
          console.log(`  - Skipping doc ${doc._id}: tenantId "${oldId}" is not a valid ObjectId string.`);
          continue;
      }

      const newId = new Types.ObjectId(oldId);
      await model.updateOne({ _id: doc._id }, { $set: { tenantId: newId } });
      successCount++;
      console.log(`  - Updated doc ${doc._id}: tenantId '${oldId}' -> ${newId}`);
    } catch (e) {
      errorCount++;
      console.error(`  - Failed to update doc ${doc._id}:`, e);
    }
  }

  console.log(`--- Migration for ${name} complete. Success: ${successCount}, Errors: ${errorCount} ---`);
}

async function runMigration() {
  let connection;
  try {
    const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/food-inventory-saas';
    connection = await connect(MONGODB_URI);
    console.log(`Connected to database at ${MONGODB_URI}`);

    await migrateCollection(ChartOfAccounts, 'ChartOfAccounts');
    await migrateCollection(JournalEntry, 'JournalEntry');

    console.log('\nMigration finished successfully!');

  } catch (err) {
    console.error('\nAn error occurred during migration:', err);
    process.exit(1);
  } finally {
    if (connection) {
      await disconnect();
      console.log('Database connection closed.');
    }
  }
}

runMigration();

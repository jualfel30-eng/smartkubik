/**
 * Migration Script: Add Commission System Accounts to Existing Tenants
 *
 * Este script agrega las cuentas contables del sistema de comisiones
 * a todos los tenants existentes.
 *
 * Cuentas que se crean:
 * - 2107: Comisiones por Pagar (Pasivo)
 * - 2108: Bonos por Pagar (Pasivo)
 * - 2109: Propinas por Pagar (Pasivo)
 * - 5301: Gasto de Comisiones sobre Ventas (Gasto)
 * - 5302: Gasto de Bonos por Metas (Gasto)
 *
 * Uso:
 *   npx ts-node scripts/migrate-commission-accounts.ts
 *
 * Variables de entorno requeridas:
 *   MONGODB_URI - URI de conexión a MongoDB
 */

import { MongoClient, Db, ObjectId } from "mongodb";
import * as dotenv from "dotenv";

dotenv.config();

interface SystemAccountBlueprint {
  code: string;
  name: string;
  type: string;
  isSystemAccount: boolean;
  metadata?: Record<string, any>;
}

const COMMISSION_SYSTEM_ACCOUNTS: SystemAccountBlueprint[] = [
  {
    code: "2107",
    name: "Comisiones por Pagar",
    type: "Pasivo",
    isSystemAccount: true,
    metadata: {
      commissionCategory: "commission_payable",
      description: "Comisiones devengadas pendientes de pago a vendedores",
    },
  },
  {
    code: "2108",
    name: "Bonos por Pagar",
    type: "Pasivo",
    isSystemAccount: true,
    metadata: {
      commissionCategory: "bonus_payable",
      description: "Bonos por metas alcanzadas pendientes de pago",
    },
  },
  {
    code: "2109",
    name: "Propinas por Pagar",
    type: "Pasivo",
    isSystemAccount: true,
    metadata: {
      commissionCategory: "tips_payable",
      description: "Propinas recaudadas pendientes de distribuir a empleados",
    },
  },
  {
    code: "5301",
    name: "Gasto de Comisiones sobre Ventas",
    type: "Gasto",
    isSystemAccount: false,
    metadata: {
      commissionCategory: "commission_expense",
      description: "Comisiones pagadas a vendedores por ventas realizadas",
      affectsProfit: true,
    },
  },
  {
    code: "5302",
    name: "Gasto de Bonos por Metas",
    type: "Gasto",
    isSystemAccount: false,
    metadata: {
      commissionCategory: "bonus_expense",
      description: "Bonos pagados por cumplimiento de metas de ventas",
      affectsProfit: true,
    },
  },
];

async function migrateCommissionAccounts(): Promise<void> {
  const mongoUri = process.env.MONGODB_URI;

  if (!mongoUri) {
    console.error("Error: MONGODB_URI environment variable is not set");
    process.exit(1);
  }

  console.log("=".repeat(60));
  console.log("MIGRATION: Commission System Accounts");
  console.log("=".repeat(60));

  const client = new MongoClient(mongoUri);

  try {
    await client.connect();
    console.log("Connected to MongoDB");

    const db: Db = client.db();
    const tenantsCollection = db.collection("tenants");
    const chartOfAccountsCollection = db.collection("chartofaccounts");

    // Obtener todos los tenants
    const tenants = await tenantsCollection.find({}).toArray();
    console.log(`Found ${tenants.length} tenants to process`);
    console.log("-".repeat(60));

    let totalCreated = 0;
    let totalSkipped = 0;
    let totalErrors = 0;

    for (const tenant of tenants) {
      const tenantId = tenant._id.toString();
      const tenantName = tenant.code || tenant.name || tenantId;
      let created = 0;
      let skipped = 0;

      console.log(`\nProcessing tenant: ${tenantName}`);

      for (const blueprint of COMMISSION_SYSTEM_ACCOUNTS) {
        try {
          // Verificar si la cuenta ya existe
          const existing = await chartOfAccountsCollection.findOne({
            tenantId,
            code: blueprint.code,
          });

          if (existing) {
            console.log(`  [SKIP] ${blueprint.code} - ${blueprint.name} (already exists)`);
            skipped++;
            continue;
          }

          // Crear la cuenta
          await chartOfAccountsCollection.insertOne({
            ...blueprint,
            tenantId,
            isEditable: !blueprint.isSystemAccount,
            createdAt: new Date(),
            updatedAt: new Date(),
          });

          console.log(`  [CREATE] ${blueprint.code} - ${blueprint.name}`);
          created++;
        } catch (error) {
          console.error(`  [ERROR] ${blueprint.code}: ${error.message}`);
          totalErrors++;
        }
      }

      totalCreated += created;
      totalSkipped += skipped;

      console.log(`  Summary: ${created} created, ${skipped} skipped`);
    }

    console.log("\n" + "=".repeat(60));
    console.log("MIGRATION COMPLETE");
    console.log("=".repeat(60));
    console.log(`Total accounts created: ${totalCreated}`);
    console.log(`Total accounts skipped: ${totalSkipped}`);
    console.log(`Total errors: ${totalErrors}`);
    console.log("=".repeat(60));
  } catch (error) {
    console.error("Migration failed:", error);
    process.exit(1);
  } finally {
    await client.close();
    console.log("\nDisconnected from MongoDB");
  }
}

// Ejecutar migración
migrateCommissionAccounts()
  .then(() => {
    console.log("\nMigration script finished successfully");
    process.exit(0);
  })
  .catch((error) => {
    console.error("\nMigration script failed:", error);
    process.exit(1);
  });

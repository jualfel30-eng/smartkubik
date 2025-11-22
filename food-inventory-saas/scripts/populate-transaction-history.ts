import { NestFactory } from "@nestjs/core";
import { AppModule } from "../src/app.module";
import { PopulateTransactionHistoryMigration } from "../src/database/migrations/populate-transaction-history.migration";

async function bootstrap() {
  console.log("🚀 Starting Transaction History Population Script...");

  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ["log", "error", "warn"],
  });

  try {
    const migration = app.get(PopulateTransactionHistoryMigration);
    await migration.run();
    console.log("✅ Migration completed successfully!");
  } catch (error) {
    console.error("❌ Migration failed:", error.message);
    console.error(error.stack);
  } finally {
    await app.close();
  }
}

bootstrap();

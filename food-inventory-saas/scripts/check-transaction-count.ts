import { NestFactory } from "@nestjs/core";
import { AppModule } from "../src/app.module";
import { InjectConnection } from "@nestjs/mongoose";
import { Connection } from "mongoose";

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ["error"],
  });

  try {
    const connection = app.get(Connection);
    const db = connection.db;

    // Count customer transactions
    const customerTransactions = db.collection(
      "customertransactionhistories",
    );
    const count = await customerTransactions.countDocuments();

    console.log("\n📊 Transaction History Statistics:");
    console.log(`✅ Total customer transactions created: ${count}`);

    // Get sample transaction
    const sample = await customerTransactions.findOne();
    if (sample) {
      console.log("\n📝 Sample transaction:");
      console.log(`  Order: ${sample.orderNumber}`);
      console.log(`  Date: ${sample.orderDate}`);
      console.log(`  Amount: $${sample.totalAmount}`);
      console.log(`  Items: ${sample.items?.length || 0} products`);
    }

    console.log("\n✅ Migration verification completed!\n");
  } catch (error) {
    console.error("❌ Error:", error.message);
  } finally {
    await app.close();
  }
}

bootstrap();

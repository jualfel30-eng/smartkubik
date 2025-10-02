import { connect, disconnect, model } from 'mongoose';
import { Product, ProductSchema } from '../src/schemas/product.schema';

async function migrateProducts() {
  const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/food-inventory-saas';
  await connect(MONGODB_URI);
  console.log(`Connected to database at ${MONGODB_URI}`);

  const ProductModel = model(Product.name, ProductSchema);

  console.log('Starting product migration for weight selling...');

  const result = await ProductModel.updateMany(
    {
      $or: [
        { isSoldByWeight: { $exists: false } },
        { unitOfMeasure: { $exists: false } },
      ],
    },
    {
      $set: {
        isSoldByWeight: false,
        unitOfMeasure: 'unidad',
      },
    }
  );

  console.log(`Migration completed. Matched: ${result.matchedCount}, Modified: ${result.modifiedCount}`);

  await disconnect();
  console.log('Disconnected from database.');
}

migrateProducts().catch(err => {
  console.error('Error migrating products:', err);
  process.exit(1);
});

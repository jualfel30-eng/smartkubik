
import { connect, model, Schema, Types } from 'mongoose';

// Minimal Schema definitions
const ProductSchema = new Schema({
    name: String,
    sku: String,
    tenantId: Schema.Types.ObjectId
}, { strict: false });

const BillOfMaterialsSchema = new Schema({
    productId: Schema.Types.ObjectId,
    components: [{
        componentProductId: { type: Schema.Types.ObjectId, ref: 'Product' },
        quantity: Number
    }],
    tenantId: Schema.Types.ObjectId
}, { strict: false });

async function run() {
    const uri = "mongodb+srv://doadmin:s38127L9Pj05q4Om@db-mongodb-nyc3-38827-0c20165c.mongo.ondigitalocean.com/admin?tls=true&authSource=admin";

    try {
        console.log("Connecting to MongoDB...");
        const conn = await connect(uri);
        console.log("Connected.");

        const ProductModel = model('Product', ProductSchema);
        const BOMModel = model('BillOfMaterials', BillOfMaterialsSchema, 'bill_of_materials'); // Explicit collection name

        // 1. Search for Hamburguesa
        console.log("Searching for 'Hamburguesa'...");
        const products = await ProductModel.find({ name: { $regex: 'Hamburguesa', $options: 'i' } }).limit(1);

        if (products.length === 0) {
            console.log("❌ No hamburger found.");
            return;
        }

        const product = products[0];
        console.log(`Checking Product: ${product.name} (${product._id})`);

        // 2. Find BOM
        const bom = await BOMModel.findOne({ productId: product._id });

        if (!bom) {
            console.log("❌ No BOM found.");
            return;
        }

        console.log(`✅ BOM Found (${bom._id}). Components: ${bom.components.length}`);

        // 3. Verify Components
        for (const comp of bom.components) {
            const ingredientId = comp.componentProductId;
            console.log(`   Checking Ingredient ID: ${ingredientId}`);

            const ingredient = await ProductModel.findById(ingredientId);
            if (ingredient) {
                console.log(`   ✅ Found: ${ingredient.name} (${ingredient.sku})`);
            } else {
                console.log(`   ❌ NOT FOUND! ID ${ingredientId} does not exist in products collection.`);
            }
        }

    } catch (error) {
        console.error("Error:", error);
    } finally {
        console.log("Done.");
        process.exit(0);
    }
}

run();

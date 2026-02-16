
import { connect, model } from 'mongoose';
import { OrderSchema } from '../schemas/order.schema';
import * as dotenv from 'dotenv';

dotenv.config();

const MONGO_URI = process.env.MONGODB_URI || 'mongodb+srv://kubik:Chipi.24@cluster0.mbtyprl.mongodb.net/test?retryWrites=true&w=majority&appName=Cluster0';

async function debugOrders() {
    try {
        await connect(MONGO_URI);
        console.log('Connected to MongoDB');

        const OrderModel = model('Order', OrderSchema);

        // Find orders that are likely to be in the driver portal (packed or in_transit)
        const orders = await OrderModel.find({
            fulfillmentStatus: { $in: ['packed', 'in_transit', 'delivered'] }
        }).sort({ updatedAt: -1 }).limit(10);

        console.log(`Found ${orders.length} recent orders.`);

        for (const order of orders) {
            console.log('---------------------------------------------------');
            console.log(`Order: ${order.orderNumber} | Status: ${order.fulfillmentStatus}`);
            console.log('Shipping Data:', JSON.stringify(order.shipping, null, 2));

            if (order.shipping && order.shipping.address) {
                console.log('Has Address:', true);
                console.log('Coordinates:', order.shipping.address.coordinates);
            } else {
                console.log('Has Address: FALSE');
            }
        }

    } catch (error) {
        console.error('Error:', error);
    } finally {
        process.exit(0);
    }
}

debugOrders();

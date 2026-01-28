
import mongoose from 'mongoose';

const MONGODB_URI = 'mongodb+srv://kubik:Chipi.24@cluster0.mbtyprl.mongodb.net/test?retryWrites=true&w=majority&appName=Cluster0';

async function verifyOrderState() {
    try {
        console.log('Connecting to MongoDB...');
        await mongoose.connect(MONGODB_URI);
        console.log('Connected!');

        const collection = mongoose.connection.collection('orders');
        const orderId = new mongoose.Types.ObjectId('69792a9caf2c583979fedc28');

        const order = await collection.findOne({ _id: orderId });

        if (order) {
            console.log('Order Found:');
            console.log(`- ID: ${order._id}`);
            console.log(`- FulfillmentStatus: '${order.fulfillmentStatus}'`);
            console.log(`- DeliveryDriver: ${order.deliveryDriver}`);
            console.log(`- TenantId: '${order.tenantId}'`);
            console.log(`- Status (legacy): '${order.status}'`);
        } else {
            console.log('Order NOT found!');
        }

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await mongoose.disconnect();
    }
}

verifyOrderState();


import mongoose from 'mongoose';

const MONGODB_URI = 'mongodb+srv://kubik:Chipi.24@cluster0.mbtyprl.mongodb.net/test?retryWrites=true&w=majority&appName=Cluster0';

async function debugPool() {
    try {
        console.log('Connecting to MongoDB...');
        await mongoose.connect(MONGODB_URI);
        console.log('Connected!');

        const collection = mongoose.connection.collection('orders');

        const allOrders = await collection.countDocuments({});
        console.log(`Total Orders: ${allOrders}`);

        const packedOrders = await collection.countDocuments({ status: 'packed' });
        console.log(`Packed Orders: ${packedOrders}`);

        const fulfillmentTypes = await collection.distinct('fulfillmentType', {});
        console.log('Available Fulfillment Types:', fulfillmentTypes);

        const deliveryCandidates = await collection.find({
            status: 'packed',
            fulfillmentType: { $in: ['delivery', 'delivery_local', 'delivery_national'] }
        }).toArray();

        console.log(`Packed & Delivery Type Orders: ${deliveryCandidates.length}`);

        if (deliveryCandidates.length > 0) {
            console.log('Sample Candidate:', JSON.stringify(deliveryCandidates[0], null, 2));
        }

        const unassigned = await collection.countDocuments({
            status: 'packed',
            fulfillmentType: { $in: ['delivery', 'delivery_local', 'delivery_national'] },
            deliveryDriver: null
        });
        console.log(`Unassigned Candidates (deliveryDriver: null): ${unassigned}`);

        const unassignedExists = await collection.countDocuments({
            status: 'packed',
            fulfillmentType: { $in: ['delivery', 'delivery_local', 'delivery_national'] },
            deliveryDriver: { $exists: false }
        });
        console.log(`Unassigned Candidates (deliveryDriver does not exist): ${unassignedExists}`);

        const finalQuery = await collection.countDocuments({
            status: 'packed',
            fulfillmentType: { $in: ['delivery', 'delivery_local', 'delivery_national'] },
            $or: [
                { deliveryDriver: null },
                { deliveryDriver: { $exists: false } }
            ]
        });
        console.log(`Final Query Match Count (with $or null/exists): ${finalQuery}`);


    } catch (error) {
        console.error('Error:', error);
    } finally {
        await mongoose.disconnect();
    }
}

debugPool();

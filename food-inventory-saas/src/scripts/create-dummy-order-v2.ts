
import mongoose from 'mongoose';

const MONGODB_URI = 'mongodb+srv://kubik:Chipi.24@cluster0.mbtyprl.mongodb.net/test?retryWrites=true&w=majority&appName=Cluster0';

async function createDummyOrderV2() {
    try {
        console.log('Connecting to MongoDB...');
        await mongoose.connect(MONGODB_URI);
        console.log('Connected!');

        const collection = mongoose.connection.collection('orders');

        const dummyOrder = {
            orderNumber: `TEST-DRIVER-${Date.now()}`,
            // Status fields
            status: 'pending', // Main status
            fulfillmentStatus: 'packed', // The one DriversService checks
            fulfillmentType: 'delivery',

            // Tenant
            tenantId: '68d371dffdb57e5c800f2fcd', // ID from logs

            deliveryDriver: null,

            // Required/Standard fields
            totalAmount: 500,
            customerName: 'Test Driver User (V2)',
            customerId: new mongoose.Types.ObjectId(), // Dummy ID
            createdBy: new mongoose.Types.ObjectId(), // Dummy ID
            items: [
                { name: 'Test Burger', quantity: 2, price: 250 }
            ],
            shipping: {
                address: {
                    street: 'Av. Test 123',
                    city: 'Mexico City',
                    zipCode: '12345'
                },
                method: 'delivery'
            },
            createdAt: new Date(),
            updatedAt: new Date(),

            // Required by schema
            ivaAmount: 0,
            igtfAmount: 0,
            finalPrice: 500,
            channel: 'manual',
            type: 'retail',
            source: 'manual'
        };

        const result = await collection.insertOne(dummyOrder);
        console.log(`Created dummy order V2 with ID: ${result.insertedId}`);
        console.log(`TenantID: ${dummyOrder.tenantId}`);
        console.log(`FulfillmentStatus: ${dummyOrder.fulfillmentStatus}`);

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await mongoose.disconnect();
    }
}

createDummyOrderV2();

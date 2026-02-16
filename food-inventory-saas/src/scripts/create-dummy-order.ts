
import mongoose from 'mongoose';

const MONGODB_URI = 'mongodb+srv://kubik:Chipi.24@cluster0.mbtyprl.mongodb.net/test?retryWrites=true&w=majority&appName=Cluster0';

async function createDummyOrder() {
    try {
        console.log('Connecting to MongoDB...');
        await mongoose.connect(MONGODB_URI);
        console.log('Connected!');

        const collection = mongoose.connection.collection('orders');

        const dummyOrder = {
            orderNumber: `TEST-DRIVER-${Date.now()}`,
            status: 'packed',
            fulfillmentType: 'delivery',
            deliveryDriver: null,
            totalAmount: 500,
            customerName: 'Test Driver User',
            items: [
                { name: 'Test Burger', quantity: 2, price: 250 }
            ],
            shipping: {
                address: {
                    street: 'Av. Test 123',
                    city: 'Mexico City',
                    zipCode: '12345'
                }
            },
            createdAt: new Date(),
            updatedAt: new Date()
        };

        const result = await collection.insertOne(dummyOrder);
        console.log(`Created dummy order with ID: ${result.insertedId}`);

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await mongoose.disconnect();
    }
}

createDummyOrder();

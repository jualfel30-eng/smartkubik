const mongoose = require('mongoose');

async function testTransaction() {
    await mongoose.connect('mongodb+srv://kubik:Chipi.24@cluster0.mbtyprl.mongodb.net/test?retryWrites=true&w=majority&appName=Cluster0');
    const Schema = new mongoose.Schema({ name: { type: String, unique: true } });
    const TestModel = mongoose.model('TestDuplicate', Schema);

    await TestModel.deleteMany({});
    await TestModel.create({ name: 'A' });

    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        // 1. Try to insert duplicate key "A"
        try {
            const doc = new TestModel({ name: 'A' });
            await doc.save({ session });
        } catch (e) {
            console.log('Caught inner error:', e.message);
            // Swallow the error
        }

        // 2. Try to do another operation on the same session
        const doc2 = new TestModel({ name: 'B' });
        await doc2.save({ session }); // This should throw "Transaction ... has been aborted"

        await session.commitTransaction();
        console.log('Success');
    } catch (err) {
        console.log('Outer catch:', err.message);
    } finally {
        session.endSession();
        await mongoose.disconnect();
    }
}

testTransaction().catch(console.error);

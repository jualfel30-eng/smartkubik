require('dotenv').config();
const mongoose = require('mongoose');

async function checkLastMessage() {
    const uri = process.env.DATABASE_URI || process.env.MONGODB_URI;
    if (!uri) {
        console.error('No MONGODB_URI found in .env');
        return;
    }

    try {
        console.log('Connecting to MongoDB...');
        await mongoose.connect(uri);
        console.log('Connected.');

        // Define minimal schema just to find
        const messageSchema = new mongoose.Schema({
            sender: String,
            content: String,
            metadata: Object,
            createdAt: Date
        }, { collection: 'messages', strict: false });

        const Message = mongoose.model('Message', messageSchema);

        const count = await Message.countDocuments({ sender: 'assistant' });
        console.log(`Total Assistant messages: ${count}`);

        if (count === 0) {
            console.log("No assistant messages found.");
            return;
        }

        const lastMsg = await Message.findOne({ sender: 'assistant' })
            .sort({ createdAt: -1 })
            .lean();

        console.log('--- LAST ASSISTANT MESSAGE ---');
        console.log(JSON.stringify(lastMsg, null, 2));

        if (lastMsg.metadata && lastMsg.metadata.action === 'order_created') {
            console.log('✅ Metadata found!');
        } else {
            console.log('❌ Metadata MISSING or Incorrect.');
        }

    } catch (err) {
        console.error(err);
    } finally {
        await mongoose.disconnect();
    }
}

checkLastMessage();

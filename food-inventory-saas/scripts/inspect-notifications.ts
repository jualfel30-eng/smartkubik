import { MongoClient } from 'mongodb';

/**
 * Script to inspect ALL notifications regardless of category
 */

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/food-inventory-saas';

async function inspectAllNotifications() {
    const client = new MongoClient(MONGODB_URI);

    try {
        await client.connect();
        console.log('✅ Connected to MongoDB');

        const db = client.db();
        const notificationsCollection = db.collection('notifications');

        // Get total count
        const totalCount = await notificationsCollection.countDocuments({});
        console.log(`\n📊 Total notifications in database: ${totalCount}\n`);

        // Get all notifications (limit to 20 most recent)
        const allNotifications = await notificationsCollection.find({})
            .sort({ createdAt: -1 })
            .limit(20)
            .toArray();

        console.log(`📋 Last ${allNotifications.length} notifications:\n`);

        allNotifications.forEach((notif, index) => {
            console.log(`${index + 1}. ID: ${notif._id}`);
            console.log(`   Category: ${notif.category}`);
            console.log(`   Type: ${notif.type}`);
            console.log(`   Title: ${notif.title}`);
            console.log(`   NavigateTo: ${notif.navigateTo || 'N/A'}`);
            console.log(`   EntityId: ${notif.entityId || 'N/A'}`);
            console.log(`   Created: ${notif.createdAt}`);
            console.log(`   IsDeleted: ${notif.isDeleted || false}`);
            console.log('');
        });

        // Count by category
        const categories = await notificationsCollection.aggregate([
            { $group: { _id: '$category', count: { $sum: 1 } } },
            { $sort: { count: -1 } }
        ]).toArray();

        console.log('📊 Notifications by category:');
        categories.forEach(cat => {
            console.log(`   ${cat._id}: ${cat.count}`);
        });

    } catch (error) {
        console.error('❌ Inspection failed:', error);
        throw error;
    } finally {
        await client.close();
        console.log('\n🔌 Disconnected from MongoDB');
    }
}

inspectAllNotifications()
    .then(() => {
        console.log('✅ Inspection completed');
        process.exit(0);
    })
    .catch((error) => {
        console.error('❌ Inspection failed:', error);
        process.exit(1);
    });

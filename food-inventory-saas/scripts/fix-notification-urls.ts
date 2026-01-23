import { MongoClient } from 'mongodb';

/**
 * Migration script to fix notification URLs for order-related notifications
 * 
 * This script updates all existing notifications that have navigateTo URLs
 * in the format `/orders/${orderId}` to the new format `/orders/history?orderId=${orderId}`
 */

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/food-inventory-saas';

async function migrateNotificationUrls() {
    const client = new MongoClient(MONGODB_URI);

    try {
        await client.connect();
        console.log('✅ Connected to MongoDB');

        const db = client.db();
        const notificationsCollection = db.collection('notifications');

        // Find all notifications with old URL format
        const oldUrlPattern = /^\/orders\/[a-f0-9]{24}$/;

        const notificationsToUpdate = await notificationsCollection.find({
            navigateTo: { $regex: oldUrlPattern },
            category: 'sales',
        }).toArray();

        console.log(`📊 Found ${notificationsToUpdate.length} notifications to update`);

        if (notificationsToUpdate.length === 0) {
            console.log('✅ No notifications need updating');
            return;
        }

        let updatedCount = 0;
        let errorCount = 0;

        for (const notification of notificationsToUpdate) {
            try {
                // Extract orderId from the old URL
                const orderId = notification.navigateTo.replace('/orders/', '');
                const newUrl = `/orders/history?orderId=${orderId}`;

                await notificationsCollection.updateOne(
                    { _id: notification._id },
                    { $set: { navigateTo: newUrl } }
                );

                updatedCount++;
                console.log(`✅ Updated notification ${notification._id}: ${notification.navigateTo} → ${newUrl}`);
            } catch (error) {
                errorCount++;
                console.error(`❌ Error updating notification ${notification._id}:`, error.message);
            }
        }

        console.log('\n📊 Migration Summary:');
        console.log(`   Total found: ${notificationsToUpdate.length}`);
        console.log(`   ✅ Updated: ${updatedCount}`);
        console.log(`   ❌ Errors: ${errorCount}`);

    } catch (error) {
        console.error('❌ Migration failed:', error);
        throw error;
    } finally {
        await client.close();
        console.log('🔌 Disconnected from MongoDB');
    }
}

// Run the migration
migrateNotificationUrls()
    .then(() => {
        console.log('✅ Migration completed successfully');
        process.exit(0);
    })
    .catch((error) => {
        console.error('❌ Migration failed:', error);
        process.exit(1);
    });

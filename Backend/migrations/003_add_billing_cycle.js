/**
 * Migration: Add Billing Cycle Field
 * 
 * Adds missing billingCycle field to user subscriptions
 * Default value: 'Monthly'
 * 
 * Run: node migrations/003_add_billing_cycle.js
 */

const mongoose = require('mongoose');
require('dotenv').config();

async function addBillingCycle() {
    try {
        // Connect to MongoDB
        const mongoUri = process.env.MONGODB_URI || process.env.MONGO_URI;
        if (!mongoUri) {
            throw new Error('MongoDB URI not found in environment variables');
        }

        await mongoose.connect(mongoUri);
        console.log('✅ Connected to MongoDB');

        const db = mongoose.connection.db;
        const usersCollection = db.collection('users');

        // Count users without billingCycle
        const missingCount = await usersCollection.countDocuments({
            'subscription.billingCycle': { $exists: false }
        });
        console.log(`\n📊 Found ${missingCount} users without billingCycle field`);

        if (missingCount > 0) {
            // Add billingCycle field to all users who are missing it
            const result = await usersCollection.updateMany(
                { 'subscription.billingCycle': { $exists: false } },
                { $set: { 'subscription.billingCycle': 'Monthly' } }
            );
            console.log(`✅ Added billingCycle='Monthly' to ${result.modifiedCount} users`);
        }

        // Also ensure subscription status values are consistent
        console.log('\n📊 Checking subscription status values...');

        const statusDistribution = await usersCollection.aggregate([
            { $group: { _id: '$subscription.status', count: { $sum: 1 } } }
        ]).toArray();
        console.table(statusDistribution);

        // Fix any "in_review" -> "In Review" inconsistencies
        const inReviewFix = await usersCollection.updateMany(
            { 'subscription.status': 'in_review' },
            { $set: { 'subscription.status': 'In Review' } }
        );
        if (inReviewFix.modifiedCount > 0) {
            console.log(`✅ Fixed ${inReviewFix.modifiedCount} 'in_review' -> 'In Review'`);
        }

        // Final verification
        console.log('\n📊 Final subscription field distribution:');
        const finalStats = await usersCollection.aggregate([
            {
                $group: {
                    _id: null,
                    totalUsers: { $sum: 1 },
                    withBillingCycle: {
                        $sum: { $cond: [{ $ifNull: ['$subscription.billingCycle', false] }, 1, 0] }
                    },
                    withPlan: {
                        $sum: { $cond: [{ $ifNull: ['$subscription.plan', false] }, 1, 0] }
                    },
                    withStatus: {
                        $sum: { $cond: [{ $ifNull: ['$subscription.status', false] }, 1, 0] }
                    }
                }
            }
        ]).toArray();
        console.table(finalStats);

        await mongoose.disconnect();
        console.log('\n✅ Migration complete! Disconnected from MongoDB.');

    } catch (error) {
        console.error('❌ Migration failed:', error.message);
        process.exit(1);
    }
}

// Run migration
addBillingCycle();

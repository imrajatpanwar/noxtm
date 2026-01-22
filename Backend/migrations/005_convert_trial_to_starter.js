/**
 * Migration: Convert Trial Users to Starter Plan
 *
 * This migration:
 * 1. Converts all existing Trial users to Starter plan
 * 2. Sets subscription end date to 1 year from now
 * 3. Updates subscription status to active
 *
 * Run: node migrations/005_convert_trial_to_starter.js
 */

const mongoose = require('mongoose');
require('dotenv').config();

async function convertTrialToStarter() {
    try {
        // Connect to MongoDB
        const mongoUri = process.env.MONGODB_URI || process.env.MONGO_URI;
        if (!mongoUri) {
            throw new Error('MongoDB URI not found in environment variables');
        }

        await mongoose.connect(mongoUri);
        console.log('Connected to MongoDB');

        const db = mongoose.connection.db;
        const usersCollection = db.collection('users');

        // Find all Trial users
        const trialUsers = await usersCollection.countDocuments({
            'subscription.plan': 'Trial'
        });
        console.log(`\nFound ${trialUsers} users with Trial plan`);

        if (trialUsers > 0) {
            // Set end date to 1 year from now
            const now = new Date();
            const oneYearFromNow = new Date();
            oneYearFromNow.setFullYear(oneYearFromNow.getFullYear() + 1);

            // Convert Trial users to Starter with 1-year access
            const result = await usersCollection.updateMany(
                { 'subscription.plan': 'Trial' },
                {
                    $set: {
                        'subscription.plan': 'Starter',
                        'subscription.status': 'active',
                        'subscription.startDate': now,
                        'subscription.endDate': oneYearFromNow,
                        'subscription.billingCycle': 'Annual'
                    }
                }
            );
            console.log(`Converted ${result.modifiedCount} Trial users to Starter plan with 1-year access`);
        }

        // Also convert any users with active status but expired trial
        const expiredTrials = await usersCollection.countDocuments({
            $or: [
                { 'subscription.status': 'trial' },
                { 'subscription.status': 'expired', 'subscription.plan': { $in: ['Trial', 'None'] } }
            ]
        });
        console.log(`\nFound ${expiredTrials} users with expired trial or trial status`);

        if (expiredTrials > 0) {
            const now = new Date();
            const oneYearFromNow = new Date();
            oneYearFromNow.setFullYear(oneYearFromNow.getFullYear() + 1);

            const result = await usersCollection.updateMany(
                {
                    $or: [
                        { 'subscription.status': 'trial' },
                        { 'subscription.status': 'expired', 'subscription.plan': { $in: ['Trial', 'None'] } }
                    ]
                },
                {
                    $set: {
                        'subscription.plan': 'Starter',
                        'subscription.status': 'active',
                        'subscription.startDate': now,
                        'subscription.endDate': oneYearFromNow,
                        'subscription.billingCycle': 'Annual'
                    }
                }
            );
            console.log(`Converted ${result.modifiedCount} expired trial users to Starter plan`);
        }

        // Convert all existing active users to Starter with 1-year access
        const activeUsers = await usersCollection.countDocuments({
            'subscription.status': 'active',
            'subscription.plan': { $nin: ['Starter', 'Pro+', 'Advance', 'Admin'] }
        });
        console.log(`\nFound ${activeUsers} other active users to convert`);

        if (activeUsers > 0) {
            const now = new Date();
            const oneYearFromNow = new Date();
            oneYearFromNow.setFullYear(oneYearFromNow.getFullYear() + 1);

            const result = await usersCollection.updateMany(
                {
                    'subscription.status': 'active',
                    'subscription.plan': { $nin: ['Starter', 'Pro+', 'Advance', 'Admin'] }
                },
                {
                    $set: {
                        'subscription.plan': 'Starter',
                        'subscription.endDate': oneYearFromNow,
                        'subscription.billingCycle': 'Annual'
                    }
                }
            );
            console.log(`Converted ${result.modifiedCount} active users to Starter plan`);
        }

        // Final verification
        console.log('\nFinal subscription plan distribution:');
        const planDistribution = await usersCollection.aggregate([
            { $group: { _id: '$subscription.plan', count: { $sum: 1 } } },
            { $sort: { count: -1 } }
        ]).toArray();
        console.table(planDistribution);

        console.log('\nFinal subscription status distribution:');
        const statusDistribution = await usersCollection.aggregate([
            { $group: { _id: '$subscription.status', count: { $sum: 1 } } },
            { $sort: { count: -1 } }
        ]).toArray();
        console.table(statusDistribution);

        await mongoose.disconnect();
        console.log('\nMigration complete! Disconnected from MongoDB.');

    } catch (error) {
        console.error('Migration failed:', error.message);
        process.exit(1);
    }
}

// Run migration
convertTrialToStarter();

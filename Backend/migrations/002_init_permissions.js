/**
 * Migration: Initialize Permissions
 * 
 * Ensures all users have explicit boolean permissions:
 * - undefined -> false
 * - Admin users get all permissions = true
 * - Regular users keep existing true values, rest become false
 * 
 * Run: node migrations/002_init_permissions.js
 */

const mongoose = require('mongoose');
require('dotenv').config();

const PERMISSION_MODULES = [
    'dashboard',
    'dataCenter',
    'projects',
    'teamCommunication',
    'digitalMediaManagement',
    'marketing',
    'hrManagement',
    'financeManagement',
    'seoManagement',
    'internalPolicies',
    'settingsConfiguration'
];

async function initializePermissions() {
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

        // Get all users
        const users = await usersCollection.find({}).toArray();
        console.log(`\n📊 Found ${users.length} users to process`);

        let adminCount = 0;
        let userCount = 0;
        let sanitizedCount = 0;

        for (const user of users) {
            const isAdmin = user.role === 'Admin';
            const currentPermissions = user.permissions || {};
            const newPermissions = {};

            // Create sanitized permissions
            PERMISSION_MODULES.forEach(module => {
                if (isAdmin) {
                    // Admins get all permissions
                    newPermissions[module] = true;
                } else {
                    // Regular users: keep true values, default others to false
                    newPermissions[module] = currentPermissions[module] === true;
                }
            });

            // Check if permissions actually changed
            const hasChanges = PERMISSION_MODULES.some(module =>
                currentPermissions[module] !== newPermissions[module]
            );

            if (hasChanges) {
                await usersCollection.updateOne(
                    { _id: user._id },
                    { $set: { permissions: newPermissions } }
                );
                sanitizedCount++;
            }

            if (isAdmin) {
                adminCount++;
            } else {
                userCount++;
            }
        }

        console.log('\n📊 Migration Results:');
        console.log(`   - Admins processed: ${adminCount} (all permissions = true)`);
        console.log(`   - Users processed: ${userCount} (sanitized to explicit booleans)`);
        console.log(`   - Records modified: ${sanitizedCount}`);

        // Verify by checking for any undefined permissions
        const usersWithUndefined = await usersCollection.find({
            $or: PERMISSION_MODULES.map(module => ({
                [`permissions.${module}`]: { $exists: false }
            }))
        }).toArray();

        if (usersWithUndefined.length > 0) {
            console.log(`\n⚠️  ${usersWithUndefined.length} users still have missing permission fields`);

            // Fix remaining users
            for (const user of usersWithUndefined) {
                const fixes = {};
                PERMISSION_MODULES.forEach(module => {
                    if (user.permissions?.[module] === undefined) {
                        fixes[`permissions.${module}`] = user.role === 'Admin';
                    }
                });

                await usersCollection.updateOne(
                    { _id: user._id },
                    { $set: fixes }
                );
            }
            console.log('✅ Fixed all remaining undefined permissions');
        }

        await mongoose.disconnect();
        console.log('\n✅ Migration complete! Disconnected from MongoDB.');

    } catch (error) {
        console.error('❌ Migration failed:', error.message);
        process.exit(1);
    }
}

// Run migration
initializePermissions();

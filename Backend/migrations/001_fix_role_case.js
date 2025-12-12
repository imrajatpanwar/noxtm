/**
 * Migration: Fix Role Case Mismatch
 * 
 * Standardizes all role values to PascalCase:
 * - ADMIN, admin -> Admin
 * - USER, user -> User
 * 
 * Run: node migrations/001_fix_role_case.js
 */

const mongoose = require('mongoose');
require('dotenv').config();

async function fixRoleCasing() {
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

        console.log('\n📊 Current role distribution:');
        const roleDistribution = await usersCollection.aggregate([
            { $group: { _id: '$role', count: { $sum: 1 } } }
        ]).toArray();
        console.table(roleDistribution);

        // Fix ADMIN -> Admin
        const adminResult = await usersCollection.updateMany(
            { role: { $in: ['ADMIN', 'admin', 'ADMINISTRATOR', 'administrator'] } },
            { $set: { role: 'Admin' } }
        );
        console.log(`\n✅ Fixed ${adminResult.modifiedCount} admin roles to 'Admin'`);

        // Fix USER -> User
        const userResult = await usersCollection.updateMany(
            { role: { $in: ['USER', 'user'] } },
            { $set: { role: 'User' } }
        );
        console.log(`✅ Fixed ${userResult.modifiedCount} user roles to 'User'`);

        // Handle any other unexpected role values
        const unexpectedRoles = await usersCollection.find({
            role: { $nin: ['Admin', 'User'] }
        }).toArray();

        if (unexpectedRoles.length > 0) {
            console.log(`\n⚠️  Found ${unexpectedRoles.length} users with unexpected roles:`);
            unexpectedRoles.forEach(u => {
                console.log(`   - ${u.email}: "${u.role}"`);
            });

            // Default unexpected roles to 'User'
            const fixOthers = await usersCollection.updateMany(
                { role: { $nin: ['Admin', 'User'] } },
                { $set: { role: 'User' } }
            );
            console.log(`✅ Fixed ${fixOthers.modifiedCount} unexpected roles to 'User'`);
        }

        // Verify final distribution
        console.log('\n📊 Final role distribution:');
        const finalDistribution = await usersCollection.aggregate([
            { $group: { _id: '$role', count: { $sum: 1 } } }
        ]).toArray();
        console.table(finalDistribution);

        await mongoose.disconnect();
        console.log('\n✅ Migration complete! Disconnected from MongoDB.');

    } catch (error) {
        console.error('❌ Migration failed:', error.message);
        process.exit(1);
    }
}

// Run migration
fixRoleCasing();

/**
 * Migration: Simplify Company Roles (Manager/Employee → Member)
 *
 * This migration:
 * 1. Converts all Manager/Employee roles to Member in Company.members
 * 2. Converts all Manager/Employee roles to Member in Company.invitations
 * 3. Converts Manager/Employee roles to Member in EmailAccount.roleAccess
 * 4. Removes roleAccess field from ContactList (now permission-based)
 *
 * Important: Existing user permissions are preserved - a former "Manager" with
 * marketing access still has permissions.marketing = true
 *
 * Run: node migrations/007_simplify_roles.js
 */

const mongoose = require('mongoose');
require('dotenv').config();

async function simplifyRoles() {
    try {
        // Connect to MongoDB
        const mongoUri = process.env.MONGODB_URI || process.env.MONGO_URI;
        if (!mongoUri) {
            throw new Error('MongoDB URI not found in environment variables');
        }

        await mongoose.connect(mongoUri);
        console.log('Connected to MongoDB');

        const db = mongoose.connection.db;
        const companiesCollection = db.collection('companies');
        const emailAccountsCollection = db.collection('emailaccounts');
        const contactListsCollection = db.collection('contactlists');

        console.log('\n=== Phase 1: Update Company.members roles ===');

        // Count Manager/Employee members before migration
        const companiesWithOldRoles = await companiesCollection.countDocuments({
            'members.roleInCompany': { $in: ['Manager', 'Employee'] }
        });
        console.log(`Found ${companiesWithOldRoles} companies with Manager/Employee members`);

        if (companiesWithOldRoles > 0) {
            const result = await companiesCollection.updateMany(
                {},
                {
                    $set: { 'members.$[m].roleInCompany': 'Member' }
                },
                {
                    arrayFilters: [{ 'm.roleInCompany': { $in: ['Manager', 'Employee'] } }]
                }
            );
            console.log(`Updated ${result.modifiedCount} companies`);
        }

        console.log('\n=== Phase 2: Update Company.invitations roles ===');

        // Count pending invitations with old roles
        const companiesWithOldInvitations = await companiesCollection.countDocuments({
            'invitations.roleInCompany': { $in: ['Manager', 'Employee'] }
        });
        console.log(`Found ${companiesWithOldInvitations} companies with Manager/Employee invitations`);

        if (companiesWithOldInvitations > 0) {
            // For invitations, we can either update the roleInCompany to Member
            // or simply unset it since new schema doesn't have roleInCompany in invitations
            const result = await companiesCollection.updateMany(
                {},
                {
                    $unset: { 'invitations.$[i].roleInCompany': '' }
                },
                {
                    arrayFilters: [{ 'i.roleInCompany': { $exists: true } }]
                }
            );
            console.log(`Removed roleInCompany from invitations in ${result.modifiedCount} companies`);
        }

        console.log('\n=== Phase 3: Update EmailAccount.roleAccess ===');

        // Count email accounts with old roles
        const emailAccountsWithOldRoles = await emailAccountsCollection.countDocuments({
            'roleAccess.role': { $in: ['Manager', 'Employee'] }
        });
        console.log(`Found ${emailAccountsWithOldRoles} email accounts with Manager/Employee roles`);

        if (emailAccountsWithOldRoles > 0) {
            // Convert Manager to Member (preserve their permissions)
            const managerResult = await emailAccountsCollection.updateMany(
                { 'roleAccess.role': 'Manager' },
                {
                    $set: { 'roleAccess.$[r].role': 'Member' }
                },
                {
                    arrayFilters: [{ 'r.role': 'Manager' }]
                }
            );
            console.log(`Converted Manager → Member in ${managerResult.modifiedCount} email accounts`);

            // Remove Employee entries (they had no access anyway, Members now get read/send by default)
            const employeeResult = await emailAccountsCollection.updateMany(
                { 'roleAccess.role': 'Employee' },
                {
                    $pull: { roleAccess: { role: 'Employee' } }
                }
            );
            console.log(`Removed Employee entries from ${employeeResult.modifiedCount} email accounts`);
        }

        console.log('\n=== Phase 4: Remove roleAccess from ContactLists ===');

        // Count contact lists with roleAccess field
        const contactListsWithRoleAccess = await contactListsCollection.countDocuments({
            roleAccess: { $exists: true }
        });
        console.log(`Found ${contactListsWithRoleAccess} contact lists with roleAccess field`);

        if (contactListsWithRoleAccess > 0) {
            const result = await contactListsCollection.updateMany(
                { roleAccess: { $exists: true } },
                { $unset: { roleAccess: '' } }
            );
            console.log(`Removed roleAccess from ${result.modifiedCount} contact lists`);
        }

        // Final verification
        console.log('\n=== Verification ===');

        // Verify company members
        const remainingOldMemberRoles = await companiesCollection.countDocuments({
            'members.roleInCompany': { $in: ['Manager', 'Employee'] }
        });
        console.log(`Companies with Manager/Employee members remaining: ${remainingOldMemberRoles}`);

        // Verify company invitations
        const remainingOldInvitationRoles = await companiesCollection.countDocuments({
            'invitations.roleInCompany': { $in: ['Manager', 'Employee'] }
        });
        console.log(`Companies with Manager/Employee invitations remaining: ${remainingOldInvitationRoles}`);

        // Verify email accounts
        const remainingOldEmailRoles = await emailAccountsCollection.countDocuments({
            'roleAccess.role': { $in: ['Manager', 'Employee'] }
        });
        console.log(`Email accounts with Manager/Employee roles remaining: ${remainingOldEmailRoles}`);

        // Verify contact lists
        const remainingContactListRoleAccess = await contactListsCollection.countDocuments({
            roleAccess: { $exists: true }
        });
        console.log(`Contact lists with roleAccess remaining: ${remainingContactListRoleAccess}`);

        // Show current role distribution
        console.log('\nCurrent company member role distribution:');
        const roleDistribution = await companiesCollection.aggregate([
            { $unwind: '$members' },
            { $group: { _id: '$members.roleInCompany', count: { $sum: 1 } } },
            { $sort: { count: -1 } }
        ]).toArray();
        console.table(roleDistribution);

        await mongoose.disconnect();
        console.log('\nMigration complete! Disconnected from MongoDB.');

        if (remainingOldMemberRoles > 0 || remainingOldInvitationRoles > 0 || remainingOldEmailRoles > 0) {
            console.warn('\n⚠️  WARNING: Some old roles were not migrated. Please investigate.');
            process.exit(1);
        }

    } catch (error) {
        console.error('Migration failed:', error.message);
        console.error(error.stack);
        process.exit(1);
    }
}

// Run migration
simplifyRoles();

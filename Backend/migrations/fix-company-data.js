/**
 * Migration Script: Fix Invalid Company Data
 *
 * Purpose: Clean up existing database records that violate the current schema
 *
 * Issues Fixed:
 * 1. members.roleInCompany: "Member" → "Employee" (invalid enum value)
 * 2. invitations.roleInCompany: "Member" → "Employee" (invalid enum value)
 * 3. invitations without department → Add default "Operations Team"
 * 4. Mark expired invitations with missing data as "expired"
 *
 * Usage:
 *   node Backend/migrations/fix-company-data.js
 */

const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

// MongoDB Connection
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/noxtm';

// Valid enum values (must match schema)
const VALID_MEMBER_ROLES = ['Owner', 'Manager', 'Employee'];
const VALID_INVITATION_ROLES = ['Manager', 'Employee'];
const VALID_DEPARTMENTS = [
  'Management Team',
  'Digital Team',
  'SEO Team',
  'Graphic Design Team',
  'Marketing Team',
  'Sales Team',
  'Development Team',
  'HR Team',
  'Finance Team',
  'Support Team',
  'Operations Team'
];

// Statistics
const stats = {
  companiesProcessed: 0,
  companiesUpdated: 0,
  membersFixed: 0,
  invitationsFixed: 0,
  invitationsExpired: 0,
  errors: []
};

async function fixCompanyData() {
  try {
    console.log('🔄 Connecting to MongoDB...');
    console.log(`📍 URI: ${MONGODB_URI.replace(/\/\/[^:]+:[^@]+@/, '//***:***@')}`);

    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    // Get Company model (schema validation disabled for this operation)
    const Company = mongoose.connection.collection('companies');

    console.log('🔍 Finding companies with invalid data...\n');

    // Find all companies
    const companies = await Company.find({}).toArray();

    console.log(`📊 Found ${companies.length} companies total\n`);

    for (const company of companies) {
      stats.companiesProcessed++;
      let needsUpdate = false;
      let updateFields = {};

      console.log(`\n${'='.repeat(60)}`);
      console.log(`🏢 Company: ${company.companyName} (ID: ${company._id})`);
      console.log(`${'='.repeat(60)}`);

      // Fix members array
      if (company.members && company.members.length > 0) {
        console.log(`\n👥 Checking ${company.members.length} members...`);

        const fixedMembers = company.members.map((member, index) => {
          const issues = [];
          let fixed = false;

          // Fix invalid roleInCompany
          if (member.roleInCompany && !VALID_MEMBER_ROLES.includes(member.roleInCompany)) {
            issues.push(`Invalid role: "${member.roleInCompany}" → "Employee"`);
            member.roleInCompany = 'Employee';
            fixed = true;
            stats.membersFixed++;
          }

          // Fix invalid department (if exists but invalid)
          if (member.department && !VALID_DEPARTMENTS.includes(member.department)) {
            issues.push(`Invalid department: "${member.department}" → "Operations Team"`);
            member.department = 'Operations Team';
            fixed = true;
          }

          if (fixed) {
            console.log(`   ⚠️  Member #${index + 1}:`);
            issues.forEach(issue => console.log(`      - ${issue}`));
            needsUpdate = true;
          }

          return member;
        });

        if (needsUpdate) {
          updateFields.members = fixedMembers;
        }
      }

      // Fix invitations array
      if (company.invitations && company.invitations.length > 0) {
        console.log(`\n📨 Checking ${company.invitations.length} invitations...`);

        const fixedInvitations = company.invitations.map((invitation, index) => {
          const issues = [];
          let fixed = false;

          // Check if invitation is expired
          const isExpired = invitation.expiresAt && new Date(invitation.expiresAt) < new Date();

          // Fix invalid roleInCompany
          if (invitation.roleInCompany && !VALID_INVITATION_ROLES.includes(invitation.roleInCompany)) {
            issues.push(`Invalid role: "${invitation.roleInCompany}" → "Employee"`);
            invitation.roleInCompany = 'Employee';
            fixed = true;
            stats.invitationsFixed++;
          }

          // Fix missing or invalid department
          if (!invitation.department || !VALID_DEPARTMENTS.includes(invitation.department)) {
            if (isExpired) {
              // If expired, mark as expired instead of fixing
              issues.push(`Missing department + Expired → Status: "expired"`);
              invitation.status = 'expired';
              invitation.department = 'Operations Team'; // Add default to satisfy schema
              stats.invitationsExpired++;
            } else {
              issues.push(`Missing/Invalid department → "Operations Team"`);
              invitation.department = 'Operations Team';
            }
            fixed = true;
            stats.invitationsFixed++;
          }

          if (fixed) {
            console.log(`   ⚠️  Invitation #${index + 1} (${invitation.email}):`);
            issues.forEach(issue => console.log(`      - ${issue}`));
            needsUpdate = true;
          }

          return invitation;
        });

        if (needsUpdate) {
          updateFields.invitations = fixedInvitations;
        }
      }

      // Update company if needed
      if (needsUpdate) {
        try {
          await Company.updateOne(
            { _id: company._id },
            { $set: updateFields }
          );
          stats.companiesUpdated++;
          console.log(`\n✅ Company updated successfully`);
        } catch (error) {
          console.error(`\n❌ Error updating company:`, error.message);
          stats.errors.push({
            companyId: company._id,
            companyName: company.companyName,
            error: error.message
          });
        }
      } else {
        console.log(`\n✓ No issues found - company data is valid`);
      }
    }

    // Print final statistics
    console.log(`\n\n${'='.repeat(60)}`);
    console.log(`📊 MIGRATION COMPLETE - SUMMARY`);
    console.log(`${'='.repeat(60)}`);
    console.log(`Companies Processed:    ${stats.companiesProcessed}`);
    console.log(`Companies Updated:      ${stats.companiesUpdated}`);
    console.log(`Members Fixed:          ${stats.membersFixed}`);
    console.log(`Invitations Fixed:      ${stats.invitationsFixed}`);
    console.log(`Invitations Expired:    ${stats.invitationsExpired}`);
    console.log(`Errors:                 ${stats.errors.length}`);

    if (stats.errors.length > 0) {
      console.log(`\n❌ ERRORS:`);
      stats.errors.forEach((err, idx) => {
        console.log(`   ${idx + 1}. Company: ${err.companyName} (${err.companyId})`);
        console.log(`      Error: ${err.error}`);
      });
    }

    console.log(`\n✅ Migration completed successfully!`);

  } catch (error) {
    console.error('\n❌ Migration failed:', error);
    throw error;
  } finally {
    await mongoose.connection.close();
    console.log('\n🔌 Database connection closed');
  }
}

// Run migration
fixCompanyData()
  .then(() => {
    console.log('\n✅ Script finished successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Script failed:', error);
    process.exit(1);
  });

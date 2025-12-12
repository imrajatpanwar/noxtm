/**
 * Migration: Drop unique index on invitations.token
 *
 * This migration removes the unique constraint on invitations.token field
 * which was causing duplicate key errors when creating companies with no invitations.
 */

const mongoose = require('mongoose');
require('dotenv').config();

async function migrate() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    const db = mongoose.connection.db;
    const collection = db.collection('companies');

    // Check if the index exists
    const indexes = await collection.indexes();
    const tokenIndexExists = indexes.some(idx => idx.name === 'invitations.token_1');

    if (tokenIndexExists) {
      // Drop the unique index
      await collection.dropIndex('invitations.token_1');
      console.log('✅ Dropped unique index on invitations.token');
    } else {
      console.log('ℹ️  Index invitations.token_1 does not exist, nothing to drop');
    }

    console.log('✅ Migration completed successfully');
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    throw error;
  } finally {
    await mongoose.disconnect();
    console.log('✅ Disconnected from MongoDB');
  }
}

// Run migration
migrate()
  .then(() => {
    console.log('Migration script finished');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Migration script failed:', error);
    process.exit(1);
  });

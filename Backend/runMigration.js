#!/usr/bin/env node
/**
 * Run a specific migration
 * Usage: node runMigration.js 006_convert_to_multiple_assignees
 */

require('dotenv').config();
const mongoose = require('mongoose');

const migrationName = process.argv[2];

if (!migrationName) {
  console.error('Usage: node runMigration.js <migration-name>');
  process.exit(1);
}

async function runMigration() {
  try {
    console.log(`Connecting to database...`);
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected');

    const migration = require(`./migrations/${migrationName}`);
    
    console.log(`Running migration: ${migrationName}`);
    await migration.up();
    
    console.log('Migration completed successfully');
    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error);
    await mongoose.disconnect();
    process.exit(1);
  }
}

runMigration();

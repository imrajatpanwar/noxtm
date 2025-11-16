// Migration script to add botgitSettings field to all users
// Run this with: node Backend/migrations/add-botgit-settings.js

const mongoose = require('mongoose');
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

async function migrate() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✓ Connected to MongoDB');

    const User = mongoose.model('User');
    
    // Update all users to have botgitSettings field if they don't have it
    const result = await User.updateMany(
      { botgitSettings: { $exists: false } },
      { 
        $set: { 
          botgitSettings: {
            selectedTradeShowId: null,
            extractionType: null,
            updatedAt: null
          }
        } 
      }
    );

    console.log(`✓ Updated ${result.modifiedCount} users with botgitSettings field`);
    
    // Verify
    const usersWithSettings = await User.countDocuments({ botgitSettings: { $exists: true } });
    console.log(`✓ Total users with botgitSettings: ${usersWithSettings}`);

    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

migrate();

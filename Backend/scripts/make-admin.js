/**
 * Script to promote a user to Admin role
 * Usage: node scripts/make-admin.js <email>
 */

require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');

const makeAdmin = async (email) => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    const user = await User.findOne({ email });
    if (!user) {
      console.error(`❌ User not found: ${email}`);
      process.exit(1);
    }

    if (user.role === 'Admin') {
      console.log(`✅ User ${email} is already an Admin`);
      process.exit(0);
    }

    user.role = 'Admin';
    await user.save();

    console.log(`✅ Successfully promoted ${email} to Admin`);
    console.log(`   User ID: ${user._id}`);
    console.log(`   Name: ${user.name || 'N/A'}`);
    console.log(`   Role: ${user.role}`);

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
};

const email = process.argv[2];
if (!email) {
  console.error('Usage: node scripts/make-admin.js <email>');
  process.exit(1);
}

makeAdmin(email);

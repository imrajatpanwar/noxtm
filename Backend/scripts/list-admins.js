/**
 * List all admin users
 */

require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');

const listAdmins = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    
    const admins = await User.find({ role: 'Admin' }, 'email name role status createdAt').lean();
    
    console.log('\n📋 Admin Users:\n');
    admins.forEach((admin, i) => {
      console.log(`${i + 1}. ${admin.email}`);
      console.log(`   Name: ${admin.name || 'N/A'}`);
      console.log(`   Status: ${admin.status || 'N/A'}`);
      console.log(`   Created: ${admin.createdAt || 'N/A'}`);
      console.log('');
    });
    
    console.log(`Total: ${admins.length} admin(s)\n`);
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
};

listAdmins();

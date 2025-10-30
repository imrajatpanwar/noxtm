const mongoose = require('mongoose');
require('dotenv').config();

const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/noxtm';

// Define schemas
const userSchema = new mongoose.Schema({
  fullName: String,
  email: String,
  companyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Company' }
});

const companySchema = new mongoose.Schema({
  companyName: String
});

const User = mongoose.model('User', userSchema);
const Company = mongoose.model('Company', companySchema);

async function cleanup() {
  try {
    await mongoose.connect(mongoUri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('✅ Connected to MongoDB\n');

    const usersWithCompany = await User.find({ companyId: { $ne: null } });
    console.log(`📋 Found ${usersWithCompany.length} users with company references\n`);

    let fixed = 0;
    let valid = 0;

    for (let user of usersWithCompany) {
      const companyExists = await Company.findById(user.companyId);
      if (!companyExists) {
        console.log(`❌ ${user.email} - Company ID ${user.companyId} does NOT exist`);
        console.log(`   Removing orphaned reference...`);
        user.companyId = null;
        await user.save();
        console.log(`   ✅ Fixed!\n`);
        fixed++;
      } else {
        console.log(`✅ ${user.email} - Company "${companyExists.companyName}" exists`);
        valid++;
      }
    }

    console.log('\n═══════════════════════════════════');
    console.log(`✅ Cleanup complete!`);
    console.log(`   Valid references: ${valid}`);
    console.log(`   Fixed orphaned references: ${fixed}`);
    console.log('═══════════════════════════════════\n');

    await mongoose.connection.close();
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

cleanup();

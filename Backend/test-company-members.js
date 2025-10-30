const mongoose = require('mongoose');
require('dotenv').config();

// Connect to MongoDB
const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/noxtm';

// Define schemas (simplified versions)
const userSchema = new mongoose.Schema({
  fullName: String,
  email: String,
  companyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Company' },
  subscription: {
    plan: String,
    status: String
  }
});

const companySchema = new mongoose.Schema({
  companyName: String,
  owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  members: [{
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    roleInCompany: String
  }]
});

const User = mongoose.model('User', userSchema);
const Company = mongoose.model('Company', companySchema);

async function testCompanyMembers() {
  try {
    await mongoose.connect(mongoUri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('✅ Connected to MongoDB');

    // Get all users
    const users = await User.find({}).select('_id fullName email companyId subscription');
    console.log('\n📋 All Users:');
    users.forEach(user => {
      console.log(`  - ${user.fullName} (${user.email})`);
      console.log(`    ID: ${user._id}`);
      console.log(`    CompanyID: ${user.companyId || 'NONE'}`);
      console.log(`    Subscription: ${user.subscription?.plan || 'None'} (${user.subscription?.status || 'inactive'})`);
      console.log('');
    });

    // Get all companies
    const companies = await Company.find({})
      .populate('owner', 'fullName email')
      .populate('members.user', 'fullName email');

    console.log('\n🏢 All Companies:');
    if (companies.length === 0) {
      console.log('  ⚠️  NO COMPANIES FOUND! This is why members can\'t be loaded.');
      console.log('  💡 Users need to:');
      console.log('     1. Subscribe to Noxtm plan');
      console.log('     2. Complete company setup at /company-setup');
    } else {
      companies.forEach(company => {
        console.log(`  - ${company.companyName}`);
        console.log(`    ID: ${company._id}`);
        console.log(`    Owner: ${company.owner?.fullName} (${company.owner?.email})`);
        console.log(`    Members: ${company.members.length}`);
        company.members.forEach((member, i) => {
          console.log(`      ${i + 1}. ${member.user?.fullName} - ${member.roleInCompany}`);
        });
        console.log('');
      });
    }

    await mongoose.connection.close();
    console.log('✅ Connection closed');
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

testCompanyMembers();

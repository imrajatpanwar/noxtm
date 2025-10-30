const mongoose = require('mongoose');
require('dotenv').config();

const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/noxtm';

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

async function checkMissingCompany() {
  try {
    await mongoose.connect(mongoUri);
    console.log('✅ Connected');

    const companyId = '68ed5c2b194cf49c32d19daf';
    console.log(`\n🔍 Looking for company: ${companyId}`);

    const company = await Company.findById(companyId)
      .populate('owner', 'fullName email')
      .populate('members.user', 'fullName email');

    if (company) {
      console.log('✅ Company FOUND:');
      console.log(`   Name: ${company.companyName}`);
      console.log(`   Owner: ${company.owner?.fullName || 'NONE'}`);
      console.log(`   Members: ${company.members.length}`);
      company.members.forEach((m, i) => {
        console.log(`     ${i + 1}. ${m.user?.fullName} - ${m.roleInCompany}`);
      });
    } else {
      console.log('❌ Company NOT FOUND - may have been deleted!');
      console.log('   Users still have this companyId but the company document doesn\'t exist.');
    }

    await mongoose.connection.close();
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

checkMissingCompany();

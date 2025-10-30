const mongoose = require('mongoose');

mongoose.connect('mongodb://localhost:27017/noxtm')
  .then(async () => {
    const User = mongoose.model('User', new mongoose.Schema({}, { strict: false }));
    const Company = mongoose.model('Company', new mongoose.Schema({}, { strict: false }));

    // Find the user
    const user = await User.findOne({ email: 'noxtmofficial@gmail.com' });

    if (!user) {
      console.log('❌ User not found');
      process.exit(1);
    }

    console.log('=== USER INFO ===');
    console.log('Email:', user.email);
    console.log('Name:', user.fullName);
    console.log('CompanyId:', user.companyId);
    console.log('Role:', user.role);

    if (user.companyId) {
      console.log('\n=== COMPANY USERS ===');
      const companyUsers = await User.find({
        companyId: user.companyId,
        _id: { $ne: user._id }
      });
      console.log('Total users in company:', companyUsers.length);
      companyUsers.forEach(u => {
        console.log(' - ' + u.fullName + ' (' + u.email + ')');
      });

      // Check company
      const company = await Company.findById(user.companyId);
      if (company) {
        console.log('\n=== COMPANY INFO ===');
        console.log('Company Name:', company.companyName);
        console.log('Members in company.members array:', company.members?.length || 0);
      }
    } else {
      console.log('\n⚠️ NO COMPANY ID - User needs to complete company setup!');

      // Show all users to help debug
      console.log('\n=== ALL USERS IN DB ===');
      const allUsers = await User.find({}).select('fullName email companyId');
      allUsers.forEach(u => {
        console.log(' - ' + u.fullName + ' (' + u.email + ') - CompanyId: ' + (u.companyId || 'NONE'));
      });
    }

    process.exit(0);
  })
  .catch(err => {
    console.error('Error:', err);
    process.exit(1);
  });

const mongoose = require('mongoose');
require('dotenv').config();

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/noxtm')
  .then(async () => {
    console.log('✅ Connected to MongoDB');

    const User = mongoose.model('User', new mongoose.Schema({}, { strict: false }));
    const Company = mongoose.model('Company', new mongoose.Schema({}, { strict: false }));

    // Find the user
    const user = await User.findOne({ email: 'noxtmofficial@gmail.com' });

    if (!user) {
      console.log('❌ User not found: noxtmofficial@gmail.com');
      process.exit(1);
    }

    console.log('\n=== USER INFO ===');
    console.log('Email:', user.email);
    console.log('Name:', user.fullName);
    console.log('Role:', user.role);
    console.log('CompanyId:', user.companyId || 'NONE');

    // Find all companies
    const companies = await Company.find({});
    console.log('\n=== ALL COMPANIES ===');
    console.log('Total companies:', companies.length);

    if (companies.length === 0) {
      console.log('\n❌ No companies found in database!');
      console.log('📝 Creating a default company for testing...');

      // Create a default company
      const newCompany = new Company({
        companyName: 'NOXTM Studio',
        industry: 'Technology',
        companySize: '1-10',
        owner: user._id,
        members: [{
          user: user._id,
          roleInCompany: 'Owner',
          joinedAt: new Date()
        }],
        subscription: {
          plan: 'Noxtm',
          status: 'active',
          startDate: new Date(),
          endDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000) // 1 year
        },
        invitations: [],
        createdAt: new Date()
      });

      await newCompany.save();
      console.log('✅ Created company:', newCompany.companyName);

      // Update user with companyId
      user.companyId = newCompany._id;
      await user.save();
      console.log('✅ Updated user with companyId');

      console.log('\n🎉 Setup complete! User now has a company.');
    } else {
      companies.forEach((c, i) => {
        console.log(`${i + 1}. ${c.companyName} (ID: ${c._id})`);
        console.log('   - Members:', c.members?.length || 0);
        console.log('   - Owner:', c.owner);
      });

      if (!user.companyId) {
        // Check if user is owner of any company
        const ownedCompany = companies.find(c => c.owner?.toString() === user._id.toString());

        if (ownedCompany) {
          console.log('\n✅ Found company owned by user:', ownedCompany.companyName);
          console.log('📝 Linking user to this company...');
          user.companyId = ownedCompany._id;
          await user.save();
          console.log('✅ User linked to company!');
        } else {
          // Link to first company
          console.log('\n⚠️ User not owner of any company');
          console.log('📝 Linking user to first available company...');
          const firstCompany = companies[0];
          user.companyId = firstCompany._id;

          // Add user to company members if not already there
          const isMember = firstCompany.members?.some(m => m.user.toString() === user._id.toString());
          if (!isMember) {
            firstCompany.members.push({
              user: user._id,
              roleInCompany: 'Admin',
              joinedAt: new Date()
            });
            await firstCompany.save();
          }

          await user.save();
          console.log('✅ User linked to company:', firstCompany.companyName);
        }
      } else {
        console.log('\n✅ User already has a company!');
      }
    }

    // Show all users in the same company
    if (user.companyId) {
      const companyUsers = await User.find({
        companyId: user.companyId
      }).select('fullName email role');

      console.log('\n=== ALL USERS IN COMPANY ===');
      console.log('Total users:', companyUsers.length);
      companyUsers.forEach(u => {
        console.log(' -', u.fullName, '(' + u.email + ')', u.role);
      });
    }

    console.log('\n✅ All done!');
    process.exit(0);
  })
  .catch(err => {
    console.error('❌ Error:', err);
    process.exit(1);
  });

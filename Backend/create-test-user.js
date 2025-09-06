const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

// User Schema (same as in server.js)
const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  createdAt: { type: Date, default: Date.now }
});

const User = mongoose.model('User', userSchema);

async function createTestUser() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/noxtmstudio', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    console.log('Connected to MongoDB');

    // Check if test user already exists
    const existingUser = await User.findOne({ email: 'test@noxtmstudio.com' });
    if (existingUser) {
      console.log('Test user already exists!');
      console.log('Email: test@noxtmstudio.com');
      console.log('Password: testpassword123');
      return;
    }

    // Create test user
    const hashedPassword = await bcrypt.hash('testpassword123', 10);
    const testUser = new User({
      username: 'testuser',
      email: 'test@noxtmstudio.com',
      password: hashedPassword
    });

    await testUser.save();

    console.log('✅ Test user created successfully!');
    console.log('Email: test@noxtmstudio.com');
    console.log('Password: testpassword123');
    console.log('');
    console.log('You can now test the login with these credentials.');

  } catch (error) {
    console.error('Error creating test user:', error);
  } finally {
    mongoose.connection.close();
  }
}

createTestUser();

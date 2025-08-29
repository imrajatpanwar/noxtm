const axios = require('axios');

// Test configuration
const BASE_URL = process.env.TEST_URL || 'http://localhost:5000';

async function testEndpoints() {
  console.log('🧪 Testing React MongoDB App endpoints...\n');

  try {
    // Test health endpoint
    console.log('1. Testing health endpoint...');
    const healthResponse = await axios.get(`${BASE_URL}/api/health`);
    console.log('✅ Health check passed:', healthResponse.data);
    console.log('');

    // Test registration
    console.log('2. Testing user registration...');
    const testUser = {
      username: `testuser_${Date.now()}`,
      email: `test_${Date.now()}@example.com`,
      password: 'testpassword123'
    };

    const registerResponse = await axios.post(`${BASE_URL}/api/register`, testUser);
    console.log('✅ Registration successful:', registerResponse.data.message);
    const token = registerResponse.data.token;
    console.log('');

    // Test login
    console.log('3. Testing user login...');
    const loginResponse = await axios.post(`${BASE_URL}/api/login`, {
      email: testUser.email,
      password: testUser.password
    });
    console.log('✅ Login successful:', loginResponse.data.message);
    console.log('');

    // Test protected endpoints
    console.log('4. Testing protected endpoints...');
    const authHeader = { headers: { Authorization: `Bearer ${token}` } };

    const profileResponse = await axios.get(`${BASE_URL}/api/profile`, authHeader);
    console.log('✅ Profile endpoint working:', profileResponse.data.username);

    const dashboardResponse = await axios.get(`${BASE_URL}/api/dashboard`, authHeader);
    console.log('✅ Dashboard endpoint working:', dashboardResponse.data.message);
    console.log('');

    console.log('🎉 All tests passed! The application is working correctly.');
    console.log('');
    console.log('You can now:');
    console.log('- Access the app at:', BASE_URL);
    console.log('- Login with:', testUser.email);
    console.log('- Password:', testUser.password);

  } catch (error) {
    console.error('❌ Test failed:', error.response?.data?.message || error.message);
    console.log('');
    console.log('Troubleshooting:');
    console.log('1. Make sure the server is running: npm start');
    console.log('2. Check MongoDB connection');
    console.log('3. Verify .env configuration');
    process.exit(1);
  }
}

// Run tests
testEndpoints();

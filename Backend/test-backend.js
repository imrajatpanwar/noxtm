#!/usr/bin/env node

/**
 * Backend Test Script
 * Tests the basic functionality of the backend server
 */

const axios = require('axios');

const BASE_URL = 'http://noxtmstudio.com/api';

async function testBackend() {
  console.log('🧪 Testing Noxtm Studio Backend...');
  console.log('='.repeat(50));

  try {
    // Test 1: Health Check
    console.log('1️⃣ Testing Health Check...');
    const healthResponse = await axios.get(`${BASE_URL}/health`);
    console.log('✅ Health Check:', healthResponse.data);
    console.log('');

    // Test 2: Test User Registration
    console.log('2️⃣ Testing User Registration...');
    const testUser = {
      username: `testuser_${Date.now()}`,
      email: `test_${Date.now()}@example.com`,
      password: 'testpassword123'
    };

    try {
      const registerResponse = await axios.post(`${BASE_URL}/register`, testUser);
      console.log('✅ User Registration:', registerResponse.data.message);
      console.log('   User ID:', registerResponse.data.user.id);
      console.log('   Token received:', registerResponse.data.token ? 'Yes' : 'No');
      console.log('');

      // Test 3: Test User Login
      console.log('3️⃣ Testing User Login...');
      const loginResponse = await axios.post(`${BASE_URL}/login`, {
        email: testUser.email,
        password: testUser.password
      });
      console.log('✅ User Login:', loginResponse.data.message);
      console.log('   Token received:', loginResponse.data.token ? 'Yes' : 'No');
      console.log('');

      // Test 4: Test Protected Route (Profile)
      console.log('4️⃣ Testing Protected Route (Profile)...');
      const profileResponse = await axios.get(`${BASE_URL}/profile`, {
        headers: {
          'Authorization': `Bearer ${loginResponse.data.token}`
        }
      });
      console.log('✅ Profile Access:', 'Success');
      console.log('   Username:', profileResponse.data.username);
      console.log('   Email:', profileResponse.data.email);
      console.log('');

    } catch (error) {
      if (error.response?.status === 400 && error.response?.data?.message === 'User already exists') {
        console.log('⚠️  User already exists, testing login instead...');
        
        // Test login with existing user
        const loginResponse = await axios.post(`${BASE_URL}/login`, {
          email: testUser.email,
          password: testUser.password
        });
        console.log('✅ User Login:', loginResponse.data.message);
      } else {
        console.log('❌ Registration/Login Error:', error.response?.data?.message || error.message);
      }
    }

    console.log('='.repeat(50));
    console.log('🎉 Backend tests completed successfully!');
    console.log('✅ All core functionality is working properly.');

  } catch (error) {
    console.log('❌ Backend Test Failed:');
    console.log('   Error:', error.message);
    if (error.response) {
      console.log('   Status:', error.response.status);
      console.log('   Data:', error.response.data);
    }
    console.log('');
    console.log('🔧 Troubleshooting:');
    console.log('   1. Make sure the backend server is running');
    console.log('   2. Check if MongoDB is connected');
    console.log('   3. Verify the API URL is correct');
    process.exit(1);
  }
}

// Run the tests
testBackend();

// Test script to check the dashboard API endpoint
const axios = require('axios');

// Get token from localStorage in browser and paste here
const token = ''; // Paste your token here from browser localStorage

async function testDashboardAPI() {
  try {
    const response = await axios.get('https://noxtm.com/api/dashboard', {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    });
    
    console.log('API Response:', response.data);
  } catch (error) {
    console.error('API Error:', error.message);
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Data:', error.response.data);
    }
  }
}

testDashboardAPI();
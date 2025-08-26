const dns = require('dns');
const http = require('http');
const https = require('https');

const domain = 'noxtm.com';
const ip = '185.137.122.61';

console.log('🔍 Testing domain connection for noxtm.com...\n');

// Test DNS resolution
console.log('1. Testing DNS resolution...');
dns.resolve4(domain, (err, addresses) => {
    if (err) {
        console.log('❌ DNS resolution failed:', err.message);
    } else {
        console.log('✅ DNS resolution successful:');
        addresses.forEach(addr => {
            console.log(`   ${domain} → ${addr}`);
            if (addr === ip) {
                console.log('   ✅ IP matches your server!');
            } else {
                console.log('   ⚠️  IP does not match your server');
            }
        });
    }
    
    // Test HTTP connectivity
    console.log('\n2. Testing HTTP connectivity...');
    testHttpConnection();
});

function testHttpConnection() {
    const options = {
        hostname: domain,
        port: 80,
        path: '/',
        method: 'GET',
        timeout: 5000
    };

    const req = http.request(options, (res) => {
        console.log(`✅ HTTP connection successful!`);
        console.log(`   Status: ${res.statusCode}`);
        console.log(`   Headers: ${JSON.stringify(res.headers, null, 2)}`);
    });

    req.on('error', (err) => {
        console.log('❌ HTTP connection failed:', err.message);
    });

    req.on('timeout', () => {
        console.log('⏰ HTTP connection timed out');
        req.destroy();
    });

    req.end();
}

// Test direct IP connection
console.log('\n3. Testing direct IP connection...');
const ipOptions = {
    hostname: ip,
    port: 80,
    path: '/',
    method: 'GET',
    timeout: 5000
};

const ipReq = http.request(ipOptions, (res) => {
    console.log(`✅ Direct IP connection successful!`);
    console.log(`   Status: ${res.statusCode}`);
});

ipReq.on('error', (err) => {
    console.log('❌ Direct IP connection failed:', err.message);
});

ipReq.end();

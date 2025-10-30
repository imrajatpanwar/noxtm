const nodemailer = require('nodemailer');
require('dotenv').config();

async function testEmail() {
  console.log('='.repeat(60));
  console.log('📧 EMAIL CONFIGURATION TEST');
  console.log('='.repeat(60));

  // Display current configuration
  console.log('\n📋 Current Email Configuration:');
  console.log(`EMAIL_HOST: ${process.env.EMAIL_HOST || 'NOT SET'}`);
  console.log(`EMAIL_PORT: ${process.env.EMAIL_PORT || 'NOT SET'}`);
  console.log(`EMAIL_USER: ${process.env.EMAIL_USER || 'NOT SET (OK for local Postfix)'}`);
  console.log(`EMAIL_PASS: ${process.env.EMAIL_PASS ? '***SET***' : 'NOT SET (OK for local Postfix)'}`);
  console.log(`EMAIL_FROM: ${process.env.EMAIL_FROM || 'NOT SET'}`);

  if (!process.env.EMAIL_HOST || !process.env.EMAIL_FROM) {
    console.log('\n❌ ERROR: EMAIL_HOST and EMAIL_FROM must be configured');
    process.exit(1);
  }

  // Configure transporter
  const transportConfig = {
    host: process.env.EMAIL_HOST,
    port: parseInt(process.env.EMAIL_PORT) || 25,
    secure: false,
    tls: {
      rejectUnauthorized: false
    }
  };

  // Only add auth if credentials are provided
  if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
    transportConfig.auth = {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS
    };
    console.log('\n🔐 Authentication: ENABLED');
  } else {
    console.log('\n🔓 Authentication: DISABLED (using local relay)');
  }

  console.log('\n🔌 Creating email transporter...');
  const transporter = nodemailer.createTransport(transportConfig);

  // Verify connection
  console.log('\n🔍 Testing SMTP connection...');
  try {
    await transporter.verify();
    console.log('✅ SMTP connection successful!');
  } catch (error) {
    console.log('❌ SMTP connection failed:');
    console.log(`   Error: ${error.message}`);
    console.log(`   Code: ${error.code || 'N/A'}`);

    if (error.code === 'ECONNREFUSED') {
      console.log('\n💡 Troubleshooting:');
      console.log('   - Check if mail server is running on', process.env.EMAIL_HOST);
      console.log('   - Verify port', process.env.EMAIL_PORT, 'is open');
      console.log('   - Check firewall settings');
    } else if (error.code === 'EAUTH') {
      console.log('\n💡 Troubleshooting:');
      console.log('   - Check EMAIL_USER and EMAIL_PASS credentials');
      console.log('   - Verify SMTP authentication is enabled');
    } else if (error.code === 'ETIMEDOUT') {
      console.log('\n💡 Troubleshooting:');
      console.log('   - Server might be blocking the connection');
      console.log('   - Check network connectivity');
    }

    console.log('\n='.repeat(60));
    process.exit(1);
  }

  // Get test email from command line or use default
  const testEmail = process.argv[2] || 'test@example.com';

  console.log(`\n📤 Sending test email to: ${testEmail}`);

  const mailOptions = {
    from: `"Noxtm Test" <${process.env.EMAIL_FROM}>`,
    to: testEmail,
    subject: 'Test Email from Noxtm - ' + new Date().toISOString(),
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">Email Test Successful!</h2>
        <p>This is a test email from Noxtm backend.</p>
        <p><strong>Configuration:</strong></p>
        <ul>
          <li>Host: ${process.env.EMAIL_HOST}</li>
          <li>Port: ${process.env.EMAIL_PORT}</li>
          <li>From: ${process.env.EMAIL_FROM}</li>
          <li>Sent at: ${new Date().toLocaleString()}</li>
        </ul>
        <p>If you received this email, your email configuration is working correctly!</p>
        <hr style="margin: 30px 0; border: none; border-top: 1px solid #ddd;">
        <p style="color: #666; font-size: 12px;">© 2025 Noxtm. All rights reserved.</p>
      </div>
    `
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log('✅ Email sent successfully!');
    console.log(`   Message ID: ${info.messageId}`);
    console.log(`   Response: ${info.response}`);
    console.log(`\n📬 Check ${testEmail} for the test email`);
    console.log('\n' + '='.repeat(60));
    console.log('✨ EMAIL CONFIGURATION IS WORKING!');
    console.log('='.repeat(60));
  } catch (error) {
    console.log('❌ Failed to send email:');
    console.log(`   Error: ${error.message}`);
    console.log(`   Code: ${error.code || 'N/A'}`);
    console.log('\n' + '='.repeat(60));
    process.exit(1);
  }
}

// Run the test
testEmail().catch(err => {
  console.error('\n❌ Unexpected error:', err);
  process.exit(1);
});

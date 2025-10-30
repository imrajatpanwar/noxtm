const nodemailer = require('nodemailer');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const question = (query) => new Promise((resolve) => rl.question(query, resolve));

async function testEmailInteractive() {
  console.log('\n' + '='.repeat(60));
  console.log('📧 INTERACTIVE EMAIL CONFIGURATION TESTER');
  console.log('='.repeat(60));

  console.log('\n📋 Choose your email provider:');
  console.log('1. Mailgun (Recommended - Free 5000 emails/month)');
  console.log('2. Zoho Mail (Free tier available)');
  console.log('3. Gmail (App Password required)');
  console.log('4. Custom SMTP Server');
  console.log('5. Current .env configuration');

  const choice = await question('\nEnter choice (1-5): ');

  let transportConfig = {};

  switch (choice.trim()) {
    case '1': // Mailgun
      console.log('\n📝 Mailgun Configuration:');
      console.log('Sign up at: https://signup.mailgun.com');
      console.log('After setup, enter your credentials:\n');

      const mgUser = await question('SMTP Username (e.g., postmaster@mg.noxtm.com): ');
      const mgPass = await question('SMTP Password: ');
      const mgFrom = await question('From Email (e.g., noreply@noxtm.com): ');

      transportConfig = {
        host: 'smtp.mailgun.org',
        port: 587,
        secure: false,
        auth: {
          user: mgUser.trim(),
          pass: mgPass.trim()
        }
      };

      console.log('\n✅ Update your .env with:');
      console.log('EMAIL_HOST=smtp.mailgun.org');
      console.log('EMAIL_PORT=587');
      console.log(`EMAIL_USER=${mgUser.trim()}`);
      console.log(`EMAIL_PASS=${mgPass.trim()}`);
      console.log(`EMAIL_FROM=${mgFrom.trim()}`);

      transportConfig.from = mgFrom.trim();
      break;

    case '2': // Zoho
      console.log('\n📝 Zoho Mail Configuration:');
      const zohoUser = await question('Zoho Email (e.g., noreply@noxtm.com): ');
      const zohoPass = await question('Zoho Password: ');

      transportConfig = {
        host: 'smtp.zoho.com',
        port: 587,
        secure: false,
        auth: {
          user: zohoUser.trim(),
          pass: zohoPass.trim()
        }
      };

      console.log('\n✅ Update your .env with:');
      console.log('EMAIL_HOST=smtp.zoho.com');
      console.log('EMAIL_PORT=587');
      console.log(`EMAIL_USER=${zohoUser.trim()}`);
      console.log(`EMAIL_PASS=${zohoPass.trim()}`);
      console.log(`EMAIL_FROM=${zohoUser.trim()}`);

      transportConfig.from = zohoUser.trim();
      break;

    case '3': // Gmail
      console.log('\n📝 Gmail Configuration:');
      console.log('⚠️  You need to create an App Password:');
      console.log('1. Go to: https://myaccount.google.com/apppasswords');
      console.log('2. Create a new App Password for "Mail"');
      console.log('3. Use the 16-character password below\n');

      const gmailUser = await question('Gmail Address: ');
      const gmailPass = await question('App Password (16 chars): ');

      transportConfig = {
        host: 'smtp.gmail.com',
        port: 587,
        secure: false,
        auth: {
          user: gmailUser.trim(),
          pass: gmailPass.trim()
        }
      };

      console.log('\n✅ Update your .env with:');
      console.log('EMAIL_HOST=smtp.gmail.com');
      console.log('EMAIL_PORT=587');
      console.log(`EMAIL_USER=${gmailUser.trim()}`);
      console.log(`EMAIL_PASS=${gmailPass.trim()}`);
      console.log(`EMAIL_FROM=${gmailUser.trim()}`);

      transportConfig.from = gmailUser.trim();
      break;

    case '4': // Custom
      console.log('\n📝 Custom SMTP Configuration:');
      const customHost = await question('SMTP Host: ');
      const customPort = await question('SMTP Port (default: 587): ');
      const customUser = await question('SMTP Username (leave empty if no auth): ');
      const customPass = customUser ? await question('SMTP Password: ') : '';
      const customFrom = await question('From Email: ');

      transportConfig = {
        host: customHost.trim(),
        port: parseInt(customPort) || 587,
        secure: false,
        tls: {
          rejectUnauthorized: false
        }
      };

      if (customUser.trim()) {
        transportConfig.auth = {
          user: customUser.trim(),
          pass: customPass.trim()
        };
      }

      transportConfig.from = customFrom.trim();
      break;

    case '5': // Use .env
      console.log('\n📝 Using current .env configuration...');
      require('dotenv').config();

      transportConfig = {
        host: process.env.EMAIL_HOST,
        port: parseInt(process.env.EMAIL_PORT) || 25,
        secure: false,
        tls: {
          rejectUnauthorized: false
        }
      };

      if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
        transportConfig.auth = {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASS
        };
      }

      transportConfig.from = process.env.EMAIL_FROM;
      console.log(`\nUsing: ${process.env.EMAIL_HOST}:${process.env.EMAIL_PORT}`);
      break;

    default:
      console.log('❌ Invalid choice');
      rl.close();
      process.exit(1);
  }

  // Test recipient
  const recipient = await question('\n📬 Send test email to: ');

  console.log('\n' + '='.repeat(60));
  console.log('🔍 Testing SMTP Connection...');
  console.log('='.repeat(60));

  const transporter = nodemailer.createTransport(transportConfig);

  try {
    await transporter.verify();
    console.log('✅ SMTP connection successful!');
  } catch (error) {
    console.log('❌ SMTP connection failed:');
    console.log(`   Error: ${error.message}`);
    console.log(`   Code: ${error.code || 'N/A'}`);

    if (error.code === 'EAUTH') {
      console.log('\n💡 Authentication failed. Check your username/password.');
    } else if (error.code === 'ECONNREFUSED') {
      console.log('\n💡 Connection refused. Check host and port.');
    }

    rl.close();
    process.exit(1);
  }

  console.log('\n📤 Sending test email...');

  const mailOptions = {
    from: `"Noxtm Test" <${transportConfig.from}>`,
    to: recipient.trim(),
    subject: 'Test Email from Noxtm - ' + new Date().toISOString(),
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 28px;">✅ Email Test Successful!</h1>
        </div>

        <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px;">
          <p style="font-size: 16px; color: #333;">
            Congratulations! Your email configuration is working correctly.
          </p>

          <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="color: #667eea; margin-top: 0;">Configuration Details:</h3>
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 8px; border-bottom: 1px solid #eee;"><strong>Host:</strong></td>
                <td style="padding: 8px; border-bottom: 1px solid #eee;">${transportConfig.host}</td>
              </tr>
              <tr>
                <td style="padding: 8px; border-bottom: 1px solid #eee;"><strong>Port:</strong></td>
                <td style="padding: 8px; border-bottom: 1px solid #eee;">${transportConfig.port}</td>
              </tr>
              <tr>
                <td style="padding: 8px; border-bottom: 1px solid #eee;"><strong>From:</strong></td>
                <td style="padding: 8px; border-bottom: 1px solid #eee;">${transportConfig.from}</td>
              </tr>
              <tr>
                <td style="padding: 8px;"><strong>Sent at:</strong></td>
                <td style="padding: 8px;">${new Date().toLocaleString()}</td>
              </tr>
            </table>
          </div>

          <div style="background: #e8f5e9; border-left: 4px solid #4caf50; padding: 15px; margin: 20px 0;">
            <strong style="color: #2e7d32;">✓ Next Steps:</strong>
            <ul style="margin: 10px 0; padding-left: 20px;">
              <li>Update your Backend/.env file with the configuration shown above</li>
              <li>Restart your backend server</li>
              <li>Test the Forgot Password feature in your app</li>
            </ul>
          </div>

          <p style="color: #666; margin-top: 30px;">
            If you received this email, you're all set! Your Noxtm application can now send emails reliably.
          </p>
        </div>

        <div style="text-align: center; padding: 20px; color: #999; font-size: 12px;">
          <p>© 2025 Noxtm. All rights reserved.</p>
          <p>This is an automated test email from your Noxtm application.</p>
        </div>
      </div>
    `
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log('✅ Email sent successfully!');
    console.log(`   Message ID: ${info.messageId}`);
    console.log(`   Response: ${info.response}`);

    console.log('\n' + '='.repeat(60));
    console.log('✨ SUCCESS! CHECK YOUR INBOX!');
    console.log('='.repeat(60));
    console.log('\n📬 Email sent to:', recipient.trim());
    console.log('📧 Check your inbox (and spam folder)');
    console.log('\n💡 Don\'t forget to update your .env file with the configuration!');
    console.log('='.repeat(60));
  } catch (error) {
    console.log('❌ Failed to send email:');
    console.log(`   Error: ${error.message}`);
    console.log(`   Code: ${error.code || 'N/A'}`);
  }

  rl.close();
}

testEmailInteractive().catch(err => {
  console.error('\n❌ Unexpected error:', err);
  rl.close();
  process.exit(1);
});

const mongoose = require('mongoose');
require('dotenv').config();

// Import models
const EmailDomain = require('../models/EmailDomain');
const EmailTemplate = require('../models/EmailTemplate');
const User = require('../models/User'); // Assuming you have a User model

async function seedEmailSystem() {
  try {
    console.log('🌱 Starting Email System Seed...\n');

    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    console.log('✅ Connected to MongoDB\n');

    // Find admin user (or create one if needed)
    let adminUser = await User.findOne({ role: 'Admin' });

    if (!adminUser) {
      console.log('⚠️  No admin user found. Creating default admin...');
      const bcrypt = require('bcryptjs');
      const hashedPassword = await bcrypt.hash('admin123', 10);

      adminUser = new User({
        fullName: 'Admin User',
        email: 'admin@noxtm.com',
        password: hashedPassword,
        role: 'Admin',
        status: 'Active'
      });
      await adminUser.save();
      console.log('✅ Default admin created: admin@noxtm.com / admin123\n');
    } else {
      console.log(`✅ Using existing admin: ${adminUser.email}\n`);
    }

    // 1. Create Default Domain (noxtm.com)
    console.log('📧 Creating default email domain...');

    let domain = await EmailDomain.findOne({ domain: 'noxtm.com' });

    if (!domain) {
      domain = new EmailDomain({
        domain: 'noxtm.com',
        verified: true,
        verifiedAt: new Date(),
        enabled: true,
        createdBy: adminUser._id,
        defaultQuota: 1024, // 1GB per account
        maxAccounts: 100,
        totalQuota: 10240, // 10GB total
        smtpHost: process.env.EMAIL_HOST || 'mail.noxtm.com',
        smtpPort: 587,
        smtpSecure: false,
        imapHost: process.env.EMAIL_HOST || 'mail.noxtm.com',
        imapPort: 993,
        imapSecure: true,
        popHost: process.env.EMAIL_HOST || 'mail.noxtm.com',
        popPort: 995,
        popSecure: true,
        webmailEnabled: false,
        spamFilterEnabled: true,
        defaultSpamThreshold: 5.0,
        dnsRecords: {
          mx: [{
            priority: 10,
            host: 'mail.noxtm.com',
            verified: true
          }],
          spf: {
            record: `v=spf1 mx a ip4:${process.env.EMAIL_HOST || '185.137.122.61'} ~all`,
            verified: true
          },
          dmarc: {
            record: 'v=DMARC1; p=quarantine; rua=mailto:postmaster@noxtm.com',
            verified: true
          },
          verification: {
            record: 'noxtm-verified',
            verified: true
          }
        }
      });

      // Generate DKIM keys
      await domain.generateDKIMKeys();
      await domain.save();

      console.log(`✅ Domain created: ${domain.domain}`);
      console.log(`   - SMTP: ${domain.smtpHost}:${domain.smtpPort}`);
      console.log(`   - IMAP: ${domain.imapHost}:${domain.imapPort}`);
      console.log(`   - Default Quota: ${domain.defaultQuota}MB`);
      console.log(`   - Max Accounts: ${domain.maxAccounts}\n`);
    } else {
      console.log(`✅ Domain already exists: ${domain.domain}\n`);
    }

    // 2. Create Default Email Templates
    console.log('📝 Creating default email templates...\n');

    const templates = [
      {
        name: 'Welcome Email',
        slug: 'welcome-email',
        type: 'transactional',
        category: 'welcome',
        subject: 'Welcome to {{company_name}}!',
        htmlBody: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px; border-radius: 10px 10px 0 0; text-align: center;">
              <h1 style="color: white; margin: 0; font-size: 32px;">Welcome to {{company_name}}!</h1>
            </div>

            <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px;">
              <p style="font-size: 16px; color: #333;">Hi {{user_name}},</p>

              <p style="font-size: 16px; color: #333; line-height: 1.6;">
                We're thrilled to have you on board! Your account has been successfully created and you're all set to get started.
              </p>

              <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #667eea;">
                <h3 style="color: #667eea; margin-top: 0;">What's Next?</h3>
                <ul style="color: #666; line-height: 1.8;">
                  <li>Complete your profile</li>
                  <li>Explore our features</li>
                  <li>Connect with your team</li>
                </ul>
              </div>

              <div style="text-align: center; margin: 30px 0;">
                <a href="{{dashboard_url}}" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 14px 30px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">
                  Go to Dashboard
                </a>
              </div>

              <p style="color: #666; font-size: 14px; margin-top: 30px;">
                If you have any questions, feel free to reach out to our support team.
              </p>
            </div>

            <div style="text-align: center; padding: 20px; color: #999; font-size: 12px;">
              <p>© 2025 {{company_name}}. All rights reserved.</p>
            </div>
          </div>
        `,
        textBody: `Welcome to {{company_name}}!

Hi {{user_name}},

We're thrilled to have you on board! Your account has been successfully created and you're all set to get started.

What's Next?
- Complete your profile
- Explore our features
- Connect with your team

Visit your dashboard: {{dashboard_url}}

If you have any questions, feel free to reach out to our support team.

© 2025 {{company_name}}. All rights reserved.`,
        fromName: 'Noxtm',
        fromEmail: process.env.EMAIL_FROM || 'noreply@noxtm.com',
        variables: [
          { name: 'company_name', description: 'Name of the company', defaultValue: 'Noxtm', required: true },
          { name: 'user_name', description: 'Name of the user', defaultValue: 'User', required: true },
          { name: 'dashboard_url', description: 'URL to the dashboard', defaultValue: 'https://noxtm.com/dashboard', required: false }
        ],
        enabled: true
      },
      {
        name: 'Password Reset',
        slug: 'password-reset',
        type: 'transactional',
        category: 'password_reset',
        subject: 'Reset Your Password - {{company_name}}',
        htmlBody: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px; border-radius: 10px 10px 0 0; text-align: center;">
              <h1 style="color: white; margin: 0; font-size: 28px;">🔒 Password Reset Request</h1>
            </div>

            <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px;">
              <p style="font-size: 16px; color: #333;">Hi {{user_name}},</p>

              <p style="font-size: 16px; color: #333; line-height: 1.6;">
                You requested to reset your password. Use the verification code below to proceed:
              </p>

              <div style="background: white; padding: 30px; border-radius: 8px; margin: 30px 0; text-align: center;">
                <h2 style="color: #667eea; letter-spacing: 8px; font-size: 36px; margin: 0;">{{reset_code}}</h2>
                <p style="color: #999; font-size: 14px; margin-top: 10px;">This code will expire in 10 minutes</p>
              </div>

              <p style="color: #666; font-size: 14px; background: #fff3cd; padding: 15px; border-radius: 6px; border-left: 4px solid #ffc107;">
                ⚠️ If you didn't request this password reset, please ignore this email and your password will remain unchanged.
              </p>
            </div>

            <div style="text-align: center; padding: 20px; color: #999; font-size: 12px;">
              <p>© 2025 {{company_name}}. All rights reserved.</p>
            </div>
          </div>
        `,
        textBody: `Password Reset Request

Hi {{user_name}},

You requested to reset your password. Use the verification code below to proceed:

Code: {{reset_code}}

This code will expire in 10 minutes.

If you didn't request this password reset, please ignore this email and your password will remain unchanged.

© 2025 {{company_name}}. All rights reserved.`,
        fromName: 'Noxtm',
        fromEmail: process.env.EMAIL_FROM || 'noreply@noxtm.com',
        variables: [
          { name: 'company_name', description: 'Name of the company', defaultValue: 'Noxtm', required: true },
          { name: 'user_name', description: 'Name of the user', defaultValue: 'User', required: true },
          { name: 'reset_code', description: '6-digit reset code', defaultValue: '123456', required: true }
        ],
        enabled: true
      },
      {
        name: 'Email Verification',
        slug: 'email-verification',
        type: 'transactional',
        category: 'email_verification',
        subject: 'Verify Your Email Address - {{company_name}}',
        htmlBody: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px; border-radius: 10px 10px 0 0; text-align: center;">
              <h1 style="color: white; margin: 0; font-size: 28px;">✉️ Verify Your Email</h1>
            </div>

            <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px;">
              <p style="font-size: 16px; color: #333;">Hi {{user_name}},</p>

              <p style="font-size: 16px; color: #333; line-height: 1.6;">
                Thank you for signing up! Please verify your email address by entering the code below:
              </p>

              <div style="background: white; padding: 30px; border-radius: 8px; margin: 30px 0; text-align: center;">
                <h2 style="color: #667eea; letter-spacing: 8px; font-size: 36px; margin: 0;">{{verification_code}}</h2>
                <p style="color: #999; font-size: 14px; margin-top: 10px;">This code will expire in 10 minutes</p>
              </div>

              <p style="color: #666; font-size: 14px;">
                If you didn't create an account, you can safely ignore this email.
              </p>
            </div>

            <div style="text-align: center; padding: 20px; color: #999; font-size: 12px;">
              <p>© 2025 {{company_name}}. All rights reserved.</p>
            </div>
          </div>
        `,
        textBody: `Verify Your Email Address

Hi {{user_name}},

Thank you for signing up! Please verify your email address by entering the code below:

Code: {{verification_code}}

This code will expire in 10 minutes.

If you didn't create an account, you can safely ignore this email.

© 2025 {{company_name}}. All rights reserved.`,
        fromName: 'Noxtm',
        fromEmail: process.env.EMAIL_FROM || 'noreply@noxtm.com',
        variables: [
          { name: 'company_name', description: 'Name of the company', defaultValue: 'Noxtm', required: true },
          { name: 'user_name', description: 'Name of the user', defaultValue: 'User', required: true },
          { name: 'verification_code', description: '6-digit verification code', defaultValue: '123456', required: true }
        ],
        enabled: true
      },
      {
        name: 'Account Notification',
        slug: 'account-notification',
        type: 'notification',
        category: 'account_notification',
        subject: '{{notification_title}} - {{company_name}}',
        htmlBody: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
              <h1 style="color: white; margin: 0; font-size: 24px;">{{notification_title}}</h1>
            </div>

            <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px;">
              <p style="font-size: 16px; color: #333;">Hi {{user_name}},</p>

              <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <p style="font-size: 16px; color: #333; line-height: 1.6;">
                  {{notification_message}}
                </p>
              </div>

              <p style="color: #666; font-size: 14px; margin-top: 30px;">
                If you have any questions, please contact our support team.
              </p>
            </div>

            <div style="text-align: center; padding: 20px; color: #999; font-size: 12px;">
              <p>© 2025 {{company_name}}. All rights reserved.</p>
            </div>
          </div>
        `,
        textBody: `{{notification_title}}

Hi {{user_name}},

{{notification_message}}

If you have any questions, please contact our support team.

© 2025 {{company_name}}. All rights reserved.`,
        fromName: 'Noxtm',
        fromEmail: process.env.EMAIL_FROM || 'noreply@noxtm.com',
        variables: [
          { name: 'company_name', description: 'Name of the company', defaultValue: 'Noxtm', required: true },
          { name: 'user_name', description: 'Name of the user', defaultValue: 'User', required: true },
          { name: 'notification_title', description: 'Title of the notification', defaultValue: 'Important Update', required: true },
          { name: 'notification_message', description: 'Message content', defaultValue: 'We have an important update for you.', required: true }
        ],
        enabled: true
      }
    ];

    // Create each template
    for (const templateData of templates) {
      const existing = await EmailTemplate.findOne({ slug: templateData.slug });

      if (!existing) {
        const template = new EmailTemplate({
          ...templateData,
          createdBy: adminUser._id
        });
        await template.save();
        console.log(`   ✅ Created template: ${template.name} (${template.slug})`);
      } else {
        console.log(`   ⏭️  Template already exists: ${templateData.name} (${templateData.slug})`);
      }
    }

    console.log('\n✅ Email system seeded successfully!');
    console.log('\n📋 Summary:');
    console.log(`   - Domain: ${domain.domain} (${domain.verified ? 'Verified' : 'Not Verified'})`);
    console.log(`   - Templates: ${templates.length} created/verified`);
    console.log(`   - Admin User: ${adminUser.email}`);
    console.log('\n🎉 You can now use the email management system!\n');

  } catch (error) {
    console.error('❌ Error seeding email system:', error);
    process.exit(1);
  } finally {
    await mongoose.connection.close();
    console.log('👋 MongoDB connection closed');
    process.exit(0);
  }
}

// Run the seed function
seedEmailSystem();

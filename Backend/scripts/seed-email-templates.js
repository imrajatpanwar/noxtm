const mongoose = require('mongoose');
require('dotenv').config();

const EmailTemplate = require('../models/EmailTemplate');

const defaultTemplates = [
  {
    name: 'Email Verification',
    slug: 'email-verification',
    type: 'transactional',
    category: 'verification',
    subject: 'Verify Your Email - Noxtm',
    htmlBody: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #7c3aed; margin: 0;">Noxtm</h1>
        </div>
        
        <div style="background-color: #f9fafb; border-radius: 8px; padding: 30px;">
          <h2 style="color: #1f2937; margin-top: 0;">Welcome to Noxtm!</h2>
          <p style="color: #4b5563; font-size: 16px; line-height: 1.6;">Hi {{firstName}},</p>
          <p style="color: #4b5563; font-size: 16px; line-height: 1.6;">
            Thank you for signing up with Noxtm. To complete your registration and verify your email address, 
            please use the verification code below:
          </p>
          
          <div style="background-color: #ffffff; border: 2px dashed #7c3aed; border-radius: 8px; padding: 25px; text-align: center; margin: 30px 0;">
            <div style="color: #6b7280; font-size: 14px; margin-bottom: 10px; text-transform: uppercase; letter-spacing: 1px;">
              Your Verification Code
            </div>
            <div style="font-size: 42px; font-weight: bold; color: #7c3aed; letter-spacing: 8px; font-family: 'Courier New', monospace;">
              {{verificationCode}}
            </div>
          </div>
          
          <p style="color: #4b5563; font-size: 14px; line-height: 1.6;">
            <strong>Important:</strong> This code will expire in <strong>10 minutes</strong> for security reasons.
          </p>
          
          <p style="color: #6b7280; font-size: 14px; line-height: 1.6; margin-top: 20px;">
            If you didn't create an account with Noxtm, please ignore this email. Your email address will not be used.
          </p>
        </div>
        
        <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; text-align: center;">
          <p style="color: #9ca3af; font-size: 12px; margin: 5px 0;">
            © 2025 Noxtm. All rights reserved.
          </p>
          <p style="color: #9ca3af; font-size: 12px; margin: 5px 0;">
            This is an automated message, please do not reply to this email.
          </p>
        </div>
      </div>
    `,
    textBody: `Welcome to Noxtm!

Hi {{firstName}},

Thank you for signing up with Noxtm. To complete your registration and verify your email address, please use the verification code below:

Your Verification Code: {{verificationCode}}

Important: This code will expire in 10 minutes for security reasons.

If you didn't create an account with Noxtm, please ignore this email. Your email address will not be used.

© 2025 Noxtm. All rights reserved.
This is an automated message, please do not reply to this email.`,
    fromName: 'Noxtm',
    fromEmail: 'noreply@noxtm.com',
    replyTo: 'support@noxtm.com',
    variables: [
      { name: 'firstName', description: 'User first name', required: true },
      { name: 'fullName', description: 'User full name', required: true },
      { name: 'verificationCode', description: 'Email verification code', required: true },
      { name: 'userName', description: 'Username', required: false },
      { name: 'email', description: 'User email address', required: false }
    ],
    enabled: true
  },
  {
    name: 'Password Reset',
    slug: 'password-reset',
    type: 'transactional',
    category: 'password-reset',
    subject: 'Password Reset Code - Noxtm',
    htmlBody: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #7c3aed; margin: 0;">Noxtm</h1>
        </div>
        
        <div style="background-color: #f9fafb; border-radius: 8px; padding: 30px;">
          <h2 style="color: #1f2937; margin-top: 0;">Password Reset Request</h2>
          <p style="color: #4b5563; font-size: 16px; line-height: 1.6;">Hi {{firstName}},</p>
          <p style="color: #4b5563; font-size: 16px; line-height: 1.6;">
            We received a request to reset the password for your Noxtm account. 
            Use the verification code below to proceed with resetting your password:
          </p>
          
          <div style="background-color: #ffffff; border: 2px dashed #ef4444; border-radius: 8px; padding: 25px; text-align: center; margin: 30px 0;">
            <div style="color: #6b7280; font-size: 14px; margin-bottom: 10px; text-transform: uppercase; letter-spacing: 1px;">
              Your Reset Code
            </div>
            <div style="font-size: 42px; font-weight: bold; color: #ef4444; letter-spacing: 8px; font-family: 'Courier New', monospace;">
              {{verificationCode}}
            </div>
          </div>
          
          <p style="color: #4b5563; font-size: 14px; line-height: 1.6;">
            <strong>Important:</strong> This code will expire in <strong>10 minutes</strong> for security reasons.
          </p>
          
          <div style="background-color: #fef2f2; border-left: 4px solid #ef4444; padding: 15px; margin: 20px 0; border-radius: 4px;">
            <p style="color: #991b1b; font-size: 14px; margin: 0; line-height: 1.6;">
              <strong>Security Notice:</strong> If you didn't request a password reset, please ignore this email. 
              Your password will remain unchanged, and your account is secure.
            </p>
          </div>
          
          <p style="color: #6b7280; font-size: 14px; line-height: 1.6; margin-top: 20px;">
            For security reasons, we recommend choosing a strong password that you don't use on any other website.
          </p>
        </div>
        
        <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; text-align: center;">
          <p style="color: #9ca3af; font-size: 12px; margin: 5px 0;">
            © 2025 Noxtm. All rights reserved.
          </p>
          <p style="color: #9ca3af; font-size: 12px; margin: 5px 0;">
            This is an automated message, please do not reply to this email.
          </p>
        </div>
      </div>
    `,
    textBody: `Password Reset Request

Hi {{firstName}},

We received a request to reset the password for your Noxtm account. Use the verification code below to proceed with resetting your password:

Your Reset Code: {{verificationCode}}

Important: This code will expire in 10 minutes for security reasons.

Security Notice: If you didn't request a password reset, please ignore this email. Your password will remain unchanged, and your account is secure.

For security reasons, we recommend choosing a strong password that you don't use on any other website.

© 2025 Noxtm. All rights reserved.
This is an automated message, please do not reply to this email.`,
    fromName: 'Noxtm Security',
    fromEmail: 'noreply@noxtm.com',
    replyTo: 'support@noxtm.com',
    variables: [
      { name: 'firstName', description: 'User first name', required: true },
      { name: 'fullName', description: 'User full name', required: true },
      { name: 'verificationCode', description: 'Password reset code', required: true },
      { name: 'resetCode', description: 'Password reset code (alias)', required: true },
      { name: 'userName', description: 'Username', required: false },
      { name: 'email', description: 'User email address', required: false }
    ],
    enabled: true
  },
  {
    name: 'Welcome Email',
    slug: 'welcome-email',
    type: 'marketing',
    category: 'welcome',
    subject: 'Welcome to Noxtm - Let\'s Get Started!',
    htmlBody: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #7c3aed; margin: 0;">Noxtm</h1>
        </div>
        
        <div style="background: linear-gradient(135deg, #7c3aed 0%, #a855f7 100%); border-radius: 8px; padding: 40px; text-align: center; color: white; margin-bottom: 30px;">
          <h2 style="margin: 0 0 10px 0; font-size: 28px;">Welcome Aboard, {{firstName}}! 🎉</h2>
          <p style="margin: 0; font-size: 16px; opacity: 0.95;">We're thrilled to have you join the Noxtm community</p>
        </div>
        
        <div style="background-color: #f9fafb; border-radius: 8px; padding: 30px;">
          <p style="color: #4b5563; font-size: 16px; line-height: 1.6;">Hi {{firstName}},</p>
          <p style="color: #4b5563; font-size: 16px; line-height: 1.6;">
            Your email has been successfully verified and your account is now active! 
            You're all set to explore everything Noxtm has to offer.
          </p>
          
          <div style="margin: 30px 0;">
            <h3 style="color: #1f2937; margin-bottom: 15px;">Quick Start Guide:</h3>
            <ul style="color: #4b5563; line-height: 2; padding-left: 20px;">
              <li>Complete your profile to personalize your experience</li>
              <li>Explore our features and tools</li>
              <li>Connect with your team members</li>
              <li>Set up your first project</li>
            </ul>
          </div>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="https://noxtm.com/dashboard" style="display: inline-block; background-color: #7c3aed; color: white; padding: 14px 30px; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 16px;">
              Go to Dashboard →
            </a>
          </div>
          
          <p style="color: #6b7280; font-size: 14px; line-height: 1.6; margin-top: 20px;">
            Need help getting started? Check out our <a href="https://noxtm.com/docs" style="color: #7c3aed;">documentation</a> 
            or reach out to our support team at support@noxtm.com
          </p>
        </div>
        
        <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; text-align: center;">
          <p style="color: #9ca3af; font-size: 12px; margin: 5px 0;">
            © 2025 Noxtm. All rights reserved.
          </p>
        </div>
      </div>
    `,
    textBody: `Welcome Aboard, {{firstName}}!

Hi {{firstName}},

Your email has been successfully verified and your account is now active! You're all set to explore everything Noxtm has to offer.

Quick Start Guide:
- Complete your profile to personalize your experience
- Explore our features and tools
- Connect with your team members
- Set up your first project

Visit your dashboard: https://noxtm.com/dashboard

Need help getting started? Check out our documentation at https://noxtm.com/docs or reach out to our support team at support@noxtm.com

© 2025 Noxtm. All rights reserved.`,
    fromName: 'Noxtm Team',
    fromEmail: 'noreply@noxtm.com',
    replyTo: 'support@noxtm.com',
    variables: [
      { name: 'firstName', description: 'User first name', required: true },
      { name: 'fullName', description: 'User full name', required: false },
      { name: 'userName', description: 'Username', required: false },
      { name: 'email', description: 'User email address', required: false }
    ],
    enabled: true
  }
];

async function seedEmailTemplates() {
  try {
    // Connect to MongoDB
    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Check and create templates
    for (const templateData of defaultTemplates) {
      const existing = await EmailTemplate.findOne({ slug: templateData.slug });
      
      if (existing) {
        console.log(`📋 Template "${templateData.name}" already exists, updating...`);
        await EmailTemplate.findByIdAndUpdate(existing._id, templateData);
        console.log(`✅ Updated template: ${templateData.name}`);
      } else {
        const template = new EmailTemplate(templateData);
        await template.save();
        console.log(`✅ Created template: ${templateData.name}`);
      }
    }

    console.log('\n🎉 Email templates seeded successfully!');
    console.log('\nAvailable template slugs:');
    defaultTemplates.forEach(t => {
      console.log(`  - ${t.slug} (${t.category})`);
    });

    await mongoose.connection.close();
    console.log('\n✅ Database connection closed');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding templates:', error);
    process.exit(1);
  }
}

// Run the script
seedEmailTemplates();

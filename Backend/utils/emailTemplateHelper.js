const EmailTemplate = require('../models/EmailTemplate');
const nodemailer = require('nodemailer');
const EmailLog = require('../models/EmailLog');

/**
 * Send email using a template by slug
 * @param {string} slug - Template slug (e.g., 'email-verification', 'password-reset')
 * @param {string} to - Recipient email address
 * @param {object} variables - Variables to replace in template (e.g., {firstName, verificationCode})
 * @param {object} options - Additional options (attachments, logData, etc.)
 * @returns {Promise<object>} - Email send result with messageId
 */
async function sendTemplateEmail(slug, to, variables = {}, options = {}) {
  try {
    // Find template by slug
    const template = await EmailTemplate.findOne({ slug, enabled: true });

    if (!template) {
      throw new Error(`Email template with slug "${slug}" not found or disabled`);
    }

    // Render template with variables
    const rendered = template.render(variables);

    // Configure nodemailer
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
    }

    const transporter = nodemailer.createTransport(transportConfig);

    // Prepare mail options
    const mailOptions = {
      from: rendered.from,
      to,
      subject: rendered.subject,
      html: rendered.html,
      text: rendered.text,
      replyTo: rendered.replyTo,
      attachments: options.attachments || []
    };

    // Send email
    const info = await transporter.sendMail(mailOptions);

    // Log email if logData provided
    if (options.logData) {
      try {
        await EmailLog.create({
          from: rendered.from,
          to,
          subject: rendered.subject,
          body: rendered.html,
          status: 'sent',
          messageId: info.messageId,
          userId: options.logData.userId,
          ip: options.logData.ip,
          userAgent: options.logData.userAgent,
          type: options.logData.type || 'transactional',
          metadata: {
            templateSlug: slug,
            variables: Object.keys(variables)
          }
        });
      } catch (logError) {
        console.error('Failed to log email:', logError);
        // Don't throw - email was sent successfully
      }
    }

    // Update template stats
    template.sendCount += 1;
    template.lastSentAt = new Date();
    await template.save();

    return {
      success: true,
      messageId: info.messageId,
      response: info.response
    };
  } catch (error) {
    console.error(`Error sending template email (${slug}):`, error);
    throw error;
  }
}

/**
 * Get template preview by slug
 * @param {string} slug - Template slug
 * @param {object} variables - Variables for preview
 * @returns {Promise<object>} - Rendered template
 */
async function previewTemplate(slug, variables = {}) {
  const template = await EmailTemplate.findOne({ slug, enabled: true });

  if (!template) {
    throw new Error(`Email template with slug "${slug}" not found or disabled`);
  }

  return template.render(variables);
}

/**
 * Check if template exists and is enabled
 * @param {string} slug - Template slug
 * @returns {Promise<boolean>}
 */
async function templateExists(slug) {
  const count = await EmailTemplate.countDocuments({ slug, enabled: true });
  return count > 0;
}

module.exports = {
  sendTemplateEmail,
  previewTemplate,
  templateExists
};

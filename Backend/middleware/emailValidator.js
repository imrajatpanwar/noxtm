const validator = require('validator');

/**
 * List of disposable/temporary email domains to block
 * These are commonly used for spam and should be rejected
 */
const DISPOSABLE_EMAIL_DOMAINS = [
  '10minutemail.com',
  'guerrillamail.com',
  'mailinator.com',
  'trashmail.com',
  'tempmail.com',
  'throwaway.email',
  'getnada.com',
  'temp-mail.org',
  'fakeinbox.com',
  'yopmail.com',
  'maildrop.cc',
  'mintemail.com',
  'sharklasers.com',
  'guerrillamail.info',
  'grr.la',
  'guerrillamail.biz',
  'guerrillamail.de',
  'spam4.me',
  'mailnesia.com',
  'mytemp.email'
];

/**
 * Validate email address format and check for disposable domains
 * @param {String} email - Email address to validate
 * @param {Boolean} allowDisposable - Whether to allow disposable email domains
 * @returns {Object} - { valid: boolean, message: string, email: string }
 */
function validateEmail(email, allowDisposable = false) {
  // Check if email is provided
  if (!email || typeof email !== 'string') {
    return {
      valid: false,
      message: 'Email is required',
      email: null
    };
  }

  // Trim and lowercase
  const cleanEmail = email.trim().toLowerCase();

  // Check format
  if (!validator.isEmail(cleanEmail)) {
    return {
      valid: false,
      message: 'Invalid email format',
      email: cleanEmail
    };
  }

  // Extract domain
  const domain = cleanEmail.split('@')[1];

  // Check against disposable email list
  if (!allowDisposable && DISPOSABLE_EMAIL_DOMAINS.includes(domain)) {
    return {
      valid: false,
      message: 'Disposable email addresses are not allowed. Please use a permanent email address.',
      email: cleanEmail
    };
  }

  // Check for suspicious patterns
  if (hasSuspiciousPatterns(cleanEmail)) {
    return {
      valid: false,
      message: 'Email address contains suspicious patterns',
      email: cleanEmail
    };
  }

  return {
    valid: true,
    message: 'Email is valid',
    email: cleanEmail
  };
}

/**
 * Check for suspicious patterns in email
 * @param {String} email - Email to check
 * @returns {Boolean} - True if suspicious
 */
function hasSuspiciousPatterns(email) {
  // Check for plus addressing abuse (e.g., spam+1@example.com, spam+2@example.com)
  const localPart = email.split('@')[0];

  // Too many plus signs
  if ((localPart.match(/\+/g) || []).length > 1) {
    return true;
  }

  // Very long local part (potential abuse)
  if (localPart.length > 64) {
    return true;
  }

  // Excessive numbers at the end (e.g., spam123456@example.com)
  if (/\d{6,}$/.test(localPart)) {
    return true;
  }

  return false;
}

/**
 * Validate recipient list and prevent bulk email abuse
 * @param {String|Array} recipients - Single email or array of emails
 * @param {Number} maxRecipients - Maximum number of recipients allowed
 * @returns {Object} - { valid: boolean, message: string, recipients: array, invalidEmails: array }
 */
function validateRecipients(recipients, maxRecipients = 10) {
  let recipientArray = [];

  // Convert to array
  if (typeof recipients === 'string') {
    recipientArray = recipients.split(',').map(e => e.trim());
  } else if (Array.isArray(recipients)) {
    recipientArray = recipients;
  } else {
    return {
      valid: false,
      message: 'Recipients must be a string or array',
      recipients: [],
      invalidEmails: []
    };
  }

  // Check max recipients
  if (recipientArray.length > maxRecipients) {
    return {
      valid: false,
      message: `Too many recipients. Maximum ${maxRecipients} recipients allowed.`,
      recipients: recipientArray,
      invalidEmails: []
    };
  }

  // Validate each email
  const validEmails = [];
  const invalidEmails = [];

  recipientArray.forEach(email => {
    const result = validateEmail(email, false);
    if (result.valid) {
      validEmails.push(result.email);
    } else {
      invalidEmails.push({ email, reason: result.message });
    }
  });

  if (invalidEmails.length > 0) {
    return {
      valid: false,
      message: `${invalidEmails.length} invalid email(s) found`,
      recipients: validEmails,
      invalidEmails
    };
  }

  return {
    valid: true,
    message: 'All recipients are valid',
    recipients: validEmails,
    invalidEmails: []
  };
}

/**
 * Express middleware to validate email in request body
 * @param {String} fieldName - Name of the email field in request body (default: 'email')
 * @param {Boolean} allowDisposable - Whether to allow disposable domains
 */
function validateEmailMiddleware(fieldName = 'email', allowDisposable = false) {
  return (req, res, next) => {
    const email = req.body[fieldName];
    const result = validateEmail(email, allowDisposable);

    if (!result.valid) {
      return res.status(400).json({
        success: false,
        message: result.message,
        error: 'INVALID_EMAIL'
      });
    }

    // Replace email with cleaned version
    req.body[fieldName] = result.email;
    next();
  };
}

/**
 * Check if email domain has MX records (domain actually receives email)
 * This is an advanced check and requires DNS lookup
 * NOTE: This is async and may slow down requests
 */
async function checkMXRecords(email) {
  const dns = require('dns').promises;
  const domain = email.split('@')[1];

  try {
    const mxRecords = await dns.resolveMx(domain);
    return {
      valid: mxRecords && mxRecords.length > 0,
      mxRecords
    };
  } catch (err) {
    // DNS lookup failed - domain doesn't exist or has no MX records
    return {
      valid: false,
      error: err.message
    };
  }
}

module.exports = {
  validateEmail,
  validateRecipients,
  validateEmailMiddleware,
  hasSuspiciousPatterns,
  checkMXRecords,
  DISPOSABLE_EMAIL_DOMAINS
};

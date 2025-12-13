/**
 * Mail Server Configuration
 *
 * Centralized configuration for email platform settings.
 * This replaces hardcoded noxtm.com references throughout the codebase.
 */

module.exports = {
  // Mail server infrastructure
  mailServer: {
    hostname: process.env.MAIL_SERVER_HOSTNAME || 'mail.noxtm.com',
    ip: process.env.MAIL_SERVER_IP || '185.137.122.61',
    // IMAP settings
    imap: {
      host: process.env.IMAP_HOST || '127.0.0.1', // localhost for hosted accounts
      port: process.env.IMAP_PORT || 993,
      secure: process.env.IMAP_SECURE !== 'false'
    },
    // SMTP settings
    smtp: {
      host: process.env.SMTP_HOST || '127.0.0.1',
      port: process.env.SMTP_PORT || 587,
      secure: process.env.SMTP_SECURE !== 'false'
    },
    // POP3 settings
    pop3: {
      host: process.env.POP3_HOST || '127.0.0.1',
      port: process.env.POP3_PORT || 995,
      secure: process.env.POP3_SECURE !== 'false'
    }
  },

  // System email addresses (for platform notifications)
  systemEmail: {
    from: process.env.SYSTEM_EMAIL_FROM || 'noreply@noxtm.com',
    replyTo: process.env.SYSTEM_EMAIL_REPLY_TO || 'support@noxtm.com',
    // Admin notifications
    admin: process.env.ADMIN_EMAIL || 'admin@noxtm.com',
    // DMARC reports
    dmarc: process.env.DMARC_EMAIL || 'dmarc@noxtm.com'
  },

  // Domain verification settings
  verification: {
    // Prefix for verification DNS records
    tokenPrefix: process.env.VERIFICATION_TOKEN_PREFIX || 'noxtm-verify',
    // Subdomain for verification records
    verificationSubdomain: process.env.VERIFICATION_SUBDOMAIN || '_noxtm-verify'
  },

  // Reserved domains that cannot be added by regular users
  reservedDomains: [
    'noxtm.com',
    'mail.noxtm.com',
    'localhost',
    'example.com',
    'test.com'
  ],

  // System email accounts preserved for platform use
  // These @noxtm.com accounts are exempt from user restrictions
  systemAccounts: [
    'noreply@noxtm.com',
    'support@noxtm.com',
    'admin@noxtm.com',
    'info@noxtm.com',
    'sales@noxtm.com',
    'contact@noxtm.com',
    'dmarc@noxtm.com'
  ],

  // Access control
  domainRestrictions: {
    // Admins can create accounts on any domain including noxtm.com
    adminCanUseReservedDomains: true,
    // Regular users must verify their own domains
    requireDomainVerification: true,
    // Minimum characters for domain name
    minDomainLength: 4,
    // Maximum domains per company
    maxDomainsPerCompany: parseInt(process.env.MAX_DOMAINS_PER_COMPANY) || 10
  },

  // DNS configuration for user domains
  dnsDefaults: {
    // TTL for DNS records (seconds)
    ttl: 3600,
    // MX record priority
    mxPriority: 10,
    // DKIM selector
    dkimSelector: 'default'
  },

  // AWS SES settings
  aws: {
    region: process.env.AWS_SDK_REGION || 'eu-north-1',
    // Whether to auto-register domains with AWS SES
    autoRegisterDomains: process.env.AWS_SES_AUTO_REGISTER !== 'false',
    // Whether to use AWS SES for sending
    enableSending: process.env.AWS_SES_ENABLE_SENDING !== 'false'
  },

  // Quota defaults for new domains
  quotaDefaults: {
    // Default total storage per domain (MB)
    totalQuotaMB: parseInt(process.env.DEFAULT_DOMAIN_QUOTA_MB) || 10240, // 10GB
    // Default max email accounts per domain
    maxAccounts: parseInt(process.env.DEFAULT_MAX_ACCOUNTS) || 50,
    // Default quota per email account (MB)
    accountQuotaMB: parseInt(process.env.DEFAULT_ACCOUNT_QUOTA_MB) || 1024 // 1GB
  }
};

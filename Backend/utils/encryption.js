const crypto = require('crypto');

// Encryption settings
const ALGORITHM = 'aes-256-cbc';
const ENCODING = 'hex';
const IV_LENGTH = 16;

/**
 * Get encryption key from environment or generate a default (MUST set in production)
 */
function getEncryptionKey() {
  const key = process.env.EMAIL_ENCRYPTION_KEY;
  
  if (!key) {
    console.warn('⚠️  EMAIL_ENCRYPTION_KEY not set in .env - using default key (INSECURE for production!)');
    // Default key for development only - MUST be changed in production
    return crypto.createHash('sha256').update('noxtm-default-encryption-key-change-in-production').digest();
  }
  
  // Hash the key to ensure it's exactly 32 bytes for AES-256
  return crypto.createHash('sha256').update(key).digest();
}

/**
 * Encrypt a password or sensitive string
 * @param {string} text - Plain text to encrypt
 * @returns {string} - Encrypted text in format: iv:encryptedData
 */
function encrypt(text) {
  try {
    if (!text) return '';
    
    const key = getEncryptionKey();
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
    
    let encrypted = cipher.update(text, 'utf8', ENCODING);
    encrypted += cipher.final(ENCODING);
    
    // Return IV and encrypted data separated by colon
    return `${iv.toString(ENCODING)}:${encrypted}`;
  } catch (error) {
    console.error('Encryption error:', error);
    throw new Error('Failed to encrypt data');
  }
}

/**
 * Decrypt an encrypted password or sensitive string
 * @param {string} encryptedText - Encrypted text in format: iv:encryptedData
 * @returns {string} - Decrypted plain text
 */
function decrypt(encryptedText) {
  try {
    if (!encryptedText) {
      console.warn('Attempted to decrypt empty or null value');
      return '';
    }
    
    const key = getEncryptionKey();
    const parts = encryptedText.split(':');
    
    if (parts.length !== 2) {
      console.error(`Invalid encrypted data format: expected "iv:data", got ${parts.length} parts`);
      throw new Error('Invalid encrypted data format');
    }
    
    const iv = Buffer.from(parts[0], ENCODING);
    const encryptedData = parts[1];
    
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    
    let decrypted = decipher.update(encryptedData, ENCODING, 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  } catch (error) {
    console.error('Decryption error:', error.message);
    if (error.code === 'ERR_OSSL_BAD_DECRYPT') {
      throw new Error('Failed to decrypt data - possibly wrong encryption key or corrupted data');
    }
    throw new Error(`Failed to decrypt data: ${error.message}`);
  }
}

/**
 * Generate a random secure password
 * @param {number} length - Password length (default: 16)
 * @returns {string} - Random password
 */
function generateSecurePassword(length = 16) {
  const lowercase = 'abcdefghijklmnopqrstuvwxyz';
  const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const numbers = '0123456789';
  const symbols = '!@#$%^&*()_+-=[]{}|;:,.<>?';
  
  const allChars = lowercase + uppercase + numbers + symbols;
  
  let password = '';
  
  // Ensure at least one of each type
  password += lowercase[Math.floor(Math.random() * lowercase.length)];
  password += uppercase[Math.floor(Math.random() * uppercase.length)];
  password += numbers[Math.floor(Math.random() * numbers.length)];
  password += symbols[Math.floor(Math.random() * symbols.length)];
  
  // Fill the rest randomly
  for (let i = password.length; i < length; i++) {
    password += allChars[Math.floor(Math.random() * allChars.length)];
  }
  
  // Shuffle the password
  return password.split('').sort(() => Math.random() - 0.5).join('');
}

module.exports = {
  encrypt,
  decrypt,
  generateSecurePassword
};

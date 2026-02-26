const mongoose = require('mongoose');
const crypto = require('crypto');

// Encryption key - use env variable or fallback
const ENCRYPTION_KEY = process.env.CREDENTIAL_ENCRYPTION_KEY || 'noxtm-credential-key-32chars!!'; // Must be 32 chars
const IV_LENGTH = 16;

function encrypt(text) {
    if (!text) return '';
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY, 'utf8'), iv);
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return iv.toString('hex') + ':' + encrypted;
}

function decrypt(text) {
    if (!text) return '';
    try {
        const parts = text.split(':');
        const iv = Buffer.from(parts.shift(), 'hex');
        const encrypted = parts.join(':');
        const decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY, 'utf8'), iv);
        let decrypted = decipher.update(encrypted, 'hex', 'utf8');
        decrypted += decipher.final('utf8');
        return decrypted;
    } catch (err) {
        console.error('Decryption error:', err.message);
        return '***decryption-error***';
    }
}

const socialMediaCredentialSchema = new mongoose.Schema({
    platform: {
        type: String,
        required: true,
        trim: true
    },
    email: {
        type: String,
        required: true,
        trim: true
    },
    password: {
        type: String,
        required: true
    },
    description: {
        type: String,
        trim: true,
        default: ''
    },
    sharedWith: [{
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        },
        sharedAt: {
            type: Date,
            default: Date.now
        }
    }],
    companyId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Company',
        required: true
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    }
}, {
    timestamps: true
});

// Indexes
socialMediaCredentialSchema.index({ companyId: 1, createdBy: 1 });
socialMediaCredentialSchema.index({ companyId: 1, 'sharedWith.user': 1 });

// Static methods for encryption/decryption
socialMediaCredentialSchema.statics.encryptPassword = encrypt;
socialMediaCredentialSchema.statics.decryptPassword = decrypt;

module.exports = mongoose.model('SocialMediaCredential', socialMediaCredentialSchema);

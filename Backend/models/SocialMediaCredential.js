const mongoose = require('mongoose');
const crypto = require('crypto');

// Derive a 32-byte key from env variable or fallback using SHA-256
const RAW_KEY = process.env.CREDENTIAL_ENCRYPTION_KEY || 'noxtm-credential-secret-key';
const ENCRYPTION_KEY = crypto.createHash('sha256').update(RAW_KEY).digest();
const IV_LENGTH = 16;

function encrypt(text) {
    if (!text) return '';
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv('aes-256-cbc', ENCRYPTION_KEY, iv);
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
        const decipher = crypto.createDecipheriv('aes-256-cbc', ENCRYPTION_KEY, iv);
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

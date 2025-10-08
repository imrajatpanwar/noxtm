const express = require('express');
const router = express.Router();
const nodemailer = require('nodemailer');

// Store email configurations in memory (in production, use a database)
const emailConfigs = new Map();

// Middleware to verify email configuration
const verifyEmailConfig = async (req, res, next) => {
    try {
        const userId = req.user.id; // Assuming you have authentication middleware
        const config = emailConfigs.get(userId);
        
        if (!config) {
            return res.status(400).json({ error: 'Email not configured' });
        }
        
        req.emailConfig = config;
        next();
    } catch (error) {
        res.status(500).json({ error: 'Internal server error' });
    }
};

// Setup email configuration
router.post('/setup', async (req, res) => {
    try {
        const { host, port, secure, auth, from } = req.body;
        const userId = req.user.id; // Assuming you have authentication middleware

        // Validate the configuration by attempting to create a transporter
        const transporter = nodemailer.createTransport({
            host,
            port: parseInt(port),
            secure: Boolean(secure),
            auth
        });

        // Verify the connection
        await transporter.verify();

        // Store the configuration (in production, save to database)
        emailConfigs.set(userId, {
            host,
            port: parseInt(port),
            secure: Boolean(secure),
            auth,
            from
        });

        res.status(200).json({ message: 'Email configuration saved successfully' });
    } catch (error) {
        console.error('Email setup error:', error);
        res.status(500).json({ error: 'Failed to save email configuration' });
    }
});

// Get email configuration
router.get('/config', async (req, res) => {
    try {
        const userId = req.user.id;
        const config = emailConfigs.get(userId);
        
        if (!config) {
            return res.status(404).json({ error: 'Email configuration not found' });
        }

        // Don't send the auth password back to the client
        const safeConfig = {
            ...config,
            auth: {
                user: config.auth.user,
                pass: '********'
            }
        };

        res.status(200).json(safeConfig);
    } catch (error) {
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Send email
router.post('/send', verifyEmailConfig, async (req, res) => {
    try {
        const { to, subject, html } = req.body;
        const config = req.emailConfig;

        const transporter = nodemailer.createTransport({
            host: config.host,
            port: config.port,
            secure: config.secure,
            auth: config.auth
        });

        const result = await transporter.sendMail({
            from: config.from,
            to,
            subject,
            html
        });

        res.status(200).json({ 
            message: 'Email sent successfully',
            messageId: result.messageId 
        });
    } catch (error) {
        console.error('Send email error:', error);
        res.status(500).json({ error: 'Failed to send email' });
    }
});

module.exports = router;
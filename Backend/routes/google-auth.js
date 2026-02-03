const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Company = require('../models/Company');

// Google OAuth configuration
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const GOOGLE_REDIRECT_URI = process.env.GOOGLE_REDIRECT_URI || 'http://localhost:5000/api/auth/google/callback';
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';
const JWT_SECRET = process.env.JWT_SECRET || 'noxtm-fallback-secret-key-change-in-production';

/**
 * @route   GET /api/auth/google
 * @desc    Redirect to Google OAuth consent screen
 * @access  Public
 */
router.get('/google', (req, res) => {
    if (!GOOGLE_CLIENT_ID) {
        return res.status(500).json({
            success: false,
            message: 'Google OAuth is not configured. Please set GOOGLE_CLIENT_ID in environment variables.'
        });
    }

    const scope = encodeURIComponent('openid email profile');
    const redirectUri = encodeURIComponent(GOOGLE_REDIRECT_URI);

    const googleAuthUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
        `client_id=${GOOGLE_CLIENT_ID}` +
        `&redirect_uri=${redirectUri}` +
        `&response_type=code` +
        `&scope=${scope}` +
        `&access_type=offline` +
        `&prompt=consent`;

    res.redirect(googleAuthUrl);
});

/**
 * @route   GET /api/auth/google/callback
 * @desc    Handle Google OAuth callback
 * @access  Public
 */
router.get('/google/callback', async (req, res) => {
    const { code, error } = req.query;

    if (error) {
        console.error('[GOOGLE AUTH] OAuth error:', error);
        return res.redirect(`${FRONTEND_URL}/login?error=google_auth_failed`);
    }

    if (!code) {
        return res.redirect(`${FRONTEND_URL}/login?error=no_code`);
    }

    try {
        // Exchange code for tokens
        const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: new URLSearchParams({
                code,
                client_id: GOOGLE_CLIENT_ID,
                client_secret: GOOGLE_CLIENT_SECRET,
                redirect_uri: GOOGLE_REDIRECT_URI,
                grant_type: 'authorization_code',
            }),
        });

        const tokenData = await tokenResponse.json();

        if (tokenData.error) {
            console.error('[GOOGLE AUTH] Token exchange error:', tokenData.error);
            return res.redirect(`${FRONTEND_URL}/login?error=token_exchange_failed`);
        }

        // Get user info from Google
        const userInfoResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
            headers: {
                Authorization: `Bearer ${tokenData.access_token}`,
            },
        });

        const googleUser = await userInfoResponse.json();

        if (!googleUser.email) {
            console.error('[GOOGLE AUTH] No email in Google response');
            return res.redirect(`${FRONTEND_URL}/login?error=no_email`);
        }

        console.log('[GOOGLE AUTH] Google user:', { email: googleUser.email, name: googleUser.name });

        // Check if user exists
        let user = await User.findOne({ email: googleUser.email });

        if (user) {
            // Existing user - update Google ID if not set
            if (!user.googleId) {
                user.googleId = googleUser.id;
                user.profileImage = user.profileImage || googleUser.picture;
                await user.save();
            }
            console.log('[GOOGLE AUTH] Existing user logged in:', user.email);
        } else {
            // Create new user
            // First, create a company for the user
            const company = new Company({
                name: `${googleUser.name}'s Workspace`,
                email: googleUser.email,
                createdAt: new Date()
            });
            await company.save();

            user = new User({
                fullName: googleUser.name,
                email: googleUser.email,
                googleId: googleUser.id,
                profileImage: googleUser.picture,
                role: 'User',
                companyId: company._id,
                isEmailVerified: true, // Google emails are verified
                permissions: {
                    dashboard: true,
                    dataCenter: true,
                    projects: true,
                    teamCommunication: true,
                    digitalMediaManagement: true,
                    marketing: true,
                    hrManagement: true,
                    financeManagement: true,
                    seoManagement: true,
                    internalPolicies: true,
                    settingsConfiguration: false
                },
                subscription: {
                    plan: 'Trial',
                    status: 'trial',
                    startDate: new Date(),
                    endDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000) // 14 day trial
                }
            });
            await user.save();

            // Update company with owner
            company.owner = user._id;
            company.members = [{ user: user._id, role: 'Owner', joinedAt: new Date() }];
            await company.save();

            console.log('[GOOGLE AUTH] New user created:', user.email);
        }

        // Generate JWT token
        const token = jwt.sign(
            {
                userId: user._id,
                email: user.email,
                role: user.role,
                companyId: user.companyId
            },
            JWT_SECRET,
            { expiresIn: '7d' }
        );

        // Redirect to frontend with token
        const redirectUrl = `${FRONTEND_URL}/auth/callback?token=${encodeURIComponent(token)}`;
        res.redirect(redirectUrl);

    } catch (error) {
        console.error('[GOOGLE AUTH] Error:', error);
        res.redirect(`${FRONTEND_URL}/login?error=server_error`);
    }
});

module.exports = router;

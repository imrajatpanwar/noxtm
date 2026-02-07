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

/**
 * @route   POST /api/auth/google/one-tap
 * @desc    Handle Google One Tap sign-in
 * @access  Public
 */
router.post('/google/one-tap', async (req, res) => {
    const { credential } = req.body;

    if (!credential) {
        return res.status(400).json({ success: false, message: 'No credential provided' });
    }

    try {
        // Verify the credential with Google
        const verifyResponse = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${credential}`);
        const googleData = await verifyResponse.json();

        if (googleData.error) {
            console.error('[GOOGLE ONE TAP] Verification error:', googleData.error);
            return res.status(401).json({ success: false, message: 'Invalid credential' });
        }

        // Verify the audience (client ID) matches
        if (googleData.aud !== GOOGLE_CLIENT_ID) {
            console.error('[GOOGLE ONE TAP] Client ID mismatch');
            return res.status(401).json({ success: false, message: 'Invalid client ID' });
        }

        if (!googleData.email) {
            console.error('[GOOGLE ONE TAP] No email in token');
            return res.status(400).json({ success: false, message: 'No email found' });
        }

        console.log('[GOOGLE ONE TAP] Verified user:', { email: googleData.email, name: googleData.name });

        // Check if user exists
        let user = await User.findOne({ email: googleData.email });

        if (user) {
            // Existing user - update Google ID if not set
            if (!user.googleId) {
                user.googleId = googleData.sub;
                user.profileImage = user.profileImage || googleData.picture;
                await user.save();
            }
            console.log('[GOOGLE ONE TAP] Existing user logged in:', user.email);
        } else {
            // Create new user
            const company = new Company({
                name: `${googleData.name}'s Workspace`,
                email: googleData.email,
                createdAt: new Date()
            });
            await company.save();

            user = new User({
                fullName: googleData.name,
                email: googleData.email,
                googleId: googleData.sub,
                profileImage: googleData.picture,
                role: 'User',
                companyId: company._id,
                isEmailVerified: true,
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
                    endDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000)
                }
            });
            await user.save();

            company.owner = user._id;
            company.members = [{ user: user._id, role: 'Owner', joinedAt: new Date() }];
            await company.save();

            console.log('[GOOGLE ONE TAP] New user created:', user.email);
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

        res.json({
            success: true,
            token,
            user: {
                _id: user._id,
                fullName: user.fullName,
                email: user.email,
                role: user.role,
                companyId: user.companyId,
                profileImage: user.profileImage
            }
        });

    } catch (error) {
        console.error('[GOOGLE ONE TAP] Error:', error);
        res.status(500).json({ success: false, message: 'Server error during authentication' });
    }
});

module.exports = router;

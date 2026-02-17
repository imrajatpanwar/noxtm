const express = require('express');
const router = express.Router();
const LinkedInSession = require('../models/LinkedInSession');
const { authenticateToken: auth } = require('../middleware/auth');

// @route   POST /api/linkedin-sessions
// @desc    Save a new LinkedIn session
// @access  Private
router.post('/', auth, async (req, res) => {
    try {
        const { profileName, liAtCookie, accountName, allCookies, profileImageUrl } = req.body;

        if (!profileName || !liAtCookie) {
            return res.status(400).json({
                success: false,
                message: 'Profile name and li_at cookie are required'
            });
        }

        // Check if session with same li_at cookie already exists for this user
        const existingSession = await LinkedInSession.findOne({
            userId: req.user.id,
            liAtCookie: liAtCookie
        });

        if (existingSession) {
            // Update existing session
            existingSession.profileName = profileName;
            existingSession.status = 'active';
            if (allCookies && Array.isArray(allCookies)) {
                existingSession.allCookies = allCookies;
            }
            if (profileImageUrl) {
                existingSession.profileImageUrl = profileImageUrl;
            }
            await existingSession.save();

            return res.json({
                success: true,
                message: 'Session updated successfully',
                session: existingSession
            });
        }

        // Create new session
        const session = new LinkedInSession({
            userId: req.user.id,
            profileName,
            liAtCookie,
            accountName: accountName || profileName,
            allCookies: allCookies || [],
            profileImageUrl: profileImageUrl || '',
            status: 'active'
        });

        await session.save();

        res.status(201).json({
            success: true,
            message: 'Session saved successfully',
            session
        });

    } catch (error) {
        console.error('Error saving LinkedIn session:', error);
        res.status(500).json({
            success: false,
            message: 'Server error while saving session'
        });
    }
});

// @route   GET /api/linkedin-sessions
// @desc    Get all LinkedIn sessions for the user
// @access  Private
router.get('/', auth, async (req, res) => {
    try {
        const sessions = await LinkedInSession.find({ userId: req.user.id })
            .sort({ createdAt: -1 });

        res.json({
            success: true,
            sessions
        });

    } catch (error) {
        console.error('Error fetching LinkedIn sessions:', error);
        res.status(500).json({
            success: false,
            message: 'Server error while fetching sessions'
        });
    }
});

// @route   GET /api/linkedin-sessions/:id
// @desc    Get a single LinkedIn session
// @access  Private
router.get('/:id', auth, async (req, res) => {
    try {
        const session = await LinkedInSession.findOne({
            _id: req.params.id,
            userId: req.user.id
        });

        if (!session) {
            return res.status(404).json({
                success: false,
                message: 'Session not found'
            });
        }

        res.json({
            success: true,
            session
        });

    } catch (error) {
        console.error('Error fetching LinkedIn session:', error);
        res.status(500).json({
            success: false,
            message: 'Server error while fetching session'
        });
    }
});

// @route   PUT /api/linkedin-sessions/:id
// @desc    Update a LinkedIn session (e.g., rename)
// @access  Private
router.put('/:id', auth, async (req, res) => {
    try {
        const { accountName, status } = req.body;

        const session = await LinkedInSession.findOne({
            _id: req.params.id,
            userId: req.user.id
        });

        if (!session) {
            return res.status(404).json({
                success: false,
                message: 'Session not found'
            });
        }

        if (accountName !== undefined) {
            session.accountName = accountName;
        }

        if (status !== undefined) {
            session.status = status;
        }

        await session.save();

        res.json({
            success: true,
            message: 'Session updated successfully',
            session
        });

    } catch (error) {
        console.error('Error updating LinkedIn session:', error);
        res.status(500).json({
            success: false,
            message: 'Server error while updating session'
        });
    }
});

// @route   PUT /api/linkedin-sessions/:id/use
// @desc    Mark session as used (for login tracking)
// @access  Private
router.put('/:id/use', auth, async (req, res) => {
    try {
        const session = await LinkedInSession.findOne({
            _id: req.params.id,
            userId: req.user.id
        });

        if (!session) {
            return res.status(404).json({
                success: false,
                message: 'Session not found'
            });
        }

        await session.markUsed();

        res.json({
            success: true,
            message: 'Session marked as used',
            session
        });

    } catch (error) {
        console.error('Error marking LinkedIn session as used:', error);
        res.status(500).json({
            success: false,
            message: 'Server error while marking session as used'
        });
    }
});

// @route   DELETE /api/linkedin-sessions/:id
// @desc    Delete a LinkedIn session
// @access  Private
router.delete('/:id', auth, async (req, res) => {
    try {
        const session = await LinkedInSession.findOneAndDelete({
            _id: req.params.id,
            userId: req.user.id
        });

        if (!session) {
            return res.status(404).json({
                success: false,
                message: 'Session not found'
            });
        }

        res.json({
            success: true,
            message: 'Session deleted successfully'
        });

    } catch (error) {
        console.error('Error deleting LinkedIn session:', error);
        res.status(500).json({
            success: false,
            message: 'Server error while deleting session'
        });
    }
});

module.exports = router;

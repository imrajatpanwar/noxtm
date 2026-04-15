const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const SocialMediaPost = require('../models/SocialMediaPost');
const SocialMediaAccount = require('../models/SocialMediaAccount');
const ContentTemplate = require('../models/ContentTemplate');
const SocialMediaCredential = require('../models/SocialMediaCredential');
const User = require('../models/User');
const socketStore = require('../utils/socketStore');

// JWT authentication middleware
const jwt = require('jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET || 'noxtm-fallback-secret-key-change-in-production';

const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    let token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        token = req.cookies?.auth_token;
    }

    if (!token) {
        return res.status(401).json({ message: 'Access token required' });
    }

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) {
            return res.status(403).json({ message: 'Invalid token' });
        }
        req.user = user;
        next();
    });
};

// Middleware to ensure company access
const requireCompanyAccess = async (req, res, next) => {
    try {
        const user = await User.findById(req.user.userId);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        if (!user.companyId) {
            return res.status(403).json({ message: 'No company associated with this user' });
        }
        req.companyId = user.companyId;
        req.userId = user._id;
        req.currentUser = user;
        next();
    } catch (error) {
        console.error('Company access check error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

// ==========================================
// PUBLIC SHARE ROUTE — no auth required
// Must be defined BEFORE router.use(auth)
// ==========================================

router.get('/public/:token', async (req, res) => {
    try {
        const SharedCalendarLink = require('../models/SharedCalendarLink');
        const link = await SharedCalendarLink.findOne({ token: req.params.token, active: true });
        if (!link) return res.status(404).json({ message: 'Invalid or expired link' });

        const [posts, accounts] = await Promise.all([
            SocialMediaPost.find({ companyId: link.companyId })
                .sort({ postDate: 1, postTime: 1 })
                .select('title content postDate postTime platform postType status priority labels referenceLinks socialMediaAccount'),
            SocialMediaAccount.find({ companyId: link.companyId })
                .select('name platform handle color')
        ]);

        res.json({ posts, accounts });
    } catch (error) {
        console.error('[SharedCalendar] Public fetch error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Apply authentication to all routes below
router.use(authenticateToken);
router.use(requireCompanyAccess);

// Configure multer for social media file uploads
const smStorage = multer.diskStorage({
    destination: function (req, file, cb) {
        const uploadDir = path.join(__dirname, '..', 'uploads', 'social-media');
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, 'sm-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const smUpload = multer({
    storage: smStorage,
    limits: {
        fileSize: 25 * 1024 * 1024 // 25MB limit for images/videos
    },
    fileFilter: (req, file, cb) => {
        const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'video/mp4', 'video/quicktime', 'video/webm'];
        if (allowedTypes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('Only image and video files are allowed'), false);
        }
    }
});

// ==========================================
// ACCOUNT ENDPOINTS
// ==========================================

// GET /api/social-media-calendar/accounts - List all accounts
router.get('/accounts', async (req, res) => {
    try {
        const accounts = await SocialMediaAccount.find({ companyId: req.companyId })
            .populate('createdBy', 'fullName email profileImage')
            .populate('assignedTo', 'fullName email profileImage')
            .sort({ createdAt: -1 });

        res.json({ accounts });
    } catch (error) {
        console.error('Error fetching social media accounts:', error);
        res.status(500).json({ message: 'Failed to fetch accounts' });
    }
});

// POST /api/social-media-calendar/accounts - Create new account
router.post('/accounts', async (req, res) => {
    try {
        const { name, platform, handle, color, assignedTo, defaultLabels } = req.body;

        if (!name || !name.trim()) {
            return res.status(400).json({ message: 'Account name is required' });
        }
        if (!platform) {
            return res.status(400).json({ message: 'Platform is required' });
        }

        const account = new SocialMediaAccount({
            name: name.trim(),
            platform,
            handle: handle || '',
            color: color || '#6366f1',
            assignedTo: Array.isArray(assignedTo) ? assignedTo.filter(Boolean) : (assignedTo ? [assignedTo] : []),
            defaultLabels: defaultLabels || [],
            companyId: req.companyId,
            createdBy: req.userId
        });

        await account.save();

        const populatedAccount = await SocialMediaAccount.findById(account._id)
            .populate('createdBy', 'fullName email profileImage')
            .populate('assignedTo', 'fullName email profileImage');

        res.status(201).json(populatedAccount);
    } catch (error) {
        console.error('Error creating social media account:', error);
        res.status(500).json({ message: 'Failed to create account' });
    }
});

// PUT /api/social-media-calendar/accounts/:id - Update account
router.put('/accounts/:id', async (req, res) => {
    try {
        const { name, platform, handle, color, isActive, assignedTo, defaultLabels } = req.body;

        const account = await SocialMediaAccount.findOne({
            _id: req.params.id,
            companyId: req.companyId
        });

        if (!account) {
            return res.status(404).json({ message: 'Account not found' });
        }

        if (name) account.name = name.trim();
        if (platform) account.platform = platform;
        if (handle !== undefined) account.handle = handle;
        if (color) account.color = color;
        if (isActive !== undefined) account.isActive = isActive;
        if (assignedTo !== undefined) account.assignedTo = Array.isArray(assignedTo) ? assignedTo.filter(Boolean) : (assignedTo ? [assignedTo] : []);
        if (defaultLabels !== undefined) account.defaultLabels = defaultLabels;

        await account.save();

        const populatedAccount = await SocialMediaAccount.findById(account._id)
            .populate('createdBy', 'fullName email profileImage')
            .populate('assignedTo', 'fullName email profileImage');

        res.json(populatedAccount);
    } catch (error) {
        console.error('Error updating social media account:', error);
        res.status(500).json({ message: 'Failed to update account' });
    }
});

// PUT /api/social-media-calendar/accounts/:id/assign - Assign user to account
router.put('/accounts/:id/assign', async (req, res) => {
    try {
        const { assignedTo } = req.body;

        const account = await SocialMediaAccount.findOne({
            _id: req.params.id,
            companyId: req.companyId
        });

        if (!account) {
            return res.status(404).json({ message: 'Account not found' });
        }

        account.assignedTo = Array.isArray(assignedTo) ? assignedTo.filter(Boolean) : (assignedTo ? [assignedTo] : []);
        await account.save();

        const populatedAccount = await SocialMediaAccount.findById(account._id)
            .populate('createdBy', 'fullName email profileImage')
            .populate('assignedTo', 'fullName email profileImage');

        res.json(populatedAccount);
    } catch (error) {
        console.error('Error assigning account:', error);
        res.status(500).json({ message: 'Failed to assign account' });
    }
});

// PUT /api/social-media-calendar/accounts/:id/hashtag-groups - Manage hashtag groups
router.put('/accounts/:id/hashtag-groups', async (req, res) => {
    try {
        const { hashtagGroups } = req.body;

        const account = await SocialMediaAccount.findOne({
            _id: req.params.id,
            companyId: req.companyId
        });

        if (!account) {
            return res.status(404).json({ message: 'Account not found' });
        }

        account.hashtagGroups = hashtagGroups || [];
        await account.save();

        const populatedAccount = await SocialMediaAccount.findById(account._id)
            .populate('createdBy', 'fullName email profileImage')
            .populate('assignedTo', 'fullName email profileImage');

        res.json(populatedAccount);
    } catch (error) {
        console.error('Error updating hashtag groups:', error);
        res.status(500).json({ message: 'Failed to update hashtag groups' });
    }
});

// DELETE /api/social-media-calendar/accounts/:id - Delete account
router.delete('/accounts/:id', async (req, res) => {
    try {
        const account = await SocialMediaAccount.findOneAndDelete({
            _id: req.params.id,
            companyId: req.companyId
        });

        if (!account) {
            return res.status(404).json({ message: 'Account not found' });
        }

        // Also delete all posts for this account
        await SocialMediaPost.deleteMany({
            socialMediaAccount: req.params.id,
            companyId: req.companyId
        });

        res.json({ message: 'Account and associated posts deleted successfully' });
    } catch (error) {
        console.error('Error deleting social media account:', error);
        res.status(500).json({ message: 'Failed to delete account' });
    }
});

// ==========================================
// POST ENDPOINTS
// ==========================================

// GET /api/social-media-calendar/posts - Get posts (filtered by month/year/account)
router.get('/posts', async (req, res) => {
    try {
        const { month, year, accountId, status } = req.query;

        const query = { companyId: req.companyId };

        // Filter by month/year
        if (month !== undefined && year !== undefined) {
            const startDate = new Date(parseInt(year), parseInt(month), 1);
            const endDate = new Date(parseInt(year), parseInt(month) + 1, 0, 23, 59, 59);
            query.postDate = { $gte: startDate, $lte: endDate };
        }

        // Filter by account
        if (accountId && accountId !== 'all') {
            query.socialMediaAccount = accountId;
        }

        // Filter by status
        if (status) {
            query.status = status;
        }

        const posts = await SocialMediaPost.find(query)
            .populate({
                path: 'socialMediaAccount',
                select: 'name platform color handle assignedTo',
                populate: { path: 'assignedTo', select: 'fullName email profileImage' }
            })
            .populate('reviewedBy', 'fullName email profileImage')
            .populate('createdBy', 'fullName email profileImage')
            .populate('comments.author', 'fullName email profileImage')
            .populate('mediaFiles.uploadedBy', 'fullName email profileImage')
            .sort({ postDate: 1, postTime: 1 });

        res.json({ posts });
    } catch (error) {
        console.error('Error fetching posts:', error);
        res.status(500).json({ message: 'Failed to fetch posts' });
    }
});

// GET /api/social-media-calendar/posts/export - Export posts as CSV
router.get('/posts/export', async (req, res) => {
    try {
        const { month, year, accountId } = req.query;
        const query = { companyId: req.companyId };

        if (month !== undefined && year !== undefined) {
            const startDate = new Date(parseInt(year), parseInt(month), 1);
            const endDate = new Date(parseInt(year), parseInt(month) + 1, 0, 23, 59, 59);
            query.postDate = { $gte: startDate, $lte: endDate };
        }
        if (accountId && accountId !== 'all') {
            query.socialMediaAccount = accountId;
        }

        const posts = await SocialMediaPost.find(query)
            .populate('socialMediaAccount', 'name platform')
            .populate('createdBy', 'fullName')
            .sort({ postDate: 1, postTime: 1 });

        // Build CSV
        const headers = ['Title', 'Content', 'Date', 'Time', 'Platform', 'Account', 'Status', 'Priority', 'Labels', 'Created By', 'Media Count'];
        const rows = posts.map(p => [
            `"${(p.title || '').replace(/"/g, '""')}"`,
            `"${(p.content || '').replace(/"/g, '""').replace(/\n/g, ' ')}"`,
            new Date(p.postDate).toLocaleDateString(),
            p.postTime || '',
            p.platform || '',
            p.socialMediaAccount?.name || '',
            p.status || '',
            p.priority || 'Medium',
            `"${(p.labels || []).join(', ')}"`,
            p.createdBy?.fullName || '',
            (p.mediaFiles || []).length
        ]);

        const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');

        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename=content-calendar-export.csv`);
        res.send(csv);
    } catch (error) {
        console.error('Error exporting posts:', error);
        res.status(500).json({ message: 'Failed to export' });
    }
});

// GET /api/social-media-calendar/posts/:id - Get single post
router.get('/posts/:id', async (req, res) => {
    try {
        const post = await SocialMediaPost.findOne({
            _id: req.params.id,
            companyId: req.companyId
        })
            .populate({
                path: 'socialMediaAccount',
                select: 'name platform color handle assignedTo hashtagGroups',
                populate: { path: 'assignedTo', select: 'fullName email profileImage' }
            })
            .populate('reviewedBy', 'fullName email profileImage')
            .populate('createdBy', 'fullName email profileImage')
            .populate('comments.author', 'fullName email profileImage')
            .populate('activity.user', 'fullName email profileImage')
            .populate('mediaFiles.uploadedBy', 'fullName email profileImage');

        if (!post) {
            return res.status(404).json({ message: 'Post not found' });
        }

        res.json(post);
    } catch (error) {
        console.error('Error fetching post:', error);
        res.status(500).json({ message: 'Failed to fetch post' });
    }
});

// POST /api/social-media-calendar/posts - Create new post
router.post('/posts', async (req, res) => {
    try {
        const { title, content, postDate, postTime, platform, socialMediaAccount, labels, notes, status, priority, isRecurring, recurringPattern, templateId, referenceImages } = req.body;

        if (!title || !title.trim()) {
            return res.status(400).json({ message: 'Title is required' });
        }
        if (!postDate) {
            return res.status(400).json({ message: 'Post date is required' });
        }
        if (!platform) {
            return res.status(400).json({ message: 'Platform is required' });
        }

        const post = new SocialMediaPost({
            title: title.trim(),
            content: content || '',
            postDate: new Date(postDate),
            postTime: postTime || '10:00 AM',
            status: status || 'Draft',
            platform,
            priority: priority || 'Medium',
            socialMediaAccount: socialMediaAccount || null,
            isRecurring: isRecurring || false,
            recurringPattern: recurringPattern || null,
            templateId: templateId || null,
            labels: labels || [],
            notes: notes || '',
            referenceImages: Array.isArray(referenceImages) ? referenceImages.map(img => ({ ...img, addedBy: req.userId })) : [],
            createdBy: req.userId,
            companyId: req.companyId,
            activity: [{
                user: req.userId,
                action: 'created',
                details: 'Post created'
            }]
        });

        await post.save();

        // If recurring, create future posts
        if (isRecurring && recurringPattern) {
            const futurePosts = [];
            const baseDate = new Date(postDate);
            const count = recurringPattern === 'weekly' ? 4 : recurringPattern === 'biweekly' ? 4 : 3;
            const increment = recurringPattern === 'weekly' ? 7 : recurringPattern === 'biweekly' ? 14 : 30;

            for (let i = 1; i <= count; i++) {
                const futureDate = new Date(baseDate);
                futureDate.setDate(futureDate.getDate() + (increment * i));
                futurePosts.push({
                    title: title.trim(),
                    content: content || '',
                    postDate: futureDate,
                    postTime: postTime || '10:00 AM',
                    status: 'Draft',
                    platform,
                    priority: priority || 'Medium',
                    socialMediaAccount: socialMediaAccount || null,
                    isRecurring: true,
                    recurringPattern,
                    labels: labels || [],
                    notes: notes || '',
                    createdBy: req.userId,
                    companyId: req.companyId,
                    activity: [{
                        user: req.userId,
                        action: 'created',
                        details: `Recurring post created (${recurringPattern})`
                    }]
                });
            }
            if (futurePosts.length > 0) {
                await SocialMediaPost.insertMany(futurePosts);
            }
        }

        const populatedPost = await SocialMediaPost.findById(post._id)
            .populate({
                path: 'socialMediaAccount',
                select: 'name platform color handle assignedTo',
                populate: { path: 'assignedTo', select: 'fullName email profileImage' }
            })
            .populate('createdBy', 'fullName email profileImage');

        // Notify other users assigned to this account
        try {
            if (populatedPost.socialMediaAccount) {
                const account = populatedPost.socialMediaAccount;
                const creator = populatedPost.createdBy;
                const assignedUsers = (account.assignedTo || [])
                    .map(u => (u._id || u).toString())
                    .filter(uid => uid !== req.userId.toString());

                if (assignedUsers.length > 0) {
                    socketStore.emitToUsers(assignedUsers, 'calendar:post-created', {
                        postId: populatedPost._id,
                        title: populatedPost.title,
                        accountName: account.name,
                        platform: account.platform,
                        creatorName: creator?.fullName || creator?.email || 'Someone',
                        postDate: populatedPost.postDate,
                    });
                }
            }
        } catch (_) { /* non-critical */ }

        res.status(201).json(populatedPost);
    } catch (error) {
        console.error('Error creating post:', error);
        res.status(500).json({ message: 'Failed to create post' });
    }
});

// PUT /api/social-media-calendar/posts/:id - Update post
router.put('/posts/:id', async (req, res) => {
    try {
        const { title, content, postDate, postTime, platform, socialMediaAccount, labels, notes, priority, referenceImages } = req.body;

        const post = await SocialMediaPost.findOne({
            _id: req.params.id,
            companyId: req.companyId
        });

        if (!post) {
            return res.status(404).json({ message: 'Post not found' });
        }

        // Track changes
        const changes = [];
        if (title && title !== post.title) changes.push(`Title updated`);
        if (postDate && new Date(postDate).toDateString() !== post.postDate.toDateString()) changes.push(`Date changed`);
        if (platform && platform !== post.platform) changes.push(`Platform changed to ${platform}`);
        if (priority && priority !== post.priority) changes.push(`Priority changed to ${priority}`);

        // Update fields
        if (title) post.title = title.trim();
        if (content !== undefined) post.content = content;
        if (postDate) post.postDate = new Date(postDate);
        if (postTime) post.postTime = postTime;
        if (platform) post.platform = platform;
        if (socialMediaAccount !== undefined) post.socialMediaAccount = socialMediaAccount || null;
        if (labels) post.labels = labels;
        if (notes !== undefined) post.notes = notes;
        if (priority) post.priority = priority;
        if (Array.isArray(referenceImages)) post.referenceImages = referenceImages.map(img => ({ ...img, addedBy: img.addedBy || req.userId }));

        if (changes.length > 0) {
            post.activity.push({
                user: req.userId,
                action: 'updated',
                details: changes.join(', ')
            });
        }

        await post.save();

        const populatedPost = await SocialMediaPost.findById(post._id)
            .populate({
                path: 'socialMediaAccount',
                select: 'name platform color handle assignedTo',
                populate: { path: 'assignedTo', select: 'fullName email profileImage' }
            })
            .populate('createdBy', 'fullName email profileImage')
            .populate('comments.author', 'fullName email profileImage');

        res.json(populatedPost);
    } catch (error) {
        console.error('Error updating post:', error);
        res.status(500).json({ message: 'Failed to update post' });
    }
});

// DELETE /api/social-media-calendar/posts/:id - Delete post
router.delete('/posts/:id', async (req, res) => {
    try {
        const post = await SocialMediaPost.findOneAndDelete({
            _id: req.params.id,
            companyId: req.companyId
        });

        if (!post) {
            return res.status(404).json({ message: 'Post not found' });
        }

        // Clean up uploaded files
        if (post.mediaFiles && post.mediaFiles.length > 0) {
            post.mediaFiles.forEach(file => {
                const filePath = path.join(__dirname, '..', 'uploads', 'social-media', file.filename);
                if (fs.existsSync(filePath)) {
                    fs.unlinkSync(filePath);
                }
            });
        }

        res.json({ message: 'Post deleted successfully' });
    } catch (error) {
        console.error('Error deleting post:', error);
        res.status(500).json({ message: 'Failed to delete post' });
    }
});

// PUT /api/social-media-calendar/posts/:id/status - Change post status
router.put('/posts/:id/status', async (req, res) => {
    try {
        const { status } = req.body;
        const validStatuses = ['Draft', 'Pending Review', 'Approved', 'Scheduled', 'Published', 'Rejected'];

        if (!validStatuses.includes(status)) {
            return res.status(400).json({ message: 'Invalid status' });
        }

        const post = await SocialMediaPost.findOne({
            _id: req.params.id,
            companyId: req.companyId
        });

        if (!post) {
            return res.status(404).json({ message: 'Post not found' });
        }

        const oldStatus = post.status;
        post.status = status;

        // Track approval/rejection
        if (status === 'Approved' || status === 'Rejected') {
            post.reviewedBy = req.userId;
        }

        const actionType = status === 'Approved' ? 'approved' : status === 'Rejected' ? 'rejected' : 'status_changed';

        post.activity.push({
            user: req.userId,
            action: actionType,
            details: `Status changed from ${oldStatus} to ${status}`
        });

        await post.save();

        const populatedPost = await SocialMediaPost.findById(post._id)
            .populate({
                path: 'socialMediaAccount',
                select: 'name platform color handle assignedTo',
                populate: { path: 'assignedTo', select: 'fullName email profileImage' }
            })
            .populate('reviewedBy', 'fullName email profileImage')
            .populate('createdBy', 'fullName email profileImage');

        res.json(populatedPost);
    } catch (error) {
        console.error('Error updating post status:', error);
        res.status(500).json({ message: 'Failed to update status' });
    }
});

// POST /api/social-media-calendar/posts/bulk-status - Bulk update status
router.post('/posts/bulk-status', async (req, res) => {
    try {
        const { postIds, status } = req.body;
        const validStatuses = ['Draft', 'Pending Review', 'Approved', 'Scheduled', 'Published', 'Rejected'];

        if (!postIds || !Array.isArray(postIds) || postIds.length === 0) {
            return res.status(400).json({ message: 'Post IDs are required' });
        }
        if (!validStatuses.includes(status)) {
            return res.status(400).json({ message: 'Invalid status' });
        }

        const result = await SocialMediaPost.updateMany(
            { _id: { $in: postIds }, companyId: req.companyId },
            {
                $set: { status },
                $push: {
                    activity: {
                        user: req.userId,
                        action: 'status_changed',
                        details: `Bulk status change to ${status}`,
                        createdAt: new Date()
                    }
                }
            }
        );

        res.json({ message: `${result.modifiedCount} posts updated`, modifiedCount: result.modifiedCount });
    } catch (error) {
        console.error('Error bulk updating posts:', error);
        res.status(500).json({ message: 'Failed to bulk update posts' });
    }
});

// DELETE /api/social-media-calendar/posts/bulk - Bulk delete posts
router.delete('/posts/bulk', async (req, res) => {
    try {
        const { postIds } = req.body;

        if (!postIds || !Array.isArray(postIds) || postIds.length === 0) {
            return res.status(400).json({ message: 'Post IDs are required' });
        }

        // Get posts to clean up files
        const posts = await SocialMediaPost.find({ _id: { $in: postIds }, companyId: req.companyId });

        // Delete physical files
        posts.forEach(post => {
            if (post.mediaFiles && post.mediaFiles.length > 0) {
                post.mediaFiles.forEach(file => {
                    const filePath = path.join(__dirname, '..', 'uploads', 'social-media', file.filename);
                    if (fs.existsSync(filePath)) {
                        fs.unlinkSync(filePath);
                    }
                });
            }
        });

        const result = await SocialMediaPost.deleteMany({ _id: { $in: postIds }, companyId: req.companyId });

        res.json({ message: `${result.deletedCount} posts deleted`, deletedCount: result.deletedCount });
    } catch (error) {
        console.error('Error bulk deleting posts:', error);
        res.status(500).json({ message: 'Failed to bulk delete posts' });
    }
});

// POST /api/social-media-calendar/posts/:id/upload - Upload media files
router.post('/posts/:id/upload', smUpload.array('files', 10), async (req, res) => {
    try {
        const post = await SocialMediaPost.findOne({
            _id: req.params.id,
            companyId: req.companyId
        });

        if (!post) {
            // Clean up uploaded files if post not found
            if (req.files) {
                req.files.forEach(f => fs.unlinkSync(f.path));
            }
            return res.status(404).json({ message: 'Post not found' });
        }

        if (!req.files || req.files.length === 0) {
            return res.status(400).json({ message: 'No files uploaded' });
        }

        const newFiles = req.files.map(file => ({
            url: `/uploads/social-media/${file.filename}`,
            filename: file.filename,
            originalName: file.originalname,
            mimeType: file.mimetype,
            size: file.size,
            uploadedBy: req.userId,
            uploadedAt: new Date()
        }));

        post.mediaFiles.push(...newFiles);

        post.activity.push({
            user: req.userId,
            action: 'file_uploaded',
            details: `Uploaded ${req.files.length} file(s): ${req.files.map(f => f.originalname).join(', ')}`
        });

        await post.save();

        const populatedPost = await SocialMediaPost.findById(post._id)
            .populate({
                path: 'socialMediaAccount',
                select: 'name platform color handle assignedTo',
                populate: { path: 'assignedTo', select: 'fullName email profileImage' }
            })
            .populate('createdBy', 'fullName email profileImage')
            .populate('mediaFiles.uploadedBy', 'fullName email profileImage');

        res.json(populatedPost);
    } catch (error) {
        console.error('Error uploading files:', error);
        res.status(500).json({ message: 'Failed to upload files' });
    }
});

// DELETE /api/social-media-calendar/posts/:id/media/:mediaId - Remove a media file
router.delete('/posts/:id/media/:mediaId', async (req, res) => {
    try {
        const post = await SocialMediaPost.findOne({
            _id: req.params.id,
            companyId: req.companyId
        });

        if (!post) {
            return res.status(404).json({ message: 'Post not found' });
        }

        const mediaFile = post.mediaFiles.id(req.params.mediaId);
        if (!mediaFile) {
            return res.status(404).json({ message: 'Media file not found' });
        }

        // Delete physical file
        const filePath = path.join(__dirname, '..', 'uploads', 'social-media', mediaFile.filename);
        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
        }

        post.mediaFiles.pull(req.params.mediaId);

        post.activity.push({
            user: req.userId,
            action: 'file_removed',
            details: `Removed file: ${mediaFile.originalName || mediaFile.filename}`
        });

        await post.save();

        res.json({ message: 'Media file removed' });
    } catch (error) {
        console.error('Error removing media file:', error);
        res.status(500).json({ message: 'Failed to remove file' });
    }
});

// POST /api/social-media-calendar/posts/:id/comments - Add comment
router.post('/posts/:id/comments', async (req, res) => {
    try {
        const { content } = req.body;

        if (!content || !content.trim()) {
            return res.status(400).json({ message: 'Comment content is required' });
        }

        const post = await SocialMediaPost.findOne({
            _id: req.params.id,
            companyId: req.companyId
        });

        if (!post) {
            return res.status(404).json({ message: 'Post not found' });
        }

        post.comments.push({
            author: req.userId,
            content: content.trim(),
            createdAt: new Date()
        });

        post.activity.push({
            user: req.userId,
            action: 'commented',
            details: 'Added a comment'
        });

        await post.save();

        const populatedPost = await SocialMediaPost.findById(post._id)
            .populate({
                path: 'socialMediaAccount',
                select: 'name platform color handle assignedTo',
                populate: { path: 'assignedTo', select: 'fullName email profileImage' }
            })
            .populate('createdBy', 'fullName email profileImage')
            .populate('comments.author', 'fullName email profileImage');

        res.json(populatedPost);
    } catch (error) {
        console.error('Error adding comment:', error);
        res.status(500).json({ message: 'Failed to add comment' });
    }
});

// ==========================================
// TEMPLATE ENDPOINTS
// ==========================================

// GET /api/social-media-calendar/templates - List templates
router.get('/templates', async (req, res) => {
    try {
        const templates = await ContentTemplate.find({ companyId: req.companyId })
            .populate('createdBy', 'fullName email')
            .sort({ createdAt: -1 });

        res.json({ templates });
    } catch (error) {
        console.error('Error fetching templates:', error);
        res.status(500).json({ message: 'Failed to fetch templates' });
    }
});

// POST /api/social-media-calendar/templates - Create template
router.post('/templates', async (req, res) => {
    try {
        const { name, content, platform, labels, hashtags, notes } = req.body;

        if (!name || !name.trim()) {
            return res.status(400).json({ message: 'Template name is required' });
        }

        const template = new ContentTemplate({
            name: name.trim(),
            content: content || '',
            platform: platform || 'Instagram',
            labels: labels || [],
            hashtags: hashtags || '',
            notes: notes || '',
            companyId: req.companyId,
            createdBy: req.userId
        });

        await template.save();

        const populated = await ContentTemplate.findById(template._id)
            .populate('createdBy', 'fullName email');

        res.status(201).json(populated);
    } catch (error) {
        console.error('Error creating template:', error);
        res.status(500).json({ message: 'Failed to create template' });
    }
});

// DELETE /api/social-media-calendar/templates/:id - Delete template
router.delete('/templates/:id', async (req, res) => {
    try {
        const template = await ContentTemplate.findOneAndDelete({
            _id: req.params.id,
            companyId: req.companyId
        });

        if (!template) {
            return res.status(404).json({ message: 'Template not found' });
        }

        res.json({ message: 'Template deleted' });
    } catch (error) {
        console.error('Error deleting template:', error);
        res.status(500).json({ message: 'Failed to delete template' });
    }
});

// ==========================================
// TEAM ENDPOINT
// ==========================================

// GET /api/social-media-calendar/team - Get team members for assignment
router.get('/team', async (req, res) => {
    try {
        const members = await User.find({ companyId: req.companyId })
            .select('fullName email profileImage role')
            .sort({ fullName: 1 });

        res.json({ members });
    } catch (error) {
        console.error('Error fetching team members:', error);
        res.status(500).json({ message: 'Failed to fetch team members' });
    }
});

// ==========================================
// MEDIA FILES ENDPOINT (access-filtered)
// ==========================================

// GET /api/social-media-calendar/media-files
// Owners/Admins see all company files.
// Members see only files from posts linked to accounts they're assigned to.
router.get('/media-files', async (req, res) => {
    try {
        const Company = require('../models/Company');
        const company = await Company.findById(req.companyId).select('owner members');

        const isOwner = company?.owner?.toString() === req.userId.toString();
        const companyMember = company?.members?.find(
            m => m.user?.toString() === req.userId.toString()
        );
        const isAdmin = companyMember?.roleInCompany === 'Admin';

        let postQuery = { companyId: req.companyId };

        if (!isOwner && !isAdmin) {
            const assignedAccounts = await SocialMediaAccount.find({
                companyId: req.companyId,
                assignedTo: req.userId,
            }).select('_id');

            const accountIds = assignedAccounts.map(a => a._id);
            if (accountIds.length === 0) {
                return res.json({ files: [], total: 0 });
            }
            postQuery.socialMediaAccount = { $in: accountIds };
        }

        const posts = await SocialMediaPost.find(postQuery)
            .populate('socialMediaAccount', 'name platform color')
            .populate('mediaFiles.uploadedBy', 'fullName profileImage')
            .select('title mediaFiles referenceImages socialMediaAccount postDate');

        const files = [];

        for (const post of posts) {
            const accountInfo = post.socialMediaAccount
                ? { _id: post.socialMediaAccount._id, name: post.socialMediaAccount.name, platform: post.socialMediaAccount.platform, color: post.socialMediaAccount.color }
                : null;

            for (const f of post.mediaFiles) {
                files.push({
                    _id: f._id,
                    type: 'upload',
                    url: f.url,
                    filename: f.originalName || f.filename,
                    mimeType: f.mimeType,
                    size: f.size,
                    uploadedBy: f.uploadedBy,
                    uploadedAt: f.uploadedAt,
                    postId: post._id,
                    postTitle: post.title,
                    account: accountInfo,
                    postDate: post.postDate,
                });
            }

            for (const r of post.referenceImages) {
                files.push({
                    _id: r._id || r.driveFileId,
                    type: 'reference',
                    driveFileId: r.driveFileId,
                    url: r.thumbnailLink,
                    webViewLink: r.webViewLink,
                    filename: r.name,
                    mimeType: r.mimeType,
                    uploadedAt: r.addedAt,
                    postId: post._id,
                    postTitle: post.title,
                    account: accountInfo,
                    postDate: post.postDate,
                });
            }
        }

        files.sort((a, b) => new Date(b.uploadedAt || 0) - new Date(a.uploadedAt || 0));

        res.json({ files, total: files.length });
    } catch (error) {
        console.error('Error fetching media files:', error);
        res.status(500).json({ message: 'Failed to fetch media files' });
    }
});

// ==========================================
// CREDENTIAL ENDPOINTS
// ==========================================

// GET /api/social-media-calendar/credentials - List credentials (own + shared with me)
router.get('/credentials', async (req, res) => {
    try {
        const reveal = req.query.reveal === 'true';

        const credentials = await SocialMediaCredential.find({
            companyId: req.companyId,
            $or: [
                { createdBy: req.userId },
                { 'sharedWith.user': req.userId }
            ]
        })
            .populate('createdBy', 'fullName email profileImage')
            .populate('sharedWith.user', 'fullName email profileImage')
            .sort({ createdAt: -1 });

        // Map credentials — mask passwords unless reveal requested
        const result = credentials.map(cred => {
            const obj = cred.toObject();
            if (reveal) {
                obj.decryptedPassword = SocialMediaCredential.decryptPassword(cred.password);
            }
            obj.password = '••••••••';
            obj.isOwner = cred.createdBy._id.toString() === req.userId.toString();
            return obj;
        });

        res.json({ credentials: result });
    } catch (error) {
        console.error('Error fetching credentials:', error);
        res.status(500).json({ message: 'Failed to fetch credentials' });
    }
});

// POST /api/social-media-calendar/credentials - Create credential
router.post('/credentials', async (req, res) => {
    try {
        const { platform, email, password, description } = req.body;

        if (!platform) {
            return res.status(400).json({ message: 'Platform is required' });
        }
        if (!email || !email.trim()) {
            return res.status(400).json({ message: 'Email is required' });
        }
        if (!password) {
            return res.status(400).json({ message: 'Password is required' });
        }

        const encryptedPassword = SocialMediaCredential.encryptPassword(password);

        const credential = new SocialMediaCredential({
            platform,
            email: email.trim(),
            password: encryptedPassword,
            description: description || '',
            companyId: req.companyId,
            createdBy: req.userId
        });

        await credential.save();

        const populated = await SocialMediaCredential.findById(credential._id)
            .populate('createdBy', 'fullName email profileImage')
            .populate('sharedWith.user', 'fullName email profileImage');

        const obj = populated.toObject();
        obj.password = '••••••••';
        obj.isOwner = true;

        res.status(201).json(obj);
    } catch (error) {
        console.error('Error creating credential:', error);
        res.status(500).json({ message: 'Failed to create credential' });
    }
});

// PUT /api/social-media-calendar/credentials/:id - Update credential
router.put('/credentials/:id', async (req, res) => {
    try {
        const { platform, email, password, description } = req.body;

        const credential = await SocialMediaCredential.findOne({
            _id: req.params.id,
            companyId: req.companyId,
            createdBy: req.userId // Only owner can edit
        });

        if (!credential) {
            return res.status(404).json({ message: 'Credential not found or access denied' });
        }

        if (platform) credential.platform = platform;
        if (email) credential.email = email.trim();
        if (password) credential.password = SocialMediaCredential.encryptPassword(password);
        if (description !== undefined) credential.description = description;

        await credential.save();

        const populated = await SocialMediaCredential.findById(credential._id)
            .populate('createdBy', 'fullName email profileImage')
            .populate('sharedWith.user', 'fullName email profileImage');

        const obj = populated.toObject();
        obj.password = '••••••••';
        obj.isOwner = true;

        res.json(obj);
    } catch (error) {
        console.error('Error updating credential:', error);
        res.status(500).json({ message: 'Failed to update credential' });
    }
});

// DELETE /api/social-media-calendar/credentials/:id - Delete credential
router.delete('/credentials/:id', async (req, res) => {
    try {
        const credential = await SocialMediaCredential.findOneAndDelete({
            _id: req.params.id,
            companyId: req.companyId,
            createdBy: req.userId // Only owner can delete
        });

        if (!credential) {
            return res.status(404).json({ message: 'Credential not found or access denied' });
        }

        res.json({ message: 'Credential deleted successfully' });
    } catch (error) {
        console.error('Error deleting credential:', error);
        res.status(500).json({ message: 'Failed to delete credential' });
    }
});

// POST /api/social-media-calendar/credentials/:id/share - Share access with users
router.post('/credentials/:id/share', async (req, res) => {
    try {
        const { userIds } = req.body;

        if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
            return res.status(400).json({ message: 'User IDs are required' });
        }

        const credential = await SocialMediaCredential.findOne({
            _id: req.params.id,
            companyId: req.companyId,
            createdBy: req.userId // Only owner can share
        });

        if (!credential) {
            return res.status(404).json({ message: 'Credential not found or access denied' });
        }

        // Add users who aren't already shared with
        const existingUserIds = credential.sharedWith.map(s => s.user.toString());
        const newUsers = userIds.filter(id => !existingUserIds.includes(id) && id !== req.userId.toString());

        newUsers.forEach(userId => {
            credential.sharedWith.push({ user: userId, sharedAt: new Date() });
        });

        await credential.save();

        const populated = await SocialMediaCredential.findById(credential._id)
            .populate('createdBy', 'fullName email profileImage')
            .populate('sharedWith.user', 'fullName email profileImage');

        const obj = populated.toObject();
        obj.password = '••••••••';
        obj.isOwner = true;

        res.json(obj);
    } catch (error) {
        console.error('Error sharing credential:', error);
        res.status(500).json({ message: 'Failed to share credential' });
    }
});

// DELETE /api/social-media-calendar/credentials/:id/share/:userId - Revoke access
router.delete('/credentials/:id/share/:userId', async (req, res) => {
    try {
        const credential = await SocialMediaCredential.findOne({
            _id: req.params.id,
            companyId: req.companyId,
            createdBy: req.userId // Only owner can revoke
        });

        if (!credential) {
            return res.status(404).json({ message: 'Credential not found or access denied' });
        }

        credential.sharedWith = credential.sharedWith.filter(
            s => s.user.toString() !== req.params.userId
        );

        await credential.save();

        const populated = await SocialMediaCredential.findById(credential._id)
            .populate('createdBy', 'fullName email profileImage')
            .populate('sharedWith.user', 'fullName email profileImage');

        const obj = populated.toObject();
        obj.password = '••••••••';
        obj.isOwner = true;

        res.json(obj);
    } catch (error) {
        console.error('Error revoking access:', error);
        res.status(500).json({ message: 'Failed to revoke access' });
    }
});

// ==========================================
// SHARE LINK MANAGEMENT (auth required)
// ==========================================

// GET /api/social-media-calendar/share — get current share link status
router.get('/share', async (req, res) => {
    try {
        const SharedCalendarLink = require('../models/SharedCalendarLink');
        const link = await SharedCalendarLink.findOne({ companyId: req.companyId, active: true });
        if (!link) return res.json({ active: false, token: null });
        res.json({ active: true, token: link.token });
    } catch (error) {
        console.error('[SharedCalendar] Get share error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// POST /api/social-media-calendar/share — create/activate share link
router.post('/share', async (req, res) => {
    try {
        const SharedCalendarLink = require('../models/SharedCalendarLink');
        let link = await SharedCalendarLink.findOne({ companyId: req.companyId, active: true });
        if (!link) {
            link = await SharedCalendarLink.create({ companyId: req.companyId, createdBy: req.userId, active: true });
        }
        res.json({ active: true, token: link.token });
    } catch (error) {
        console.error('[SharedCalendar] Create share error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// PUT /api/social-media-calendar/share/regenerate — new token, deactivate old
router.put('/share/regenerate', async (req, res) => {
    try {
        const SharedCalendarLink = require('../models/SharedCalendarLink');
        const crypto = require('crypto');
        // Deactivate all existing links for this company
        await SharedCalendarLink.updateMany({ companyId: req.companyId }, { active: false });
        // Create fresh link
        const link = await SharedCalendarLink.create({
            companyId: req.companyId,
            createdBy: req.userId,
            active: true,
            token: crypto.randomBytes(24).toString('hex')
        });
        res.json({ active: true, token: link.token });
    } catch (error) {
        console.error('[SharedCalendar] Regenerate share error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// DELETE /api/social-media-calendar/share — deactivate share link
router.delete('/share', async (req, res) => {
    try {
        const SharedCalendarLink = require('../models/SharedCalendarLink');
        await SharedCalendarLink.updateMany({ companyId: req.companyId }, { active: false });
        res.json({ active: false, token: null });
    } catch (error) {
        console.error('[SharedCalendar] Delete share error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

module.exports = router;

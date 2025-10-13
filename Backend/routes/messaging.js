const express = require('express');
const crypto = require('crypto');
const nodemailer = require('nodemailer');

// Initialize routes with dependencies from server.js
function initializeRoutes(dependencies) {
  const router = express.Router();
  const { User, Company, Conversation, Message, authenticateToken, requireCompanyAccess } = dependencies;

  // ===== COMPANY INVITATIONS =====

  // Send invitation to join company
  router.post('/invitations/send', authenticateToken, requireCompanyAccess, async (req, res) => {
    try {
      const { email, roleInCompany } = req.body;
      const companyId = req.companyId;
      const inviterId = req.userId;

      // Validate input
      if (!email) {
        return res.status(400).json({ message: 'Email is required' });
      }

      // Get company details
      const company = await Company.findById(companyId);
      if (!company) {
        return res.status(404).json({ message: 'Company not found' });
      }

      // Check if user is owner or admin
      const inviter = company.members.find(m => m.user.toString() === inviterId.toString());
      if (!inviter || !['Owner', 'Admin'].includes(inviter.roleInCompany)) {
        return res.status(403).json({
          message: 'Only company owners and admins can send invitations'
        });
      }

      // Check if user already exists and is already a member
      const existingUser = await User.findOne({ email: email.toLowerCase() });
      if (existingUser && existingUser.companyId && existingUser.companyId.toString() === companyId.toString()) {
        return res.status(400).json({
          message: 'User is already a member of this company'
        });
      }

      // Check if invitation already exists
      const existingInvitation = company.invitations.find(
        inv => inv.email.toLowerCase() === email.toLowerCase() && inv.status === 'pending'
      );

      if (existingInvitation) {
        return res.status(400).json({
          message: 'An invitation has already been sent to this email'
        });
      }

      // Generate unique invitation token
      const invitationToken = crypto.randomBytes(32).toString('hex');

      // Add invitation to company
      company.invitations.push({
        email: email.toLowerCase(),
        token: invitationToken,
        roleInCompany: roleInCompany || 'Member',
        invitedBy: inviterId,
        createdAt: new Date(),
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
        status: 'pending'
      });

      await company.save();

      // Send invitation email
      if (process.env.EMAIL_HOST && process.env.EMAIL_FROM) {
        try {
          const transportConfig = {
            host: process.env.EMAIL_HOST,
            port: parseInt(process.env.EMAIL_PORT) || 25,
            secure: false,
            tls: { rejectUnauthorized: false }
          };

          if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
            transportConfig.auth = {
              user: process.env.EMAIL_USER,
              pass: process.env.EMAIL_PASS
            };
          }

          const transporter = nodemailer.createTransport(transportConfig);
          const invitationUrl = `${process.env.FRONTEND_URL || 'http://noxtm.com'}/join-company?token=${invitationToken}`;

          await transporter.sendMail({
            from: `"${company.companyName}" <${process.env.EMAIL_FROM}>`,
            to: email,
            subject: `You've been invited to join ${company.companyName}`,
            html: `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h2>Company Invitation</h2>
                <p>You have been invited to join <strong>${company.companyName}</strong> on Noxtm.</p>
                <p>Click the button below to accept the invitation:</p>
                <div style="text-align: center; margin: 30px 0;">
                  <a href="${invitationUrl}" style="background-color: #007bff; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">
                    Accept Invitation
                  </a>
                </div>
                <p style="color: #666; font-size: 12px;">This invitation will expire in 7 days.</p>
                <p style="color: #666; font-size: 12px;">© 2025 Noxtm. All rights reserved.</p>
              </div>
            `
          });
        } catch (emailError) {
          console.error('Failed to send invitation email:', emailError);
          // Don't fail the request if email fails
        }
      }

      res.json({
        success: true,
        message: 'Invitation sent successfully',
        invitation: {
          email,
          roleInCompany: roleInCompany || 'Member',
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
        }
      });
    } catch (error) {
      console.error('Send invitation error:', error);
      res.status(500).json({ message: 'Server error', error: error.message });
    }
  });

  // Accept invitation
  router.post('/invitations/accept', authenticateToken, async (req, res) => {
    try {
      const { token } = req.body;
      const userId = req.user.userId;

      if (!token) {
        return res.status(400).json({ message: 'Invitation token is required' });
      }

      // Find company with this invitation token
      const company = await Company.findOne({
        'invitations.token': token,
        'invitations.status': 'pending'
      });

      if (!company) {
        return res.status(404).json({
          message: 'Invalid or expired invitation'
        });
      }

      // Find the specific invitation
      const invitation = company.invitations.find(
        inv => inv.token === token && inv.status === 'pending'
      );

      if (!invitation) {
        return res.status(404).json({
          message: 'Invitation not found'
        });
      }

      // Check if invitation has expired
      if (new Date() > invitation.expiresAt) {
        invitation.status = 'expired';
        await company.save();
        return res.status(400).json({
          message: 'Invitation has expired'
        });
      }

      // Get user
      const user = await User.findById(userId);
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }

      // Check if user's email matches invitation email
      if (user.email.toLowerCase() !== invitation.email.toLowerCase()) {
        return res.status(403).json({
          message: 'This invitation was sent to a different email address'
        });
      }

      // Check if user already has a company
      if (user.companyId) {
        return res.status(400).json({
          message: 'You are already a member of another company'
        });
      }

      // Add user to company members
      company.members.push({
        user: userId,
        roleInCompany: invitation.roleInCompany,
        joinedAt: new Date()
      });

      // Mark invitation as accepted
      invitation.status = 'accepted';

      await company.save();

      // Update user with company ID
      user.companyId = company._id;
      await user.save();

      res.json({
        success: true,
        message: 'Successfully joined company',
        company: {
          id: company._id,
          companyName: company.companyName,
          roleInCompany: invitation.roleInCompany
        }
      });
    } catch (error) {
      console.error('Accept invitation error:', error);
      res.status(500).json({ message: 'Server error', error: error.message });
    }
  });

  // Get pending invitations for current company
  router.get('/invitations', authenticateToken, requireCompanyAccess, async (req, res) => {
    try {
      const companyId = req.companyId;

      const company = await Company.findById(companyId)
        .populate('invitations.invitedBy', 'fullName email');

      if (!company) {
        return res.status(404).json({ message: 'Company not found' });
      }

      // Filter pending invitations only
      const pendingInvitations = company.invitations
        .filter(inv => inv.status === 'pending' && new Date() < inv.expiresAt)
        .map(inv => ({
          email: inv.email,
          roleInCompany: inv.roleInCompany,
          invitedBy: inv.invitedBy,
          createdAt: inv.createdAt,
          expiresAt: inv.expiresAt
        }));

      res.json({
        invitations: pendingInvitations,
        total: pendingInvitations.length
      });
    } catch (error) {
      console.error('Get invitations error:', error);
      res.status(500).json({ message: 'Server error', error: error.message });
    }
  });

  // ===== USER SEARCH =====

  // Search for team members within company
  router.get('/users/search', authenticateToken, requireCompanyAccess, async (req, res) => {
    try {
      const companyId = req.companyId;
      const { query, department, role } = req.query;

      // Get company with populated members
      const company = await Company.findById(companyId)
        .populate({
          path: 'members.user',
          select: 'fullName email role status'
        });

      if (!company) {
        return res.status(404).json({ message: 'Company not found' });
      }

      // Filter members based on search criteria
      let members = company.members
        .filter(m => m.user && m.user.status === 'Active')
        .map(m => ({
          id: m.user._id,
          fullName: m.user.fullName,
          email: m.user.email,
          role: m.user.role,
          roleInCompany: m.roleInCompany,
          joinedAt: m.joinedAt
        }));

      // Apply search query
      if (query) {
        const searchTerm = query.toLowerCase();
        members = members.filter(m =>
          m.fullName.toLowerCase().includes(searchTerm) ||
          m.email.toLowerCase().includes(searchTerm) ||
          m.roleInCompany.toLowerCase().includes(searchTerm)
        );
      }

      // Apply role filter
      if (role) {
        members = members.filter(m => m.roleInCompany === role);
      }

      res.json({
        members,
        total: members.length
      });
    } catch (error) {
      console.error('User search error:', error);
      res.status(500).json({ message: 'Server error', error: error.message });
    }
  });

  // Get all company members
  router.get('/users', authenticateToken, requireCompanyAccess, async (req, res) => {
    try {
      const companyId = req.companyId;

      const company = await Company.findById(companyId)
        .populate({
          path: 'members.user',
          select: 'fullName email role status'
        });

      if (!company) {
        return res.status(404).json({ message: 'Company not found' });
      }

      const members = company.members
        .filter(m => m.user)
        .map(m => ({
          id: m.user._id,
          fullName: m.user.fullName,
          email: m.user.email,
          role: m.user.role,
          roleInCompany: m.roleInCompany,
          joinedAt: m.joinedAt,
          status: m.user.status
        }));

      res.json({
        members,
        total: members.length
      });
    } catch (error) {
      console.error('Get company members error:', error);
      res.status(500).json({ message: 'Server error', error: error.message });
    }
  });

  // ===== CONVERSATIONS =====

  // Get all conversations for current user
  router.get('/conversations', authenticateToken, requireCompanyAccess, async (req, res) => {
    try {
      const companyId = req.companyId;
      const userId = req.userId;

      const conversations = await Conversation.find({
        companyId,
        'participants.user': userId
      })
        .populate('participants.user', 'fullName email')
        .populate('lastMessage.sender', 'fullName')
        .populate('createdBy', 'fullName')
        .sort({ updatedAt: -1 });

      // Format conversations for response
      const formattedConversations = conversations.map(conv => {
        // For direct chats, get the other participant's name
        let displayName = conv.name;
        if (conv.type === 'direct') {
          const otherParticipant = conv.participants.find(
            p => p.user._id.toString() !== userId.toString()
          );
          displayName = otherParticipant ? otherParticipant.user.fullName : 'Unknown User';
        }

        // Calculate unread count
        const currentParticipant = conv.participants.find(
          p => p.user._id.toString() === userId.toString()
        );
        const lastReadAt = currentParticipant ? currentParticipant.lastReadAt : new Date(0);

        return {
          id: conv._id,
          type: conv.type,
          name: displayName,
          participants: conv.participants.map(p => ({
            id: p.user._id,
            fullName: p.user.fullName,
            email: p.user.email
          })),
          lastMessage: conv.lastMessage,
          lastReadAt,
          createdAt: conv.createdAt,
          updatedAt: conv.updatedAt
        };
      });

      res.json({
        conversations: formattedConversations,
        total: formattedConversations.length
      });
    } catch (error) {
      console.error('Get conversations error:', error);
      res.status(500).json({ message: 'Server error', error: error.message });
    }
  });

  // Create new conversation (direct or group)
  router.post('/conversations', authenticateToken, requireCompanyAccess, async (req, res) => {
    try {
      const companyId = req.companyId;
      const userId = req.userId;
      const { type, participantIds, name } = req.body;

      // Validate input
      if (!type || !['direct', 'group'].includes(type)) {
        return res.status(400).json({
          message: 'Invalid conversation type. Must be "direct" or "group"'
        });
      }

      if (!participantIds || !Array.isArray(participantIds) || participantIds.length === 0) {
        return res.status(400).json({
          message: 'Participant IDs are required'
        });
      }

      // For direct chats, ensure only 1 other participant
      if (type === 'direct' && participantIds.length !== 1) {
        return res.status(400).json({
          message: 'Direct conversations must have exactly one other participant'
        });
      }

      // For group chats, ensure name is provided
      if (type === 'group' && !name) {
        return res.status(400).json({
          message: 'Group name is required for group conversations'
        });
      }

      // Verify all participants are in the same company
      const participants = await User.find({
        _id: { $in: [...participantIds, userId] },
        companyId
      });

      if (participants.length !== participantIds.length + 1) {
        return res.status(400).json({
          message: 'Some participants are not members of your company'
        });
      }

      // For direct chats, check if conversation already exists
      if (type === 'direct') {
        const existingConversation = await Conversation.findOne({
          companyId,
          type: 'direct',
          'participants.user': { $all: [userId, participantIds[0]] }
        });

        if (existingConversation) {
          return res.json({
            success: true,
            message: 'Conversation already exists',
            conversation: existingConversation
          });
        }
      }

      // Create new conversation
      const conversation = new Conversation({
        companyId,
        type,
        name: type === 'group' ? name : null,
        participants: [userId, ...participantIds].map(id => ({
          user: id,
          joinedAt: new Date(),
          lastReadAt: new Date()
        })),
        createdBy: userId
      });

      await conversation.save();

      // Populate for response
      await conversation.populate('participants.user', 'fullName email');

      res.status(201).json({
        success: true,
        message: 'Conversation created successfully',
        conversation
      });
    } catch (error) {
      console.error('Create conversation error:', error);
      res.status(500).json({ message: 'Server error', error: error.message });
    }
  });

  // ===== MESSAGES =====

  // Get messages for a conversation
  router.get('/conversations/:conversationId/messages', authenticateToken, requireCompanyAccess, async (req, res) => {
    try {
      const { conversationId } = req.params;
      const companyId = req.companyId;
      const userId = req.userId;
      const { limit = 50, before } = req.query;

      // Verify user has access to this conversation
      const conversation = await Conversation.findOne({
        _id: conversationId,
        companyId,
        'participants.user': userId
      });

      if (!conversation) {
        return res.status(404).json({
          message: 'Conversation not found or access denied'
        });
      }

      // Build query
      const query = {
        conversationId,
        companyId
      };

      // Add pagination
      if (before) {
        query.createdAt = { $lt: new Date(before) };
      }

      const messages = await Message.find(query)
        .populate('sender', 'fullName email')
        .sort({ createdAt: -1 })
        .limit(parseInt(limit));

      // Mark messages as read
      await Message.updateMany(
        {
          conversationId,
          'readBy.user': { $ne: userId }
        },
        {
          $push: {
            readBy: {
              user: userId,
              readAt: new Date()
            }
          }
        }
      );

      // Update user's lastReadAt in conversation
      await Conversation.updateOne(
        {
          _id: conversationId,
          'participants.user': userId
        },
        {
          $set: {
            'participants.$.lastReadAt': new Date()
          }
        }
      );

      res.json({
        messages: messages.reverse(),
        total: messages.length
      });
    } catch (error) {
      console.error('Get messages error:', error);
      res.status(500).json({ message: 'Server error', error: error.message });
    }
  });

  // Send a message
  router.post('/conversations/:conversationId/messages', authenticateToken, requireCompanyAccess, async (req, res) => {
    try {
      const { conversationId } = req.params;
      const companyId = req.companyId;
      const userId = req.userId;
      const { content, type = 'text', fileUrl, fileName } = req.body;

      // Validate input
      if (!content || content.trim() === '') {
        return res.status(400).json({
          message: 'Message content is required'
        });
      }

      // Verify user has access to this conversation
      const conversation = await Conversation.findOne({
        _id: conversationId,
        companyId,
        'participants.user': userId
      });

      if (!conversation) {
        return res.status(404).json({
          message: 'Conversation not found or access denied'
        });
      }

      // Create message
      const message = new Message({
        conversationId,
        companyId,
        sender: userId,
        content: content.trim(),
        type,
        fileUrl,
        fileName,
        readBy: [{
          user: userId,
          readAt: new Date()
        }]
      });

      await message.save();

      // Update conversation's lastMessage
      conversation.lastMessage = {
        content: content.trim(),
        sender: userId,
        timestamp: message.createdAt
      };
      conversation.updatedAt = new Date();
      await conversation.save();

      // Populate sender for response
      await message.populate('sender', 'fullName email');

      res.status(201).json({
        success: true,
        message: 'Message sent successfully',
        data: message
      });
    } catch (error) {
      console.error('Send message error:', error);
      res.status(500).json({ message: 'Server error', error: error.message });
    }
  });

  return router;
}

module.exports = { initializeRoutes };

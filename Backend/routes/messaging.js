const express = require('express');
const crypto = require('crypto');
const nodemailer = require('nodemailer');

// Initialize routes with dependencies from server.js
function initializeRoutes(dependencies) {
  const router = express.Router();
  const { User, Company, Conversation, Message, authenticateToken, requireCompanyAccess, io } = dependencies;

  // Store online users (userId -> socketId mapping)
  const onlineUsers = new Map();

  // Socket.IO connection handling
  if (io) {
    io.on('connection', (socket) => {
      console.log('💬 User connected to messaging:', socket.id);

      // Send current online users list to the newly connected client
      socket.emit('online-users-list', {
        onlineUsers: Array.from(onlineUsers.keys())
      });

      // User comes online
      socket.on('user-online', (userId) => {
        console.log(`👤 User ${userId} is online`);
        onlineUsers.set(userId, socket.id);

        // Broadcast to all connected clients (including sender)
        io.emit('user-status-changed', {
          userId,
          status: 'online'
        });

        // Also send updated list
        io.emit('online-users-list', {
          onlineUsers: Array.from(onlineUsers.keys())
        });
      });

      // Join conversation room
      socket.on('join-conversation', (conversationId) => {
        socket.join(`conversation:${conversationId}`);
        console.log(`User ${socket.id} joined conversation: ${conversationId}`);
      });

      // Leave conversation room
      socket.on('leave-conversation', (conversationId) => {
        socket.leave(`conversation:${conversationId}`);
        console.log(`User ${socket.id} left conversation: ${conversationId}`);
      });

      // Typing indicator - start typing
      socket.on('typing-start', (data) => {
        const { conversationId, userId, userName } = data;
        // Broadcast to conversation room except sender
        socket.to(`conversation:${conversationId}`).emit('user-typing', {
          conversationId,
          userId,
          userName,
          isTyping: true
        });
      });

      // Typing indicator - stop typing
      socket.on('typing-stop', (data) => {
        const { conversationId, userId } = data;
        // Broadcast to conversation room except sender
        socket.to(`conversation:${conversationId}`).emit('user-typing', {
          conversationId,
          userId,
          isTyping: false
        });
      });

      socket.on('disconnect', () => {
        console.log('User disconnected from messaging:', socket.id);

        // Find and remove user from online users
        for (const [userId, socketId] of onlineUsers.entries()) {
          if (socketId === socket.id) {
            onlineUsers.delete(userId);
            console.log(`👤 User ${userId} went offline`);
            // Broadcast to all connected clients
            io.emit('user-status-changed', {
              userId,
              status: 'offline'
            });

            // Send updated online users list
            io.emit('online-users-list', {
              onlineUsers: Array.from(onlineUsers.keys())
            });
            break;
          }
        }
      });
    });
  }

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
      const existingInvitationIndex = company.invitations.findIndex(
        inv => inv.email.toLowerCase() === email.toLowerCase() && inv.status === 'pending'
      );

      // If invitation exists, remove it so we can create a new one (for resending)
      if (existingInvitationIndex !== -1) {
        const existingInvitation = company.invitations[existingInvitationIndex];

        // If not expired, don't allow resending
        if (new Date() < existingInvitation.expiresAt) {
          return res.status(400).json({
            message: 'An active invitation has already been sent to this email'
          });
        }

        // Remove the old expired invitation
        company.invitations.splice(existingInvitationIndex, 1);
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

  // Verify invitation token (public endpoint for signup page)
  router.get('/invitations/verify/:token', async (req, res) => {
    try {
      const { token } = req.params;

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
          message: 'Invalid or expired invitation',
          valid: false
        });
      }

      // Find the specific invitation
      const invitation = company.invitations.find(
        inv => inv.token === token && inv.status === 'pending'
      );

      if (!invitation) {
        return res.status(404).json({
          message: 'Invitation not found',
          valid: false
        });
      }

      // Check if invitation has expired
      if (new Date() > invitation.expiresAt) {
        return res.status(400).json({
          message: 'Invitation has expired',
          valid: false
        });
      }

      res.json({
        valid: true,
        company: {
          companyName: company.companyName,
          industry: company.industry
        },
        invitation: {
          email: invitation.email,
          roleInCompany: invitation.roleInCompany,
          expiresAt: invitation.expiresAt
        }
      });
    } catch (error) {
      console.error('Verify invitation error:', error);
      res.status(500).json({ message: 'Server error', error: error.message });
    }
  });

  // Accept invitation (for existing users)
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

      // Update user with company ID and inherit company's subscription/permissions
      user.companyId = company._id;

      // Set user's subscription to match company's subscription
      user.subscription = {
        plan: company.subscription.plan,
        status: company.subscription.status,
        startDate: company.subscription.startDate,
        endDate: company.subscription.endDate
      };

      // Give user full Noxtm permissions (matching company plan)
      user.permissions = {
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
        settingsConfiguration: false // Only owner can change settings
      };

      // Update access array from permissions
      const accessArray = [];
      if (user.permissions.dashboard) accessArray.push('Dashboard');
      if (user.permissions.dataCenter) accessArray.push('Data Center');
      if (user.permissions.projects) accessArray.push('Projects');
      if (user.permissions.teamCommunication) accessArray.push('Team Communication');
      if (user.permissions.digitalMediaManagement) accessArray.push('Digital Media Management');
      if (user.permissions.marketing) accessArray.push('Marketing');
      if (user.permissions.hrManagement) accessArray.push('HR Management');
      if (user.permissions.financeManagement) accessArray.push('Finance Management');
      if (user.permissions.seoManagement) accessArray.push('SEO Management');
      if (user.permissions.internalPolicies) accessArray.push('Internal Policies');
      if (user.permissions.settingsConfiguration) accessArray.push('Settings & Configuration');
      user.access = accessArray;

      await user.save();

      res.json({
        success: true,
        message: 'Successfully joined company',
        company: {
          id: company._id,
          companyName: company.companyName,
          roleInCompany: invitation.roleInCompany
        },
        user: {
          id: user._id,
          permissions: user.permissions,
          subscription: user.subscription,
          companyId: user.companyId
        }
      });
    } catch (error) {
      console.error('Accept invitation error:', error);
      res.status(500).json({ message: 'Server error', error: error.message });
    }
  });

  // Accept invitation during signup (public endpoint with user creation)
  router.post('/invitations/signup-accept', async (req, res) => {
    try {
      const { token, userId } = req.body;

      if (!token || !userId) {
        return res.status(400).json({ message: 'Token and userId are required' });
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

      // Update user with company ID and inherit company's subscription/permissions
      user.companyId = company._id;

      // Set user's subscription to match company's subscription
      user.subscription = {
        plan: company.subscription.plan,
        status: company.subscription.status,
        startDate: company.subscription.startDate,
        endDate: company.subscription.endDate
      };

      // Give user full Noxtm permissions (matching company plan)
      // Company members should have same access as company owner
      user.permissions = {
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
        settingsConfiguration: false // Only owner can change settings
      };

      // Update access array from permissions
      const accessArray = [];
      if (user.permissions.dashboard) accessArray.push('Dashboard');
      if (user.permissions.dataCenter) accessArray.push('Data Center');
      if (user.permissions.projects) accessArray.push('Projects');
      if (user.permissions.teamCommunication) accessArray.push('Team Communication');
      if (user.permissions.digitalMediaManagement) accessArray.push('Digital Media Management');
      if (user.permissions.marketing) accessArray.push('Marketing');
      if (user.permissions.hrManagement) accessArray.push('HR Management');
      if (user.permissions.financeManagement) accessArray.push('Finance Management');
      if (user.permissions.seoManagement) accessArray.push('SEO Management');
      if (user.permissions.internalPolicies) accessArray.push('Internal Policies');
      if (user.permissions.settingsConfiguration) accessArray.push('Settings & Configuration');
      user.access = accessArray;

      await user.save();

      res.json({
        success: true,
        message: 'Successfully joined company',
        company: {
          id: company._id,
          companyName: company.companyName,
          roleInCompany: invitation.roleInCompany
        },
        user: {
          id: user._id,
          permissions: user.permissions,
          subscription: user.subscription,
          companyId: user.companyId
        }
      });
    } catch (error) {
      console.error('Signup accept invitation error:', error);
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

      // Filter pending invitations (including expired ones so user can resend)
      const pendingInvitations = company.invitations
        .filter(inv => inv.status === 'pending')
        .map(inv => ({
          email: inv.email,
          roleInCompany: inv.roleInCompany,
          invitedBy: inv.invitedBy,
          invitedAt: inv.createdAt,
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
  router.get('/users', authenticateToken, async (req, res) => {
    console.log('🔍 GET /api/messaging/users called');
    try {
      const user = await User.findById(req.user.userId);
      console.log('👤 User found:', user?.email);

      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }

      // Check if user has a company
      if (!user.companyId) {
        console.log('⚠️ User has no company, returning empty users list');
        return res.json({
          users: [],
          members: [],
          total: 0,
          message: 'No company associated. Please complete company setup to see team members.'
        });
      }

      const companyId = user.companyId;

      // METHOD 1: Get all users with the same companyId directly from Users collection
      // This shows ALL users with the same company, not just those in company.members array
      const companyUsers = await User.find({
        companyId: companyId,
        _id: { $ne: user._id } // Exclude current user from the list
      }).select('fullName email role status');

      console.log('📊 Total users with companyId:', companyUsers.length);

      // METHOD 2: Also get company members for roleInCompany info
      const company = await Company.findById(companyId);
      const memberRoles = {};
      if (company && company.members) {
        company.members.forEach(m => {
          memberRoles[m.user.toString()] = m.roleInCompany || 'Member';
        });
      }

      // Map users with all necessary fields and online status
      const users = companyUsers.map(u => ({
        _id: u._id,
        id: u._id,
        fullName: u.fullName,
        username: u.fullName,
        email: u.email,
        role: u.role,
        roleInCompany: memberRoles[u._id.toString()] || 'Member',
        department: memberRoles[u._id.toString()] || 'Member',
        status: u.status || 'Active',
        isOnline: onlineUsers.has(u._id.toString())
      }));

      console.log('✅ Users found:', users.length);
      console.log('👥 Users:', users.map(u => `${u.fullName} (${u.email})`).join(', '));

      res.json({
        users,
        members: users,
        total: users.length,
        onlineUserIds: Array.from(onlineUsers.keys())
      });
    } catch (error) {
      console.error('Get company members error:', error);
      res.status(500).json({ message: 'Server error', error: error.message });
    }
  });

  // Get online users
  router.get('/users/online', authenticateToken, async (req, res) => {
    try {
      const onlineUserIds = Array.from(onlineUsers.keys());
      res.json({
        onlineUsers: onlineUserIds,
        total: onlineUserIds.length
      });
    } catch (error) {
      console.error('Get online users error:', error);
      res.status(500).json({ message: 'Server error', error: error.message });
    }
  });

  // ===== CONVERSATIONS =====

  // Get all conversations for current user
  router.get('/conversations', authenticateToken, async (req, res) => {
    try {
      const user = await User.findById(req.user.userId);

      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }

      // Return empty if no company
      if (!user.companyId) {
        return res.json({
          conversations: [],
          total: 0
        });
      }

      const companyId = user.companyId;
      const userId = user._id;

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
        const isDirectMessage = conv.type === 'direct';

        if (isDirectMessage) {
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
          _id: conv._id,
          id: conv._id, // Keep for backward compatibility
          type: conv.type,
          isDirectMessage, // Add this for frontend compatibility
          name: displayName,
          participants: conv.participants.map(p => ({
            _id: p.user._id,
            id: p.user._id,
            user: {
              _id: p.user._id,
              fullName: p.user.fullName,
              username: p.user.fullName,
              email: p.user.email
            },
            fullName: p.user.fullName,
            username: p.user.fullName,
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

  // Create or get existing direct message conversation (simplified endpoint for frontend)
  router.post('/conversations/direct', authenticateToken, async (req, res) => {
    try {
      const user = await User.findById(req.user.userId);

      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }

      if (!user.companyId) {
        return res.status(403).json({
          message: 'Please complete company setup to start conversations'
        });
      }

      const companyId = user.companyId;
      const userId = user._id;
      const { recipientId } = req.body;

      console.log('📝 Creating direct conversation:', { userId, recipientId, companyId });

      // Validate input
      if (!recipientId) {
        return res.status(400).json({
          message: 'Recipient ID is required'
        });
      }

      // Verify recipient is in the same company
      const recipient = await User.findOne({
        _id: recipientId,
        companyId
      });

      if (!recipient) {
        return res.status(400).json({
          message: 'Recipient not found or not in your company'
        });
      }

      // Check if direct conversation already exists
      const existingConversation = await Conversation.findOne({
        companyId,
        type: 'direct',
        'participants.user': { $all: [userId, recipientId] }
      })
        .populate('participants.user', 'fullName email');

      if (existingConversation) {
        console.log('✅ Found existing conversation:', existingConversation._id);
        // Return existing conversation with proper format
        const isDirectMessage = true;
        const otherParticipant = existingConversation.participants.find(
          p => p.user._id.toString() !== userId.toString()
        );

        return res.json({
          success: true,
          message: 'Conversation retrieved',
          conversation: {
            _id: existingConversation._id,
            id: existingConversation._id,
            type: 'direct',
            isDirectMessage,
            name: otherParticipant ? otherParticipant.user.fullName : 'Unknown User',
            participants: existingConversation.participants.map(p => ({
              _id: p.user._id,
              id: p.user._id,
              user: {
                _id: p.user._id,
                fullName: p.user.fullName,
                username: p.user.fullName,
                email: p.user.email
              },
              fullName: p.user.fullName,
              username: p.user.fullName,
              email: p.user.email
            })),
            lastMessage: existingConversation.lastMessage,
            createdAt: existingConversation.createdAt,
            updatedAt: existingConversation.updatedAt
          }
        });
      }

      // Create new direct conversation
      console.log('✨ Creating new direct conversation');
      const conversation = new Conversation({
        companyId,
        type: 'direct',
        name: null, // Direct messages don't have names
        participants: [userId, recipientId].map(id => ({
          user: id,
          joinedAt: new Date(),
          lastReadAt: new Date()
        })),
        createdBy: userId
      });

      await conversation.save();

      // Populate for response
      await conversation.populate('participants.user', 'fullName email');

      console.log('✅ Created new conversation:', conversation._id);

      const isDirectMessage = true;
      const otherParticipant = conversation.participants.find(
        p => p.user._id.toString() !== userId.toString()
      );

      res.status(201).json({
        success: true,
        message: 'Conversation created successfully',
        conversation: {
          _id: conversation._id,
          id: conversation._id,
          type: 'direct',
          isDirectMessage,
          name: otherParticipant ? otherParticipant.user.fullName : 'Unknown User',
          participants: conversation.participants.map(p => ({
            _id: p.user._id,
            id: p.user._id,
            user: {
              _id: p.user._id,
              fullName: p.user.fullName,
              username: p.user.fullName,
              email: p.user.email
            },
            fullName: p.user.fullName,
            username: p.user.fullName,
            email: p.user.email
          })),
          lastMessage: conversation.lastMessage,
          createdAt: conversation.createdAt,
          updatedAt: conversation.updatedAt
        }
      });
    } catch (error) {
      console.error('❌ Create direct conversation error:', error);
      res.status(500).json({ message: 'Server error', error: error.message });
    }
  });

  // Create new conversation (direct or group)
  router.post('/conversations', authenticateToken, async (req, res) => {
    try {
      const user = await User.findById(req.user.userId);

      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }

      if (!user.companyId) {
        return res.status(403).json({
          message: 'Please complete company setup to start conversations'
        });
      }

      const companyId = user.companyId;
      const userId = user._id;
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

      console.log('💬 Send message request:', { conversationId, userId, content: content?.substring(0, 50) });

      // Validate input
      if (!content || content.trim() === '') {
        console.log('❌ Empty message content');
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
        console.log('❌ Conversation not found:', { conversationId, companyId, userId });
        return res.status(404).json({
          message: 'Conversation not found or access denied'
        });
      }

      console.log('✅ Conversation found, creating message');

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
      console.log('✅ Message saved:', message._id);

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

      // Emit real-time message to all participants in the conversation
      if (io) {
        const messageData = {
          conversationId,
          message: {
            _id: message._id,
            content: message.content,
            type: message.type,
            sender: {
              _id: message.sender._id,
              fullName: message.sender.fullName,
              username: message.sender.fullName,
              email: message.sender.email
            },
            createdAt: message.createdAt,
            readBy: message.readBy
          }
        };

        console.log('📡 Broadcasting message to conversation room:', `conversation:${conversationId}`);
        io.to(`conversation:${conversationId}`).emit('new-message', messageData);
        console.log('✅ Message broadcasted successfully');
      }

      res.status(201).json({
        success: true,
        message: 'Message sent successfully',
        data: message
      });
    } catch (error) {
      console.error('❌ Send message error:', error);
      res.status(500).json({ message: 'Server error', error: error.message });
    }
  });

  return router;
}

module.exports = { initializeRoutes };

const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const LeadDirectory = require('../models/Lead');
const Client = require('../models/Client');
const { authenticateToken } = require('../middleware/auth');
const auth = authenticateToken;

// Get all leads for current user
router.get('/', auth, async (req, res) => {
  try {
    const { status, search } = req.query;
    const query = { userId: req.user.userId };

    // Filter by status
    if (status && status !== 'All') {
      query.status = status;
    }

    // Search functionality
    if (search) {
      query.$or = [
        { companyName: { $regex: search, $options: 'i' } },
        { clientName: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }

    const leads = await LeadDirectory.find(query).sort({ createdAt: -1 });
    res.json(leads);
  } catch (error) {
    console.error('Error fetching leads:', error);
    res.status(500).json({ message: 'Failed to fetch leads', error: error.message });
  }
});

// Get single lead
router.get('/:id', auth, async (req, res) => {
  try {
    const lead = await LeadDirectory.findOne({ 
      _id: req.params.id, 
      userId: req.user.userId 
    });

    if (!lead) {
      return res.status(404).json({ message: 'Lead not found' });
    }

    res.json(lead);
  } catch (error) {
    console.error('Error fetching lead:', error);
    res.status(500).json({ message: 'Failed to fetch lead', error: error.message });
  }
});

// Create new lead
router.post('/', auth, async (req, res) => {
  try {
    console.log('Received lead data:', req.body);
    
    const leadData = {
      ...req.body,
      userId: req.user.userId
    };

    console.log('Lead data with userId:', leadData);
    const lead = new LeadDirectory(leadData);
    await lead.save();

    res.status(201).json(lead);
  } catch (error) {
    console.error('Error creating lead:', error);
    
    // Handle Mongoose validation errors
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({ message: messages.join(', ') });
    }
    
    res.status(400).json({ message: error.message || 'Failed to create lead' });
  }
});

// Update lead
router.put('/:id', auth, async (req, res) => {
  try {
    const lead = await LeadDirectory.findOneAndUpdate(
      { _id: req.params.id, userId: req.user.userId },
      req.body,
      { new: true, runValidators: true }
    );

    if (!lead) {
      return res.status(404).json({ message: 'Lead not found' });
    }

    res.json(lead);
  } catch (error) {
    console.error('Error updating lead:', error);
    res.status(400).json({ message: 'Failed to update lead', error: error.message });
  }
});

// Delete lead
router.delete('/:id', auth, async (req, res) => {
  try {
    const lead = await LeadDirectory.findOneAndDelete({ 
      _id: req.params.id, 
      userId: req.user.userId 
    });

    if (!lead) {
      return res.status(404).json({ message: 'Lead not found' });
    }

    res.json({ message: 'Lead deleted successfully' });
  } catch (error) {
    console.error('Error deleting lead:', error);
    res.status(500).json({ message: 'Failed to delete lead', error: error.message });
  }
});

// Update lead status
router.patch('/:id/status', auth, async (req, res) => {
  try {
    const { status } = req.body;
    const lead = await LeadDirectory.findOne({ 
      _id: req.params.id, 
      userId: req.user.userId 
    });

    if (!lead) {
      return res.status(404).json({ message: 'Lead not found' });
    }

    lead.status = status;

    // If status is changed to "Qualified (SQL)", convert to client
    if (status === 'Qualified (SQL)' && !lead.convertedToClient) {
      try {
        // Check if client already exists with same email
        const existingClient = await Client.findOne({ 
          email: lead.email, 
          userId: req.user.userId 
        });

        if (!existingClient) {
          const clientData = {
            companyName: lead.companyName,
            clientName: lead.clientName,
            email: lead.email,
            phone: lead.phone,
            designation: lead.designation,
            location: lead.location,
            userId: req.user.userId
          };

          const client = new Client(clientData);
          await client.save();

          lead.convertedToClient = true;
          lead.clientId = client._id;
        } else {
          lead.convertedToClient = true;
          lead.clientId = existingClient._id;
        }
      } catch (clientError) {
        console.error('Error creating client from lead:', clientError);
        // Continue with lead status update even if client creation fails
      }
    }

    await lead.save();
    res.json(lead);
  } catch (error) {
    console.error('Error updating lead status:', error);
    res.status(400).json({ message: 'Failed to update lead status', error: error.message });
  }
});

// Update follow-up
router.patch('/:id/followup', auth, async (req, res) => {
  try {
    const { followUp } = req.body;
    const lead = await LeadDirectory.findOneAndUpdate(
      { _id: req.params.id, userId: req.user.userId },
      { followUp },
      { new: true }
    );

    if (!lead) {
      return res.status(404).json({ message: 'Lead not found' });
    }

    res.json(lead);
  } catch (error) {
    console.error('Error updating follow-up:', error);
    res.status(400).json({ message: 'Failed to update follow-up', error: error.message });
  }
});

// Get lead statistics
router.get('/stats/summary', auth, async (req, res) => {
  try {
    const userId = req.user.userId;

    const stats = await LeadDirectory.aggregate([
      { $match: { userId: mongoose.Types.ObjectId(userId) } },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);

    const totalLeads = await LeadDirectory.countDocuments({ userId });
    const convertedLeads = await LeadDirectory.countDocuments({ 
      userId, 
      convertedToClient: true 
    });

    const summary = {
      total: totalLeads,
      converted: convertedLeads,
      byStatus: {}
    };

    stats.forEach(stat => {
      summary.byStatus[stat._id] = stat.count;
    });

    res.json(summary);
  } catch (error) {
    console.error('Error fetching lead stats:', error);
    res.status(500).json({ message: 'Failed to fetch statistics', error: error.message });
  }
});

module.exports = router;

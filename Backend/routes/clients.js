const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const auth = authenticateToken;
const Client = require('../models/Client');

// Get all clients
router.get('/', auth, async (req, res) => {
  try {
    const clients = await Client.find({ userId: req.user.userId })
      .sort({ createdAt: -1 })
      .lean();
    res.json(clients);
  } catch (error) {
    console.error('Error fetching clients:', error);
    res.status(500).json({ message: 'Error fetching clients', error: error.message });
  }
});

// Get single client
router.get('/:id', auth, async (req, res) => {
  try {
    const client = await Client.findOne({ 
      _id: req.params.id, 
      userId: req.user.userId 
    });
    
    if (!client) {
      return res.status(404).json({ message: 'Client not found' });
    }
    res.json(client);
  } catch (error) {
    console.error('Error fetching client:', error);
    res.status(500).json({ message: 'Error fetching client', error: error.message });
  }
});

// Create new client
router.post('/', auth, async (req, res) => {
  try {
    const { companyName, clientName, email, phone, designation, location } = req.body;

    // Validate required fields
    if (!companyName || !clientName || !email || !phone) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    const newClient = new Client({
      companyName,
      clientName,
      email,
      phone,
      designation: designation || '',
      location: location || '',
      userId: req.user.userId,
      messages: [],
      quote: null
    });

    await newClient.save();
    res.status(201).json(newClient);
  } catch (error) {
    console.error('Error creating client:', error);
    res.status(500).json({ message: 'Error creating client', error: error.message });
  }
});

// Update client
router.put('/:id', auth, async (req, res) => {
  try {
    const { companyName, clientName, email, phone, designation, location } = req.body;

    const client = await Client.findOneAndUpdate(
      { _id: req.params.id, userId: req.user.userId },
      {
        $set: {
          companyName,
          clientName,
          email,
          phone,
          designation,
          location,
          updatedAt: new Date()
        }
      },
      { new: true, runValidators: true }
    );

    if (!client) {
      return res.status(404).json({ message: 'Client not found' });
    }

    res.json(client);
  } catch (error) {
    console.error('Error updating client:', error);
    res.status(500).json({ message: 'Error updating client', error: error.message });
  }
});

// Delete client
router.delete('/:id', auth, async (req, res) => {
  try {
    const client = await Client.findOneAndDelete({ 
      _id: req.params.id, 
      userId: req.user.userId 
    });

    if (!client) {
      return res.status(404).json({ message: 'Client not found' });
    }

    res.json({ message: 'Client deleted successfully' });
  } catch (error) {
    console.error('Error deleting client:', error);
    res.status(500).json({ message: 'Error deleting client', error: error.message });
  }
});

// Add message to client
router.post('/:id/messages', auth, async (req, res) => {
  try {
    const { text, author } = req.body;
    if (!text) {
      return res.status(400).json({ message: 'Message text is required' });
    }

    const newMessage = {
      text,
      author: author || req.user.name || 'Admin',
      timestamp: new Date().toLocaleString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })
    };

    const client = await Client.findOneAndUpdate(
      { _id: req.params.id, userId: req.user.userId },
      { $push: { messages: newMessage } },
      { new: true }
    );

    if (!client) {
      return res.status(404).json({ message: 'Client not found' });
    }

    res.status(201).json(newMessage);
  } catch (error) {
    console.error('Error adding message:', error);
    res.status(500).json({ message: 'Error adding message', error: error.message });
  }
});

// Add/Update quote for client
router.post('/:id/quote', auth, async (req, res) => {
  try {
    const { items } = req.body;
    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ message: 'Quote items are required' });
    }

    // Calculate totals
    const subtotal = items.reduce((sum, item) => sum + (item.price * (item.quantity || 1)), 0);
    const tax = subtotal * 0.1; // 10% tax
    const total = subtotal + tax;

    const quote = {
      items,
      subtotal,
      tax,
      total,
      status: 'pending',
      invoiceGenerated: false,
      createdAt: new Date()
    };

    const client = await Client.findOneAndUpdate(
      { _id: req.params.id, userId: req.user.userId },
      { $set: { quote } },
      { new: true }
    );

    if (!client) {
      return res.status(404).json({ message: 'Client not found' });
    }

    // Send email notification
    try {
      const emailService = require('../services/emailService');
      await emailService.sendQuoteNotification(client, quote);
    } catch (emailError) {
      console.error('Error sending quote email:', emailError);
      // Don't fail the request if email fails
    }

    res.status(201).json(quote);
  } catch (error) {
    console.error('Error creating quote:', error);
    res.status(500).json({ message: 'Error creating quote', error: error.message });
  }
});

// Update quote status
router.patch('/:id/quote/status', auth, async (req, res) => {
  try {
    const { status, invoiceGenerated, invoiceId } = req.body;
    
    const updateFields = {};
    if (status) updateFields['quote.status'] = status;
    if (invoiceGenerated !== undefined) updateFields['quote.invoiceGenerated'] = invoiceGenerated;
    if (invoiceId) updateFields['quote.invoiceId'] = invoiceId;

    const client = await Client.findOneAndUpdate(
      { _id: req.params.id, userId: req.user.userId },
      { $set: updateFields },
      { new: true }
    );

    if (!client) {
      return res.status(404).json({ message: 'Client not found' });
    }

    if (!client.quote) {
      return res.status(404).json({ message: 'No quote found for this client' });
    }

    res.json(client.quote);
  } catch (error) {
    console.error('Error updating quote status:', error);
    res.status(500).json({ message: 'Error updating quote status', error: error.message });
  }
});

module.exports = router;

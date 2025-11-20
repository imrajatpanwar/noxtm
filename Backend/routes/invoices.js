const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const Invoice = require('../models/Invoice');

// Get all invoices
router.get('/', auth, async (req, res) => {
  try {
    const { status, search } = req.query;
    
    let query = { userId: req.user.userId };

    // Filter by status
    if (status && status !== 'All') {
      query.status = status.toLowerCase();
    }

    // Filter by search term
    if (search) {
      query.$or = [
        { invoiceNumber: new RegExp(search, 'i') },
        { clientName: new RegExp(search, 'i') },
        { companyName: new RegExp(search, 'i') }
      ];
    }

    const invoices = await Invoice.find(query)
      .sort({ createdAt: -1 })
      .lean();

    // Format dates for frontend
    const formattedInvoices = invoices.map(inv => ({
      ...inv,
      id: inv.invoiceNumber,
      createdAt: new Date(inv.createdAt).toISOString().split('T')[0],
      dueDate: new Date(inv.dueDate).toISOString().split('T')[0],
      paidAt: inv.paidAt ? new Date(inv.paidAt).toISOString().split('T')[0] : null
    }));

    res.json(formattedInvoices);
  } catch (error) {
    console.error('Error fetching invoices:', error);
    res.status(500).json({ message: 'Error fetching invoices', error: error.message });
  }
});

// Get single invoice
router.get('/:id', auth, async (req, res) => {
  try {
    const invoice = await Invoice.findOne({ 
      invoiceNumber: req.params.id, 
      userId: req.user.userId 
    }).lean();
    
    if (!invoice) {
      return res.status(404).json({ message: 'Invoice not found' });
    }
    
    const formattedInvoice = {
      ...invoice,
      id: invoice.invoiceNumber,
      createdAt: new Date(invoice.createdAt).toISOString().split('T')[0],
      dueDate: new Date(invoice.dueDate).toISOString().split('T')[0],
      paidAt: invoice.paidAt ? new Date(invoice.paidAt).toISOString().split('T')[0] : null
    };
    
    res.json(formattedInvoice);
  } catch (error) {
    console.error('Error fetching invoice:', error);
    res.status(500).json({ message: 'Error fetching invoice', error: error.message });
  }
});

// Create new invoice
router.post('/', auth, async (req, res) => {
  try {
    const { clientName, companyName, email, phone, items, dueDate, notes, clientId } = req.body;

    // Validate required fields
    if (!clientName || !companyName || !email || !phone || !items || !dueDate) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ message: 'Invoice must have at least one item' });
    }

    // Generate unique invoice number
    const invoiceNumber = await Invoice.generateInvoiceNumber();

    const newInvoice = new Invoice({
      invoiceNumber,
      clientName,
      companyName,
      email,
      phone,
      items,
      dueDate,
      notes: notes || '',
      userId: req.user.userId,
      clientId: clientId || null
    });

    await newInvoice.save();

    // Send email notification
    try {
      const emailService = require('../services/emailService');
      await emailService.sendInvoiceNotification(newInvoice);
    } catch (emailError) {
      console.error('Error sending invoice email:', emailError);
    }

    const formattedInvoice = {
      ...newInvoice.toObject(),
      id: newInvoice.invoiceNumber,
      createdAt: new Date(newInvoice.createdAt).toISOString().split('T')[0],
      dueDate: new Date(newInvoice.dueDate).toISOString().split('T')[0]
    };

    res.status(201).json(formattedInvoice);
  } catch (error) {
    console.error('Error creating invoice:', error);
    res.status(500).json({ message: 'Error creating invoice', error: error.message });
  }
});

// Update invoice
router.put('/:id', auth, async (req, res) => {
  try {
    const { clientName, companyName, email, phone, items, dueDate, notes } = req.body;

    // Validate items if provided
    if (items && (!Array.isArray(items) || items.length === 0)) {
      return res.status(400).json({ message: 'Invoice must have at least one item' });
    }

    const updateData = {
      clientName,
      companyName,
      email,
      phone,
      items,
      dueDate,
      notes,
      updatedAt: new Date()
    };

    // Remove undefined values
    Object.keys(updateData).forEach(key => 
      updateData[key] === undefined && delete updateData[key]
    );

    const invoice = await Invoice.findOneAndUpdate(
      { invoiceNumber: req.params.id, userId: req.user.userId },
      { $set: updateData },
      { new: true, runValidators: true }
    );

    if (!invoice) {
      return res.status(404).json({ message: 'Invoice not found' });
    }

    const formattedInvoice = {
      ...invoice.toObject(),
      id: invoice.invoiceNumber,
      createdAt: new Date(invoice.createdAt).toISOString().split('T')[0],
      dueDate: new Date(invoice.dueDate).toISOString().split('T')[0],
      paidAt: invoice.paidAt ? new Date(invoice.paidAt).toISOString().split('T')[0] : null
    };

    res.json(formattedInvoice);
  } catch (error) {
    console.error('Error updating invoice:', error);
    res.status(500).json({ message: 'Error updating invoice', error: error.message });
  }
});

// Delete invoice
router.delete('/:id', auth, async (req, res) => {
  try {
    const invoice = await Invoice.findOneAndDelete({ 
      invoiceNumber: req.params.id, 
      userId: req.user.userId 
    });

    if (!invoice) {
      return res.status(404).json({ message: 'Invoice not found' });
    }

    res.json({ message: 'Invoice deleted successfully' });
  } catch (error) {
    console.error('Error deleting invoice:', error);
    res.status(500).json({ message: 'Error deleting invoice', error: error.message });
  }
});

// Update invoice status
router.patch('/:id/status', auth, async (req, res) => {
  try {
    const { status } = req.body;
    if (!status) {
      return res.status(400).json({ message: 'Status is required' });
    }

    const validStatuses = ['pending', 'paid', 'overdue', 'cancelled'];
    if (!validStatuses.includes(status.toLowerCase())) {
      return res.status(400).json({ message: 'Invalid status' });
    }

    const updateData = { status: status.toLowerCase() };
    
    // If status is paid, set paidAt timestamp
    if (status.toLowerCase() === 'paid') {
      updateData.paidAt = new Date();
    }

    const invoice = await Invoice.findOneAndUpdate(
      { invoiceNumber: req.params.id, userId: req.user.userId },
      { $set: updateData },
      { new: true }
    );

    if (!invoice) {
      return res.status(404).json({ message: 'Invoice not found' });
    }

    const formattedInvoice = {
      ...invoice.toObject(),
      id: invoice.invoiceNumber,
      createdAt: new Date(invoice.createdAt).toISOString().split('T')[0],
      dueDate: new Date(invoice.dueDate).toISOString().split('T')[0],
      paidAt: invoice.paidAt ? new Date(invoice.paidAt).toISOString().split('T')[0] : null
    };

    res.json(formattedInvoice);
  } catch (error) {
    console.error('Error updating invoice status:', error);
    res.status(500).json({ message: 'Error updating invoice status', error: error.message });
  }
});

// Generate PDF
router.get('/:id/pdf', auth, async (req, res) => {
  try {
    const invoice = await Invoice.findOne({ 
      invoiceNumber: req.params.id, 
      userId: req.user.userId 
    });
    
    if (!invoice) {
      return res.status(404).json({ message: 'Invoice not found' });
    }

    // Generate PDF
    const pdfService = require('../services/pdfService');
    const pdfBuffer = await pdfService.generateInvoicePDF(invoice, req.user);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=${invoice.invoiceNumber}.pdf`);
    res.send(pdfBuffer);
  } catch (error) {
    console.error('Error generating PDF:', error);
    res.status(500).json({ message: 'Error generating PDF', error: error.message });
  }
});

// Get invoice statistics
router.get('/stats/summary', auth, async (req, res) => {
  try {
    const invoices = await Invoice.find({ userId: req.user.userId });

    const stats = {
      total: invoices.length,
      paid: invoices.filter(inv => inv.status === 'paid').length,
      pending: invoices.filter(inv => inv.status === 'pending').length,
      overdue: invoices.filter(inv => inv.status === 'overdue').length,
      totalRevenue: invoices
        .filter(inv => inv.status === 'paid')
        .reduce((sum, inv) => sum + inv.total, 0),
      pendingAmount: invoices
        .filter(inv => inv.status === 'pending')
        .reduce((sum, inv) => sum + inv.total, 0)
    };

    res.json(stats);
  } catch (error) {
    console.error('Error fetching invoice stats:', error);
    res.status(500).json({ message: 'Error fetching statistics', error: error.message });
  }
});

module.exports = router;

const express = require('express');
const router = express.Router();
const multer = require('multer');
const ContactList = require('../models/ContactList');
const Lead = require('../models/Lead');
const TradeShow = require('../models/TradeShow');
const Exhibitor = require('../models/Exhibitor');
const { authenticateToken } = require('../middleware/auth');
const { requireManagerOrOwner } = require('../middleware/campaignAuth');
const { parseCSV } = require('../utils/csvParser');

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['text/csv', 'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'];
    if (allowedTypes.includes(file.mimetype) || file.originalname.endsWith('.csv')) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only CSV and Excel files are allowed.'));
    }
  }
});

// Apply authentication and role check to all routes
router.use(authenticateToken);
router.use(requireManagerOrOwner);

/**
 * GET /api/contact-lists
 * List all contact lists for the user's company
 */
router.get('/', async (req, res) => {
  try {
    const companyId = req.user.companyId;
    const userRole = req.userRole;
    const { sourceType, page = 1, limit = 20 } = req.query;

    const filters = {};
    if (sourceType) {
      filters.sourceType = sourceType;
    }

    const contactLists = await ContactList.getByCompany(companyId, userRole, filters);

    // Pagination
    const startIndex = (page - 1) * limit;
    const endIndex = page * limit;
    const paginatedLists = contactLists.slice(startIndex, endIndex);

    res.json({
      success: true,
      data: paginatedLists,
      pagination: {
        total: contactLists.length,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(contactLists.length / limit)
      }
    });
  } catch (error) {
    console.error('Get contact lists error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch contact lists',
      error: error.message
    });
  }
});

/**
 * GET /api/contact-lists/:id
 * Get single contact list with all contacts
 */
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const companyId = req.user.companyId;

    const contactList = await ContactList.findOne({ _id: id, companyId })
      .populate('createdBy', 'fullName email')
      .populate('lastModifiedBy', 'fullName email');

    if (!contactList) {
      return res.status(404).json({
        success: false,
        message: 'Contact list not found'
      });
    }

    res.json({
      success: true,
      data: contactList
    });
  } catch (error) {
    console.error('Get contact list error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch contact list',
      error: error.message
    });
  }
});

/**
 * POST /api/contact-lists
 * Create new contact list
 */
router.post('/', async (req, res) => {
  try {
    const userId = req.user._id || req.user.userId;
    const companyId = req.user.companyId;

    const { name, description, source } = req.body;

    if (!name) {
      return res.status(400).json({
        success: false,
        message: 'Name is required'
      });
    }

    const contactList = new ContactList({
      name,
      description,
      source: source || { type: 'custom' },
      companyId,
      createdBy: userId,
      lastModifiedBy: userId
    });

    await contactList.save();

    res.status(201).json({
      success: true,
      message: 'Contact list created successfully',
      data: contactList
    });
  } catch (error) {
    console.error('Create contact list error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create contact list',
      error: error.message
    });
  }
});

/**
 * PATCH /api/contact-lists/:id
 * Update contact list metadata
 */
router.patch('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user._id || req.user.userId;
    const companyId = req.user.companyId;

    const contactList = await ContactList.findOne({ _id: id, companyId });

    if (!contactList) {
      return res.status(404).json({
        success: false,
        message: 'Contact list not found'
      });
    }

    // Update allowed fields
    if (req.body.name) contactList.name = req.body.name;
    if (req.body.description !== undefined) contactList.description = req.body.description;

    contactList.lastModifiedBy = userId;
    await contactList.save();

    res.json({
      success: true,
      message: 'Contact list updated successfully',
      data: contactList
    });
  } catch (error) {
    console.error('Update contact list error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update contact list',
      error: error.message
    });
  }
});

/**
 * DELETE /api/contact-lists/:id
 * Delete contact list
 */
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const companyId = req.user.companyId;

    const contactList = await ContactList.findOne({ _id: id, companyId });

    if (!contactList) {
      return res.status(404).json({
        success: false,
        message: 'Contact list not found'
      });
    }

    await ContactList.deleteOne({ _id: id });

    res.json({
      success: true,
      message: 'Contact list deleted successfully'
    });
  } catch (error) {
    console.error('Delete contact list error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete contact list',
      error: error.message
    });
  }
});

/**
 * POST /api/contact-lists/:id/contacts
 * Add contacts to existing list
 */
router.post('/:id/contacts', async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user._id || req.user.userId;
    const companyId = req.user.companyId;
    const { contacts } = req.body;

    if (!contacts || !Array.isArray(contacts)) {
      return res.status(400).json({
        success: false,
        message: 'Contacts array is required'
      });
    }

    const contactList = await ContactList.findOne({ _id: id, companyId });

    if (!contactList) {
      return res.status(404).json({
        success: false,
        message: 'Contact list not found'
      });
    }

    const addedCount = contactList.addContacts(contacts);
    contactList.lastModifiedBy = userId;
    await contactList.save();

    res.json({
      success: true,
      message: `${addedCount} contacts added successfully`,
      data: {
        addedCount,
        totalContacts: contactList.contactCount
      }
    });
  } catch (error) {
    console.error('Add contacts error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to add contacts',
      error: error.message
    });
  }
});

/**
 * DELETE /api/contact-lists/:id/contacts/:email
 * Remove contact from list
 */
router.delete('/:id/contacts/:email', async (req, res) => {
  try {
    const { id, email } = req.params;
    const userId = req.user._id || req.user.userId;
    const companyId = req.user.companyId;

    const contactList = await ContactList.findOne({ _id: id, companyId });

    if (!contactList) {
      return res.status(404).json({
        success: false,
        message: 'Contact list not found'
      });
    }

    const removed = contactList.removeContact(email);

    if (!removed) {
      return res.status(404).json({
        success: false,
        message: 'Contact not found in list'
      });
    }

    contactList.lastModifiedBy = userId;
    await contactList.save();

    res.json({
      success: true,
      message: 'Contact removed successfully'
    });
  } catch (error) {
    console.error('Remove contact error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to remove contact',
      error: error.message
    });
  }
});

/**
 * POST /api/contact-lists/import/csv
 * Import contacts from CSV file
 */
router.post('/import/csv', upload.single('file'), async (req, res) => {
  try {
    const userId = req.user._id || req.user.userId;
    const companyId = req.user.companyId;
    const { listName, description } = req.body;

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'CSV file is required'
      });
    }

    if (!listName) {
      return res.status(400).json({
        success: false,
        message: 'List name is required'
      });
    }

    // Parse CSV
    const contacts = await parseCSV(req.file.buffer);

    if (contacts.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No valid contacts found in CSV file'
      });
    }

    // Create contact list
    const contactList = new ContactList({
      name: listName,
      description,
      source: {
        type: 'csv',
        details: `Imported from ${req.file.originalname}`,
        importedAt: new Date()
      },
      companyId,
      createdBy: userId,
      lastModifiedBy: userId
    });

    contactList.addContacts(contacts);
    await contactList.save();

    res.status(201).json({
      success: true,
      message: 'Contacts imported successfully from CSV',
      data: {
        listId: contactList._id,
        listName: contactList.name,
        contactCount: contactList.contactCount
      }
    });
  } catch (error) {
    console.error('CSV import error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to import CSV',
      error: error.message
    });
  }
});

/**
 * POST /api/contact-lists/import/leads
 * Import contacts from LeadsDirectory
 */
router.post('/import/leads', async (req, res) => {
  try {
    const userId = req.user._id || req.user.userId;
    const companyId = req.user.companyId;
    const { listName, description, leadIds, filters } = req.body;

    if (!listName) {
      return res.status(400).json({
        success: false,
        message: 'List name is required'
      });
    }

    let leads;

    // Get leads by IDs or filters
    if (leadIds && leadIds.length > 0) {
      leads = await Lead.find({ _id: { $in: leadIds }, userId });
    } else if (filters) {
      const query = { userId };
      if (filters.status) query.status = filters.status;
      leads = await Lead.find(query);
    } else {
      // Get all leads for user
      leads = await Lead.find({ userId });
    }

    if (leads.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No leads found'
      });
    }

    // Convert leads to contacts
    const contacts = leads.map(lead => ({
      email: lead.email,
      name: lead.clientName,
      companyName: lead.companyName,
      phone: lead.phone,
      designation: lead.designation,
      location: lead.location,
      sourceType: 'lead',
      sourceId: lead._id.toString(),
      variables: new Map([
        ['name', lead.clientName],
        ['companyName', lead.companyName],
        ['designation', lead.designation || '']
      ])
    }));

    // Create contact list
    const contactList = new ContactList({
      name: listName,
      description,
      source: {
        type: 'leads',
        details: `Imported ${leads.length} leads from LeadsDirectory`,
        importedAt: new Date()
      },
      companyId,
      createdBy: userId,
      lastModifiedBy: userId
    });

    contactList.addContacts(contacts);
    await contactList.save();

    res.status(201).json({
      success: true,
      message: 'Contacts imported successfully from LeadsDirectory',
      data: {
        listId: contactList._id,
        listName: contactList.name,
        contactCount: contactList.contactCount
      }
    });
  } catch (error) {
    console.error('Lead import error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to import leads',
      error: error.message
    });
  }
});

/**
 * GET /api/contact-lists/import/trade-shows
 * List available trade shows for import
 */
router.get('/import/trade-shows', async (req, res) => {
  try {
    const companyId = req.user.companyId;

    const tradeShows = await TradeShow.find({ companyId })
      .select('shortName fullName showDate location exhibitors')
      .sort({ showDate: -1 });

    // Get exhibitor counts for each trade show
    const tradeShowsWithCounts = await Promise.all(
      tradeShows.map(async (show) => {
        const exhibitorCount = await Exhibitor.countDocuments({ tradeShowId: show._id });
        return {
          ...show.toObject(),
          exhibitorCount
        };
      })
    );

    res.json({
      success: true,
      data: tradeShowsWithCounts
    });
  } catch (error) {
    console.error('Get trade shows error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch trade shows',
      error: error.message
    });
  }
});

/**
 * GET /api/contact-lists/import/trade-shows/:id/exhibitors
 * List exhibitors for a specific trade show
 */
router.get('/import/trade-shows/:id/exhibitors', async (req, res) => {
  try {
    const { id } = req.params;
    const companyId = req.user.companyId;

    // Verify trade show belongs to company
    const tradeShow = await TradeShow.findOne({ _id: id, companyId });

    if (!tradeShow) {
      return res.status(404).json({
        success: false,
        message: 'Trade show not found'
      });
    }

    const exhibitors = await Exhibitor.find({ tradeShowId: id })
      .select('companyName boothNo location companyEmail contacts');

    // Add contact count to each exhibitor
    const exhibitorsWithCounts = exhibitors.map(exhibitor => ({
      ...exhibitor.toObject(),
      contactCount: exhibitor.contacts ? exhibitor.contacts.length : 0
    }));

    res.json({
      success: true,
      data: {
        tradeShow: {
          id: tradeShow._id,
          name: tradeShow.fullName,
          shortName: tradeShow.shortName,
          date: tradeShow.showDate,
          location: tradeShow.location
        },
        exhibitors: exhibitorsWithCounts
      }
    });
  } catch (error) {
    console.error('Get exhibitors error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch exhibitors',
      error: error.message
    });
  }
});

/**
 * POST /api/contact-lists/import/trade-shows/:id
 * Import contacts from trade show exhibitors
 */
router.post('/import/trade-shows/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user._id || req.user.userId;
    const companyId = req.user.companyId;
    const { listName, description, exhibitorIds } = req.body;

    if (!listName) {
      return res.status(400).json({
        success: false,
        message: 'List name is required'
      });
    }

    // Verify trade show belongs to company
    const tradeShow = await TradeShow.findOne({ _id: id, companyId });

    if (!tradeShow) {
      return res.status(404).json({
        success: false,
        message: 'Trade show not found'
      });
    }

    let query = { tradeShowId: id };

    // If specific exhibitors selected, filter by IDs
    if (exhibitorIds && exhibitorIds.length > 0) {
      query._id = { $in: exhibitorIds };
    }

    const exhibitors = await Exhibitor.find(query);

    if (exhibitors.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No exhibitors found'
      });
    }

    // Extract contacts from exhibitors
    const contacts = [];
    exhibitors.forEach(exhibitor => {
      if (exhibitor.contacts && exhibitor.contacts.length > 0) {
        exhibitor.contacts.forEach(contact => {
          if (contact.email) {
            contacts.push({
              email: contact.email,
              name: contact.fullName,
              companyName: exhibitor.companyName,
              phone: contact.phone,
              designation: contact.designation,
              location: contact.location || exhibitor.location,
              sourceType: 'tradeshow',
              sourceId: tradeShow._id.toString(),
              variables: new Map([
                ['name', contact.fullName || ''],
                ['companyName', exhibitor.companyName],
                ['designation', contact.designation || ''],
                ['tradeShow', tradeShow.fullName]
              ])
            });
          }
        });
      }
    });

    if (contacts.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No contacts with email addresses found in selected exhibitors'
      });
    }

    // Create contact list
    const contactList = new ContactList({
      name: listName,
      description,
      source: {
        type: 'tradeshow',
        details: `Imported from ${tradeShow.fullName} - ${exhibitors.length} exhibitors`,
        importedAt: new Date()
      },
      companyId,
      createdBy: userId,
      lastModifiedBy: userId
    });

    contactList.addContacts(contacts);
    await contactList.save();

    res.status(201).json({
      success: true,
      message: 'Contacts imported successfully from trade show',
      data: {
        listId: contactList._id,
        listName: contactList.name,
        contactCount: contactList.contactCount,
        tradeShow: tradeShow.fullName
      }
    });
  } catch (error) {
    console.error('Trade show import error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to import from trade show',
      error: error.message
    });
  }
});

module.exports = router;

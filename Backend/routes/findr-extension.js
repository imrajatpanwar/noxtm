const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const auth = require('../middleware/auth');

// Get models
const getUser = () => mongoose.model('User');
const TradeShow = require('../models/TradeShow');
const Exhibitor = require('../models/Exhibitor');

// ===== USER SETTINGS =====

// Save user's findr settings
router.post('/settings', auth, async (req, res) => {
  try {
    const { selectedTradeShowId, extractionType, useCase, fullDetails } = req.body;
    const User = getUser();
    
    // Verify trade show exists only if tradeshow use case
    if (useCase === 'tradeshow' && selectedTradeShowId) {
      const tradeShow = await TradeShow.findById(selectedTradeShowId);
      if (!tradeShow) {
        return res.status(404).json({
          success: false,
          message: 'Trade show not found'
        });
      }
    }

    // Update user with findr settings
    const updateData = {
      'findrSettings.updatedAt': new Date(),
      'findrSettings.useCase': useCase || '',
      'findrSettings.fullDetails': fullDetails || ''
    };

    if (selectedTradeShowId !== undefined) updateData['findrSettings.selectedTradeShowId'] = selectedTradeShowId;
    if (extractionType !== undefined) updateData['findrSettings.extractionType'] = extractionType;

    const user = await User.findByIdAndUpdate(
      req.user.userId,
      { $set: updateData },
      { new: true }
    );

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.json({
      success: true,
      message: 'Settings saved successfully',
      settings: user.findrSettings
    });
  } catch (error) {
    console.error('Error saving findr settings:', error);
    res.status(500).json({
      success: false,
      message: 'Error saving settings',
      error: error.message
    });
  }
});

// Get user's findr settings
router.get('/settings', auth, async (req, res) => {
  try {
    const User = getUser();
    const user = await User.findById(req.user.userId)
      .select('findrSettings');
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Build response settings
    const responseSettings = {
      selectedTradeShowId: user.findrSettings?.selectedTradeShowId || '',
      extractionType: user.findrSettings?.extractionType || '',
      useCase: user.findrSettings?.useCase || '',
      fullDetails: user.findrSettings?.fullDetails || '',
      updatedAt: user.findrSettings?.updatedAt
    };

    // If trade show exists, populate trade show info
    if (user.findrSettings?.selectedTradeShowId) {
      const tradeShow = await TradeShow.findById(user.findrSettings.selectedTradeShowId)
        .select('shortName fullName location');
      
      if (tradeShow) {
        responseSettings.tradeShowName = tradeShow.shortName;
        responseSettings.tradeShowLocation = tradeShow.location;
      }
    }

    res.json({
      success: true,
      settings: responseSettings
    });
  } catch (error) {
    console.error('Error fetching findr settings:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching settings',
      error: error.message
    });
  }
});

// ===== TRADE SHOWS =====

// Get all trade shows for the user's company (optimized for extension)
router.get('/trade-shows', auth, async (req, res) => {
  try {
    const User = getUser();
    const user = await User.findById(req.user.userId);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const query = user.companyId
      ? { companyId: user.companyId }
      : { createdBy: user._id };

    const tradeShows = await TradeShow.find(query)
      .select('showName showLocation showStartDate showEndDate showLogo')
      .sort({ showStartDate: -1, createdAt: -1 })
      .lean();

    res.json({
      success: true,
      tradeShows
    });
  } catch (error) {
    console.error('Error fetching trade shows for extension:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching trade shows',
      error: error.message
    });
  }
});

// Get single trade show details
router.get('/trade-shows/:id', auth, async (req, res) => {
  try {
    const User = getUser();
    const user = await User.findById(req.user.userId);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const tradeShow = await TradeShow.findOne({
      _id: req.params.id,
      companyId: user.companyId
    }).lean();

    if (!tradeShow) {
      return res.status(404).json({
        success: false,
        message: 'Trade show not found'
      });
    }

    res.json({
      success: true,
      tradeShow
    });
  } catch (error) {
    console.error('Error fetching trade show:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching trade show',
      error: error.message
    });
  }
});

// ===== EXHIBITORS =====

// Create exhibitor (simplified for extension)
router.post('/exhibitors', auth, async (req, res) => {
  try {
    const { tradeShowId, tradeShowName, companyName, boothNo, location, companyEmail, website, extractedAt, contacts } = req.body;
    const User = getUser();
    const user = await User.findById(req.user.userId);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Validate required fields
    if (!tradeShowId || !companyName) {
      return res.status(400).json({
        success: false,
        message: 'Trade show ID and company name are required'
      });
    }

    // Verify trade show exists and belongs to user's company
    const tradeShow = await TradeShow.findOne({
      _id: tradeShowId,
      companyId: user.companyId
    });

    if (!tradeShow) {
      return res.status(404).json({
        success: false,
        message: 'Trade show not found or you do not have access'
      });
    }

    // Create exhibitor
    const exhibitor = new Exhibitor({
      tradeShowId,
      companyName,
      boothNo: boothNo || '',
      location: location || '',
      companyEmail: companyEmail || '',
      website: website || '',
      contacts: contacts || [],
      extractedAt: extractedAt ? new Date(extractedAt) : new Date(),
      createdBy: user._id,
      companyId: user.companyId
    });

    await exhibitor.save();

    res.status(201).json({
      success: true,
      message: 'Exhibitor data saved successfully',
      exhibitor: {
        id: exhibitor._id,
        tradeShowId: exhibitor.tradeShowId,
        companyName: exhibitor.companyName,
        boothNo: exhibitor.boothNo,
        location: exhibitor.location,
        companyEmail: exhibitor.companyEmail,
        website: exhibitor.website,
        contacts: exhibitor.contacts,
        extractedAt: exhibitor.extractedAt,
        createdAt: exhibitor.createdAt
      }
    });
  } catch (error) {
    console.error('Error creating exhibitor from extension:', error);
    res.status(500).json({
      success: false,
      message: 'Error saving exhibitor data',
      error: error.message
    });
  }
});

// Get exhibitors for a trade show
router.get('/trade-shows/:tradeShowId/exhibitors', auth, async (req, res) => {
  try {
    const { tradeShowId } = req.params;
    const User = getUser();
    const user = await User.findById(req.user.userId);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const exhibitors = await Exhibitor.find({
      tradeShowId,
      companyId: user.companyId
    })
    .select('companyName boothNo location companyEmail website contacts extractedAt createdAt')
    .sort({ createdAt: -1 })
    .lean();

    res.json({
      success: true,
      count: exhibitors.length,
      exhibitors
    });
  } catch (error) {
    console.error('Error fetching exhibitors:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching exhibitors',
      error: error.message
    });
  }
});

// Update exhibitor
router.put('/exhibitors/:id', auth, async (req, res) => {
  try {
    const { id } = req.params;
    const { companyName, boothNo, location, companyEmail, website, contacts } = req.body;
    const User = getUser();
    const user = await User.findById(req.user.userId);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const exhibitor = await Exhibitor.findOne({
      _id: id,
      companyId: user.companyId
    });

    if (!exhibitor) {
      return res.status(404).json({
        success: false,
        message: 'Exhibitor not found'
      });
    }

    // Update fields
    if (companyName !== undefined) exhibitor.companyName = companyName;
    if (boothNo !== undefined) exhibitor.boothNo = boothNo;
    if (location !== undefined) exhibitor.location = location;
    if (companyEmail !== undefined) exhibitor.companyEmail = companyEmail;
    if (website !== undefined) exhibitor.website = website;
    if (contacts !== undefined) exhibitor.contacts = contacts;

    await exhibitor.save();

    res.json({
      success: true,
      message: 'Exhibitor updated successfully',
      exhibitor: {
        id: exhibitor._id,
        companyName: exhibitor.companyName,
        boothNo: exhibitor.boothNo,
        location: exhibitor.location,
        companyEmail: exhibitor.companyEmail,
        website: exhibitor.website,
        contacts: exhibitor.contacts,
        updatedAt: exhibitor.updatedAt
      }
    });
  } catch (error) {
    console.error('Error updating exhibitor:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating exhibitor',
      error: error.message
    });
  }
});

// Delete exhibitor
router.delete('/exhibitors/:id', auth, async (req, res) => {
  try {
    const { id } = req.params;
    const User = getUser();
    const user = await User.findById(req.user.userId);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const exhibitor = await Exhibitor.findOneAndDelete({
      _id: id,
      companyId: user.companyId
    });

    if (!exhibitor) {
      return res.status(404).json({
        success: false,
        message: 'Exhibitor not found'
      });
    }

    res.json({
      success: true,
      message: 'Exhibitor deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting exhibitor:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting exhibitor',
      error: error.message
    });
  }
});

// ===== STATISTICS =====

// Get extension dashboard stats
router.get('/stats', auth, async (req, res) => {
  try {
    const User = getUser();
    const user = await User.findById(req.user.userId);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Get counts
    const tradeShowsCount = await TradeShow.countDocuments({
      companyId: user.companyId
    });

    const exhibitorsCount = await Exhibitor.countDocuments({
      companyId: user.companyId
    });

    // Today's exhibitors
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const todayExhibitorsCount = await Exhibitor.countDocuments({
      companyId: user.companyId,
      createdAt: { $gte: today }
    });

    // Recent trade shows
    const recentTradeShows = await TradeShow.find({
      companyId: user.companyId
    })
    .select('showName showLocation showStartDate')
    .sort({ createdAt: -1 })
    .limit(5)
    .lean();

    res.json({
      success: true,
      stats: {
        tradeShows: tradeShowsCount,
        exhibitors: exhibitorsCount,
        todayExhibitors: todayExhibitorsCount,
        recentTradeShows
      }
    });
  } catch (error) {
    console.error('Error fetching stats:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching statistics',
      error: error.message
    });
  }
});

// ===== QUICK ACTIONS =====

// Bulk create exhibitors
router.post('/exhibitors/bulk', auth, async (req, res) => {
  try {
    const { tradeShowId, exhibitors } = req.body;
    const User = getUser();
    const user = await User.findById(req.user.userId);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    if (!tradeShowId || !Array.isArray(exhibitors) || exhibitors.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Trade show ID and exhibitors array are required'
      });
    }

    // Verify trade show
    const tradeShow = await TradeShow.findOne({
      _id: tradeShowId,
      companyId: user.companyId
    });

    if (!tradeShow) {
      return res.status(404).json({
        success: false,
        message: 'Trade show not found'
      });
    }

    // Create exhibitors
    const exhibitorDocs = exhibitors.map(ex => ({
      tradeShowId,
      companyName: ex.companyName,
      boothNo: ex.boothNo || '',
      location: ex.location || '',
      website: ex.website || '',
      extractedAt: new Date(),
      createdBy: user._id,
      companyId: user.companyId
    }));

    const result = await Exhibitor.insertMany(exhibitorDocs);

    res.status(201).json({
      success: true,
      message: `${result.length} exhibitors created successfully`,
      count: result.length
    });
  } catch (error) {
    console.error('Error bulk creating exhibitors:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating exhibitors',
      error: error.message
    });
  }
});

// ===== USER REPORTS =====

// Get user activity reports
router.get('/user-reports', auth, async (req, res) => {
  try {
    const { filter = 'today' } = req.query;
    const User = getUser();
    
    // Get current user to check company
    const currentUser = await User.findById(req.user.userId);
    if (!currentUser) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Calculate date range based on filter
    const now = new Date();
    let startDate;
    
    switch(filter) {
      case 'today':
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        break;
      case 'yesterday':
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
        const endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        break;
      case 'this-month':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
      case 'last-month':
        startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);
        break;
      case 'all':
        startDate = new Date(0); // Beginning of time
        break;
      default:
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    }

    // Get all users from the same company
    const companyUsers = await User.find({ companyId: currentUser.companyId })
      .select('fullName email findrSettings')
      .lean();

    // Build reports for each user
    const reports = await Promise.all(companyUsers.map(async (user) => {
      // Build date filter
      let dateFilter = { createdBy: user._id };
      
      if (filter === 'yesterday') {
        const yesterdayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
        const yesterdayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        dateFilter.createdAt = { $gte: yesterdayStart, $lt: yesterdayEnd };
      } else if (filter === 'last-month') {
        const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);
        dateFilter.createdAt = { $gte: lastMonthStart, $lte: lastMonthEnd };
      } else if (filter !== 'all') {
        dateFilter.createdAt = { $gte: startDate };
      }

      // Count exhibitors data (Exhibitor's Data - basic exhibitors without much contact data)
      const exhibitorsDataCount = await Exhibitor.countDocuments({
        ...dateFilter,
        $or: [
          { contacts: { $exists: false } },
          { contacts: { $size: 0 } }
        ]
      });

      // Count company data (Exhibitors Company Data - exhibitors with contacts)
      const companyDataCount = await Exhibitor.countDocuments({
        ...dateFilter,
        contacts: { $exists: true, $not: { $size: 0 } }
      });

      // Get last activity
      const lastActivity = await Exhibitor.findOne({ createdBy: user._id })
        .sort({ createdAt: -1 })
        .select('createdAt')
        .lean();

      return {
        userName: user.fullName || 'Unknown',
        userEmail: user.email,
        exhibitorsDataCount,
        companyDataCount,
        totalCount: exhibitorsDataCount + companyDataCount,
        lastActivity: lastActivity ? lastActivity.createdAt : null
      };
    }));

    // Sort by total count descending
    reports.sort((a, b) => b.totalCount - a.totalCount);

    res.json({
      success: true,
      filter,
      reports
    });
  } catch (error) {
    console.error('Error fetching user reports:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching user reports',
      error: error.message
    });
  }
});

module.exports = router;

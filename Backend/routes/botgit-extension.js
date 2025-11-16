const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const auth = require('../middleware/auth');

// Get models
const getUser = () => mongoose.model('User');
const TradeShow = require('../models/TradeShow');
const Exhibitor = require('../models/Exhibitor');

// ===== USER SETTINGS =====

// Save user's botgit settings
router.post('/settings', auth, async (req, res) => {
  try {
    const { selectedTradeShowId, extractionType } = req.body;
    const User = getUser();
    
    // Verify trade show exists
    const tradeShow = await TradeShow.findById(selectedTradeShowId);
    if (!tradeShow) {
      return res.status(404).json({
        success: false,
        message: 'Trade show not found'
      });
    }

    // Update user with botgit settings
    const user = await User.findByIdAndUpdate(
      req.user.userId,
      {
        $set: {
          'botgitSettings.selectedTradeShowId': selectedTradeShowId,
          'botgitSettings.extractionType': extractionType,
          'botgitSettings.updatedAt': new Date()
        }
      },
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
      settings: user.botgitSettings
    });
  } catch (error) {
    console.error('Error saving botgit settings:', error);
    res.status(500).json({
      success: false,
      message: 'Error saving settings',
      error: error.message
    });
  }
});

// Get user's botgit settings
router.get('/settings', auth, async (req, res) => {
  try {
    const User = getUser();
    const user = await User.findById(req.user.userId)
      .select('botgitSettings');
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // If settings exist, populate trade show info
    if (user.botgitSettings && user.botgitSettings.selectedTradeShowId) {
      const tradeShow = await TradeShow.findById(user.botgitSettings.selectedTradeShowId)
        .select('shortName fullName location');
      
      if (tradeShow) {
        return res.json({
          success: true,
          settings: {
            selectedTradeShowId: user.botgitSettings.selectedTradeShowId,
            tradeShowName: tradeShow.shortName,
            tradeShowLocation: tradeShow.location,
            extractionType: user.botgitSettings.extractionType,
            updatedAt: user.botgitSettings.updatedAt
          }
        });
      }
    }

    res.json({
      success: true,
      settings: null
    });
  } catch (error) {
    console.error('Error fetching botgit settings:', error);
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
    const { tradeShowId, tradeShowName, companyName, boothNo, location, website, extractedAt } = req.body;
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
      website: website || '',
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
        website: exhibitor.website,
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
    .select('companyName boothNo location website extractedAt createdAt')
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
    const { companyName, boothNo, location, website } = req.body;
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
    if (website !== undefined) exhibitor.website = website;

    await exhibitor.save();

    res.json({
      success: true,
      message: 'Exhibitor updated successfully',
      exhibitor: {
        id: exhibitor._id,
        companyName: exhibitor.companyName,
        boothNo: exhibitor.boothNo,
        location: exhibitor.location,
        website: exhibitor.website,
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

module.exports = router;

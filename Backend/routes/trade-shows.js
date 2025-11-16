const express = require('express');
const router = express.Router();
const TradeShow = require('../models/TradeShow');
const auth = require('../middleware/auth');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const mongoose = require('mongoose');

// Trade Show file upload configuration
const tradeShowStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = path.join(__dirname, '..', 'uploads', 'trade-shows');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const prefix = file.fieldname === 'showLogo' ? 'logo-' : 'floorplan-';
    cb(null, prefix + uniqueSuffix + path.extname(file.originalname));
  }
});

// Combined upload for trade shows (logo + floor plan)
const uploadTradeShowFiles = multer({
  storage: tradeShowStorage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit for largest file
  },
  fileFilter: (req, file, cb) => {
    if (file.fieldname === 'showLogo') {
      const allowedMimes = ['image/jpeg', 'image/jpg', 'image/png', 'image/svg+xml'];
      if (allowedMimes.includes(file.mimetype)) {
        cb(null, true);
      } else {
        cb(new Error('Only JPG, PNG, and SVG files are allowed for logos!'), false);
      }
    } else if (file.fieldname === 'floorPlan') {
      const allowedMimes = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'];
      if (allowedMimes.includes(file.mimetype)) {
        cb(null, true);
      } else {
        cb(new Error('Only PDF, JPG, and PNG files are allowed for floor plans!'), false);
      }
    } else {
      cb(new Error('Unexpected field'), false);
    }
  }
});

// GET all trade shows for the user's company
router.get('/', auth, async (req, res) => {
  try {
    // Get User model from mongoose
    const User = mongoose.model('User');

    // Fetch user to get companyId
    const user = await User.findById(req.user.userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Query by companyId if available, otherwise by createdBy
    const query = user.companyId
      ? { companyId: user.companyId }
      : { createdBy: user._id };

    const tradeShows = await TradeShow.find(query)
      .populate('createdBy', 'fullName email')
      .populate('showAccessPeople', 'fullName email profileImage')
      .populate('showLeadsAccessPeople', 'fullName email profileImage')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      tradeShows
    });
  } catch (error) {
    console.error('Error fetching trade shows:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching trade shows',
      error: error.message
    });
  }
});

// GET single trade show by ID
router.get('/:id', auth, async (req, res) => {
  try {
    const tradeShow = await TradeShow.findOne({
      _id: req.params.id,
      companyId: req.user.companyId
    })
    .populate('createdBy', 'fullName email')
    .populate('showAccessPeople', 'fullName email profileImage')
    .populate('showLeadsAccessPeople', 'fullName email profileImage');

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

// POST create new trade show with file uploads
router.post('/', auth, uploadTradeShowFiles.fields([
  { name: 'showLogo', maxCount: 1 },
  { name: 'floorPlan', maxCount: 1 }
]), async (req, res) => {
  try {
    // Get User model from mongoose
    const User = mongoose.model('User');

    // Fetch user to get companyId
    const user = await User.findById(req.user.userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const {
      shortName,
      fullName,
      showDate,
      location,
      exhibitors,
      attendees,
      industry,
      eacDeadline,
      earlyBirdDeadline,
      showAccessPeople,
      showLeadsAccessPeople
    } = req.body;

    // Validate required fields
    if (!shortName || !fullName || !showDate || !location) {
      return res.status(400).json({
        success: false,
        message: 'Please provide all required fields: shortName, fullName, showDate, location'
      });
    }

    // Validate logo file size (100KB limit)
    if (req.files && req.files.showLogo && req.files.showLogo[0]) {
      const logoFile = req.files.showLogo[0];
      if (logoFile.size > 100 * 1024) {
        // Delete the uploaded file
        fs.unlinkSync(logoFile.path);
        return res.status(400).json({
          success: false,
          message: 'Logo file size must be less than 100KB'
        });
      }
    }

    // Prepare trade show data
    const tradeShowData = {
      shortName,
      fullName,
      showDate,
      location,
      exhibitors,
      attendees,
      industry,
      eacDeadline,
      earlyBirdDeadline,
      createdBy: req.user.userId,
      companyId: user.companyId || user._id // Use companyId if available, otherwise userId
    };

    // Add show logo if uploaded
    if (req.files && req.files.showLogo && req.files.showLogo[0]) {
      const logoFile = req.files.showLogo[0];
      tradeShowData.showLogo = {
        filename: logoFile.filename,
        originalName: logoFile.originalname,
        path: `/uploads/trade-shows/${logoFile.filename}`,
        size: logoFile.size,
        mimetype: logoFile.mimetype,
        uploadedAt: new Date()
      };
    }

    // Add floor plan if uploaded
    if (req.files && req.files.floorPlan && req.files.floorPlan[0]) {
      const floorPlanFile = req.files.floorPlan[0];
      tradeShowData.floorPlan = {
        filename: floorPlanFile.filename,
        originalName: floorPlanFile.originalname,
        path: `/uploads/trade-shows/${floorPlanFile.filename}`,
        size: floorPlanFile.size,
        mimetype: floorPlanFile.mimetype,
        uploadedAt: new Date()
      };
    }

    // Parse access people arrays
    if (showAccessPeople) {
      try {
        tradeShowData.showAccessPeople = typeof showAccessPeople === 'string'
          ? JSON.parse(showAccessPeople)
          : showAccessPeople;
      } catch (e) {
        tradeShowData.showAccessPeople = [];
      }
    }

    if (showLeadsAccessPeople) {
      try {
        tradeShowData.showLeadsAccessPeople = typeof showLeadsAccessPeople === 'string'
          ? JSON.parse(showLeadsAccessPeople)
          : showLeadsAccessPeople;
      } catch (e) {
        tradeShowData.showLeadsAccessPeople = [];
      }
    }

    // Create trade show
    const tradeShow = new TradeShow(tradeShowData);
    await tradeShow.save();

    // Populate references before sending response
    await tradeShow.populate('createdBy', 'fullName email');
    await tradeShow.populate('showAccessPeople', 'fullName email profileImage');
    await tradeShow.populate('showLeadsAccessPeople', 'fullName email profileImage');

    res.status(201).json({
      success: true,
      message: 'Trade show created successfully',
      tradeShow
    });
  } catch (error) {
    console.error('Error creating trade show:', error);

    // Clean up uploaded files on error
    if (req.files) {
      if (req.files.showLogo && req.files.showLogo[0]) {
        fs.unlinkSync(req.files.showLogo[0].path);
      }
      if (req.files.floorPlan && req.files.floorPlan[0]) {
        fs.unlinkSync(req.files.floorPlan[0].path);
      }
    }

    res.status(500).json({
      success: false,
      message: 'Error creating trade show',
      error: error.message
    });
  }
});

// PUT update trade show
router.put('/:id', auth, uploadTradeShowFiles.fields([
  { name: 'showLogo', maxCount: 1 },
  { name: 'floorPlan', maxCount: 1 }
]), async (req, res) => {
  try {
    const tradeShow = await TradeShow.findOne({
      _id: req.params.id,
      companyId: req.user.companyId
    });

    if (!tradeShow) {
      return res.status(404).json({
        success: false,
        message: 'Trade show not found'
      });
    }

    const {
      shortName,
      fullName,
      showDate,
      location,
      exhibitors,
      attendees,
      industry,
      eacDeadline,
      earlyBirdDeadline,
      showAccessPeople,
      showLeadsAccessPeople
    } = req.body;

    // Update basic fields
    if (shortName) tradeShow.shortName = shortName;
    if (fullName) tradeShow.fullName = fullName;
    if (showDate) tradeShow.showDate = showDate;
    if (location) tradeShow.location = location;
    if (exhibitors !== undefined) tradeShow.exhibitors = exhibitors;
    if (attendees !== undefined) tradeShow.attendees = attendees;
    if (industry !== undefined) tradeShow.industry = industry;
    if (eacDeadline !== undefined) tradeShow.eacDeadline = eacDeadline;
    if (earlyBirdDeadline !== undefined) tradeShow.earlyBirdDeadline = earlyBirdDeadline;

    // Validate logo file size (100KB limit)
    if (req.files && req.files.showLogo && req.files.showLogo[0]) {
      const logoFile = req.files.showLogo[0];
      if (logoFile.size > 100 * 1024) {
        // Delete the uploaded file
        fs.unlinkSync(logoFile.path);
        return res.status(400).json({
          success: false,
          message: 'Logo file size must be less than 100KB'
        });
      }

      // Delete old logo file if exists
      if (tradeShow.showLogo && tradeShow.showLogo.filename) {
        const oldLogoPath = path.join(__dirname, '..', 'uploads', 'trade-shows', tradeShow.showLogo.filename);
        if (fs.existsSync(oldLogoPath)) {
          fs.unlinkSync(oldLogoPath);
        }
      }

      // Update with new logo
      tradeShow.showLogo = {
        filename: logoFile.filename,
        originalName: logoFile.originalname,
        path: `/uploads/trade-shows/${logoFile.filename}`,
        size: logoFile.size,
        mimetype: logoFile.mimetype,
        uploadedAt: new Date()
      };
    }

    // Update floor plan if uploaded
    if (req.files && req.files.floorPlan && req.files.floorPlan[0]) {
      const floorPlanFile = req.files.floorPlan[0];

      // Delete old floor plan file if exists
      if (tradeShow.floorPlan && tradeShow.floorPlan.filename) {
        const oldFloorPlanPath = path.join(__dirname, '..', 'uploads', 'trade-shows', tradeShow.floorPlan.filename);
        if (fs.existsSync(oldFloorPlanPath)) {
          fs.unlinkSync(oldFloorPlanPath);
        }
      }

      // Update with new floor plan
      tradeShow.floorPlan = {
        filename: floorPlanFile.filename,
        originalName: floorPlanFile.originalname,
        path: `/uploads/trade-shows/${floorPlanFile.filename}`,
        size: floorPlanFile.size,
        mimetype: floorPlanFile.mimetype,
        uploadedAt: new Date()
      };
    }

    // Update access people arrays
    if (showAccessPeople) {
      try {
        tradeShow.showAccessPeople = typeof showAccessPeople === 'string'
          ? JSON.parse(showAccessPeople)
          : showAccessPeople;
      } catch (e) {
        // Keep existing value if parse fails
      }
    }

    if (showLeadsAccessPeople) {
      try {
        tradeShow.showLeadsAccessPeople = typeof showLeadsAccessPeople === 'string'
          ? JSON.parse(showLeadsAccessPeople)
          : showLeadsAccessPeople;
      } catch (e) {
        // Keep existing value if parse fails
      }
    }

    await tradeShow.save();

    // Populate references before sending response
    await tradeShow.populate('createdBy', 'fullName email');
    await tradeShow.populate('showAccessPeople', 'fullName email profileImage');
    await tradeShow.populate('showLeadsAccessPeople', 'fullName email profileImage');

    res.json({
      success: true,
      message: 'Trade show updated successfully',
      tradeShow
    });
  } catch (error) {
    console.error('Error updating trade show:', error);

    // Clean up uploaded files on error
    if (req.files) {
      if (req.files.showLogo && req.files.showLogo[0]) {
        fs.unlinkSync(req.files.showLogo[0].path);
      }
      if (req.files.floorPlan && req.files.floorPlan[0]) {
        fs.unlinkSync(req.files.floorPlan[0].path);
      }
    }

    res.status(500).json({
      success: false,
      message: 'Error updating trade show',
      error: error.message
    });
  }
});

// DELETE trade show
router.delete('/:id', auth, async (req, res) => {
  try {
    const tradeShow = await TradeShow.findOne({
      _id: req.params.id,
      companyId: req.user.companyId
    });

    if (!tradeShow) {
      return res.status(404).json({
        success: false,
        message: 'Trade show not found'
      });
    }

    // Delete associated files
    if (tradeShow.showLogo && tradeShow.showLogo.filename) {
      const logoPath = path.join(__dirname, '..', 'uploads', 'trade-shows', tradeShow.showLogo.filename);
      if (fs.existsSync(logoPath)) {
        fs.unlinkSync(logoPath);
      }
    }

    if (tradeShow.floorPlan && tradeShow.floorPlan.filename) {
      const floorPlanPath = path.join(__dirname, '..', 'uploads', 'trade-shows', tradeShow.floorPlan.filename);
      if (fs.existsSync(floorPlanPath)) {
        fs.unlinkSync(floorPlanPath);
      }
    }

    await TradeShow.deleteOne({ _id: req.params.id });

    res.json({
      success: true,
      message: 'Trade show deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting trade show:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting trade show',
      error: error.message
    });
  }
});

module.exports = router;

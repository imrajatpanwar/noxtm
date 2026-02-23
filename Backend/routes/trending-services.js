const express = require('express');
const router = express.Router();
const TrendingService = require('../models/TrendingService');
const { authenticateToken } = require('../middleware/auth');
const auth = authenticateToken;
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const mongoose = require('mongoose');

// Trending Service file upload configuration
const trendingServiceStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = path.join(__dirname, '..', 'uploads', 'trending-services');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'logo-' + uniqueSuffix + path.extname(file.originalname));
  }
});

// Upload for trending service logo
const uploadServiceLogo = multer({
  storage: trendingServiceStorage,
  limits: {
    fileSize: 100 * 1024 // 100KB limit for logo
  },
  fileFilter: (req, file, cb) => {
    const allowedMimes = ['image/jpeg', 'image/jpg', 'image/png', 'image/svg+xml'];
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only JPG, PNG, and SVG files are allowed for logos!'), false);
    }
  }
});

// GET all trending services for the user's company
router.get('/', auth, async (req, res) => {
  try {
    const User = mongoose.model('User');
    const user = await User.findById(req.user.userId);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const query = user.companyId
      ? { companyId: user.companyId }
      : { createdBy: user._id };

    const trendingServices = await TrendingService.find(query)
      .populate('createdBy', 'fullName email')
      .populate('serviceAccessPeople', 'fullName email profileImage')
      .populate('serviceLeadsAccessPeople', 'fullName email profileImage')
      .sort({ createdAt: -1 });

    res.json({ success: true, trendingServices });
  } catch (error) {
    console.error('Error fetching trending services:', error);
    res.status(500).json({ success: false, message: 'Error fetching trending services', error: error.message });
  }
});

// GET single trending service by ID
router.get('/:id', auth, async (req, res) => {
  try {
    const trendingService = await TrendingService.findOne({
      _id: req.params.id,
      companyId: req.user.companyId
    })
    .populate('createdBy', 'fullName email')
    .populate('serviceAccessPeople', 'fullName email profileImage')
    .populate('serviceLeadsAccessPeople', 'fullName email profileImage');

    if (!trendingService) {
      return res.status(404).json({ success: false, message: 'Trending service not found' });
    }

    res.json({ success: true, trendingService });
  } catch (error) {
    console.error('Error fetching trending service:', error);
    res.status(500).json({ success: false, message: 'Error fetching trending service', error: error.message });
  }
});

// POST create new trending service with logo upload
router.post('/', auth, uploadServiceLogo.single('serviceLogo'), async (req, res) => {
  try {
    const User = mongoose.model('User');
    const user = await User.findById(req.user.userId);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const {
      serviceName,
      fullName,
      location,
      industry,
      serviceAccessPeople,
      serviceLeadsAccessPeople
    } = req.body;

    // Validate required fields
    if (!serviceName || !fullName || !location) {
      return res.status(400).json({
        success: false,
        message: 'Please provide all required fields: serviceName, fullName, location'
      });
    }

    // Validate logo file size (100KB limit)
    if (req.file && req.file.size > 100 * 1024) {
      fs.unlinkSync(req.file.path);
      return res.status(400).json({ success: false, message: 'Logo file size must be less than 100KB' });
    }

    // Prepare trending service data
    const serviceData = {
      serviceName,
      fullName,
      location,
      industry,
      createdBy: req.user.userId,
      companyId: user.companyId || user._id
    };

    // Add service logo if uploaded
    if (req.file) {
      serviceData.serviceLogo = {
        filename: req.file.filename,
        originalName: req.file.originalname,
        path: `/uploads/trending-services/${req.file.filename}`,
        size: req.file.size,
        mimetype: req.file.mimetype,
        uploadedAt: new Date()
      };
    }

    // Parse access people arrays
    if (serviceAccessPeople) {
      try {
        serviceData.serviceAccessPeople = typeof serviceAccessPeople === 'string'
          ? JSON.parse(serviceAccessPeople)
          : serviceAccessPeople;
      } catch (e) {
        serviceData.serviceAccessPeople = [];
      }
    }

    if (serviceLeadsAccessPeople) {
      try {
        serviceData.serviceLeadsAccessPeople = typeof serviceLeadsAccessPeople === 'string'
          ? JSON.parse(serviceLeadsAccessPeople)
          : serviceLeadsAccessPeople;
      } catch (e) {
        serviceData.serviceLeadsAccessPeople = [];
      }
    }

    const trendingService = new TrendingService(serviceData);
    await trendingService.save();

    await trendingService.populate('createdBy', 'fullName email');
    await trendingService.populate('serviceAccessPeople', 'fullName email profileImage');
    await trendingService.populate('serviceLeadsAccessPeople', 'fullName email profileImage');

    res.status(201).json({
      success: true,
      message: 'Trending service created successfully',
      trendingService
    });
  } catch (error) {
    console.error('Error creating trending service:', error);
    if (req.file) {
      fs.unlinkSync(req.file.path);
    }
    res.status(500).json({ success: false, message: 'Error creating trending service', error: error.message });
  }
});

// PUT update trending service
router.put('/:id', auth, uploadServiceLogo.single('serviceLogo'), async (req, res) => {
  try {
    const trendingService = await TrendingService.findOne({
      _id: req.params.id,
      companyId: req.user.companyId
    });

    if (!trendingService) {
      return res.status(404).json({ success: false, message: 'Trending service not found' });
    }

    const {
      serviceName,
      fullName,
      location,
      industry,
      serviceAccessPeople,
      serviceLeadsAccessPeople
    } = req.body;

    // Update basic fields
    if (serviceName) trendingService.serviceName = serviceName;
    if (fullName) trendingService.fullName = fullName;
    if (location) trendingService.location = location;
    if (industry !== undefined) trendingService.industry = industry;

    // Validate logo file size (100KB limit)
    if (req.file) {
      if (req.file.size > 100 * 1024) {
        fs.unlinkSync(req.file.path);
        return res.status(400).json({ success: false, message: 'Logo file size must be less than 100KB' });
      }

      // Delete old logo file if exists
      if (trendingService.serviceLogo && trendingService.serviceLogo.filename) {
        const oldLogoPath = path.join(__dirname, '..', 'uploads', 'trending-services', trendingService.serviceLogo.filename);
        if (fs.existsSync(oldLogoPath)) {
          fs.unlinkSync(oldLogoPath);
        }
      }

      trendingService.serviceLogo = {
        filename: req.file.filename,
        originalName: req.file.originalname,
        path: `/uploads/trending-services/${req.file.filename}`,
        size: req.file.size,
        mimetype: req.file.mimetype,
        uploadedAt: new Date()
      };
    }

    // Update access people arrays
    if (serviceAccessPeople) {
      try {
        trendingService.serviceAccessPeople = typeof serviceAccessPeople === 'string'
          ? JSON.parse(serviceAccessPeople)
          : serviceAccessPeople;
      } catch (e) {
        // Keep existing value if parse fails
      }
    }

    if (serviceLeadsAccessPeople) {
      try {
        trendingService.serviceLeadsAccessPeople = typeof serviceLeadsAccessPeople === 'string'
          ? JSON.parse(serviceLeadsAccessPeople)
          : serviceLeadsAccessPeople;
      } catch (e) {
        // Keep existing value if parse fails
      }
    }

    await trendingService.save();

    await trendingService.populate('createdBy', 'fullName email');
    await trendingService.populate('serviceAccessPeople', 'fullName email profileImage');
    await trendingService.populate('serviceLeadsAccessPeople', 'fullName email profileImage');

    res.json({
      success: true,
      message: 'Trending service updated successfully',
      trendingService
    });
  } catch (error) {
    console.error('Error updating trending service:', error);
    if (req.file) {
      fs.unlinkSync(req.file.path);
    }
    res.status(500).json({ success: false, message: 'Error updating trending service', error: error.message });
  }
});

// DELETE trending service
router.delete('/:id', auth, async (req, res) => {
  try {
    const trendingService = await TrendingService.findOne({
      _id: req.params.id,
      companyId: req.user.companyId
    });

    if (!trendingService) {
      return res.status(404).json({ success: false, message: 'Trending service not found' });
    }

    // Delete associated logo file
    if (trendingService.serviceLogo && trendingService.serviceLogo.filename) {
      const logoPath = path.join(__dirname, '..', 'uploads', 'trending-services', trendingService.serviceLogo.filename);
      if (fs.existsSync(logoPath)) {
        fs.unlinkSync(logoPath);
      }
    }

    await TrendingService.deleteOne({ _id: req.params.id });

    res.json({ success: true, message: 'Trending service deleted successfully' });
  } catch (error) {
    console.error('Error deleting trending service:', error);
    res.status(500).json({ success: false, message: 'Error deleting trending service', error: error.message });
  }
});

module.exports = router;

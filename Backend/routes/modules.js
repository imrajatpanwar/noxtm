const express = require('express');
const router = express.Router();
const InstalledModule = require('../models/InstalledModule');
const { authenticateToken } = require('../middleware/auth');
const auth = authenticateToken;

// Get all installed modules for the current user
router.get('/installed', auth, async (req, res) => {
  try {
    const modules = await InstalledModule.find({
      userId: req.user.userId,
      status: 'active',
    }).select('moduleId installedAt');

    res.json({
      success: true,
      modules: modules.map(m => ({
        moduleId: m.moduleId,
        installedAt: m.installedAt,
      })),
    });
  } catch (error) {
    console.error('Error fetching installed modules:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch installed modules',
    });
  }
});

// Install a module
router.post('/install', auth, async (req, res) => {
  try {
    const { moduleId } = req.body;

    // Validate moduleId
    if (!moduleId || !['BotGit', 'ExhibitOS', 'ChatAutomation', 'WhatsAppMarketing'].includes(moduleId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid module ID',
      });
    }

    // Check if module is already installed
    const existingModule = await InstalledModule.findOne({
      userId: req.user.userId,
      moduleId,
    });

    if (existingModule) {
      // If it exists but is inactive, reactivate it
      if (existingModule.status === 'inactive') {
        existingModule.status = 'active';
        existingModule.installedAt = new Date();
        await existingModule.save();
        return res.json({
          success: true,
          message: 'Module reactivated successfully',
          module: {
            moduleId: existingModule.moduleId,
            installedAt: existingModule.installedAt,
          },
        });
      }

      return res.status(400).json({
        success: false,
        message: 'Module already installed',
      });
    }

    // Install the module
    const newModule = new InstalledModule({
      userId: req.user.userId,
      moduleId,
      status: 'active',
    });

    await newModule.save();

    res.json({
      success: true,
      message: 'Module installed successfully',
      module: {
        moduleId: newModule.moduleId,
        installedAt: newModule.installedAt,
      },
    });
  } catch (error) {
    console.error('Error installing module:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to install module',
    });
  }
});

// Uninstall a module
router.delete('/:moduleId/uninstall', auth, async (req, res) => {
  try {
    const { moduleId } = req.params;

    // Validate moduleId
    if (!['BotGit', 'ExhibitOS', 'ChatAutomation'].includes(moduleId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid module ID',
      });
    }

    const module = await InstalledModule.findOne({
      userId: req.user.userId,
      moduleId,
    });

    if (!module) {
      return res.status(404).json({
        success: false,
        message: 'Module not found',
      });
    }

    // Set status to inactive instead of deleting
    module.status = 'inactive';
    await module.save();

    res.json({
      success: true,
      message: 'Module uninstalled successfully',
    });
  } catch (error) {
    console.error('Error uninstalling module:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to uninstall module',
    });
  }
});

module.exports = router;

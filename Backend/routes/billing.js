const express = require('express');
const router = express.Router();
const { authenticateToken: auth } = require('../middleware/auth');
const Company = require('../models/Company');
const User = require('../models/User');

// Get billing info
router.get('/info', auth, async (req, res) => {
  try {
    const company = await Company.findById(req.user.company);

    if (!company) {
      return res.status(404).json({ success: false, message: 'Company not found' });
    }

    // Initialize billing if not exists
    if (!company.billing) {
      company.billing = {
        emailCredits: 0,
        totalPurchased: 0,
        totalUsed: 0,
        purchaseHistory: []
      };
      await company.save();
    }

    res.json({
      success: true,
      billing: {
        emailCredits: company.billing.emailCredits || 0,
        totalPurchased: company.billing.totalPurchased || 0,
        totalUsed: company.billing.totalUsed || 0,
        lastPurchase: company.billing.purchaseHistory?.length > 0
          ? company.billing.purchaseHistory[company.billing.purchaseHistory.length - 1].date
          : null
      }
    });
  } catch (error) {
    console.error('Error fetching billing info:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Get email usage stats
router.get('/usage', auth, async (req, res) => {
  try {
    const company = await Company.findById(req.user.company);

    if (!company) {
      return res.status(404).json({ success: false, message: 'Company not found' });
    }

    // Calculate usage from campaigns
    const Campaign = require('../models/Campaign');
    const now = new Date();
    const startOfThisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);

    // This month's usage
    const thisMonthCampaigns = await Campaign.find({
      company: req.user.company,
      sentAt: { $gte: startOfThisMonth }
    });
    const thisMonthUsage = thisMonthCampaigns.reduce((acc, c) => acc + (c.stats?.sent || 0), 0);

    // Last month's usage
    const lastMonthCampaigns = await Campaign.find({
      company: req.user.company,
      sentAt: { $gte: startOfLastMonth, $lte: endOfLastMonth }
    });
    const lastMonthUsage = lastMonthCampaigns.reduce((acc, c) => acc + (c.stats?.sent || 0), 0);

    // Total usage
    const allCampaigns = await Campaign.find({ company: req.user.company });
    const totalUsage = allCampaigns.reduce((acc, c) => acc + (c.stats?.sent || 0), 0);

    res.json({
      success: true,
      usage: {
        thisMonth: thisMonthUsage,
        lastMonth: lastMonthUsage,
        total: totalUsage
      }
    });
  } catch (error) {
    console.error('Error fetching usage:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Purchase email credits
router.post('/purchase', auth, async (req, res) => {
  try {
    const { emailCredits, amount } = req.body;

    if (!emailCredits || emailCredits < 1000) {
      return res.status(400).json({
        success: false,
        message: 'Minimum purchase is 1,000 email credits'
      });
    }

    const company = await Company.findById(req.user.company);

    if (!company) {
      return res.status(404).json({ success: false, message: 'Company not found' });
    }

    // Initialize billing if not exists
    if (!company.billing) {
      company.billing = {
        emailCredits: 0,
        totalPurchased: 0,
        totalUsed: 0,
        purchaseHistory: []
      };
    }

    // TODO: Integrate with Stripe/PayPal for real payment processing
    // For now, we'll simulate successful payment

    // Add credits
    company.billing.emailCredits = (company.billing.emailCredits || 0) + emailCredits;
    company.billing.totalPurchased = (company.billing.totalPurchased || 0) + emailCredits;

    // Add to purchase history
    if (!company.billing.purchaseHistory) {
      company.billing.purchaseHistory = [];
    }

    company.billing.purchaseHistory.push({
      date: new Date(),
      emailCredits,
      amount: parseFloat(amount),
      status: 'completed',
      paymentMethod: 'card'
    });

    await company.save();

    res.json({
      success: true,
      message: 'Purchase successful',
      billing: {
        emailCredits: company.billing.emailCredits,
        totalPurchased: company.billing.totalPurchased
      }
    });
  } catch (error) {
    console.error('Error processing purchase:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Get purchase history
router.get('/history', auth, async (req, res) => {
  try {
    const company = await Company.findById(req.user.company);

    if (!company) {
      return res.status(404).json({ success: false, message: 'Company not found' });
    }

    res.json({
      success: true,
      history: company.billing?.purchaseHistory || []
    });
  } catch (error) {
    console.error('Error fetching purchase history:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Deduct email credits (called when sending campaigns)
router.post('/deduct', auth, async (req, res) => {
  try {
    const { emailCount, campaignId } = req.body;

    const company = await Company.findById(req.user.company);

    if (!company) {
      return res.status(404).json({ success: false, message: 'Company not found' });
    }

    const currentCredits = company.billing?.emailCredits || 0;

    if (currentCredits < emailCount) {
      return res.status(400).json({
        success: false,
        message: 'Insufficient email credits',
        required: emailCount,
        available: currentCredits
      });
    }

    // Deduct credits
    company.billing.emailCredits -= emailCount;
    company.billing.totalUsed = (company.billing.totalUsed || 0) + emailCount;

    await company.save();

    res.json({
      success: true,
      message: 'Credits deducted',
      remainingCredits: company.billing.emailCredits
    });
  } catch (error) {
    console.error('Error deducting credits:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Check if company has enough credits
router.get('/check/:count', auth, async (req, res) => {
  try {
    const count = parseInt(req.params.count);
    const company = await Company.findById(req.user.company);

    if (!company) {
      return res.status(404).json({ success: false, message: 'Company not found' });
    }

    const currentCredits = company.billing?.emailCredits || 0;

    res.json({
      success: true,
      hasEnoughCredits: currentCredits >= count,
      available: currentCredits,
      required: count
    });
  } catch (error) {
    console.error('Error checking credits:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;

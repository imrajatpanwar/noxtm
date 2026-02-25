const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const Razorpay = require('razorpay');
const { authenticateToken } = require('../middleware/auth');
const User = require('../models/User');
const Company = require('../models/Company');

// Lazy-init Razorpay instance (so it reads env at call time, not import time)
let razorpayInstance = null;
function getRazorpay() {
  if (!razorpayInstance) {
    razorpayInstance = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID,
      key_secret: process.env.RAZORPAY_KEY_SECRET
    });
  }
  return razorpayInstance;
}

// Plan price map (INR — amounts in paise for Razorpay)
const PLAN_PRICES = {
  Starter:  { monthly: 169900, yearly: 1359 * 12 * 100 },
  'Pro+':   { monthly: 269900, yearly: 2159 * 12 * 100 },
  Advance:  { monthly: 469900, yearly: 3759 * 12 * 100 },
  Noxtm:    { monthly: 1299900, yearly: 1299900 * 12 }
};

// Email credit pricing (INR paise per credit)
const CREDIT_RATE_PAISE = 15; // ₹0.15 per credit

// ============================================
// POST /create-order — Create a Razorpay order for subscription checkout
// ============================================
router.post('/create-order', authenticateToken, async (req, res) => {
  try {
    const { plan, billingCycle } = req.body;

    if (!plan || !PLAN_PRICES[plan]) {
      return res.status(400).json({ success: false, message: 'Invalid plan' });
    }

    const cycle = billingCycle === 'Annual' ? 'yearly' : 'monthly';
    const amount = PLAN_PRICES[plan][cycle];

    const rzp = getRazorpay();
    const shortId = req.user.userId.toString().slice(-8);
    const order = await rzp.orders.create({
      amount,
      currency: 'INR',
      receipt: `sub_${shortId}_${Date.now()}`,
      notes: {
        userId: req.user.userId,
        plan,
        billingCycle: billingCycle || 'Monthly',
        type: 'subscription'
      }
    });

    res.json({
      success: true,
      order: {
        id: order.id,
        amount: order.amount,
        currency: order.currency
      },
      key: process.env.RAZORPAY_KEY_ID
    });
  } catch (error) {
    console.error('Razorpay create-order error:', error);
    res.status(500).json({ success: false, message: 'Failed to create payment order' });
  }
});

// ============================================
// POST /verify-payment — Verify Razorpay payment signature & activate subscription
// ============================================
router.post('/verify-payment', authenticateToken, async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, plan, billingCycle } = req.body;

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return res.status(400).json({ success: false, message: 'Missing payment details' });
    }

    // Verify signature
    const body = razorpay_order_id + '|' + razorpay_payment_id;
    const expectedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(body)
      .digest('hex');

    if (expectedSignature !== razorpay_signature) {
      return res.status(400).json({ success: false, message: 'Payment verification failed — invalid signature' });
    }

    // Payment verified — activate subscription
    const userId = req.user.userId;
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const startDate = new Date();
    const endDate = new Date();
    if (billingCycle === 'Annual') {
      endDate.setFullYear(endDate.getFullYear() + 1);
    } else {
      endDate.setMonth(endDate.getMonth() + 1);
    }

    user.subscription = {
      plan,
      status: 'active',
      startDate,
      endDate,
      billingCycle: billingCycle || 'Monthly',
      trialUsed: user.subscription?.trialUsed || false
    };

    // Import permission helpers
    const { getDefaultPermissions, syncAccessFromPermissions } = require('../utils/subscriptionHelpers');

    user.permissions = getDefaultPermissions(plan);
    user.access = syncAccessFromPermissions(user.permissions);

    await user.save();

    // Sync company subscription
    if (user.companyId) {
      await Company.findByIdAndUpdate(user.companyId, {
        'subscription.plan': plan,
        'subscription.status': 'active',
        'subscription.startDate': startDate,
        'subscription.endDate': endDate
      });
    }

    const userObject = user.toObject();
    delete userObject.password;

    res.json({
      success: true,
      message: `Payment successful! You are now subscribed to ${plan} plan.`,
      user: userObject
    });
  } catch (error) {
    console.error('Razorpay verify-payment error:', error);
    res.status(500).json({ success: false, message: 'Payment verification failed' });
  }
});

// ============================================
// POST /create-credits-order — Create order for email credit purchase
// ============================================
router.post('/create-credits-order', authenticateToken, async (req, res) => {
  try {
    const { emailCredits } = req.body;

    if (!emailCredits || emailCredits < 1000) {
      return res.status(400).json({ success: false, message: 'Minimum purchase is 1,000 email credits' });
    }

    const amount = emailCredits * CREDIT_RATE_PAISE; // in paise

    const rzp = getRazorpay();
    const shortId = req.user.userId.toString().slice(-8);
    const order = await rzp.orders.create({
      amount,
      currency: 'INR',
      receipt: `cr_${shortId}_${Date.now()}`,
      notes: {
        userId: req.user.userId,
        companyId: req.user.companyId || req.user.company,
        emailCredits,
        type: 'email_credits'
      }
    });

    res.json({
      success: true,
      order: {
        id: order.id,
        amount: order.amount,
        currency: order.currency
      },
      key: process.env.RAZORPAY_KEY_ID
    });
  } catch (error) {
    console.error('Razorpay create-credits-order error:', error);
    res.status(500).json({ success: false, message: 'Failed to create payment order' });
  }
});

// ============================================
// POST /verify-credits-payment — Verify payment & add email credits
// ============================================
router.post('/verify-credits-payment', authenticateToken, async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, emailCredits, amount } = req.body;

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return res.status(400).json({ success: false, message: 'Missing payment details' });
    }

    // Verify signature
    const body = razorpay_order_id + '|' + razorpay_payment_id;
    const expectedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(body)
      .digest('hex');

    if (expectedSignature !== razorpay_signature) {
      return res.status(400).json({ success: false, message: 'Payment verification failed' });
    }

    // Payment verified — add credits
    const companyId = req.user.companyId || req.user.company;
    const company = await Company.findById(companyId);
    if (!company) {
      return res.status(404).json({ success: false, message: 'Company not found' });
    }

    if (!company.billing) {
      company.billing = { emailCredits: 0, totalPurchased: 0, totalUsed: 0, purchaseHistory: [] };
    }

    company.billing.emailCredits = (company.billing.emailCredits || 0) + emailCredits;
    company.billing.totalPurchased = (company.billing.totalPurchased || 0) + emailCredits;

    if (!company.billing.purchaseHistory) {
      company.billing.purchaseHistory = [];
    }

    company.billing.purchaseHistory.push({
      date: new Date(),
      emailCredits,
      amount: amount / 100, // convert paise to rupees
      status: 'completed',
      paymentMethod: 'razorpay',
      transactionId: razorpay_payment_id
    });

    await company.save();

    res.json({
      success: true,
      message: `${emailCredits.toLocaleString()} email credits added successfully!`,
      billing: {
        emailCredits: company.billing.emailCredits,
        totalPurchased: company.billing.totalPurchased
      }
    });
  } catch (error) {
    console.error('Razorpay verify-credits-payment error:', error);
    res.status(500).json({ success: false, message: 'Payment verification failed' });
  }
});

// ============================================
// POST /webhook — Razorpay webhook handler (optional — for async events)
// ============================================
router.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  try {
    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;
    if (!webhookSecret) {
      return res.status(200).json({ status: 'ok' }); // No webhook secret configured, skip
    }

    const signature = req.headers['x-razorpay-signature'];
    const body = typeof req.body === 'string' ? req.body : JSON.stringify(req.body);

    const expectedSignature = crypto
      .createHmac('sha256', webhookSecret)
      .update(body)
      .digest('hex');

    if (signature !== expectedSignature) {
      console.warn('[Razorpay Webhook] Invalid signature');
      return res.status(400).json({ status: 'invalid_signature' });
    }

    const event = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    console.log('[Razorpay Webhook] Event:', event.event);

    // Handle payment.captured event for extra safety
    if (event.event === 'payment.captured') {
      const payment = event.payload?.payment?.entity;
      if (payment) {
        console.log(`[Razorpay Webhook] Payment captured: ${payment.id}, amount: ${payment.amount}, order: ${payment.order_id}`);
      }
    }

    // Handle payment.failed
    if (event.event === 'payment.failed') {
      const payment = event.payload?.payment?.entity;
      if (payment) {
        console.log(`[Razorpay Webhook] Payment failed: ${payment.id}, reason: ${payment.error_description}`);
      }
    }

    res.json({ status: 'ok' });
  } catch (error) {
    console.error('[Razorpay Webhook] Error:', error);
    res.status(500).json({ status: 'error' });
  }
});

module.exports = router;

import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import api from '../config/api';
import './PaymentCheckout.css';

const PLAN_DETAILS = {
  'Starter': { name: 'Starter', monthlyPrice: 1699, yearlyPrice: 1359 },
  'Pro+': { name: 'Pro +', monthlyPrice: 2699, yearlyPrice: 2159 },
  'Advance': { name: 'Advance', monthlyPrice: 4699, yearlyPrice: 3759 }
};

// Load Razorpay SDK dynamically
function loadRazorpayScript() {
  return new Promise((resolve) => {
    if (window.Razorpay) { resolve(true); return; }
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

const PaymentCheckout = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const planKey = searchParams.get('plan') || 'Advance';
  const billingCycle = searchParams.get('billing') || 'Monthly';
  const plan = PLAN_DETAILS[planKey] || PLAN_DETAILS['Advance'];

  const [loading, setLoading] = useState(false);

  // Redirect if not logged in
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      navigate('/login');
    }
  }, [navigate]);

  // Preload Razorpay SDK
  useEffect(() => {
    loadRazorpayScript();
  }, []);

  const handlePayment = useCallback(async () => {
    setLoading(true);
    try {
      // 1. Load Razorpay SDK
      const loaded = await loadRazorpayScript();
      if (!loaded) {
        toast.error('Failed to load payment gateway. Please check your internet connection.');
        setLoading(false);
        return;
      }

      // 2. Create order on backend
      const orderRes = await api.post('/razorpay/create-order', {
        plan: planKey,
        billingCycle
      });

      if (!orderRes.data.success) {
        toast.error(orderRes.data.message || 'Failed to create payment order');
        setLoading(false);
        return;
      }

      const { order, key } = orderRes.data;

      // 3. Get user info for prefill
      const userStr = localStorage.getItem('user');
      const user = userStr ? JSON.parse(userStr) : {};

      // 4. Open Razorpay checkout
      const options = {
        key,
        amount: order.amount,
        currency: order.currency,
        name: 'Noxtm',
        description: `${plan.name} Plan — ${billingCycle} Billing`,
        order_id: order.id,
        handler: async function (response) {
          // Payment successful — verify on backend
          try {
            const verifyRes = await api.post('/razorpay/verify-payment', {
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
              plan: planKey,
              billingCycle
            });

            if (verifyRes.data.success) {
              localStorage.setItem('user', JSON.stringify(verifyRes.data.user));
              window.dispatchEvent(new Event('userUpdated'));
              toast.success(verifyRes.data.message || 'Payment successful!');
              navigate('/dashboard');
            } else {
              toast.error(verifyRes.data.message || 'Payment verification failed.');
            }
          } catch (err) {
            console.error('Payment verification error:', err);
            toast.error('Payment verification failed. If amount was debited, please contact support.');
          }
          setLoading(false);
        },
        prefill: {
          name: user.name || user.firstName || '',
          email: user.email || '',
          contact: user.phone || ''
        },
        theme: {
          color: '#6C5CE7'
        },
        modal: {
          ondismiss: function () {
            setLoading(false);
          }
        }
      };

      const rzp = new window.Razorpay(options);

      rzp.on('payment.failed', function (response) {
        console.error('Razorpay payment failed:', response.error);
        toast.error(response.error?.description || 'Payment failed. Please try again.');
        setLoading(false);
      });

      rzp.open();
    } catch (error) {
      console.error('Checkout error:', error);
      toast.error(error.response?.data?.message || 'Something went wrong. Please try again.');
      setLoading(false);
    }
  }, [planKey, billingCycle, plan.name, navigate]);

  const price = billingCycle === 'Annual' ? plan.yearlyPrice : plan.monthlyPrice;
  const totalAmount = billingCycle === 'Annual' ? price * 12 : price;

  return (
    <div className="pc-page">
      <div className="pc-container">
        {/* Stepper */}
        <div className="pc-stepper">
          <div className="pc-step completed">
            <div className="pc-step-circle">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
            </div>
            <span>Company Details</span>
          </div>
          <div className="pc-step-line"></div>
          <div className="pc-step completed">
            <div className="pc-step-circle">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
            </div>
            <span>Choose Plan</span>
          </div>
          <div className="pc-step-line"></div>
          <div className="pc-step active">
            <div className="pc-step-circle">3</div>
            <span>Payment</span>
          </div>
        </div>

        <div className="pc-layout">
          {/* Order Summary */}
          <div className="pc-summary-card">
            <h3>Order Summary</h3>
            <div className="pc-plan-info">
              <div className="pc-plan-name">{plan.name}</div>
              <div className="pc-plan-cycle">{billingCycle} billing</div>
            </div>
            <div className="pc-price-row">
              <span>Plan price</span>
              <span className="pc-price">₹{price}/mo</span>
            </div>
            {billingCycle === 'Annual' && (
              <div className="pc-price-row">
                <span>Annual total (12 months)</span>
                <span className="pc-price">₹{(price * 12).toLocaleString()}</span>
              </div>
            )}
            <div className="pc-divider"></div>
            <div className="pc-price-row pc-total">
              <span>Due today</span>
              <span className="pc-price-total">₹{totalAmount.toLocaleString()}</span>
            </div>
            <button className="pc-back-link" onClick={() => navigate('/pricing')}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>
              Back to plans
            </button>
          </div>

          {/* Payment Card */}
          <div className="pc-form-card">
            <h3>Payment</h3>

            <div style={{ textAlign: 'center', padding: '20px 0' }}>
              <p style={{ color: '#666', marginBottom: '8px', fontSize: '14px' }}>
                You'll be redirected to Razorpay's secure payment page to complete your payment.
              </p>
              <p style={{ color: '#888', fontSize: '13px', marginBottom: '24px' }}>
                Supports UPI, Credit/Debit Cards, Net Banking, Wallets & more.
              </p>

              <button
                type="button"
                className="pc-pay-btn"
                disabled={loading}
                onClick={handlePayment}
              >
                {loading ? (
                  <>
                    <svg className="pc-spinner" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/></svg>
                    Processing...
                  </>
                ) : (
                  <>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
                    Pay ₹{totalAmount.toLocaleString()}
                  </>
                )}
              </button>

              <p className="pc-secure-text">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                Secured by Razorpay — 256-bit encrypted
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PaymentCheckout;

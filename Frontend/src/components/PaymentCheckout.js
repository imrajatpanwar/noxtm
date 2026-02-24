import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import api from '../config/api';
import './PaymentCheckout.css';

const PLAN_DETAILS = {
  'Starter': { name: 'Starter', monthlyPrice: 1699, yearlyPrice: 1359 },
  'Pro+': { name: 'Pro +', monthlyPrice: 2699, yearlyPrice: 2159 },
  'Advance': { name: 'Advance', monthlyPrice: 4699, yearlyPrice: 3759 }
};

const PaymentCheckout = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const planKey = searchParams.get('plan') || 'Advance';
  const billingCycle = searchParams.get('billing') || 'Monthly';
  const plan = PLAN_DETAILS[planKey] || PLAN_DETAILS['Advance'];

  const [paymentMethod, setPaymentMethod] = useState('card');
  const [loading, setLoading] = useState(false);
  const [cardData, setCardData] = useState({
    cardNumber: '',
    expiry: '',
    cvv: '',
    cardholderName: ''
  });
  const [upiId, setUpiId] = useState('');

  // Redirect if not logged in
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      navigate('/login');
    }
  }, [navigate]);

  const formatCardNumber = (value) => {
    const v = value.replace(/\D/g, '').slice(0, 16);
    const parts = [];
    for (let i = 0; i < v.length; i += 4) {
      parts.push(v.slice(i, i + 4));
    }
    return parts.join(' ');
  };

  const formatExpiry = (value) => {
    const v = value.replace(/\D/g, '').slice(0, 4);
    if (v.length >= 3) return v.slice(0, 2) + '/' + v.slice(2);
    return v;
  };

  const handleCardChange = (e) => {
    const { name, value } = e.target;
    if (name === 'cardNumber') {
      setCardData(prev => ({ ...prev, cardNumber: formatCardNumber(value) }));
    } else if (name === 'expiry') {
      setCardData(prev => ({ ...prev, expiry: formatExpiry(value) }));
    } else if (name === 'cvv') {
      setCardData(prev => ({ ...prev, cvv: value.replace(/\D/g, '').slice(0, 4) }));
    } else {
      setCardData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validate
    if (paymentMethod === 'card') {
      const num = cardData.cardNumber.replace(/\s/g, '');
      if (num.length < 13) { toast.error('Enter a valid card number'); return; }
      if (cardData.expiry.length < 5) { toast.error('Enter a valid expiry date'); return; }
      if (cardData.cvv.length < 3) { toast.error('Enter a valid CVV'); return; }
      if (!cardData.cardholderName.trim()) { toast.error('Enter the cardholder name'); return; }
    } else {
      if (!upiId.includes('@')) { toast.error('Enter a valid UPI ID (e.g. name@bank)'); return; }
    }

    setLoading(true);
    try {
      const payload = {
        plan: planKey,
        billingCycle,
        paymentMethod
      };

      if (paymentMethod === 'card') {
        payload.cardDetails = {
          cardNumber: cardData.cardNumber.replace(/\s/g, ''),
          expiry: cardData.expiry,
          cvv: cardData.cvv,
          cardholderName: cardData.cardholderName
        };
      } else {
        payload.upiId = upiId;
      }

      const response = await api.post('/subscription/checkout', payload);

      if (response.data.success) {
        localStorage.setItem('user', JSON.stringify(response.data.user));
        window.dispatchEvent(new Event('userUpdated'));
        toast.success(response.data.message || 'Payment successful!');
        navigate('/dashboard');
      } else {
        toast.error(response.data.message || 'Payment failed. Please try again.');
      }
    } catch (error) {
      console.error('Checkout error:', error);
      toast.error(error.response?.data?.message || 'Payment failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const price = billingCycle === 'Annual' ? plan.yearlyPrice : plan.monthlyPrice;

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
            <div className="pc-divider"></div>
            <div className="pc-price-row pc-total">
              <span>Due today</span>
              <span className="pc-price-total">₹{billingCycle === 'Annual' ? price * 12 : price}</span>
            </div>
            <button className="pc-back-link" onClick={() => navigate('/pricing')}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>
              Back to plans
            </button>
          </div>

          {/* Payment Form */}
          <div className="pc-form-card">
            <h3>Payment Details</h3>

            {/* Payment Method Tabs */}
            <div className="pc-method-tabs">
              <button
                type="button"
                className={`pc-method-tab ${paymentMethod === 'card' ? 'active' : ''}`}
                onClick={() => setPaymentMethod('card')}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="4" width="22" height="16" rx="2" ry="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>
                Credit / Debit Card
              </button>
              <button
                type="button"
                className={`pc-method-tab ${paymentMethod === 'upi' ? 'active' : ''}`}
                onClick={() => setPaymentMethod('upi')}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
                UPI
              </button>
            </div>

            <form onSubmit={handleSubmit} className="pc-form">
              {paymentMethod === 'card' ? (
                <>
                  <div className="pc-field">
                    <label>Cardholder Name</label>
                    <input
                      type="text"
                      name="cardholderName"
                      value={cardData.cardholderName}
                      onChange={handleCardChange}
                      placeholder="Name on card"
                      autoComplete="cc-name"
                    />
                  </div>
                  <div className="pc-field">
                    <label>Card Number</label>
                    <div className="pc-card-input-wrap">
                      <input
                        type="text"
                        name="cardNumber"
                        value={cardData.cardNumber}
                        onChange={handleCardChange}
                        placeholder="1234 5678 9012 3456"
                        autoComplete="cc-number"
                        inputMode="numeric"
                      />
                      <div className="pc-card-icons">
                        <svg width="24" height="16" viewBox="0 0 48 32" fill="none"><rect width="48" height="32" rx="4" fill="#1A1F71"/><circle cx="18" cy="16" r="8" fill="#EB001B"/><circle cx="30" cy="16" r="8" fill="#F79E1B"/><path d="M24 9.8a8 8 0 0 1 0 12.4 8 8 0 0 1 0-12.4z" fill="#FF5F00"/></svg>
                        <svg width="24" height="16" viewBox="0 0 48 32" fill="none"><rect width="48" height="32" rx="4" fill="#0066B2"/><text x="8" y="20" fontSize="12" fontWeight="700" fill="#FFF">VISA</text></svg>
                      </div>
                    </div>
                  </div>
                  <div className="pc-row">
                    <div className="pc-field">
                      <label>Expiry Date</label>
                      <input
                        type="text"
                        name="expiry"
                        value={cardData.expiry}
                        onChange={handleCardChange}
                        placeholder="MM/YY"
                        autoComplete="cc-exp"
                        inputMode="numeric"
                      />
                    </div>
                    <div className="pc-field">
                      <label>CVV</label>
                      <input
                        type="password"
                        name="cvv"
                        value={cardData.cvv}
                        onChange={handleCardChange}
                        placeholder="•••"
                        autoComplete="cc-csc"
                        inputMode="numeric"
                      />
                    </div>
                  </div>
                </>
              ) : (
                <div className="pc-field">
                  <label>UPI ID</label>
                  <input
                    type="text"
                    value={upiId}
                    onChange={(e) => setUpiId(e.target.value)}
                    placeholder="yourname@upi"
                  />
                  <span className="pc-hint">e.g. name@okicici, name@paytm, name@ybl</span>
                </div>
              )}

              <button type="submit" className="pc-pay-btn" disabled={loading}>
                {loading ? (
                  <>
                    <svg className="pc-spinner" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/></svg>
                    Processing payment...
                  </>
                ) : (
                  <>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
                    Pay ₹{billingCycle === 'Annual' ? (price * 12).toLocaleString() : price.toLocaleString()}
                  </>
                )}
              </button>

              <p className="pc-secure-text">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                Your payment information is encrypted and secure
              </p>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PaymentCheckout;

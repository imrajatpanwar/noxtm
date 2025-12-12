import React, { useState, useEffect, useCallback } from 'react';
import { FiAlertCircle, FiCheck } from 'react-icons/fi';
import api from '../config/api';
import './ProfileSettings.css';

function ProfileSettings({ user: initialUser, onLogout }) {
  const [userData, setUserData] = useState(initialUser);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [activeTab, setActiveTab] = useState('personal'); // personal, salary, billing
  const [uploadingImage, setUploadingImage] = useState(false);
  const [previewImage, setPreviewImage] = useState(null);

  // Billing modals
  const [showPlanModal, setShowPlanModal] = useState(false);
  const [showCardModal, setShowCardModal] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [selectedBillingCycle, setSelectedBillingCycle] = useState('Monthly');

  const showMessage = useCallback((type, text) => {
    setMessage({ type, text });
    setTimeout(() => setMessage({ type: '', text: '' }), 5000);
  }, []);

  const handleProfileImageUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      showMessage('error', 'Please select a valid image file');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      showMessage('error', 'Image size should be less than 5MB');
      return;
    }

    // Create preview URL
    const previewUrl = URL.createObjectURL(file);
    setPreviewImage(previewUrl);

    try {
      setUploadingImage(true);
      const formData = new FormData();
      formData.append('profileImage', file);

      const response = await api.post('/profile/upload-image', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      if (response.data.success) {
        // Update userData with the new image URL
        const newImageUrl = response.data.imageUrl || response.data.profileImage || response.data.data?.imageUrl;

        console.log('Upload response:', response.data);
        console.log('New image URL:', newImageUrl);

        setUserData(prev => ({
          ...prev,
          profileImage: newImageUrl,
          avatarUrl: newImageUrl,
          image: newImageUrl
        }));
        // Clear preview since we now have the uploaded image
        setPreviewImage(null);
        URL.revokeObjectURL(previewUrl); // Clean up preview URL
        showMessage('success', 'Profile image updated successfully');

        // Optionally refetch profile to ensure consistency
        fetchProfile();
      }
    } catch (error) {
      console.error('Error uploading image:', error);
      showMessage('error', 'Failed to upload image. Please try again.');
      // Keep preview on error so user can try again
    } finally {
      setUploadingImage(false);
      // Clear the input so the same file can be selected again
      event.target.value = '';
    }
  };

  const fetchProfile = useCallback(async () => {
    try {
      setLoading(true);
      const response = await api.get('/profile');
      console.log('Fetched profile data:', response.data);
      console.log('Profile image URL:', response.data?.profileImage || response.data?.avatarUrl || response.data?.image);
      setUserData(response.data);
    } catch (error) {
      console.error('Error fetching profile:', error);
      showMessage('error', 'Failed to load profile data');
    } finally {
      setLoading(false);
    }
  }, [showMessage]);

  // Handle plan adjustment
  const handleAdjustPlan = () => {
    setSelectedPlan(userData?.subscription?.plan || 'Noxtm');
    setSelectedBillingCycle(userData?.subscription?.billingCycle || 'Monthly');
    setShowPlanModal(true);
  };

  const handleSavePlan = async () => {
    try {
      setLoading(true);
      const response = await api.put('/profile/subscription', {
        plan: selectedPlan,
        billingCycle: selectedBillingCycle
      });

      if (response.data.success || response.data.user) {
        setUserData(prev => ({
          ...prev,
          subscription: {
            ...prev.subscription,
            plan: selectedPlan,
            billingCycle: selectedBillingCycle
          }
        }));
        showMessage('success', 'Subscription plan updated successfully');
        setShowPlanModal(false);
        fetchProfile(); // Refresh data
      }
    } catch (error) {
      console.error('Error updating plan:', error);
      showMessage('error', error.response?.data?.message || 'Failed to update plan');
    } finally {
      setLoading(false);
    }
  };

  // Handle add card (placeholder - integrate with payment gateway)
  const handleAddCard = () => {
    setShowCardModal(true);
  };

  const handleSaveCard = async () => {
    // TODO: Integrate with Razorpay/Stripe
    showMessage('success', 'Payment gateway integration coming soon');
    setShowCardModal(false);
  };

  // Handle cancel subscription
  const handleCancelSubscription = () => {
    setShowCancelModal(true);
  };

  const confirmCancelSubscription = async () => {
    try {
      setLoading(true);
      const response = await api.put('/profile/subscription/cancel');

      if (response.data.success || response.data.user) {
        setUserData(prev => ({
          ...prev,
          subscription: {
            ...prev.subscription,
            status: 'cancelled'
          }
        }));
        showMessage('success', 'Subscription cancelled successfully');
        setShowCancelModal(false);
        fetchProfile(); // Refresh data
      }
    } catch (error) {
      console.error('Error cancelling subscription:', error);
      showMessage('error', error.response?.data?.message || 'Failed to cancel subscription');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  if (loading) {
    return (
      <div className="profile-settings">
        <div className="loading-state">Loading profile...</div>
      </div>
    );
  }

  return (
    <div className="profile-settings">
      {/* Content previously inside .sheet */}
      <div className="top-row">
        <div className="top-left">
          <div className="avatar-circle" onClick={() => document.getElementById('profile-image-input').click()}>
            {/* Use preview image, user image, or initials */}
            {previewImage || userData?.avatarUrl || userData?.photoUrl || userData?.profileImage || userData?.image ? (
              <img
                className="avatar-img"
                src={previewImage || userData?.avatarUrl || userData?.photoUrl || userData?.profileImage || userData?.image}
                alt={userData?.fullName || 'User avatar'}
                onError={(e) => {
                  console.log('Image failed to load:', e.currentTarget.src);
                  e.currentTarget.style.display = 'none';
                }}
              />
            ) : (
              <span className="avatar-initial">{(userData?.fullName || 'U').charAt(0)}</span>
            )}
            <span className="online-dot" />

            {/* Upload overlay */}
            <div className="avatar-upload-overlay">
              {uploadingImage ? (
                <>
                  <div className="upload-spinner"></div>
                  <span>Uploading...</span>
                </>
              ) : (
                <>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                    <circle cx="12" cy="13" r="4" />
                  </svg>
                  <span>Upload</span>
                </>
              )}
            </div>
          </div>

          {/* Hidden file input */}
          <input
            id="profile-image-input"
            type="file"
            accept="image/*"
            style={{ display: 'none' }}
            onChange={handleProfileImageUpload}
          />
          <div className="greeting">
            <h1>
              <span className="hello-dim">Hello,</span> <span className="name">{userData?.fullName || 'Rajat Panwar'}</span>
            </h1>
            <p className="hint">As you know Rise & Slay</p>
            <div className="hint-dot" aria-hidden="true" />
          </div>
        </div>
        <div className="top-right">
          <a
            className="social-btn linkedin"
            href={userData?.social?.linkedin || '#'}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="LinkedIn"
            title="LinkedIn"
          >
            <img
              src="/images/LinkedIn_icon.webp"
              alt="LinkedIn"
              className="social-img"
              onError={(e) => { e.currentTarget.style.display = 'none'; }}
            />
          </a>
        </div>
      </div>

      {/* removed soft-rule per request */}

      {/* Tabs */}
      <div className="tabs-row">
        <button className={`tab ${activeTab === 'personal' ? 'active' : ''}`} onClick={() => setActiveTab('personal')}>Personal Details</button>
        <button className={`tab ${activeTab === 'salary' ? 'active' : ''}`} onClick={() => setActiveTab('salary')}>Salary/Incentive's</button>
        <button className={`tab ${activeTab === 'billing' ? 'active' : ''}`} onClick={() => setActiveTab('billing')}>Billing</button>
      </div>

      {/* Personal Details Tab */}
      {activeTab === 'personal' && (
        <div className="content-row three-col">
          {/* Column 1 - Details */}
          <div className="col">
            <h3 className="section-title">Details</h3>
            <dl className="kv">
              <div className="kv-row">
                <dt>E-mail :</dt>
                <dd>{userData?.email || 'imrajatpanwar@gmail.com'}</dd>
              </div>
              <div className="kv-row">
                <dt>Phone No :</dt>
                <dd>+91 8130921042</dd>
              </div>
              <div className="kv-row">
                <dt>Business E-Mail:</dt>
                <dd>rajat@noxtm.com</dd>
              </div>

              <div className="spacer" />

              <div className="kv-row">
                <dt>Time in Company:</dt>
                <dd>2 Year's 3 Months</dd>
              </div>
              <div className="kv-row">
                <dt>Joining Date :</dt>
                <dd>20 June 2025</dd>
              </div>

              <div className="spacer" />

              <div className="kv-row">
                <dt>Documents -</dt>
                <dd></dd>
              </div>
              <div className="kv-row">
                <dt>Aadhar :</dt>
                <dd>Uploaded</dd>
              </div>
              <div className="kv-row">
                <dt>Digital Signature :</dt>
                <dd>Uploaded</dd>
              </div>

              <div className="spacer" />

              <div className="kv-row">
                <dt>Highest Qualification :</dt>
                <dd>BCA</dd>
              </div>
              <div className="kv-row">
                <dt>Institute / University :</dt>
                <dd>Amity University Noida</dd>
              </div>
              <div className="kv-row">
                <dt>Year of Passing :</dt>
                <dd>2026</dd>
              </div>
              <div className="kv-row">
                <dt>Upload Certificate :</dt>
                <dd>Uploaded</dd>
              </div>

              <div className="spacer" />

              <div className="kv-row">
                <dt>Certification :</dt>
                <dd>Uploaded</dd>
              </div>
              <div className="kv-row">
                <dt>Name :</dt>
                <dd>Graphic Design</dd>
              </div>
              <div className="kv-row">
                <dt>Institute :</dt>
                <dd>Dice Academy</dd>
              </div>
            </dl>
          </div>

          {/* Divider */}
          <div className="v-divider" />

          {/* Column 2 - Attendance */}
          <div className="col">
            <h3 className="section-title">Attendance</h3>
            <dl className="kv">
              <div className="kv-row">
                <dt>Today's Status</dt>
                <dd>Present</dd>
              </div>
              <div className="kv-row">
                <dt>Check-In Time</dt>
                <dd>09:45 AM</dd>
              </div>
              <div className="kv-row">
                <dt>Check-Out Time</dt>
                <dd>06:15 PM</dd>
              </div>
              <div className="kv-row">
                <dt>Active Time (Work Hours)</dt>
                <dd>8 hr 30 min</dd>
              </div>
              <div className="kv-row">
                <dt>Break Time</dt>
                <dd>1 hr</dd>
              </div>
              <div className="kv-row">
                <dt>Total Active Days (Month)</dt>
                <dd>18 / 22</dd>
              </div>
              <div className="kv-row">
                <dt>Total Absents (Month)</dt>
                <dd>4</dd>
              </div>
              <div className="kv-row">
                <dt>Weekly Average Hours</dt>
                <dd>7.8 hrs/day</dd>
              </div>
              <div className="kv-row">
                <dt>Last Login Date</dt>
                <dd>26 Oct 2025</dd>
              </div>

              <div className="spacer" />

              <h3 className="section-title danger">Emergency Contact</h3>
              <div className="kv-row">
                <dt>Name :</dt>
                <dd>Praveen Panwar</dd>
              </div>
              <div className="kv-row">
                <dt>Relation :</dt>
                <dd>Father</dd>
              </div>
              <div className="kv-row">
                <dt>Contact Number :</dt>
                <dd>+91 9991919199</dd>
              </div>
              <div className="kv-row">
                <dt>Address :</dt>
                <dd>Twine Building Flat No. 104<br />Modi Nagar, New Delhi</dd>
              </div>
            </dl>
          </div>

          {/* Divider */}
          <div className="v-divider" />

          {/* Column 3 - Company */}
          <div className="col">
            <h3 className="section-title">Company</h3>
            <dl className="kv">
              <div className="kv-row">
                <dt>Company :</dt>
                <dd>Noxtm</dd>
              </div>
              <div className="kv-row">
                <dt>Role :</dt>
                <dd>User</dd>
              </div>
              <div className="kv-row">
                <dt>Team :</dt>
                <dd>Digital Marketing</dd>
              </div>
            </dl>
          </div>
        </div>
      )}

      {/* Salary/Incentive's Tab */}
      {activeTab === 'salary' && (
        <div className="content-row two-col">
          {/* Left Column - Bank & Salary Details */}
          <div className="col">
            <h3 className="section-title">Bank Details :</h3>
            <dl className="kv">
              <div className="kv-row">
                <dt>Bank Name :</dt>
                <dd>Kotak Mahindra Bank</dd>
              </div>
              <div className="kv-row">
                <dt>Account Number :</dt>
                <dd>99288172893782</dd>
              </div>
              <div className="kv-row">
                <dt>IFFSC Code :</dt>
                <dd>KKBK00398</dd>
              </div>
              <div className="kv-row">
                <dt>Name :</dt>
                <dd>Rajat Panwar</dd>
              </div>
              <div className="kv-row">
                <dt>UPI ID :</dt>
                <dd>imrajatpanwar@paytm</dd>
              </div>

              <div className="spacer" />

              <h3 className="section-title">Salary Details :</h3>
              <div className="kv-row">
                <dt>Current Salary Per Month :</dt>
                <dd>5,00,000</dd>
              </div>
              <div className="kv-row">
                <dt>Incentive :</dt>
                <dd>N/A</dd>
              </div>
            </dl>
          </div>

          {/* Divider */}
          <div className="v-divider" />

          {/* Right Column - Salary Slips */}
          <div className="col">
            <h3 className="section-title-salary">Salary Slips</h3>

            <div className="salary-slips-list">
              <div className="salary-slip-card">
                <div className="slip-header-row">
                  <span className="slip-id-gray">#8920090</span>
                  <span className="slip-label">Pay Date</span>
                  <span className="slip-label">Salary of Month</span>
                  <span className="slip-label">Amount</span>
                  <span className="slip-label">Status</span>
                </div>
                <div className="slip-content-row">
                  <span className="slip-id-placeholder"></span>
                  <span className="slip-value-bold">01-04-2026</span>
                  <span className="slip-value">01 to 30 March 2026</span>
                  <span className="slip-value-bold">₹5,00,000</span>
                  <span className="status-badge paid">Paid</span>
                </div>
              </div>

              <div className="salary-slip-card">
                <div className="slip-header-row">
                  <span className="slip-id-gray">#8920090</span>
                  <span className="slip-label">Pay Date</span>
                  <span className="slip-label">Salary of Month</span>
                  <span className="slip-label">Amount</span>
                  <span className="slip-label">Status</span>
                </div>
                <div className="slip-content-row">
                  <span className="slip-id-placeholder"></span>
                  <span className="slip-value-bold">01-05-2026</span>
                  <span className="slip-value">01 to 30 April 2026</span>
                  <span className="slip-value-bold">₹5,00,000</span>
                  <span className="status-badge paid">Paid</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Billing Tab */}
      {activeTab === 'billing' && (
        <div className="billing-container">
          {/* Left Side - Plan & Payment */}
          <div className="billing-left">
            {/* Subscription Plan */}
            <div className="billing-card">
              <div className="billing-card-header">
                <div className="plan-logo">
                  <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
                    <path d="M20 5L5 12.5V20C5 28.75 11.25 35 20 35C28.75 35 35 28.75 35 20V12.5L20 5Z" fill="#000" />
                    <path d="M20 10L10 15V20C10 26.25 14.375 30 20 30C25.625 30 30 26.25 30 20V15L20 10Z" fill="#FFF" />
                  </svg>
                </div>
                <div className="plan-info">
                  <div className="plan-name">
                    <span>{userData?.subscription?.plan || 'No Plan'} Plan</span>
                    <span className={`badge-${userData?.subscription?.status === 'active' ? 'active' : userData?.subscription?.status === 'trial' ? 'trial' : 'inactive'}`}>
                      {userData?.subscription?.status === 'active' ? 'Active' :
                        userData?.subscription?.status === 'trial' ? 'Trial' :
                          userData?.subscription?.status === 'inactive' ? 'Inactive' :
                            userData?.subscription?.status || 'Unknown'}
                    </span>
                  </div>
                  <div className="plan-billing">
                    {userData?.subscription?.status === 'trial' ? '7-Day Free Trial' : (userData?.subscription?.billingCycle || 'Monthly')}
                  </div>
                  {userData?.subscription?.status === 'trial' && userData?.subscription?.endDate ? (
                    <div className="plan-renewal">
                      {(() => {
                        const daysRemaining = Math.ceil((new Date(userData.subscription.endDate) - new Date()) / (1000 * 60 * 60 * 24));
                        return daysRemaining > 0
                          ? `Trial ends in ${daysRemaining} day${daysRemaining > 1 ? 's' : ''} (${new Date(userData.subscription.endDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })})`
                          : 'Trial has expired. Please upgrade to continue.';
                      })()}
                    </div>
                  ) : userData?.subscription?.endDate && userData?.subscription?.status === 'active' ? (
                    <div className="plan-renewal">
                      Your subscription will auto renew on {new Date(userData.subscription.endDate).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric'
                      })}.
                    </div>
                  ) : userData?.subscription?.status === 'inactive' ? (
                    <div className="plan-renewal">
                      No active subscription. <a href="/pricing">Upgrade now</a>
                    </div>
                  ) : null}
                </div>
                <button className="btn-adjust-plan" onClick={handleAdjustPlan}>
                  {userData?.subscription?.status === 'active' ? 'Adjust plan' : userData?.subscription?.status === 'trial' ? 'Upgrade' : 'Activate plan'}
                </button>
              </div>
            </div>

            {/* Payment Method */}
            <div className="billing-card">
              <div className="billing-section-title">Payment</div>
              <div className="payment-method">
                <div className="payment-card-icon">
                  <svg width="32" height="24" viewBox="0 0 32 24" fill="none">
                    <rect width="32" height="24" rx="4" fill="#1A1F36" />
                    <rect x="2" y="8" width="28" height="4" fill="#FFF" />
                  </svg>
                </div>
                <div className="payment-card-info">
                  <span>No payment method on file</span>
                </div>
                <button className="btn-update" onClick={handleAddCard}>Add Card</button>
              </div>
            </div>

            {/* Subscription Details */}
            {userData?.subscription && (
              <div className="billing-card">
                <div className="billing-section-title">Subscription Details</div>
                <dl className="kv">
                  <div className="kv-row">
                    <dt>Plan:</dt>
                    <dd>{userData.subscription.plan || 'None'}</dd>
                  </div>
                  <div className="kv-row">
                    <dt>Status:</dt>
                    <dd>{userData.subscription.status || 'Inactive'}</dd>
                  </div>
                  <div className="kv-row">
                    <dt>Billing Cycle:</dt>
                    <dd>{userData.subscription.billingCycle || 'Monthly'}</dd>
                  </div>
                  {userData.subscription.startDate && (
                    <div className="kv-row">
                      <dt>Start Date:</dt>
                      <dd>{new Date(userData.subscription.startDate).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric'
                      })}</dd>
                    </div>
                  )}
                  {userData.subscription.endDate && (
                    <div className="kv-row">
                      <dt>End Date:</dt>
                      <dd>{new Date(userData.subscription.endDate).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric'
                      })}</dd>
                    </div>
                  )}
                  {userData.subscription.plan === 'Noxtm' && (
                    <div className="kv-row">
                      <dt>Price:</dt>
                      <dd>
                        ₹{userData.subscription.billingCycle === 'Annual' ? '10,399' : '12,999'}/
                        {userData.subscription.billingCycle === 'Annual' ? 'year' : 'month'}
                      </dd>
                    </div>
                  )}
                </dl>
              </div>
            )}

            {/* Cancellation */}
            {userData?.subscription?.status === 'active' && (
              <div className="billing-card">
                <div className="billing-section-title">Cancellation</div>
                <div className="cancellation-section">
                  <span>Cancel Plan</span>
                  <button className="ps-btn-cancel-plan" onClick={handleCancelSubscription}>Cancel</button>
                </div>
              </div>
            )}
          </div>

          {/* Right Side - Invoices */}
          <div className="billing-right">
            <h3 className="invoice-title">Invoice History</h3>
            <div className="invoice-list">
              {/* No invoices available message */}
              <div className="no-invoices">
                <p>No invoice history available</p>
                <p className="hint">Invoices will appear here after your first payment</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Message alert anchored below content */}
      {message.text && (
        <div className={`message-alert ${message.type}`}>
          {message.type === 'success' ? <FiCheck /> : <FiAlertCircle />}
          <span>{message.text}</span>
        </div>
      )}

      {/* Plan Adjustment Modal */}
      {showPlanModal && (
        <div className="modal-overlay" onClick={() => setShowPlanModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3>Adjust Subscription Plan</h3>
            <div className="modal-body">
              <div className="form-group">
                <label>Select Plan</label>
                <select
                  value={selectedPlan}
                  onChange={(e) => setSelectedPlan(e.target.value)}
                  className="modal-select"
                >
                  <option value="Noxtm">Noxtm Plan</option>
                  <option value="Enterprise">Enterprise Plan</option>
                </select>
              </div>

              <div className="form-group">
                <label>Billing Cycle</label>
                <select
                  value={selectedBillingCycle}
                  onChange={(e) => setSelectedBillingCycle(e.target.value)}
                  className="modal-select"
                >
                  <option value="Monthly">Monthly - ₹12,999/month</option>
                  <option value="Annual">Annual - ₹10,399/month (Save 20%)</option>
                </select>
              </div>

              <div className="plan-summary">
                <p><strong>Selected Plan:</strong> {selectedPlan}</p>
                <p><strong>Billing:</strong> {selectedBillingCycle}</p>
                <p><strong>Price:</strong> ₹{selectedBillingCycle === 'Annual' ? '10,399' : '12,999'}/{selectedBillingCycle === 'Annual' ? 'month' : 'month'}</p>
              </div>
            </div>
            <div className="modal-actions">
              <button className="btn-cancel" onClick={() => setShowPlanModal(false)}>Cancel</button>
              <button className="btn-save" onClick={handleSavePlan} disabled={loading}>
                {loading ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Card Modal */}
      {showCardModal && (
        <div className="modal-overlay" onClick={() => setShowCardModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3>Add Payment Method</h3>
            <div className="modal-body">
              <p className="modal-info">Payment gateway integration coming soon. We'll support:</p>
              <ul className="payment-methods-list">
                <li>💳 Credit/Debit Cards</li>
                <li>🏦 UPI Payments</li>
                <li>🌐 Net Banking</li>
                <li>📱 Digital Wallets</li>
              </ul>
              <p className="modal-note">Contact support for manual payment setup.</p>
            </div>
            <div className="modal-actions">
              <button className="btn-cancel" onClick={() => setShowCardModal(false)}>Close</button>
              <button className="btn-save" onClick={handleSaveCard}>Contact Support</button>
            </div>
          </div>
        </div>
      )}

      {/* Cancel Subscription Modal */}
      {showCancelModal && (
        <div className="modal-overlay" onClick={() => setShowCancelModal(false)}>
          <div className="modal-content modal-danger" onClick={(e) => e.stopPropagation()}>
            <h3>⚠️ Cancel Subscription</h3>
            <div className="modal-body">
              <p className="modal-warning">Are you sure you want to cancel your subscription?</p>
              <ul className="cancellation-effects">
                <li>Your subscription will remain active until {userData?.subscription?.endDate ? new Date(userData.subscription.endDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'the end of billing period'}</li>
                <li>You'll lose access to all premium features after that</li>
                <li>Your data will be retained for 30 days</li>
                <li>You can reactivate anytime before data deletion</li>
              </ul>
            </div>
            <div className="modal-actions">
              <button className="btn-cancel" onClick={() => setShowCancelModal(false)}>Keep Subscription</button>
              <button className="btn-danger" onClick={confirmCancelSubscription} disabled={loading}>
                {loading ? 'Cancelling...' : 'Yes, Cancel Subscription'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ProfileSettings;
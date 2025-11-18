import React, { useState } from 'react';
import { Container, Row, Col } from 'react-bootstrap';
import './Legal.css';

const Legal = () => {
    const [activeComponent, setActiveComponent] = useState('terms');

    const renderComponent = () => {
        switch (activeComponent) {
            case 'terms':
                return (
                    <div className="legal-policy-wrapper">
                        <h1>NOXTM TERMS AND CONDITIONS</h1>
                        <hr />
                        <p className="legal-intro" style={{margin: '0'}}>Last Updated: October 25, 2025</p>
                        <hr />
                        <section>
                            <h2>1. INTRODUCTION AND ACCEPTANCE</h2>
                            <p>Welcome to Noxtm ("we," "us," "our," or "Noxtm"). These Terms and Conditions ("Terms," "Agreement") govern your access to and use of the Noxtm platform, including our website at noxtm.com, web applications, services, APIs, and any related software, mobile applications, or services (collectively, the "Service" or "Platform").</p>
                            <p>By creating an account, accessing, or using any part of the Noxtm Service, you ("you," "your," or "User") agree to be bound by these Terms. If you are using the Service on behalf of an organization or company ("Company" or "Organization"), you represent and warrant that you have the authority to bind that organization to these Terms, and the terms "you" and "your" shall refer to both you as an individual and the organization.</p>
                            <p style={{fontWeight: 'bold'}}>IF YOU DO NOT AGREE TO THESE TERMS, DO NOT ACCESS OR USE THE SERVICE.</p>
                        </section>

                        <section>
                            <h2>2. DEFINITIONS</h2>
                            <p>For purposes of these Terms:</p>
                            <ul>
                                <li><strong>"Account"</strong> means your registered user account with Noxtm, including all associated data, settings, and credentials.</li>
                                <li><strong>"Company"</strong> means an organizational entity created within the Noxtm platform by a subscribing User.</li>
                                <li><strong>"Content"</strong> means any data, text, files, information, usernames, images, graphics, photos, profiles, audio and video clips, sounds, musical works, works of authorship, applications, links, and other content or materials.</li>
                                <li><strong>"Customer Data"</strong> means all Content that you or your authorized users submit, upload, transmit, or display through the Service.</li>
                                <li><strong>"Subscription Plan"</strong> refers to the service tier you have selected: SoloHQ (Free), Noxtm (Paid), or Enterprise (Custom).</li>
                                <li><strong>"Effective Date"</strong> means the date you first access or use the Service.</li>
                                <li><strong>"Intellectual Property Rights"</strong> means all patents, copyrights, trademarks, trade secrets, and other proprietary rights.</li>
                                <li><strong>"Member"</strong> means a user who has been invited to and joined a Company within the Noxtm platform.</li>
                                <li><strong>"Owner"</strong> means the user who created a Company and holds administrative control over it.</li>
                            </ul>
                        </section>

                        <section>
                            <h2>3. ELIGIBILITY AND ACCOUNT REGISTRATION</h2>

                            <h3>3.1 Age Requirement</h3>
                            <p>You must be at least 18 years of age to use the Service. By agreeing to these Terms, you represent and warrant that you are at least 18 years old.</p>

                            <h3>3.2 Account Creation</h3>
                            <p>To access the Service, you must register for an account by providing:</p>
                            <ul>
                                <li>Full name</li>
                                <li>Valid email address</li>
                                <li>Secure password</li>
                                <li>Email verification via a 6-digit code (valid for 10 minutes)</li>
                            </ul>

                            <h3>3.3 Account Accuracy</h3>
                            <p>You agree to:</p>
                            <ul>
                                <li>Provide accurate, current, and complete information during registration</li>
                                <li>Maintain and promptly update your account information</li>
                                <li>Not use disposable or temporary email addresses for registration</li>
                                <li>Notify us immediately of any unauthorized access or security breach</li>
                            </ul>

                            <h3>3.4 Account Security</h3>
                            <p>You are responsible for:</p>
                            <ul>
                                <li>Maintaining the confidentiality of your password and account credentials</li>
                                <li>All activities that occur under your account</li>
                                <li>Implementing strong password practices (minimum recommended complexity)</li>
                                <li>Logging out from your account at the end of each session</li>
                            </ul>
                            <p>We are not liable for any loss or damage arising from your failure to maintain account security.</p>

                            <h3>3.5 One Account Per User</h3>
                            <p>Each individual may maintain only one user account. Creating multiple accounts to circumvent limitations, restrictions, or subscription requirements is prohibited.</p>
                        </section>

                        <section>
                            <h2>4. SUBSCRIPTION PLANS AND SERVICES</h2>

                            <h3>4.1 Service Tiers</h3>
                            <p>Noxtm offers three subscription tiers:</p>

                            <h4>4.1.1 SoloHQ (Free Plan)</h4>
                            <ul>
                                <li><strong>Cost:</strong> Free</li>
                                <li><strong>Projects:</strong> Up to 5 projects</li>
                                <li><strong>Storage:</strong> 500 MB</li>
                                <li><strong>Employee Limit:</strong> Up to 10 employees</li>
                                <li><strong>Email Notifications:</strong> Up to 100 per day</li>
                                <li><strong>Features:</strong> Client Leads only</li>
                                <li><strong>Support:</strong> Community Support</li>
                                <li><strong>Uptime SLA:</strong> None (no guaranteed uptime)</li>
                                <li><strong>Limitations:</strong> Limited to basic features; no company creation; no advanced modules</li>
                            </ul>

                            <h4>4.1.2 Noxtm (Paid Plan)</h4>
                            <ul>
                                <li><strong>Cost:</strong> Subscription fee (Monthly or Annual billing)</li>
                                <li><strong>Projects:</strong> Unlimited</li>
                                <li><strong>Storage:</strong> Unlimited</li>
                                <li><strong>Employee Limit:</strong> Up to 500 employees</li>
                                <li><strong>Email Notifications:</strong> Unlimited</li>
                                <li><strong>Features:</strong> All modules except Noxtm Mail and Settings & Configuration</li>
                                <li><strong>Support:</strong> 24/7 Premium Support</li>
                                <li><strong>Uptime SLA:</strong> 99.9% monthly uptime guarantee</li>
                                <li><strong>Includes:</strong> Conversion Tracking, Email Marketing, WhatsApp Marketing, Social Media Scheduler, Internal Messages (real-time chat), HR Management, Financial Management, Internal Policies, Video Meeting (when available), SEO & Content Management, Blog Management, Company Creation and Management, Team Invitations (up to 500 members)</li>
                            </ul>

                            <h4>4.1.3 Enterprise (Custom Plan)</h4>
                            <ul>
                                <li><strong>Cost:</strong> Custom pricing based on requirements</li>
                                <li><strong>Projects:</strong> Unlimited</li>
                                <li><strong>Storage:</strong> Unlimited</li>
                                <li><strong>Employee Limit:</strong> Unlimited</li>
                                <li><strong>Email Notifications:</strong> Unlimited</li>
                                <li><strong>Features:</strong> All modules except Video Meeting</li>
                                <li><strong>Support:</strong> Dedicated Support Team</li>
                                <li><strong>Uptime SLA:</strong> 99.99% monthly uptime guarantee</li>
                                <li><strong>Includes:</strong> All Noxtm features plus custom integrations and dedicated account management</li>
                            </ul>

                            <h3>4.2 Subscription Activation</h3>
                            <ul>
                                <li>SoloHQ: Activated immediately upon account creation</li>
                                <li>Noxtm: Activated upon successful payment processing</li>
                                <li>Enterprise: Activated upon contract execution and payment terms agreement</li>
                            </ul>

                            <h3>4.3 Access Restrictions</h3>
                            <p>Access to features and modules is strictly governed by your active Subscription Plan. Attempting to access features outside your plan's scope may result in account suspension.</p>
                        </section>

                        <section>
                            <h2>5. PAYMENT TERMS AND BILLING</h2>

                            <h3>5.1 Subscription Fees</h3>
                            <ul>
                                <li><strong>SoloHQ:</strong> No charge</li>
                                <li><strong>Noxtm:</strong> Subscription fees as displayed on the Pricing Page at the time of purchase</li>
                                <li><strong>Enterprise:</strong> Custom pricing as agreed in your Enterprise Agreement</li>
                            </ul>

                            <h3>5.2 Billing Cycles</h3>
                            <ul>
                                <li><strong>Monthly Billing:</strong> Charges recur every 30 days from your subscription start date</li>
                                <li><strong>Annual Billing:</strong> Charges recur every 365 days from your subscription start date, typically offering a discounted rate compared to monthly billing</li>
                            </ul>

                            <h3>5.3 Payment Methods</h3>
                            <p>We accept payment through:</p>
                            <ul>
                                <li>Credit cards (Visa, Mastercard, American Express)</li>
                                <li>Debit cards</li>
                                <li>Other payment methods as displayed at checkout</li>
                            </ul>

                            <h3>5.4 Auto-Renewal</h3>
                            <p><strong>IMPORTANT:</strong> All paid subscriptions automatically renew at the end of each billing cycle unless you cancel before the renewal date. By subscribing, you authorize us to charge your payment method automatically for each renewal period.</p>

                            <h3>5.5 Price Changes</h3>
                            <ul>
                                <li>We reserve the right to change subscription prices with at least 30 days' notice</li>
                                <li>Price changes will not affect your current billing cycle</li>
                                <li>Continued use after price changes constitutes acceptance of new pricing</li>
                            </ul>

                            <h3>5.6 Taxes</h3>
                            <p>All fees are exclusive of applicable taxes (including VAT, GST, sales tax, etc.). You are responsible for all taxes associated with your subscription, except for taxes based on our net income.</p>

                            <h3>5.7 Failed Payments</h3>
                            <p>If payment fails:</p>
                            <ul>
                                <li>We will attempt to charge your payment method up to 3 times over 7 days</li>
                                <li>You will receive email notifications of failed payment attempts</li>
                                <li>Your account may be downgraded or suspended if payment is not received within 14 days</li>
                                <li>We reserve the right to terminate your account after 30 days of non-payment</li>
                            </ul>

                            <h3>5.8 No Refunds (Except as Required by Law)</h3>
                            <p>All subscription fees are non-refundable, except:</p>
                            <ul>
                                <li>As explicitly stated in our Cancellation & Refund Policy</li>
                                <li>Where required by applicable law</li>
                                <li>In cases of service unavailability exceeding SLA commitments</li>
                            </ul>
                        </section>

                        <section>
                            <h2>6. CANCELLATION AND REFUND POLICY</h2>

                            <h3>6.1 Cancellation Process</h3>
                            <p>You may cancel your subscription at any time by:</p>
                            <ul>
                                <li>Navigating to your Account Settings</li>
                                <li>Selecting "Cancel Subscription"</li>
                                <li>Following the cancellation workflow</li>
                                <li>Confirming cancellation via email verification</li>
                            </ul>

                            <h3>6.2 Effect of Cancellation</h3>
                            <ul>
                                <li>Your access continues until the end of your current billing period</li>
                                <li>No prorated refunds for unused time in the billing period</li>
                                <li>You will not be charged for subsequent billing cycles</li>
                                <li>Your account will be downgraded to SoloHQ at the end of the paid period</li>
                            </ul>

                            <h3>6.3 Account Data After Cancellation</h3>
                            <p>Upon cancellation:</p>
                            <ul>
                                <li>Your Customer Data remains accessible until the end of your paid period</li>
                                <li>After downgrade to SoloHQ, data exceeding free tier limits becomes read-only</li>
                                <li>You have 30 days after downgrade to export or delete excess data</li>
                                <li>After 30 days, data exceeding free tier limits may be automatically archived or deleted</li>
                            </ul>

                            <h3>6.4 Refund Eligibility</h3>
                            <p>Refunds may be issued only in the following circumstances:</p>
                            <ul>
                                <li><strong>Service Outage:</strong> If uptime falls below SLA commitment (99.9% for Noxtm, 99.99% for Enterprise) in a billing month, you may receive a prorated credit</li>
                                <li><strong>Billing Errors:</strong> If you were charged incorrectly due to our error</li>
                                <li><strong>Legal Requirements:</strong> Where refunds are mandated by applicable law</li>
                                <li><strong>Discretionary Refunds:</strong> At our sole discretion on a case-by-case basis</li>
                            </ul>

                            <h3>6.5 Downgrade Options</h3>
                            <p>You may downgrade from:</p>
                            <ul>
                                <li><strong>Noxtm to SoloHQ:</strong> Takes effect at the end of your current billing period</li>
                                <li><strong>Enterprise to Noxtm:</strong> Contact your account manager to process</li>
                            </ul>
                            <p>Downgrades do not entitle you to refunds for the current billing period.</p>
                        </section>

                        <section>
                            <h2>7. COMPANY CREATION AND MANAGEMENT</h2>

                            <h3>7.1 Company Setup</h3>
                            <p>Users with a Noxtm or Enterprise subscription may create a Company within the platform, providing:</p>
                            <ul>
                                <li>Company name (required)</li>
                                <li>Company email (required)</li>
                                <li>Industry type (required)</li>
                                <li>Company address, phone, website (optional)</li>
                                <li>Company size (1-10, 11-50, 51-200, 201-500, 500+)</li>
                                <li>GSTIN (for Indian tax compliance, if applicable)</li>
                            </ul>

                            <h3>7.2 Company Ownership</h3>
                            <ul>
                                <li>The user who creates a Company becomes its Owner</li>
                                <li>Owners have full administrative control over the Company</li>
                                <li>Ownership can be transferred to another Member with Owner approval</li>
                                <li>Companies are tied to the Owner's active subscription</li>
                            </ul>

                            <h3>7.3 Member Invitations</h3>
                            <ul>
                                <li>Owners and Admins may invite Members via email</li>
                                <li>Invitations include a unique token valid for 7 days</li>
                                <li>Invitees can accept as existing users or sign up as new users</li>
                                <li>Members can be assigned roles: Admin or Member</li>
                            </ul>

                            <h3>7.4 Member Roles and Permissions</h3>
                            <ul>
                                <li><strong>Owner:</strong> Full control; cannot be removed; can delete Company</li>
                                <li><strong>Admin:</strong> Can invite/remove Members; configure settings; cannot delete Company</li>
                                <li><strong>Member:</strong> Standard access based on assigned permissions</li>
                            </ul>

                            <h3>7.5 Company Data Isolation</h3>
                            <ul>
                                <li>Each Company's data is strictly isolated from other Companies</li>
                                <li>Members can only access data belonging to their Company</li>
                                <li>Cross-company data sharing is prohibited by platform architecture</li>
                            </ul>

                            <h3>7.6 Company Deletion</h3>
                            <ul>
                                <li>Only the Owner can delete a Company</li>
                                <li>Deletion is irreversible after 30-day recovery period</li>
                                <li>All Company data, including messages, files, and member access, is permanently deleted after 30 days</li>
                                <li>Members are notified of Company deletion</li>
                            </ul>

                            <h3>7.7 Subscription Dependency</h3>
                            <ul>
                                <li>If the Owner's subscription lapses, the Company may be suspended</li>
                                <li>Suspended Companies become read-only until subscription is renewed</li>
                                <li>After 60 days of suspension, Companies may be permanently deleted</li>
                            </ul>
                        </section>

                        <section>
                            <h2>8. TEAM COMMUNICATION AND MESSAGING</h2>

                            <h3>8.1 Real-Time Messaging</h3>
                            <p>The Service provides real-time messaging capabilities via Socket.IO, including:</p>
                            <ul>
                                <li>Direct messages between two users</li>
                                <li>Group chats with multiple participants</li>
                                <li>File sharing (images, documents, etc.)</li>
                                <li>Message reactions (emoji)</li>
                                <li>Message editing and deletion</li>
                                <li>Read receipts and delivery status</li>
                                <li>Typing indicators</li>
                                <li>Online presence indicators</li>
                            </ul>

                            <h3>8.2 Message Retention</h3>
                            <ul>
                                <li>Messages are stored indefinitely while your account is active</li>
                                <li>Deleted messages are soft-deleted with a timestamp for audit purposes</li>
                                <li>You may permanently delete messages via the deletion workflow</li>
                                <li>We may retain message metadata for security and compliance purposes</li>
                            </ul>

                            <h3>8.3 Message Ownership</h3>
                            <ul>
                                <li>You retain ownership of all messages and content you send</li>
                                <li>By sending messages through the Service, you grant us a license to store, display, and transmit your messages to intended recipients</li>
                            </ul>

                            <h3>8.4 Prohibited Messaging Conduct</h3>
                            <p>You may not use the messaging system to:</p>
                            <ul>
                                <li>Send spam, unsolicited advertising, or promotional materials</li>
                                <li>Transmit viruses, malware, or harmful code</li>
                                <li>Harass, threaten, or abuse other users</li>
                                <li>Share illegal content or engage in illegal activities</li>
                                <li>Impersonate others or misrepresent your identity</li>
                                <li>Violate intellectual property rights</li>
                            </ul>

                            <h3>8.5 Message Monitoring</h3>
                            <p>We do not routinely monitor messages, but we reserve the right to:</p>
                            <ul>
                                <li>Review messages in response to user reports</li>
                                <li>Investigate potential Terms violations</li>
                                <li>Comply with legal obligations</li>
                                <li>Ensure platform security</li>
                            </ul>

                            <h3>8.6 File Size and Type Restrictions</h3>
                            <ul>
                                <li>Message attachments are limited to reasonable file sizes (as specified in the application)</li>
                                <li>Certain file types may be restricted for security reasons</li>
                                <li>We reserve the right to scan uploaded files for malware</li>
                            </ul>
                        </section>

                        <section>
                            <h2>9. EMAIL MANAGEMENT AND NOXTM MAIL</h2>

                            <h3>9.1 Email Account Creation</h3>
                            <p>Enterprise users may create email accounts associated with their domain, including:</p>
                            <ul>
                                <li>Custom email addresses (e.g., user@yourcompany.com)</li>
                                <li>Display name customization</li>
                                <li>Password protection (bcrypt encrypted)</li>
                                <li>Storage quota (default 1 GB, configurable)</li>
                            </ul>

                            <h3>9.2 Email Services</h3>
                            <p>The platform supports:</p>
                            <ul>
                                <li><strong>IMAP:</strong> Email retrieval</li>
                                <li><strong>SMTP:</strong> Email sending</li>
                                <li><strong>POP:</strong> Email access (where available)</li>
                                <li><strong>Email forwarding:</strong> Rule-based forwarding to external addresses</li>
                                <li><strong>Email aliases:</strong> Alternative email addresses for accounts</li>
                                <li><strong>Spam filtering:</strong> Automated spam detection</li>
                            </ul>

                            <h3>9.3 Email Domains</h3>
                            <ul>
                                <li>Enterprise users can register and manage email domains</li>
                                <li>DNS configuration and verification required</li>
                                <li>You must own or control the domain you register</li>
                                <li>Noxtm is not responsible for domain registration or renewal</li>
                            </ul>

                            <h3>9.4 Email Templates</h3>
                            <ul>
                                <li>Create reusable email templates for marketing and communication</li>
                                <li>Templates support versioning and preview functionality</li>
                                <li>Templates remain your intellectual property</li>
                                <li>We may review templates for compliance with anti-spam laws</li>
                            </ul>

                            <h3>9.5 Email Rate Limiting</h3>
                            <ul>
                                <li><strong>SoloHQ:</strong> Limited to 100 emails per day</li>
                                <li><strong>Noxtm:</strong> Unlimited emails (subject to fair use policy)</li>
                                <li><strong>Enterprise:</strong> Unlimited emails (subject to fair use policy)</li>
                                <li>Rate limits apply to prevent abuse and spam</li>
                            </ul>

                            <h3>9.6 Email Logging</h3>
                            <p>We log all emails sent through the platform, including:</p>
                            <ul>
                                <li>From/To addresses</li>
                                <li>Subject lines</li>
                                <li>Send timestamp</li>
                                <li>Delivery status (queued, sent, failed, bounced)</li>
                                <li>Error messages (if applicable)</li>
                            </ul>
                            <p>Logs are retained for security, debugging, and compliance purposes.</p>

                            <h3>9.7 Anti-Spam Compliance</h3>
                            <p>You agree to comply with all applicable anti-spam laws, including:</p>
                            <ul>
                                <li>CAN-SPAM Act (US)</li>
                                <li>GDPR (EU)</li>
                                <li>CASL (Canada)</li>
                                <li>Other applicable laws based on recipient location</li>
                            </ul>
                            <p>You must:</p>
                            <ul>
                                <li>Obtain consent before sending marketing emails</li>
                                <li>Provide clear unsubscribe mechanisms</li>
                                <li>Include accurate sender information</li>
                                <li>Honor unsubscribe requests within 10 business days</li>
                            </ul>

                            <h3>9.8 Email Security</h3>
                            <ul>
                                <li>Emails are transmitted via TLS/SSL where supported</li>
                                <li>Passwords are encrypted using bcrypt</li>
                                <li>We implement security measures to protect against unauthorized access</li>
                                <li>You are responsible for securing your email account credentials</li>
                            </ul>

                            <h3>9.9 Email Content Responsibility</h3>
                            <p>You are solely responsible for:</p>
                            <ul>
                                <li>Content of emails sent through your account</li>
                                <li>Compliance with applicable laws</li>
                                <li>Obtaining necessary permissions and consents</li>
                                <li>Accuracy of recipient lists</li>
                            </ul>
                            <p>We are not responsible for email content, deliverability issues, or recipient actions.</p>
                        </section>

                        <section>
                            <h2>10. CONTENT AND DATA OWNERSHIP</h2>

                            <h3>10.1 Your Content Ownership</h3>
                            <p>You retain all ownership rights to Customer Data you submit to the Service. We do not claim ownership of your Content.</p>

                            <h3>10.2 License to Noxtm</h3>
                            <p>By submitting Content to the Service, you grant Noxtm a worldwide, non-exclusive, royalty-free, transferable, sublicensable license to:</p>
                            <ul>
                                <li>Store, process, and transmit your Content as necessary to provide the Service</li>
                                <li>Display your Content to authorized users within your Company</li>
                                <li>Make backup copies for disaster recovery</li>
                                <li>Perform technical operations (e.g., format conversions, compression)</li>
                            </ul>
                            <p>This license terminates when you delete Content from the Service, except for:</p>
                            <ul>
                                <li>Backup copies (deleted within 90 days)</li>
                                <li>Content shared with other users (remains accessible to them)</li>
                                <li>Content required for legal or compliance purposes</li>
                            </ul>

                            <h3>10.3 User Responsibilities for Content</h3>
                            <p>You represent and warrant that:</p>
                            <ul>
                                <li>You own or have rights to all Content you submit</li>
                                <li>Your Content does not violate any third-party rights</li>
                                <li>Your Content complies with all applicable laws</li>
                                <li>You have obtained necessary permissions and consents</li>
                            </ul>

                            <h3>10.4 Prohibited Content</h3>
                            <p>You may not upload, post, or transmit Content that:</p>
                            <ul>
                                <li>Is illegal, harmful, or promotes illegal activity</li>
                                <li>Infringes intellectual property rights</li>
                                <li>Contains viruses, malware, or harmful code</li>
                                <li>Is defamatory, obscene, pornographic, or offensive</li>
                                <li>Violates privacy or data protection laws</li>
                                <li>Impersonates others or contains false information</li>
                                <li>Constitutes spam or unsolicited advertising</li>
                            </ul>

                            <h3>10.5 Content Monitoring and Removal</h3>
                            <p>We reserve the right, but have no obligation, to:</p>
                            <ul>
                                <li>Monitor Content for Terms compliance</li>
                                <li>Remove or refuse to publish Content that violates these Terms</li>
                                <li>Suspend or terminate accounts that repeatedly violate content policies</li>
                                <li>Report illegal Content to authorities</li>
                            </ul>

                            <h3>10.6 Backup and Data Retention</h3>
                            <ul>
                                <li>We perform regular backups of Customer Data</li>
                                <li>Backups are retained for disaster recovery purposes</li>
                                <li>Deleted data may remain in backups for up to 90 days</li>
                                <li>After 30 days, deleted data cannot be recovered</li>
                            </ul>

                            <h3>10.7 Data Export</h3>
                            <p>You may export your Customer Data at any time through:</p>
                            <ul>
                                <li>Built-in export functionality (where available)</li>
                                <li>API access (for Enterprise customers)</li>
                                <li>Requesting a data export from support (may incur fees for large datasets)</li>
                            </ul>
                        </section>

                        <section>
                            <h2>11. BLOG AND CONTENT MANAGEMENT</h2>

                            <h3>11.1 Blog Creation</h3>
                            <p>Users may create blog posts on the platform, including:</p>
                            <ul>
                                <li>Blog title, content, and meta descriptions</li>
                                <li>Featured images (up to 5 MB, image files only)</li>
                                <li>Categories and tags for organization</li>
                                <li>SEO keywords</li>
                                <li>Published/draft status</li>
                            </ul>

                            <h3>11.2 Blog Ownership</h3>
                            <ul>
                                <li>You retain ownership of blog content you create</li>
                                <li>Noxtm has a license to display your blog content publicly on the platform</li>
                                <li>You may edit or delete your blog posts at any time</li>
                            </ul>

                            <h3>11.3 Public Display</h3>
                            <p>Blog posts marked as "published" are publicly accessible and may be:</p>
                            <ul>
                                <li>Displayed on the Noxtm website</li>
                                <li>Indexed by search engines</li>
                                <li>Shared by visitors via social media</li>
                            </ul>

                            <h3>11.4 Blog Content Responsibility</h3>
                            <p>You are responsible for ensuring your blog content:</p>
                            <ul>
                                <li>Does not violate intellectual property rights</li>
                                <li>Complies with all applicable laws</li>
                                <li>Is accurate and not misleading</li>
                                <li>Does not contain prohibited content (as defined in Section 10.4)</li>
                            </ul>

                            <h3>11.5 Blog Images</h3>
                            <ul>
                                <li>You must own or have rights to images you upload</li>
                                <li>Images must not violate third-party copyrights or trademarks</li>
                                <li>We may remove images that violate these Terms</li>
                            </ul>
                        </section>

                        <section>
                            <h2>12. THIRD-PARTY INTEGRATIONS</h2>

                            <h3>12.1 Botgit Chrome Extension</h3>
                            <p>The Service integrates with the Botgit Chrome Extension for LinkedIn data scraping, subject to:</p>
                            <ul>
                                <li>Compliance with LinkedIn's Terms of Service</li>
                                <li>Obtaining necessary permissions from profile owners (where required by law)</li>
                                <li>Responsible use of scraped data</li>
                            </ul>

                            <h3>12.2 Scraped Data Storage</h3>
                            <p>Data imported via Botgit is stored in your account, including:</p>
                            <ul>
                                <li>Name, email, phone, location</li>
                                <li>Profile URL, role, company</li>
                                <li>Timestamp of scraping</li>
                            </ul>

                            <h3>12.3 Data Scraping Responsibility</h3>
                            <p>You are solely responsible for:</p>
                            <ul>
                                <li>Ensuring lawful scraping practices</li>
                                <li>Compliance with LinkedIn's Terms and applicable laws (including GDPR, CCPA)</li>
                                <li>Obtaining necessary consents from data subjects</li>
                                <li>Use of scraped data in accordance with privacy laws</li>
                            </ul>
                            <p style={{fontWeight: 'bold'}}>Noxtm is not responsible for how you collect or use data via third-party tools like Botgit.</p>

                            <h3>12.4 Other Integrations</h3>
                            <p>We may offer integrations with third-party services. When you connect third-party services:</p>
                            <ul>
                                <li>You authorize data sharing between Noxtm and the third party</li>
                                <li>You agree to the third party's terms of service and privacy policy</li>
                                <li>We are not responsible for third-party actions or data handling</li>
                            </ul>
                        </section>

                        <section>
                            <h2>13. ACCEPTABLE USE POLICY</h2>

                            <h3>13.1 Permitted Use</h3>
                            <p>You may use the Service only for lawful purposes and in accordance with these Terms.</p>

                            <h3>13.2 Prohibited Activities</h3>
                            <p>You agree NOT to:</p>

                            <h4>13.2.1 Legal Violations</h4>
                            <ul>
                                <li>Violate any applicable local, state, national, or international law</li>
                                <li>Engage in illegal activities or promote illegal conduct</li>
                                <li>Violate others' intellectual property rights</li>
                            </ul>

                            <h4>13.2.2 Unauthorized Access</h4>
                            <ul>
                                <li>Access accounts or data without authorization</li>
                                <li>Attempt to bypass security measures or authentication mechanisms</li>
                                <li>Use automated tools (bots, scrapers) except via approved integrations (like Botgit)</li>
                                <li>Probe, scan, or test vulnerabilities of the Service</li>
                            </ul>

                            <h4>13.2.3 Platform Abuse</h4>
                            <ul>
                                <li>Interfere with or disrupt the Service or servers</li>
                                <li>Impose unreasonable load on infrastructure</li>
                                <li>Transmit viruses, worms, or malicious code</li>
                                <li>Create multiple accounts to circumvent limitations</li>
                                <li>Resell or sublicense the Service without authorization</li>
                            </ul>

                            <h4>13.2.4 Harmful Conduct</h4>
                            <ul>
                                <li>Harass, threaten, stalk, or harm others</li>
                                <li>Impersonate any person or entity</li>
                                <li>Collect personal information without consent</li>
                                <li>Send spam, phishing emails, or unsolicited communications</li>
                            </ul>

                            <h4>13.2.5 Data Misuse</h4>
                            <ul>
                                <li>Scrape data from the platform (except via approved methods)</li>
                                <li>Use customer data in violation of privacy laws</li>
                                <li>Share account credentials with unauthorized users</li>
                                <li>Access data belonging to other Companies</li>
                            </ul>

                            <h3>13.3 Enforcement</h3>
                            <p>Violations may result in:</p>
                            <ul>
                                <li>Warning notices</li>
                                <li>Temporary account suspension</li>
                                <li>Permanent account termination</li>
                                <li>Referral to law enforcement</li>
                                <li>Legal action for damages</li>
                            </ul>
                        </section>

                        <section>
                            <h2>14. INTELLECTUAL PROPERTY RIGHTS</h2>

                            <h3>14.1 Noxtm Intellectual Property</h3>
                            <p>The Service and all materials therein, including software, code, design, graphics, logos, text, and documentation ("Noxtm IP"), are owned by Noxtm or our licensors and are protected by:</p>
                            <ul>
                                <li>Copyright laws</li>
                                <li>Trademark laws</li>
                                <li>Patent laws</li>
                                <li>Trade secret laws</li>
                                <li>Other intellectual property laws</li>
                            </ul>

                            <h3>14.2 Trademarks</h3>
                            <p>"Noxtm," the Noxtm logo, and other marks are trademarks or registered trademarks of Noxtm. You may not use our trademarks without prior written permission.</p>

                            <h3>14.3 Limited License to Use Service</h3>
                            <p>We grant you a limited, non-exclusive, non-transferable, revocable license to:</p>
                            <ul>
                                <li>Access and use the Service for your internal business purposes</li>
                                <li>Access and use documentation and materials provided by us</li>
                            </ul>
                            <p>This license is subject to these Terms and terminates upon account termination.</p>

                            <h3>14.4 Restrictions on Use</h3>
                            <p>You may not:</p>
                            <ul>
                                <li>Copy, modify, or create derivative works of the Service</li>
                                <li>Reverse engineer, decompile, or disassemble the Service</li>
                                <li>Remove or alter any proprietary notices</li>
                                <li>Use the Service to develop competing products</li>
                                <li>Sublicense, rent, lease, or transfer your license</li>
                            </ul>

                            <h3>14.5 Feedback</h3>
                            <p>If you provide feedback, suggestions, or ideas about the Service ("Feedback"), you grant Noxtm a perpetual, irrevocable, worldwide, royalty-free license to use, implement, and commercialize the Feedback without any obligation to you.</p>

                            <h3>14.6 Copyright Infringement Claims</h3>
                            <p>If you believe Content on the Service infringes your copyright, contact us at legal@noxtm.com with:</p>
                            <ul>
                                <li>Description of the copyrighted work</li>
                                <li>URL or location of infringing Content</li>
                                <li>Your contact information</li>
                                <li>Statement of good faith belief</li>
                                <li>Statement of accuracy under penalty of perjury</li>
                                <li>Physical or electronic signature</li>
                            </ul>
                            <p>We will investigate and take appropriate action in accordance with the DMCA (Digital Millennium Copyright Act).</p>
                        </section>

                        <section>
                            <h2>15. PRIVACY AND DATA PROTECTION</h2>

                            <h3>15.1 Privacy Policy</h3>
                            <p>Our Privacy Policy (available at noxtm.com/legal) describes how we collect, use, store, and protect your personal information. By using the Service, you agree to our Privacy Policy.</p>

                            <h3>15.2 Data Processing</h3>
                            <p>We process personal data as a data controller (for account data) and data processor (for Customer Data) in accordance with:</p>
                            <ul>
                                <li>GDPR (General Data Protection Regulation) - EU</li>
                                <li>CCPA (California Consumer Privacy Act) - US</li>
                                <li>Other applicable data protection laws</li>
                            </ul>

                            <h3>15.3 Data Security</h3>
                            <p>We implement industry-standard security measures, including:</p>
                            <ul>
                                <li>Encryption in transit (TLS/SSL)</li>
                                <li>Password hashing (bcrypt)</li>
                                <li>Access controls and authentication</li>
                                <li>Regular security audits</li>
                                <li>Secure data centers</li>
                            </ul>
                            <p>However, no system is 100% secure. You acknowledge that you provide data at your own risk.</p>

                            <h3>15.4 Data Breach Notification</h3>
                            <p>If we become aware of a data breach affecting your personal information, we will:</p>
                            <ul>
                                <li>Notify you within 72 hours (or as required by law)</li>
                                <li>Provide details about the breach</li>
                                <li>Describe steps we are taking</li>
                                <li>Recommend actions you should take</li>
                            </ul>

                            <h3>15.5 Data Retention</h3>
                            <p>We retain data as follows:</p>
                            <ul>
                                <li><strong>Account data:</strong> While your account is active plus 30 days after deletion</li>
                                <li><strong>Customer Data:</strong> While your subscription is active plus 30-day recovery period</li>
                                <li><strong>Email logs:</strong> Varies by plan; typically 12 months</li>
                                <li><strong>Backup data:</strong> Up to 90 days</li>
                            </ul>

                            <h3>15.6 Your Data Rights</h3>
                            <p>Subject to applicable law, you have rights to:</p>
                            <ul>
                                <li>Access your personal data</li>
                                <li>Correct inaccurate data</li>
                                <li>Delete your data (right to be forgotten)</li>
                                <li>Export your data (data portability)</li>
                                <li>Restrict or object to processing</li>
                                <li>Withdraw consent</li>
                            </ul>
                            <p>To exercise these rights, contact support@noxtm.com.</p>

                            <h3>15.7 International Data Transfers</h3>
                            <p>Your data may be transferred to and processed in countries other than your country of residence. We ensure appropriate safeguards are in place, including:</p>
                            <ul>
                                <li>Standard Contractual Clauses (SCCs)</li>
                                <li>Adequacy decisions by the European Commission</li>
                                <li>Other lawful transfer mechanisms</li>
                            </ul>
                        </section>

                        <section>
                            <h2>16. SERVICE AVAILABILITY AND UPTIME</h2>

                            <h3>16.1 Uptime Commitments</h3>

                            <h4>16.1.1 SoloHQ (Free Plan)</h4>
                            <ul>
                                <li><strong>Uptime SLA:</strong> None</li>
                                <li><strong>Availability:</strong> Best effort; no guarantees</li>
                                <li><strong>Maintenance:</strong> May occur without notice</li>
                                <li><strong>Support:</strong> Community support only</li>
                            </ul>

                            <h4>16.1.2 Noxtm (Paid Plan)</h4>
                            <ul>
                                <li><strong>Uptime SLA:</strong> 99.9% monthly uptime</li>
                                <li><strong>Downtime Allowance:</strong> Up to 43.2 minutes per month</li>
                                <li><strong>Scheduled Maintenance:</strong> Announced 72 hours in advance when possible</li>
                                <li><strong>Support:</strong> 24/7 premium support</li>
                            </ul>

                            <h4>16.1.3 Enterprise (Custom Plan)</h4>
                            <ul>
                                <li><strong>Uptime SLA:</strong> 99.99% monthly uptime</li>
                                <li><strong>Downtime Allowance:</strong> Up to 4.32 minutes per month</li>
                                <li><strong>Scheduled Maintenance:</strong> Announced 7 days in advance when possible</li>
                                <li><strong>Support:</strong> Dedicated support team with priority response</li>
                            </ul>

                            <h3>16.2 SLA Credits</h3>
                            <p>If uptime falls below the committed SLA for Noxtm or Enterprise:</p>
                            <ul>
                                <li><strong>99.0% - 99.9% uptime:</strong> 10% credit of monthly fee</li>
                                <li><strong>95.0% - 98.99% uptime:</strong> 25% credit of monthly fee</li>
                                <li><strong>Below 95.0% uptime:</strong> 50% credit of monthly fee</li>
                            </ul>
                            <p>Credits are issued as account credits for future billing periods, not cash refunds.</p>

                            <h3>16.3 SLA Exclusions</h3>
                            <p>Uptime SLA does not cover downtime caused by:</p>
                            <ul>
                                <li>Scheduled maintenance (with advance notice)</li>
                                <li>Your misuse of the Service</li>
                                <li>Third-party services or integrations</li>
                                <li>Internet or network issues outside our control</li>
                                <li>Force majeure events (natural disasters, war, pandemics, etc.)</li>
                                <li>DDoS attacks or security incidents</li>
                                <li>Your failure to follow documentation or support guidance</li>
                            </ul>

                            <h3>16.4 Maintenance Windows</h3>
                            <ul>
                                <li><strong>Scheduled Maintenance:</strong> We will provide advance notice via email and platform notifications</li>
                                <li><strong>Emergency Maintenance:</strong> May occur without notice to address critical security or performance issues</li>
                                <li><strong>Maintenance typically occurs:</strong> During low-usage periods (e.g., weekends, late night UTC)</li>
                            </ul>

                            <h3>16.5 Service Modifications</h3>
                            <p>We reserve the right to:</p>
                            <ul>
                                <li>Modify, update, or discontinue features (with 30 days' notice for significant changes)</li>
                                <li>Add new features or services</li>
                                <li>Change technical requirements or specifications</li>
                                <li>Upgrade infrastructure</li>
                            </ul>
                            <p>Continued use after modifications constitutes acceptance of changes.</p>
                        </section>

                        <section>
                            <h2>17. SUPPORT AND CUSTOMER SERVICE</h2>

                            <h3>17.1 Support Channels</h3>
                            <ul>
                                <li><strong>Email:</strong> support@noxtm.com</li>
                                <li><strong>In-app:</strong> Support ticket system (for Noxtm and Enterprise)</li>
                                <li><strong>Community Forum:</strong> For SoloHQ users</li>
                            </ul>

                            <h3>17.2 Support Levels</h3>

                            <h4>17.2.1 SoloHQ (Free)</h4>
                            <ul>
                                <li>Community support only</li>
                                <li>No guaranteed response time</li>
                                <li>Best-effort assistance</li>
                            </ul>

                            <h4>17.2.2 Noxtm (Paid)</h4>
                            <ul>
                                <li>24/7 premium support</li>
                                <li>Response time: Within 24 hours for non-critical issues</li>
                                <li>Priority assistance for critical issues</li>
                            </ul>

                            <h4>17.2.3 Enterprise (Custom)</h4>
                            <ul>
                                <li>Dedicated support team</li>
                                <li>Response time: Within 4 hours for critical issues</li>
                                <li>Account manager for strategic guidance</li>
                                <li>Phone support available</li>
                            </ul>

                            <h3>17.3 Support Scope</h3>
                            <p>Support covers:</p>
                            <ul>
                                <li>Technical issues with the Service</li>
                                <li>Account and billing questions</li>
                                <li>Bug reports and troubleshooting</li>
                                <li>Feature usage guidance</li>
                            </ul>
                            <p>Support does NOT cover:</p>
                            <ul>
                                <li>Custom development or consulting</li>
                                <li>Third-party integrations (except Botgit)</li>
                                <li>General business advice</li>
                                <li>Training (available separately for Enterprise)</li>
                            </ul>
                        </section>

                        <section>
                            <h2>18. WARRANTIES AND DISCLAIMERS</h2>

                            <h3>18.1 Limited Warranty</h3>
                            <p>We warrant that:</p>
                            <ul>
                                <li>The Service will perform substantially as described in our documentation</li>
                                <li>We will use commercially reasonable efforts to maintain the Service</li>
                                <li>We will comply with applicable laws in providing the Service</li>
                            </ul>

                            <h3>18.2 WARRANTY DISCLAIMER</h3>
                            <p style={{fontWeight: 'bold'}}>THE SERVICE IS PROVIDED "AS IS" AND "AS AVAILABLE" WITHOUT WARRANTIES OF ANY KIND, EITHER EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO:</p>
                            <ul style={{fontWeight: 'bold'}}>
                                <li>MERCHANTABILITY: We do not warrant that the Service is fit for your particular purpose</li>
                                <li>FITNESS FOR A PARTICULAR PURPOSE: You use the Service at your own risk</li>
                                <li>NON-INFRINGEMENT: We do not warrant that the Service does not infringe third-party rights</li>
                                <li>ACCURACY: We do not warrant that Content or data is accurate, complete, or reliable</li>
                                <li>AVAILABILITY: We do not warrant uninterrupted, timely, or error-free operation (except as stated in SLA)</li>
                                <li>SECURITY: We do not warrant that the Service is free from viruses or malicious code</li>
                            </ul>

                            <h3>18.3 No Guarantee of Results</h3>
                            <p>We do not guarantee that use of the Service will:</p>
                            <ul>
                                <li>Result in specific business outcomes</li>
                                <li>Increase productivity or efficiency</li>
                                <li>Improve sales, marketing, or financial performance</li>
                                <li>Comply with your industry-specific regulations (you must ensure compliance)</li>
                            </ul>

                            <h3>18.4 Third-Party Services</h3>
                            <p>We are not responsible for:</p>
                            <ul>
                                <li>Third-party integrations or services</li>
                                <li>Actions or omissions of third parties</li>
                                <li>Content or accuracy of third-party data (e.g., LinkedIn profiles scraped via Botgit)</li>
                            </ul>

                            <h3>18.5 Beta Features</h3>
                            <p>Features marked as "beta," "preview," or "experimental":</p>
                            <ul>
                                <li>Are provided without warranty</li>
                                <li>May be discontinued without notice</li>
                                <li>May contain bugs or errors</li>
                                <li>Are not covered by SLA commitments</li>
                            </ul>
                        </section>

                        <section>
                            <h2>19. LIMITATION OF LIABILITY</h2>

                            <h3>19.1 Liability Cap</h3>
                            <p style={{fontWeight: 'bold'}}>TO THE MAXIMUM EXTENT PERMITTED BY LAW, NOXTM'S TOTAL LIABILITY TO YOU FOR ALL CLAIMS ARISING OUT OF OR RELATED TO THESE TERMS OR THE SERVICE SHALL NOT EXCEED THE GREATER OF:</p>
                            <ol style={{fontWeight: 'bold'}}>
                                <li>THE TOTAL AMOUNT YOU PAID TO NOXTM IN THE 12 MONTHS PRECEDING THE CLAIM, OR</li>
                                <li>$100 USD</li>
                            </ol>

                            <h3>19.2 Exclusion of Damages</h3>
                            <p style={{fontWeight: 'bold'}}>TO THE MAXIMUM EXTENT PERMITTED BY LAW, NOXTM SHALL NOT BE LIABLE FOR:</p>
                            <ul style={{fontWeight: 'bold'}}>
                                <li>Indirect damages: Loss of profits, revenue, data, goodwill, or business opportunities</li>
                                <li>Consequential damages: Costs of procurement of substitute services</li>
                                <li>Incidental damages: Damages arising from unforeseen events</li>
                                <li>Special damages: Damages unique to your circumstances</li>
                                <li>Punitive damages: Damages intended to punish</li>
                            </ul>
                            <p style={{fontWeight: 'bold'}}>THIS LIMITATION APPLIES EVEN IF NOXTM HAS BEEN ADVISED OF THE POSSIBILITY OF SUCH DAMAGES AND REGARDLESS OF THE LEGAL THEORY (CONTRACT, TORT, NEGLIGENCE, STRICT LIABILITY, OR OTHERWISE).</p>

                            <h3>19.3 Exceptions</h3>
                            <p>The above limitations do not apply to:</p>
                            <ul>
                                <li>Your breach of intellectual property rights</li>
                                <li>Your indemnification obligations</li>
                                <li>Your violation of law</li>
                                <li>Gross negligence or willful misconduct by Noxtm</li>
                                <li>Liability that cannot be excluded or limited by law</li>
                            </ul>

                            <h3>19.4 Force Majeure</h3>
                            <p>We are not liable for delays or failures in performance resulting from causes beyond our reasonable control, including:</p>
                            <ul>
                                <li>Natural disasters (earthquakes, floods, hurricanes)</li>
                                <li>War, terrorism, civil unrest</li>
                                <li>Government actions or regulations</li>
                                <li>Pandemics or public health emergencies</li>
                                <li>Internet or telecommunications failures</li>
                                <li>Power outages</li>
                                <li>DDoS attacks or cyberattacks</li>
                                <li>Labor disputes or strikes</li>
                            </ul>

                            <h3>19.5 Basis of the Bargain</h3>
                            <p>You acknowledge that we have set our prices and entered into these Terms in reliance on the limitations of liability and disclaimers set forth herein, which allocate risk between us and form the basis of our agreement.</p>
                        </section>

                        <section>
                            <h2>20. INDEMNIFICATION</h2>

                            <h3>20.1 Your Indemnification Obligation</h3>
                            <p>You agree to indemnify, defend, and hold harmless Noxtm, our affiliates, officers, directors, employees, agents, licensors, and partners (collectively, "Noxtm Parties") from and against any and all claims, liabilities, damages, losses, costs, expenses, or fees (including reasonable attorneys' fees) arising out of or related to:</p>
                            <ol>
                                <li>Your use or misuse of the Service</li>
                                <li>Your violation of these Terms</li>
                                <li>Your violation of any rights of another party, including intellectual property rights</li>
                                <li>Your Customer Data or Content</li>
                                <li>Your violation of applicable laws or regulations</li>
                                <li>Your use of third-party integrations (including Botgit)</li>
                                <li>Claims by your employees, contractors, or Members</li>
                                <li>Your data scraping activities</li>
                                <li>Your email marketing or communication practices</li>
                                <li>Negligent or wrongful conduct by you or your authorized users</li>
                            </ol>

                            <h3>20.2 Indemnification Process</h3>
                            <ul>
                                <li>We will promptly notify you of any claim subject to indemnification</li>
                                <li>You will have sole control of the defense and settlement (with our approval, not to be unreasonably withheld)</li>
                                <li>We may participate in defense at our own expense</li>
                                <li>You will not settle any claim that imposes obligations on us without our written consent</li>
                            </ul>

                            <h3>20.3 Cooperation</h3>
                            <p>You agree to cooperate with us in defending any claim and will not make any admission or settlement that adversely affects our interests without our prior written consent.</p>
                        </section>

                        <section>
                            <h2>21. TERM AND TERMINATION</h2>

                            <h3>21.1 Term</h3>
                            <p>These Terms commence on your first use of the Service and continue until terminated in accordance with this Section.</p>

                            <h3>21.2 Termination by You</h3>
                            <p>You may terminate your account at any time by:</p>
                            <ul>
                                <li>Canceling your subscription (as described in Section 6)</li>
                                <li>Deleting your account via Account Settings</li>
                                <li>Contacting support@noxtm.com</li>
                            </ul>

                            <h3>21.3 Termination by Noxtm</h3>
                            <p>We may suspend or terminate your account immediately, without notice, if:</p>
                            <ol>
                                <li>You breach these Terms</li>
                                <li>You engage in prohibited activities (Section 13)</li>
                                <li>Your account is used for illegal purposes</li>
                                <li>You fail to pay subscription fees</li>
                                <li>You engage in abusive behavior toward our staff or other users</li>
                                <li>Required by law or regulatory authority</li>
                                <li>We discontinue the Service (with 30 days' notice)</li>
                                <li>Your account has been inactive for more than 2 years (for free accounts)</li>
                            </ol>

                            <h3>21.4 Effect of Termination</h3>
                            <p>Upon termination:</p>
                            <ol>
                                <li><strong>Access:</strong> Your access to the Service is immediately revoked</li>
                                <li><strong>Data:</strong> You have 30 days to export your Customer Data before it is permanently deleted</li>
                                <li><strong>Payment:</strong> No refunds for unused subscription time (except as required by law or our Refund Policy)</li>
                                <li><strong>Licenses:</strong> All licenses granted to you terminate immediately</li>
                                <li><strong>Survival:</strong> Sections that by their nature should survive termination will survive (including Sections 10, 14, 15, 18, 19, 20, 21.4, 22, and 23)</li>
                            </ol>

                            <h3>21.5 Data Deletion After Termination</h3>
                            <ul>
                                <li><strong>30 days:</strong> Customer Data is recoverable if you reactivate your account</li>
                                <li><strong>After 30 days:</strong> Customer Data is permanently deleted (except as required by law or stored in backups)</li>
                                <li><strong>Backups:</strong> Data in backups is deleted within 90 days</li>
                            </ul>

                            <h3>21.6 Company Deletion</h3>
                            <p>If you delete a Company:</p>
                            <ul>
                                <li>All Company Members lose access immediately</li>
                                <li>Company data is recoverable for 30 days</li>
                                <li>After 30 days, all Company data is permanently deleted</li>
                            </ul>
                        </section>

                        <section>
                            <h2>22. DISPUTE RESOLUTION</h2>

                            <h3>22.1 Informal Resolution</h3>
                            <p>Before filing a formal dispute, you agree to contact us at legal@noxtm.com to attempt to resolve the dispute informally. We will attempt to resolve disputes within 30 days of receiving notice.</p>

                            <h3>22.2 Governing Law</h3>
                            <p>These Terms are governed by and construed in accordance with the laws of [INSERT JURISDICTION], without regard to its conflict of law principles.</p>

                            <h3>22.3 Jurisdiction and Venue</h3>
                            <p>Subject to the arbitration provision below, you agree that any legal action or proceeding arising out of or related to these Terms shall be brought exclusively in the courts located in [INSERT JURISDICTION], and you consent to the personal jurisdiction of such courts.</p>

                            <h3>22.4 Class Action Waiver</h3>
                            <p style={{fontWeight: 'bold'}}>YOU AGREE THAT DISPUTES WILL BE RESOLVED INDIVIDUALLY. YOU WAIVE ANY RIGHT TO PARTICIPATE IN A CLASS ACTION LAWSUIT OR CLASS-WIDE ARBITRATION.</p>

                            <h3>22.5 Injunctive Relief</h3>
                            <p>Notwithstanding any other provision in these Terms, we may seek injunctive or other equitable relief in any court of competent jurisdiction to prevent the actual or threatened infringement of our intellectual property rights.</p>
                        </section>

                        <section>
                            <h2>23. GENERAL PROVISIONS</h2>

                            <h3>23.1 Entire Agreement</h3>
                            <p>These Terms, together with our Privacy Policy, Cancellation & Refund Policy, and any other legal notices published on the Service, constitute the entire agreement between you and Noxtm regarding the Service and supersede all prior agreements, understandings, and communications.</p>

                            <h3>23.2 Amendments</h3>
                            <p>We may modify these Terms at any time by:</p>
                            <ul>
                                <li>Posting revised Terms on the Service</li>
                                <li>Notifying you via email or in-app notification</li>
                                <li>Updating the "Last Updated" date</li>
                            </ul>
                            <p style={{fontWeight: 'bold'}}>Material changes will be notified 30 days in advance. Continued use after the effective date constitutes acceptance of modified Terms.</p>
                            <p>If you do not agree to modified Terms, you must stop using the Service and may cancel your subscription.</p>

                            <h3>23.3 Waiver</h3>
                            <p>Our failure to enforce any provision of these Terms does not constitute a waiver of that provision. Waiver of any breach does not waive any subsequent breach.</p>

                            <h3>23.4 Severability</h3>
                            <p>If any provision of these Terms is found invalid or unenforceable by a court, the remaining provisions shall remain in full force and effect. The invalid provision will be modified to the minimum extent necessary to make it valid and enforceable.</p>

                            <h3>23.5 Assignment</h3>
                            <p>You may not assign or transfer these Terms or your account without our prior written consent. We may assign or transfer these Terms to:</p>
                            <ul>
                                <li>An affiliate or subsidiary</li>
                                <li>A successor in interest in the event of a merger, acquisition, or sale of assets</li>
                            </ul>

                            <h3>23.6 No Third-Party Beneficiaries</h3>
                            <p>These Terms do not create any third-party beneficiary rights except as expressly stated herein.</p>

                            <h3>23.7 Relationship of the Parties</h3>
                            <p>You and Noxtm are independent contractors. These Terms do not create a partnership, joint venture, employment, or agency relationship.</p>

                            <h3>23.8 Export Compliance</h3>
                            <p>You agree to comply with all applicable export and import laws and regulations. You represent that you are not located in a country subject to U.S. embargo or designated as a "terrorist supporting" country, and you are not on any U.S. government list of prohibited or restricted parties.</p>

                            <h3>23.9 Language</h3>
                            <p>These Terms are written in English. Any translations are provided for convenience only. In the event of conflict, the English version prevails.</p>

                            <h3>23.10 Notices</h3>
                            <p><strong>Notices to You:</strong> We may provide notices via:</p>
                            <ul>
                                <li>Email to your registered email address</li>
                                <li>In-app notifications or banners</li>
                                <li>Posting on the Service</li>
                            </ul>
                            <p><strong>Notices to Noxtm:</strong> You may provide notices to:</p>
                            <ul>
                                <li><strong>Email:</strong> legal@noxtm.com</li>
                                <li><strong>Support:</strong> support@noxtm.com</li>
                            </ul>
                            <p>Notices are deemed received:</p>
                            <ul>
                                <li><strong>Email:</strong> When sent (if during business hours) or next business day</li>
                                <li><strong>Mail:</strong> 5 business days after mailing</li>
                            </ul>
                        </section>

                        <section>
                            <h2>24. CONTACT INFORMATION</h2>
                            <p>For questions about these Terms:</p>
                            <ul>
                                <li><strong>Email:</strong> legal@noxtm.com</li>
                                <li><strong>Support:</strong> support@noxtm.com</li>
                                <li><strong>Website:</strong> https://noxtm.com</li>
                            </ul>
                        </section>

                        <section>
                            <h2>25. ACKNOWLEDGMENT AND ACCEPTANCE</h2>
                            <p style={{fontWeight: 'bold'}}>BY CLICKING "I ACCEPT," CREATING AN ACCOUNT, OR USING THE SERVICE, YOU ACKNOWLEDGE THAT:</p>
                            <ol style={{fontWeight: 'bold'}}>
                                <li>You have read and understood these Terms</li>
                                <li>You agree to be bound by these Terms</li>
                                <li>You have authority to bind any organization on whose behalf you are using the Service</li>
                                <li>You meet the eligibility requirements (age 18+)</li>
                                <li>You have read and agree to our Privacy Policy</li>
                            </ol>
                            <p style={{fontWeight: 'bold'}}>IF YOU DO NOT AGREE TO THESE TERMS, DO NOT USE THE SERVICE.</p>
                        </section>

                        <section style={{textAlign: 'center', marginTop: '40px', paddingTop: '20px', borderTop: '1px solid #ddd'}}>
                            <hr />
                            <p style={{margin: '0'}}>Last Updated: October 25, 2025</p>
                            <hr />
                            <p style={{fontWeight: 'bold'}}>Noxtm - All-in-One Business Management Platform</p>
                            <p>© 2025 Noxtm. All rights reserved.</p>
                        </section>
                    </div>
                );
case 'privacy':
                return (
                    <div className="legal-policy-wrapper">
                        <h1>NOXTM PRIVACY POLICY</h1>
                        <hr />
                        <p style={{margin: '0'}}>Last Updated: October 25, 2025</p>
                        <hr />

                        <section>
                            <h2>INTRODUCTION AND OUR COMMITMENT TO YOUR PRIVACY</h2>
                            <p>Welcome to Noxtm, an all-in-one business management platform that serves thousands of organizations, teams, and individual users around the world. Throughout this Privacy Policy, when we refer to "we," "us," "our," or "Noxtm," we are referring to our company and the comprehensive suite of services we provide through our platform, including our website located at noxtm.com, our web applications, any mobile applications we may offer, our application programming interfaces, and all related services, features, and functionalities. For convenience and clarity, we will collectively refer to all of these as the "Service," the "Platform," or "Noxtm Platform."</p>
                            <p>Your privacy is not just important to us—it is fundamental to everything we do. We recognize that when you choose to use Noxtm for your business management needs, you are entrusting us with information that may be sensitive, confidential, and critical to your operations. This trust is something we take extraordinarily seriously, and we have designed our entire approach to data handling with the goal of earning and maintaining that trust every single day. We believe that transparency about our data practices is not just a legal obligation but a moral imperative, and this Privacy Policy represents our commitment to providing you with clear, comprehensive, and honest information about how we collect, use, store, protect, and share your personal information and business data.</p>
                            <p>This Privacy Policy has been carefully drafted to explain our data practices in detail while remaining as accessible and understandable as possible. We know that privacy policies can sometimes be dense, technical, or difficult to navigate, so we have made a conscious effort to write this one in clear language that explains not just what we do with your data, but also why we do it and how it benefits you. We want you to feel confident that you understand exactly what happens to your information when you use Noxtm, and we want you to have the knowledge and tools you need to make informed decisions about your privacy.</p>
                            <p>By accessing or using the Noxtm Service in any capacity, you are agreeing to the terms of this Privacy Policy and consenting to our collection, use, disclosure, retention, and protection of your information as described throughout this document. If you do not agree with any aspect of this Privacy Policy, or if you have concerns about how we handle your data, we respectfully ask that you do not use our Service. We would, however, encourage you to contact us first to discuss your concerns, as we may be able to address them or provide clarification that resolves any issues you may have. Your right to privacy is important, and we want to ensure you feel comfortable with our practices before you decide whether to use our platform.</p>
                            <p>For any questions, concerns, or requests related to this Privacy Policy or our data practices in general, we have established a dedicated privacy team that can be reached at privacy@noxtm.com. We are committed to responding promptly and thoroughly to all privacy-related inquiries, and we welcome your feedback on how we can continue to improve our privacy practices and make this policy even more clear and useful for our users.</p>
                        </section>

                        <section>
                            <h2>SCOPE AND APPLICATION OF THIS PRIVACY POLICY</h2>
                            <p>This Privacy Policy applies comprehensively to all users of the Noxtm Platform, regardless of how you access or use our services. Whether you are an individual user who has created a personal account for solo business management, a company owner who has established an organization within Noxtm and invited team members to collaborate, an administrator who manages user permissions and settings on behalf of your organization, a regular team member who uses Noxtm to communicate and collaborate with colleagues, or even a visitor to our public website who has not yet created an account, this Privacy Policy governs how we handle any information we collect from you or about you.</p>
                            <p>The scope of this policy extends to all features and functionalities offered through the Noxtm Platform. This includes our core dashboard and business management tools, our real-time messaging system that enables direct and group conversations among team members, our enterprise email management system known as Noxtm Mail that allows you to send, receive, and manage emails through integrated IMAP, SMTP, and POP protocols, our blog creation and management features that enable you to publish content, our company and team management capabilities that allow you to organize your organization's structure and invite members, our project management tools, our customer relationship management features, our human resources management modules, our financial tracking and invoicing capabilities, our document management system, and any other features or services we may add to the platform in the future.</p>
                            <p>It is important to understand that when you use Noxtm as part of an organization or company, there may be multiple parties who have certain rights or responsibilities with respect to your data. Specifically, if you have been invited to join a company within Noxtm by an organization owner or administrator, that organization may have certain administrative rights and may be able to access, monitor, or manage the data you create or store within that company's workspace. The company owner or administrators may be able to view your messages, access your files, review your activity logs, and exercise other controls that are necessary for them to manage their organization effectively. This is a standard and necessary aspect of business collaboration platforms, but we want you to be fully aware of it so you understand that your use of Noxtm in a company context may not provide the same level of privacy from your employer or organization administrators as you might have in a purely personal account.</p>
                            <p>Additionally, this Privacy Policy applies regardless of the subscription plan you are using. Whether you are using our free SoloHQ plan with basic features for individual users, our paid Noxtm plan with advanced features and expanded capabilities for growing teams, or our Enterprise plan with the most comprehensive feature set including dedicated support and enhanced security options, the fundamental privacy principles described in this policy apply equally to all users. However, it is worth noting that different subscription tiers may have access to different features, and therefore the types of data we collect and how we process it may vary slightly depending on which features you are actually using.</p>
                            <p>This Privacy Policy does not apply to third-party websites, services, or applications that may be linked from our platform or that may integrate with Noxtm. For example, if you use our Botgit Chrome Extension integration to import contact information from LinkedIn, the collection of that information from LinkedIn is subject to LinkedIn's privacy policy and terms of service, not ours. Similarly, if we provide links to external resources, documentation, or partner services, your interaction with those external sites is governed by their own privacy policies. We encourage you to review the privacy policies of any third-party services you use in connection with Noxtm, as we cannot control and are not responsible for the privacy practices of other companies or platforms.</p>
                            <p>We also want to clarify that while we make every effort to keep this Privacy Policy current and accurate, the Noxtm Platform is continuously evolving as we add new features, improve existing functionality, and respond to user feedback and changing legal requirements. As a result, we may need to update this Privacy Policy from time to time to reflect changes in our practices, new features we have added, or new legal obligations we must fulfill. When we make material changes to this policy, we will notify you through appropriate channels, which may include email notifications sent to the address associated with your account, prominent notices displayed within the Noxtm Platform when you log in, or announcements posted on our website. We will also update the "Last Updated" date at the top of this policy to reflect when the most recent changes were made. We encourage you to review this Privacy Policy periodically to stay informed about how we are protecting your information and what rights you have with respect to your data.</p>
                        </section>

                        <section>
                            <h2>CATEGORIES OF INFORMATION WE COLLECT</h2>
                            <p>To provide you with the comprehensive business management capabilities that Noxtm offers, we need to collect various types of information from and about you. This section provides a detailed explanation of all the categories of information we collect, how we collect that information, and why each type of information is necessary for the functioning of our platform. We believe in collecting only the information that is genuinely necessary to provide, maintain, improve, and secure our services, and we do not collect information for purposes unrelated to delivering value to our users.</p>
                            <p>The information we collect can be broadly categorized into three main groups: information you provide to us directly through your active use of the platform, information we collect automatically through your interaction with our services and the operation of our technical infrastructure, and information we may receive from third-party sources such as payment processors or services you choose to integrate with Noxtm. Each of these categories is described in detail in the subsections that follow.</p>
                        </section>

                        <section>
                            <h2>INFORMATION YOU PROVIDE DIRECTLY TO US</h2>
                            <p>The most significant category of information we collect is information that you actively and voluntarily provide to us as you create your account, set up your profile, configure your company settings, use the various features of the platform, and interact with other users. This information is essential for creating your unique user experience, enabling collaboration with your team members, and providing you with the specific features and capabilities you need to manage your business effectively.</p>

                            <p>When you first decide to create a Noxtm account, we ask you to provide certain basic registration information that allows us to create your unique user profile and authenticate your identity. Specifically, we collect your full name, which helps us personalize your experience and allows other users to identify you when you collaborate within shared company workspaces. We also collect your email address, which serves multiple critical purposes: it acts as your unique username for logging into the platform, it provides us with a way to communicate with you about your account and our services, it enables us to send you important security notifications and password reset instructions, and it allows us to verify that you are a real person and not an automated bot attempting to create fraudulent accounts. Additionally, we collect the password you create for your account, though we want to assure you that we never store your password in plain text—instead, we use industry-standard bcrypt hashing with salt to encrypt your password before storing it in our database, ensuring that even our own employees and systems cannot view your actual password.</p>

                            <p>As part of our commitment to security and preventing fraudulent account creation, we have implemented an email verification system that requires you to verify your email address before you can fully activate your account. When you register, we generate and send a six-digit verification code to the email address you provided. This verification code is randomly generated for security purposes and is designed to expire after ten minutes to prevent unauthorized use. We store the verification code temporarily in our database along with a timestamp indicating when it was created and when it was used (if applicable), and we track the number of verification attempts you make to prevent brute-force attacks. Once you successfully verify your email address by entering the correct code within the expiration window, we permanently record the fact that your email has been verified, which allows you to access all features of the platform.</p>

                            <p>Beyond this basic registration information, you have the option to provide additional profile information that helps personalize your experience and makes it easier for your colleagues and team members to recognize and interact with you. You can optionally add a username or display name that differs from your full legal name, which some users prefer for professional or personal reasons. You can write a bio or description about yourself, which might include information about your role, expertise, interests, or anything else you wish to share with others who view your profile. You can upload a profile picture, which we accept in common image formats and store either as a base64-encoded string or as a URL reference to an uploaded file, with a maximum file size limit of two megabytes to ensure reasonable storage usage and fast loading times. You can also optionally provide a phone number, which might be useful for account recovery purposes or for enabling certain features in the future. All of this profile information is entirely optional, and you have complete control over what you choose to share and what you prefer to keep private.</p>

                            <p>If you decide to create a company or organization within Noxtm, which is necessary if you want to invite team members and collaborate with others in a shared workspace, we collect comprehensive information about your company to establish your organizational profile and enable proper management of your business data. This company information includes the company name, which serves as the identifier for your organization within the platform and appears in various contexts throughout the interface. We collect the company email address, which may differ from your personal email and serves as the official contact point for the organization. We ask you to specify your industry type from a predefined list of categories, which helps us understand your business context and may enable us to provide industry-specific features or recommendations in the future. You provide information about your company size by selecting from ranges such as one to ten employees, eleven to fifty employees, fifty-one to two hundred employees, two hundred one to five hundred employees, or more than five hundred employees, which helps us understand the scale of your operations and ensure we can support your needs appropriately.</p>

                            <p>We also collect detailed company address information, including the street address, city, state or province, postal or zip code, and country where your company is located. This address information may be used for billing purposes, for compliance with tax regulations in certain jurisdictions, and for providing location-specific features or services. If you provide a company phone number, we store that for communication and support purposes. Similarly, if you have a company website, you can provide that URL, which might be displayed on your public-facing company profile or used for verification purposes. For companies operating in India or dealing with Indian tax regulations, we provide a field for you to enter your GSTIN number, which is the Goods and Services Tax Identification Number required for tax compliance in India. We automatically record the date and time when your company profile was created, and we track any modifications you make to your company information, storing timestamps for when the profile was last updated so we have an audit trail of changes for security and support purposes.</p>

                            <p>When you subscribe to one of our paid plans—whether the Noxtm plan or the Enterprise plan—we need to collect subscription and payment-related information to process your payment, manage your subscription, and ensure you have access to the features included in your chosen plan. We record which subscription plan you have selected, whether you have chosen monthly billing or annual billing, the exact dates when your subscription period begins and when it is scheduled to end, and the current status of your subscription which might be active, inactive, pending (for example, if a payment is being processed), or cancelled (if you have terminated your subscription but it has not yet expired). Regarding payment information itself, we want to emphasize that we partner with reputable third-party payment processors to handle the actual collection and processing of your payment credentials, and we deliberately do not store your full credit card number or other highly sensitive payment information on our own servers. Instead, we store tokenized payment method identifiers provided by our payment processors, which allow us to initiate transactions without ever having access to your actual card details. We do, however, maintain records of your billing address, your complete payment history including transaction IDs, amounts, dates, and outcomes, and digital copies of invoices we have issued to you, all of which are necessary for accounting, tax compliance, customer support, and allowing you to access your billing history.</p>

                            <p>One of the core features of the Noxtm Platform is our real-time messaging system, which enables you to communicate instantly with team members through both direct one-on-one conversations and group chats. When you use our messaging features, we necessarily collect and store the content of the messages you send, which may include text content, files you attach to messages, images you share, or any other content you choose to transmit through the messaging system. We store detailed metadata about each message, including precise timestamps indicating when the message was originally sent, when it was successfully delivered to the recipient's device or browser, and when the recipient actually read or viewed the message (if read receipts are enabled). If you react to a message with an emoji reaction, we store that reaction along with your user identifier and a timestamp. If you edit a message after sending it, we maintain an edit history that tracks what changes were made and when, though we typically only display the most recent version to other users. When you delete a message, we implement a soft delete approach, meaning the message is marked as deleted and hidden from view but remains in our database for a period of time to support features like message recovery and to comply with legal data retention requirements. We record the participants in each conversation, whether it is a direct conversation between two users or a group conversation with multiple participants, and we maintain comprehensive conversation metadata including when the conversation was first created, when the last message was sent, how many unread messages each participant has, and other information necessary for providing a smooth messaging experience.</p>

                            <p>Beyond the message content itself, our real-time messaging system also collects and processes various presence and activity indicators that enable features like showing when users are online, displaying typing indicators when someone is composing a message, and providing read receipts that let you know when your messages have been seen. To support these features, we continuously track whether you are currently connected to our real-time messaging server via WebSocket, whether you are actively viewing a particular conversation, and whether you are currently typing a message. This information is processed in real-time and is typically not stored permanently, but it is temporarily maintained in our system's memory and may appear in logs that are retained for troubleshooting and security purposes.</p>

                            <p>For users who have subscribed to our Enterprise plan and have access to our Noxtm Mail feature, which is a comprehensive email management system that allows you to send, receive, and manage emails through integrated IMAP, SMTP, and POP3 protocols, we collect and store extensive email-related information. This includes all email addresses involved in your correspondence, both the sender addresses and all recipient addresses including those in the To, CC, and BCC fields. We store the complete subject lines of all emails, the full body content of emails in both HTML and plain text formats, and any attachments you send or receive through the system. We maintain precise timestamps for when emails are sent, when they are received by our servers, and when they are delivered to the final recipient's mail server. We track the delivery status of each email, which might indicate whether the email is still queued for sending, has been successfully sent from our servers, has been confirmed delivered to the recipient's server, has failed to send due to an error, or has bounced back due to an invalid address or full mailbox.</p>

                            <p>To facilitate enterprise email management, we maintain comprehensive email logs that record details of every email transaction processed through our system, including the from and to addresses, all timestamps, any error messages or delivery failures, and any other information relevant to ensuring reliable email delivery and troubleshooting any issues that may arise. If you configure external email accounts to work with Noxtm Mail by providing credentials for your existing email services, we collect and securely store those email account credentials, including usernames and passwords, though just as with your Noxtm password, we encrypt email account passwords using bcrypt before storing them so they cannot be viewed in plain text by anyone, including our own staff. We also store information about the email domains you have configured for use with Noxtm Mail and any DNS configuration settings you have provided to enable features like custom domain email sending. If you create email templates for repeated use, we store the content of those templates, version history showing how templates have evolved over time, and metadata about when templates were created, last modified, and last used.</p>

                            <p>Our platform also includes comprehensive blogging capabilities that allow you to create and publish blog posts for public consumption or for sharing with specific audiences. When you create blog content, we collect and store the complete title and text content of your blog posts, any featured images you upload to be displayed alongside the post (with a maximum file size of five megabytes per image to ensure reasonable storage and bandwidth usage), meta descriptions up to one hundred sixty characters that are used for search engine optimization and social media sharing, SEO keywords and tags you assign to help categorize and make your content discoverable, the category or categories into which you have organized the post, the publication status indicating whether the post is still a draft, has been published and is publicly visible, or has been archived and removed from public view, the exact date and time when you first published the post, running counts of how many times the post has been viewed by readers, and author information identifying you as the creator of the content.</p>

                            <p>Beyond these specific feature areas, users of the Noxtm Platform may create and store a wide variety of other business data depending on which modules and features they utilize. This might include comprehensive project information detailing your active initiatives, client leads and contact information you are managing through our CRM features, human resources data such as employee records, attendance tracking, interview notes, and hiring pipelines, financial data including invoices you have created, payments you have recorded, expenses you are tracking, and other accounting information, various documents and files you upload to the platform for storage or sharing with team members, notes and templates you create for repeated use, custom content specific to your business needs, and essentially any other information you choose to voluntarily input into the Service as you use its various capabilities. We want to emphasize that you have full control over what business data you choose to store in Noxtm, and we only collect and store the information that you actively decide to enter into the system.</p>

                            <p>If you use our team and member management features to invite colleagues to join your company's Noxtm workspace, we collect information about those team members and the invitation process. This includes the email addresses of individuals you invite, which we need in order to send them invitation emails and create their accounts if they accept. We collect the names and profile information of team members once they join and create their profiles. We store information about the roles you have assigned to each team member, which might be Owner (the highest level with full administrative control), Admin (elevated privileges for managing the organization), or Member (standard user access). For more granular control, we store customized permission settings that define exactly which features and data each user can access within your company workspace. When you send invitations, we generate unique invitation tokens that are cryptographically secure and valid for seven days, after which they expire and cannot be used. We track the status of each invitation to show whether it is still pending and waiting for the recipient to respond, has been accepted and the person has joined your workspace, or has expired without being accepted. We maintain timestamps for when invitations were originally sent and when they were accepted or expired.</p>

                            <p>For users who choose to utilize our Botgit Chrome Extension integration, which is a tool designed to help you import contact information from LinkedIn profiles directly into Noxtm for lead management and CRM purposes, we collect the data that you scrape or import using that extension. This typically includes the person's name as displayed on their LinkedIn profile, their email address if available, their phone number if they have made it public, their location information, their current role or job title, the company they work for, their complete LinkedIn profile URL, and a timestamp indicating when you performed the scraping action. We want to be absolutely clear about an important legal and ethical consideration regarding this feature: you, as the user who is scraping this information, are solely and completely responsible for ensuring that your collection and use of this data complies with all applicable laws, regulations, and terms of service of the platforms from which you are collecting it. This includes LinkedIn's terms of service, the European Union's General Data Protection Regulation if you are dealing with EU residents, the California Consumer Privacy Act if you are dealing with California residents, and any other relevant privacy and data protection laws. Noxtm provides the technical capability to import this data, but we cannot and do not control how you use the Botgit extension, what data you choose to collect, or whether you have obtained proper consent or have a lawful basis for collecting and processing that information. You agree to indemnify and hold Noxtm harmless from any claims, damages, or legal issues arising from your use of scraped data that violates applicable laws or third-party terms of service.</p>

                            <p>Finally, when you contact our customer support team with questions, issues, or feedback, we collect information related to those support interactions. This includes the content of your support inquiries and all correspondence between you and our support staff, any attachments or screenshots you provide to help us understand and resolve your issue, diagnostic information such as log files or error messages that you share or that we collect with your permission to troubleshoot technical problems, and any general feedback or suggestions you provide about how we can improve our service. We retain this support communication history so we can provide you with consistent, informed assistance across multiple interactions and so we can identify patterns or common issues that might indicate bugs or areas where our product could be improved.</p>
                        </section>

                        <section>
                            <h2>INFORMATION WE COLLECT AUTOMATICALLY</h2>
                            <p>In addition to the information you actively provide to us, we also automatically collect certain information about you and your use of the Noxtm Platform through the operation of our technical infrastructure and the standard functioning of web-based services. This automatically collected information is essential for providing you with a secure, reliable, and high-performing service, for understanding how our platform is being used so we can make improvements, for detecting and preventing fraud and security threats, and for complying with our legal obligations. Most of this automatic data collection is standard practice across the software industry and is necessary for any modern web application to function properly.</p>

                            <p>Whenever you access or use the Noxtm Service, our servers automatically collect certain usage data and technical information about your session. This includes your Internet Protocol address, commonly known as your IP address, which is a numerical identifier assigned to your device by your Internet service provider and is necessary for routing data between your device and our servers. We use IP addresses for multiple purposes: they help us authenticate your identity by verifying that login attempts are coming from expected locations and devices, they enable us to detect suspicious activity such as multiple failed login attempts from unusual locations that might indicate a compromised account or brute-force attack, they help us enforce rate limiting and prevent abuse of our services, and they provide basic geographic information about where our users are located which helps us ensure our infrastructure is properly distributed to serve users globally with good performance.</p>

                            <p>We automatically collect information about the browser you are using to access Noxtm, including the browser type such as Chrome, Firefox, Safari, Edge, or others, the specific version number of that browser, and various technical capabilities of the browser that help us ensure we are delivering compatible code and features. We also collect information about your operating system, including whether you are using Windows, macOS, Linux, iOS, Android, or another platform, and the version of that operating system. We gather data about the type of device you are using, such as whether you are accessing Noxtm from a desktop computer, a laptop, a tablet, or a mobile phone, and the screen resolution and display characteristics of your device, which help us optimize our user interface to provide the best possible experience on your particular device. We record the referring URL, which tells us what website or web page you were viewing immediately before you arrived at Noxtm, giving us insight into how users are discovering our service and which marketing channels or partners are most effective. We track which specific pages within Noxtm you visit, which features you use, and how you navigate through the application, creating a comprehensive picture of your interaction patterns that helps us understand which features are most valuable, which parts of the interface might be confusing or underutilized, and where we should focus our development efforts to provide maximum value.</p>

                            <p>For every session you have on Noxtm, we record the exact date and time when you first accessed the service, when you logged out or your session ended, and the total duration of your session. We track your click patterns, meaning which buttons you click, which links you follow, and which interactive elements you engage with throughout the application. We monitor your navigation paths to understand the sequence of pages and features you access during a typical session. We record which specific modules of the Noxtm Platform you interact with, whether that is the dashboard, the messaging system, the email management interface, the blog editor, the CRM tools, the project management features, or any other functional area of the platform. All of this usage data is collected and analyzed to help us improve the user experience, identify bugs or performance issues, understand which features are successful and which might need redesign, and make data-driven decisions about product development priorities.</p>

                            <p>To enable secure authentication and maintain your logged-in state across multiple page views and sessions, we generate and use various authentication tokens and cookies. When you successfully log in to Noxtm, we create a JSON Web Token, commonly known as a JWT, which is a cryptographically signed token that contains claims about your identity and is used to authenticate your requests to our servers. These JWT tokens are designed to expire after twenty-four hours for security purposes, requiring you to log in again after that period (though we may implement automatic refresh mechanisms in the future to provide a smoother experience while maintaining security). We set session cookies in your browser that store your authentication token and maintain your logged-in state, allowing you to navigate between different pages of the application without having to re-enter your credentials repeatedly. If we implement refresh token functionality in the future, we would also store longer-lived refresh tokens that allow us to issue new access tokens when your current token expires without requiring you to log in again, striking a balance between security and convenience.</p>

                            <p>Our email verification and password reset processes also involve the automatic generation and tracking of certain temporary data. When you need to verify your email address or reset your password, we automatically generate secure six-digit verification codes or cryptographic reset tokens, respectively. These codes and tokens are designed to expire after ten minutes to minimize the window of opportunity for unauthorized use if they are intercepted. We store timestamps indicating when each code or token was generated, which allows us to check whether it has expired when you attempt to use it. We also track the number of verification or reset attempts you make, both to provide helpful feedback about incorrect entries and to detect and prevent brute-force attacks where someone might try to guess verification codes or exploit the reset mechanism.</p>

                            <p>To ensure the security and reliability of our service and to facilitate troubleshooting when issues arise, our servers automatically maintain comprehensive log files that record various types of system events and activities. These logs include detailed server logs that record every HTTP request made to our servers, the responses we sent back, any errors that occurred during processing, and technical details about the request and response cycle. We maintain email logs that record every email that was sent through the Noxtm Mail system, including sender and recipient addresses, timestamps, subject lines, delivery status, and any error messages or bounce notifications, which are essential for diagnosing email delivery problems and ensuring the reliability of our email infrastructure. We keep security logs that record all login attempts whether successful or failed, authentication events, changes to account security settings, and other security-relevant activities, which help us detect suspicious behavior, investigate potential security incidents, and provide you with visibility into account access. We log all API requests made to our application programming interfaces, including which endpoints were accessed, what parameters were provided, authentication details, and rate limiting information, which helps us monitor API usage, prevent abuse, and provide reliable service to developers and integrations. We also maintain error logs that record application crashes, unhandled exceptions, software bugs, and other technical problems, along with stack traces and contextual information that help our engineering team diagnose and fix issues quickly.</p>

                            <p>Our real-time messaging features, which are built on Socket.IO technology and use WebSocket connections for instant bidirectional communication, require us to collect and process certain real-time connection data. We track the status of your WebSocket connection to our messaging servers, including whether you are currently connected, whether the connection has been temporarily interrupted, and whether you are online or offline from the perspective of other users. We maintain information about your online and offline presence status, which is displayed to other users who might want to know whether you are currently available to receive and respond to messages. We record which conversations you currently have open or are actively viewing, which helps us deliver messages to the right place and optimize message delivery. We track various real-time events such as when you start typing a message, when you send a message, when you read a message, and other instantaneous interactions that make the messaging experience feel live and responsive. While much of this real-time connection data is ephemeral and exists only in system memory during your active session, some of it may be recorded in logs for troubleshooting purposes.</p>
                        </section>

                        <section>
                            <h2>INFORMATION FROM THIRD-PARTY SOURCES</h2>
                            <p>In addition to information you provide directly and information we collect automatically, we may also receive certain information about you from third-party sources that you choose to connect with or that are necessary for providing specific features of our service. This third-party information supplements the data we collect directly and helps us provide a more complete and integrated experience.</p>

                            <p>When you subscribe to a paid Noxtm plan and make a payment, we work with third-party payment processing services to securely handle your payment information and process transactions. These payment processors provide us with certain transaction information that we need to manage your subscription and maintain accurate billing records. Specifically, we receive unique transaction identifiers that allow us to track and reference specific payment events, the payment status indicating whether a transaction was successful, failed, or is still pending processing, the exact payment amount and the currency in which it was denominated, and general information about the payment method type you used, such as whether you paid with a Visa card, a Mastercard, or another payment method, though as mentioned earlier we deliberately do not receive or store your full credit card number or other highly sensitive payment credentials. This information from payment processors is essential for confirming that your subscription payments have been received, for crediting your account appropriately, for generating accurate invoices, and for providing customer support related to billing issues.</p>

                            <p>As discussed in the earlier section about information you provide directly, if you use the Botgit Chrome Extension to import contact information from LinkedIn or potentially other sources in the future, that extension facilitates the transfer of data from those third-party platforms into Noxtm. The data you import through Botgit becomes part of your Noxtm account and is thereafter governed by this Privacy Policy, but the initial collection of that data from the third-party source is subject to that source's terms of service and privacy policy, and you are responsible for ensuring your use of such tools complies with all applicable requirements and restrictions.</p>

                            <p>Looking toward future features we may implement, if we add support for OAuth-based authentication or single sign-on capabilities that would allow you to log in to Noxtm using credentials from third-party identity providers such as Google, Microsoft, Apple, or others, we would receive certain basic profile information from those providers when you choose to use that authentication method. This would typically include your name as registered with that provider, your email address, and possibly your profile picture, which we would use to create or populate your Noxtm account. We would also receive verification from the identity provider that your account with them has been confirmed as authentic, which helps us prevent fake accounts and improve security. Any such OAuth or single sign-on integration would be entirely optional, and you would always have the choice to use traditional email and password authentication if you prefer not to connect third-party accounts.</p>
                        </section>

                        <section>
                            <h2>COOKIES AND TRACKING TECHNOLOGIES</h2>
                            <p>Like virtually all modern web applications, Noxtm uses cookies and similar tracking technologies to enable essential functionality, improve your user experience, understand how our service is being used, and enhance security. A cookie is a small text file that is stored on your device by your web browser when you visit a website, and that can be read by the website on subsequent visits to remember information about you or your preferences. We want to provide you with a clear explanation of what cookies we use, why we use them, and what control you have over them.</p>

                            <p>We use several different categories of cookies, each serving a distinct purpose. First and most importantly, we use essential cookies that are absolutely necessary for the Noxtm Platform to function properly. These essential cookies include authentication cookies that maintain your logged-in session and remember who you are as you navigate through different pages of the application, without which you would have to log in again every time you clicked on a new link or accessed a new feature. They include session management cookies that keep track of your current session state and ensure that your interactions with the application are properly coordinated and maintained. They also include security cookies that help us detect and prevent fraudulent activity, cross-site request forgery attacks, and other security threats that could compromise your account or our systems. Essential cookies cannot be disabled if you want to use Noxtm, because the platform simply cannot function without them, but we want to assure you that these essential cookies are strictly limited to what is technically necessary and do not track you across other websites or collect information for advertising or other non-essential purposes.</p>

                            <p>We also use functional cookies that are not strictly essential for basic operation but that significantly enhance your user experience by remembering your preferences and settings. Functional cookies might store information about your preferred language or locale, your chosen theme or interface customization options, your notification preferences, the size and position of resizable interface panels, which sections of the interface you have expanded or collapsed, and other settings that you have configured to personalize your experience. These functional cookies ensure that when you return to Noxtm, the application appears and behaves the way you have configured it, rather than resetting to default settings every time. While functional cookies are not absolutely essential, they make the platform much more pleasant and efficient to use, and we believe most users would find the experience frustrating without them. However, if you disable functional cookies through your browser settings, the core functionality of Noxtm will still work—you just may have to reconfigure your preferences more frequently.</p>

                            <p>To help us understand how users interact with Noxtm and identify opportunities for improvement, we use analytics cookies that collect aggregated, anonymized information about usage patterns across our user base. Analytics cookies help us answer questions like which features are used most frequently and which are rarely accessed, where users spend the most time in the application, which pages or flows have high abandonment rates that might indicate usability problems, which buttons or links get clicked most often, and how users typically navigate through the application. The information collected by analytics cookies is used exclusively for internal analysis and product improvement purposes—we do not sell this analytics data to third parties, and we take steps to anonymize and aggregate the data so that it cannot be used to identify individual users. However, we understand that some users may prefer not to have their usage tracked even in aggregate form, and you can opt out of analytics cookies either through your browser settings or through any cookie preference controls we may provide within the Noxtm interface.</p>

                            <p>Finally, we use security cookies specifically designed to protect your account and our platform from various security threats. Security cookies help us detect unusual patterns of behavior that might indicate a compromised account, such as login attempts from geographically distant locations in rapid succession. They help us implement rate limiting to prevent brute-force attacks where someone tries to guess passwords or verification codes through repeated automated attempts. They help us detect and prevent cross-site request forgery attacks where a malicious website tries to trick your browser into performing unwanted actions on Noxtm while you are logged in. They also help us identify potential bot activity or other automated abuse of our services. Security cookies are essential for maintaining the integrity and safety of our platform, and we strongly recommend leaving them enabled to protect your account.</p>

                            <p>We want to be transparent about the fact that in addition to cookies that we set directly (called first-party cookies), there may be situations where cookies are set by third-party services that we integrate with our platform, such as analytics providers, payment processors, or other service providers. However, we are selective about which third-party services we integrate, we review their privacy practices before integrating them, and we configure these integrations to minimize third-party tracking to the extent possible while still enabling the functionality we need. We do not use third-party advertising networks or allow third parties to track you across websites for advertising purposes through our platform.</p>

                            <p>You have significant control over cookies through your web browser settings. All modern browsers allow you to view what cookies are stored, delete existing cookies, and block future cookies either entirely or selectively. However, please be aware that if you choose to disable or block cookies, particularly essential cookies, parts of the Noxtm Platform may not function properly or at all. We recommend leaving at least essential and security cookies enabled to ensure you can use Noxtm effectively and securely, while making your own informed decisions about whether to allow functional and analytics cookies based on your personal preferences regarding convenience versus privacy.</p>
                        </section>

                        <section>
                            <h2>HOW WE USE YOUR INFORMATION</h2>
                            <p>Now that we have explained what information we collect, it is equally important to explain how we actually use that information. We want to be completely transparent about our purposes for processing your data, and we want to assure you that we use your information only for legitimate purposes that are directly related to providing, improving, and securing our service, and that we do not sell your personal information to third parties or use it for unrelated commercial purposes without your consent.</p>

                            <p>The primary and most fundamental purpose for which we use your information is to provide you with the Noxtm Platform and all of its features and functionality. This means using your account credentials to authenticate you when you log in and verify that you are who you claim to be. It means using your profile information to personalize your experience and display your identity to other users when you collaborate. It means using the content you create—whether messages, emails, blog posts, project data, or other business information—to store that content securely and display it back to you when you need to access it. It means using your company and team information to organize your workspace, manage permissions, and enable collaboration among your team members. It means using your subscription information to determine which features you have access to and to ensure you can use all the capabilities included in your chosen plan. In short, every piece of information you provide or we collect is used, first and foremost, to make the Noxtm Platform work the way you expect it to work and to deliver the value you are paying for (or receiving for free in the case of our SoloHQ plan).</p>

                            <p>Beyond simply providing the existing functionality, we use your information to actively improve and enhance the Noxtm Platform over time. We analyze usage data to understand which features are most valuable to users, which features might be confusing or underutilized, and where there are opportunities to add new capabilities that would address unmet needs. We study navigation patterns and click behavior to identify parts of our interface that could be made more intuitive or efficient. We review error logs and support tickets to identify bugs that need to be fixed and pain points that need to be addressed. We monitor performance metrics to ensure our infrastructure is scaling properly and delivering fast, reliable service to all users regardless of where they are located. We aggregate and anonymize data to identify trends and insights that inform our product development roadmap. All of this analysis and improvement work is done with the goal of making Noxtm better for everyone, and your usage data contributes to that continuous improvement process.</p>

                            <p>We use your contact information, particularly your email address, to communicate with you about your account and our service in various important ways. We send you transactional emails that are directly related to actions you have taken or events affecting your account, such as email verification messages when you sign up, password reset instructions when you request them, confirmation emails when you change important account settings, notifications when your subscription payment is processed or when a payment fails, and alerts when there are important changes to your account status. We send you service-related announcements about new features we have added, improvements we have made, scheduled maintenance windows that might affect availability, and other operational updates that help you stay informed about the platform you are using. If you opt in to receive them, we may also send you educational content, tips for getting more value from Noxtm, blog post notifications, and other non-essential communications, though you can always unsubscribe from these optional emails while continuing to receive essential transactional and service messages that are necessary for account management.</p>

                            <p>Security is a top priority for us, and we use various types of information we collect to protect your account and our platform from threats. We analyze login patterns and IP addresses to detect suspicious activity such as login attempts from unusual locations, multiple failed password attempts that might indicate a brute-force attack, or simultaneous access from geographically distant locations that could indicate a compromised account. When we detect such suspicious activity, we may temporarily lock your account, require additional verification, or alert you via email so you can take appropriate action. We use behavioral analysis to identify patterns that might indicate automated bot activity, account takeover attempts, or other abuse of our services. We implement rate limiting based on IP addresses and user identifiers to prevent denial-of-service attacks and other forms of abuse. We monitor for unusual data access patterns that might indicate unauthorized access to sensitive information. We maintain security logs that create an audit trail we can investigate if a security incident occurs. All of these security measures rely on the information we collect, and they are essential for keeping your data safe and maintaining the integrity of our platform.</p>

                            <p>We use aggregated, anonymized information derived from our user base for research and analysis purposes that help us understand broader trends and make strategic decisions about our business. For example, we might analyze which industries are adopting Noxtm most rapidly, what company sizes are most represented in our customer base, which geographic regions are showing the strongest growth, how usage patterns differ between subscription tiers, and how users in different segments interact with various features. This kind of aggregate analysis helps us make informed decisions about marketing investments, feature prioritization, infrastructure scaling, support staffing, and overall business strategy. It is important to emphasize that this research uses only aggregated, anonymized data—we do not share individual user data externally for research purposes, and the insights we derive cannot be traced back to any specific individual or organization.</p>

                            <p>When you contact our customer support team for assistance, we use the information you provide, along with your account information and relevant technical data, to diagnose your issue, provide helpful responses, and resolve problems you are experiencing. Support agents may need to access your account information, review your usage logs, examine error messages or diagnostic data, and look at relevant content or settings to understand the context of your issue and provide accurate assistance. All support interactions are handled with strict confidentiality, and support staff are trained to access only the minimum information necessary to address your specific issue. We also retain support interaction history so that if you contact us again in the future, we can provide more informed assistance based on the context of previous interactions and avoid asking you to repeat information you have already provided.</p>

                            <p>As a business operating in multiple jurisdictions and serving users around the world, we have various legal and regulatory obligations that require us to collect, maintain, and sometimes disclose certain information. We use your information to comply with these legal obligations, which may include responding to valid legal process such as subpoenas or court orders, providing information to law enforcement when required by law, complying with tax regulations that require us to maintain records of transactions and issue tax documents, adhering to data protection laws like GDPR and CCPA that impose specific requirements on how we handle personal data, fulfilling audit and accounting requirements, and cooperating with regulatory investigations when legally obligated to do so. We take these legal obligations seriously, but we also advocate for user privacy and will resist overly broad or inappropriate requests for user data to the extent legally permissible.</p>

                            <p>If Noxtm is involved in a business transaction such as a merger, acquisition, sale of assets, or bankruptcy proceeding, we may need to transfer user information as part of that transaction. In such situations, we would use and disclose your information as necessary to facilitate the transaction, conduct due diligence, and transition services to the acquiring entity. However, we would require any acquiring company to honor the commitments made in this Privacy Policy, and we would provide notice to affected users about the change of control and any new privacy practices that might apply going forward.</p>

                            <p>Finally, we want to emphasize an important limitation on how we use your information: we do not sell your personal data to third parties for their marketing purposes, we do not allow third-party advertisers to track you through our platform, and we do not use your sensitive business data for any purpose unrelated to providing and improving our service. Your information is valuable to us specifically because it allows us to serve you better, not because we can monetize it through third-party sales. Our business model is based on providing valuable software that users are willing to pay for, not on exploiting user data for advertising revenue, and we are committed to maintaining that trust-based relationship with our users.</p>
                        </section>

                        <section>
                            <h2>HOW WE SHARE YOUR INFORMATION</h2>
                            <p>While we do not sell your personal information, there are specific, limited circumstances in which we share certain information with third parties. We want to be completely transparent about these information-sharing practices, who we share with, why we share, and what protections are in place to ensure your information remains secure even when shared.</p>

                            <p>First and most obviously, when you use Noxtm as part of a company or organization, the information you create and store within that company's workspace is inherently shared with other members of that organization who have appropriate permissions. When you send messages in group conversations, all participants in those conversations can view the message content and associated metadata. When you create company-wide content such as projects, documents, or blog posts, other team members with access to those resources can view and potentially edit that content depending on their permissions. Company administrators and owners have access to comprehensive information about the company workspace, including the ability to view member lists, access settings and configurations, review usage logs, and potentially access content created by team members. This kind of sharing is fundamental to how collaboration platforms work, but we want you to be fully aware that using Noxtm in a company context means your activity and content may be visible to your colleagues and supervisors in ways that would not apply if you were using a personal account in isolation.</p>

                            <p>We engage various third-party service providers to help us operate our business and deliver the Noxtm Platform. These service providers may have access to certain user information to the extent necessary to perform their specific functions on our behalf. This includes cloud infrastructure providers who host our servers and store our data, and who necessarily have access to all data stored on their systems though they are contractually prohibited from accessing or using it for any purpose other than providing hosting services to us. It includes payment processing companies who handle credit card transactions and subscription billing, and who receive the payment information necessary to process your transactions though as mentioned earlier we minimize this by using tokenization and not sending full card numbers ourselves. It includes email delivery services that help us send transactional and service emails to users, and who receive recipient email addresses and message content for emails we send through their infrastructure. It includes analytics and monitoring services that help us track platform performance and usage patterns, and who may receive anonymized or aggregated usage data. It includes customer support tools that our support team uses to manage and respond to user inquiries, and which necessarily contain the content of support tickets and related account information. And it may include other specialized service providers for specific functions like data backup, security scanning, fraud prevention, or other technical capabilities we need to operate a robust platform.</p>

                            <p>We want to emphasize that we are very selective about which service providers we work with, we review their security and privacy practices before engaging them, we enter into contractual agreements that require them to protect user information and use it only for the specific purposes for which we have engaged them, and we limit their access to the minimum information necessary for them to perform their designated functions. We do not give service providers carte blanche access to user data, and we hold them to high standards of data protection that are consistent with our own commitments to user privacy.</p>

                            <p>As mentioned in the previous section, we may share aggregated, anonymized information that cannot be used to identify individual users or specific organizations with third parties for various research, analysis, or business purposes. For example, we might share aggregate statistics about platform usage, growth trends, or feature adoption with investors, potential business partners, or the press. We might publish general research findings based on anonymized user data to contribute to industry knowledge or demonstrate thought leadership. Because this information is truly anonymous and cannot be traced back to any individual, we do not consider it to be personal information subject to the same restrictions as identifiable data, but we want to disclose this practice for the sake of complete transparency.</p>

                            <p>In certain situations, we may be legally required to disclose user information to government authorities, law enforcement agencies, or other third parties. This includes situations where we receive a valid subpoena, court order, or search warrant that compels disclosure of specific user information as part of a legal investigation or proceeding. It includes situations where we have a good-faith belief that disclosure is necessary to prevent imminent harm to individuals, such as if we become aware of a credible threat of violence or child exploitation. It includes situations where disclosure is necessary to protect our own legal rights, such as defending against a lawsuit or enforcing our Terms of Service. And it includes situations where we are required by tax authorities or regulatory agencies to provide information for compliance or audit purposes. We want to be clear that we do not voluntarily hand over user data to authorities—we require valid legal process, we carefully review requests to ensure they are legitimate and appropriately scoped, we disclose only the specific information that is legally required and not more, and we notify affected users about disclosures when legally permitted to do so and when we believe such notice is appropriate. We believe in transparency around government requests, and if legally permissible we publish transparency reports detailing the number and types of requests we receive and how we respond to them.</p>

                            <p>If Noxtm undergoes a business transaction such as a merger with or acquisition by another company, a sale of substantial assets, a financing round, or bankruptcy proceedings, user information may be among the assets transferred to or acquired by the other party. In such situations, we would provide notice to affected users about the transfer of their information, the identity of the new controlling party, and any choices they might have regarding their information. We would also require the acquiring entity to continue honoring the privacy commitments made in this Privacy Policy, at least for a reasonable transition period, to ensure users are not caught off guard by sudden changes to privacy practices.</p>

                            <p>With your explicit consent, we may share your information in additional ways beyond those described above. For example, if we develop a partner integration ecosystem where third-party applications can connect to Noxtm with your permission, you might choose to authorize specific third-party apps to access certain of your Noxtm data for purposes like advanced analytics, specialized integrations, or extended functionality. Any such sharing would be subject to your explicit opt-in consent, and we would provide clear information about what data the third party would receive and how they intend to use it so you can make an informed decision about whether to authorize the integration. You would always have the ability to revoke such access if you later decide you no longer want to share your information with that third party.</p>

                            <p>Finally, we want to reiterate what we do not do with your information: we do not sell your personal data to data brokers, marketing companies, advertisers, or other third parties who would use it for their own commercial purposes unrelated to providing you with the Noxtm service. We do not participate in advertising networks that track users across multiple websites to build behavioral advertising profiles. We do not rent our user email list to companies who want to send marketing messages to our users. Your trust is far more valuable to us than any revenue we might generate from such practices, and we are committed to keeping your information secure and using it only in ways that directly benefit you and our platform.</p>
                        </section>

                        <section>
                            <h2>DATA RETENTION AND DELETION</h2>
                            <p>We believe that we should retain user information only for as long as it serves a legitimate purpose, and that users should have clear information about how long we keep their data and how they can request deletion when they no longer want us to retain it. This section explains our data retention policies and practices in detail.</p>

                            <p>For active accounts where users continue to use the Noxtm Platform, we retain your account information, profile data, and content you have created indefinitely for as long as your account remains active and in good standing. This is necessary because the entire purpose of our service is to provide you with a persistent platform where you can store your business data, access it whenever you need it, and build up a comprehensive repository of your business information over time. If we deleted your data while you were still actively using the service, it would defeat the entire purpose of the platform. However, you maintain control over your own content and can delete specific messages, blog posts, projects, or other content items at any time through the normal interface, and those deletions are typically processed immediately (though as explained below, we may retain deleted content in backups for a limited period).</p>

                            <p>When you delete specific content items such as messages, files, or blog posts, we typically implement a soft delete process where the content is marked as deleted and hidden from view, but remains in our database for a period of time before being permanently removed. This retention of deleted content serves several purposes: it enables us to provide a recovery feature in case you accidentally deleted something and want to restore it, it maintains the integrity of conversation threads and audit trails where removing messages entirely would create confusing gaps, and it helps us comply with legal data retention requirements that may prohibit immediate destruction of certain records. Depending on the type of content and the specific circumstances, soft-deleted content may be retained for a period ranging from thirty days to ninety days before being permanently purged from our systems. During this soft-delete retention period, you can typically recover deleted content through account settings or by contacting our support team, but after the retention period expires and the content is permanently deleted, recovery is no longer possible.</p>

                            <p>If you decide to completely close your Noxtm account, we provide a mechanism for you to request full account deletion. When you submit an account deletion request, we begin a process to remove your personal information from our active systems. However, this deletion process is not instantaneous, and there are several important caveats and limitations you should understand. First, when you delete your account, we typically retain your data in a deactivated state for thirty days before beginning permanent deletion. This thirty-day grace period is designed to protect you from accidental or impulsive deletion—if you realize within thirty days that you actually want to keep your account, you can contact us and we can restore it along with all your data. After the thirty-day grace period expires, we begin the process of permanently deleting your data from our production systems, but even then, complete deletion is not immediate for technical and practical reasons.</p>

                            <p>Specifically, data that has been deleted from our primary production databases may continue to exist in backup systems for up to ninety days. We maintain regular backups of our entire database to protect against data loss from system failures, disasters, or catastrophic errors, and these backups are retained for ninety days before being rotated out and destroyed. Because it is not technically feasible to remove individual user records from already-created backups without compromising the integrity and recoverability of those backups, your data may persist in these backup systems for up to ninety days after it is deleted from production. However, this backed-up data is not accessible through normal operations and will only be restored in the event of a catastrophic system failure requiring us to restore from backups, which is an extremely rare occurrence. Once backups containing your data age beyond the ninety-day retention window and are destroyed, your information is fully and permanently removed from all our systems.</p>

                            <p>There are certain categories of information that we may retain even after account deletion for legitimate legal, financial, or security reasons. Financial and transaction records, including information about payments you have made, invoices we have issued, and subscription history, may be retained indefinitely for accounting, tax compliance, and audit purposes, as we are legally required to maintain financial records for specified periods that may extend for several years. Information related to violations of our Terms of Service, security incidents, fraud, or abuse may be retained to protect our platform and other users from repeated violations by the same individuals—for example, if an account was terminated for fraudulent activity, we may retain identifying information to prevent that individual from creating new accounts and continuing their fraudulent behavior. Aggregate, anonymized data derived from your account that no longer identifies you personally may be retained indefinitely for research and analytical purposes. And information that we are legally obligated to retain due to pending legal proceedings, regulatory investigations, or valid preservation requests from law enforcement will be retained for as long as legally required, even if you have requested deletion.</p>

                            <p>For accounts that become inactive—meaning you stop logging in and using the service but do not explicitly request deletion—we do not automatically delete your data after a specific period of inactivity. We recognize that many users may go through periods where they do not actively use Noxtm, and we do not want to delete valuable business data simply because you have not logged in recently. However, if an account remains inactive for an extremely long period, such as several years, and especially if it is a free account that is not generating subscription revenue, we reserve the right to eventually archive or delete that account after providing reasonable notice to the email address on file. This ensures we are not maintaining infrastructure and storage costs indefinitely for accounts that have been effectively abandoned, while still protecting active and paying users from unexpected data loss.</p>

                            <p>For specific types of data governed by special retention requirements, we follow industry standards and legal obligations. Log files are typically retained for ninety days to six months depending on the type of log, balancing the need for security analysis and troubleshooting against the privacy interest in not retaining detailed activity records indefinitely. Email verification codes and password reset tokens are automatically deleted immediately after successful use or after expiration (ten minutes), whichever comes first, as they have no value after serving their immediate purpose. Session tokens and authentication cookies expire and are automatically cleaned up according to their defined lifetimes, typically twenty-four hours for JWT tokens. Invitation tokens for joining companies expire after seven days and are then purged from the system. And credit card information (to the limited extent we store it at all, which is primarily in tokenized form) is retained only as long as necessary for the subscription relationship and is deleted promptly after a subscription is cancelled and all potential chargebacks or disputes have been resolved.</p>

                            <p>We want to emphasize that data retention and deletion is a complex technical and legal issue, and complete instantaneous deletion of all traces of information from all systems is not always technically feasible or legally permissible. However, we are committed to deleting or anonymizing user information that we no longer have a legitimate reason to retain, to being transparent about our retention practices and limitations, and to respecting user deletion requests to the fullest extent possible within the constraints of technical feasibility and legal compliance. If you have specific questions about what happens to particular types of data after deletion, or if you want to request deletion of specific information, we encourage you to contact our privacy team at privacy@noxtm.com for detailed assistance.</p>
                        </section>

                        <section>
                            <h2>HOW WE PROTECT YOUR INFORMATION</h2>
                            <p>The security of your information is of paramount importance to us, and we have implemented comprehensive technical, physical, and organizational safeguards to protect your data from unauthorized access, disclosure, alteration, and destruction. While no system can ever be perfectly secure and we cannot guarantee absolute security, we employ industry-standard and often industry-leading security measures to minimize risks and protect your sensitive business data and personal information.</p>

                            <p>All data transmitted between your browser or device and our servers is encrypted in transit using Transport Layer Security, commonly known as TLS, which is the same encryption protocol used by banks and other security-sensitive services. This encryption ensures that even if someone intercepts the data while it is traveling across the internet, they cannot read or tamper with it because it is scrambled into an unreadable format without the proper cryptographic keys. We enforce HTTPS connections for all access to the Noxtm Platform, meaning you cannot accidentally use an unencrypted connection that would leave your data vulnerable to interception. We use strong modern cipher suites and keep our TLS configuration up to date with current security best practices, regularly reviewing and updating our encryption settings as new vulnerabilities are discovered and new stronger algorithms become available.</p>

                            <p>In addition to encrypting data in transit, we also protect sensitive data at rest through encryption of our database systems and storage infrastructure. This means that even if someone were to physically steal a hard drive from our data center or gain unauthorized access to the underlying storage systems, they would not be able to read the encrypted data without the proper decryption keys, which are carefully managed and separated from the data itself. Particularly sensitive information such as passwords and email account credentials is subject to additional layers of protection beyond database encryption—as mentioned earlier, all passwords are individually hashed using the bcrypt algorithm with unique salt values before being stored, meaning we never store your actual password in a recoverable form, and even our own engineers and administrators cannot view your password. When you log in, we hash the password you enter and compare it to the stored hash—if they match, you are authenticated, but we never decrypt the stored password because it is cryptographically one-way.</p>

                            <p>Our application infrastructure is built with security in mind from the ground up. We implement robust access controls that ensure each user can only access data they are authorized to see, based on their account permissions and company memberships. When you make a request to our API, we validate your authentication token to confirm your identity, check your permissions to ensure you are authorized to perform the requested action, and filter the results to include only data you should have access to, preventing unauthorized access to other users' information or company data you are not a member of. We use parameterized database queries and prepared statements throughout our codebase to prevent SQL injection attacks, which are a common technique malicious actors use to manipulate database queries and gain unauthorized access to data. We implement rate limiting on our API endpoints and authentication systems to prevent brute-force attacks where someone tries to guess passwords or verification codes through repeated automated attempts. We validate and sanitize all user input to prevent cross-site scripting attacks, code injection, and other input-based vulnerabilities.</p>

                            <p>We maintain strict physical security controls around our infrastructure. While Noxtm uses cloud hosting providers for our primary infrastructure, we select providers that maintain highly secure data centers with comprehensive physical security measures including perimeter fencing, security personnel, video surveillance, biometric access controls, environmental monitoring, redundant power and cooling systems, and disaster recovery capabilities. These data centers are certified to rigorous security standards such as SOC 2, ISO 27001, and others that verify they maintain appropriate security controls. Our own offices and facilities also maintain appropriate physical security to protect any equipment or backup media that might contain user data.</p>

                            <p>From an organizational security perspective, we implement strict internal policies and procedures to protect user data from insider threats and human error. Access to production systems and user data is restricted to a limited number of authorized personnel who require such access to perform their job functions, and is granted on a least-privilege basis meaning employees only have access to the specific systems and data they need for their role, not carte blanche access to everything. All production access is logged and monitored so we have an audit trail of who accessed what systems when. Employees with access to sensitive systems and data undergo background checks as appropriate to their level of access and region, receive comprehensive security training to ensure they understand their responsibilities and the importance of protecting user data, and are bound by strict confidentiality agreements that legally prohibit unauthorized disclosure of user information. We implement separation of duties and require multiple approvals for sensitive operations like deploying code changes to production or accessing user data for support purposes, preventing any single individual from having unchecked control.</p>

                            <p>We actively monitor our systems for security threats and anomalies through comprehensive logging, intrusion detection systems, and security information and event management tools that aggregate and analyze security data from across our infrastructure. We monitor for unusual patterns that might indicate a security breach such as unexpected spikes in traffic that could indicate a denial-of-service attack, unusual data access patterns that might indicate a compromised account or insider threat, failed login attempts from unusual locations, or known attack signatures that match common hacking techniques. When potential security incidents are detected, they trigger alerts that are immediately investigated by our security team, and we have established incident response procedures to quickly contain, investigate, and remediate security breaches if they occur.</p>

                            <p>We conduct regular security assessments and testing to proactively identify and fix vulnerabilities before they can be exploited by malicious actors. This includes regular vulnerability scanning of our infrastructure and applications to identify known security issues, periodic penetration testing where we engage ethical hackers to attempt to break into our systems and identify weaknesses, security code reviews where experienced engineers examine our codebase looking for security flaws, and ongoing monitoring of security advisories and threat intelligence to stay informed about new vulnerabilities and attack techniques that might affect our platform. When security vulnerabilities are identified through these assessments or through external reports, we prioritize fixing them based on their severity and potential impact, with critical vulnerabilities addressed as emergencies often within hours or days.</p>

                            <p>We encourage security researchers and users who discover potential security vulnerabilities in Noxtm to report them to us responsibly rather than exploiting them or disclosing them publicly. We maintain a security contact email where vulnerabilities can be reported confidentially, we commit to responding promptly to credible vulnerability reports, and we work cooperatively with researchers to understand, validate, and fix reported issues. While we do not currently have a formal bug bounty program, we recognize and appreciate responsible security research and may offer recognition or rewards for particularly impactful vulnerability reports at our discretion.</p>

                            <p>Despite all these security measures, we must acknowledge that no security system is impenetrable, and determined and sophisticated attackers with sufficient resources may potentially find ways to compromise even well-secured systems. In the unlikely event that we experience a data breach that compromises user information, we have established procedures to respond quickly and appropriately. This includes immediately working to contain the breach and prevent further unauthorized access, conducting a thorough investigation to determine what happened, what data was affected, and how many users are impacted, notifying affected users promptly via email and through prominent notices in the application, providing clear information about what data was compromised and what steps users should take to protect themselves, working with law enforcement and security experts to investigate the breach and pursue the perpetrators, and implementing additional security measures to prevent similar breaches in the future. We also comply with all applicable data breach notification laws, which in many jurisdictions require us to notify affected individuals and regulatory authorities within specific time frames when personal data is compromised.</p>

                            <p>While we invest heavily in security and do everything we can to protect your information, users also play a critical role in security, and there are important steps you should take to protect your own account. You should choose a strong, unique password for your Noxtm account that is not used for any other service, as password reuse is one of the most common ways accounts are compromised. You should never share your password with anyone, including colleagues, support staff, or people claiming to be from Noxtm—we will never ask you for your password. You should be cautious about accessing Noxtm from public or shared computers, and if you do, you should always log out completely when you are finished. You should keep your email account secure, since it is the primary recovery mechanism for your Noxtm account and someone who compromises your email could potentially reset your Noxtm password. You should review your account activity regularly and report any suspicious activity to our support team immediately. And you should keep your browser and operating system up to date with the latest security patches to protect against vulnerabilities that could be exploited to steal your credentials or session tokens.</p>

                            <p>By working together—with us implementing robust security measures on our end and you following security best practices on your end—we can maintain a highly secure platform that protects your valuable business data and personal information from the wide range of threats that exist in today's digital landscape.</p>
                        </section>

                        <section>
                            <h2>YOUR PRIVACY RIGHTS AND CHOICES</h2>
                            <p>We believe that you should have meaningful control over your personal information, and depending on where you are located and which data protection laws apply to you, you may have various legal rights regarding how your information is collected, used, and managed. This section explains the rights you may have and how you can exercise them.</p>

                            <p>Regardless of your location, all Noxtm users have certain basic rights and controls over their information. You have the right to access your own data through the Noxtm Platform—all of your account information, profile details, messages, emails, blog posts, and other content is readily accessible to you through the normal interface, and you can view, download, or export your data at any time. You have the right to update or correct your information if it is inaccurate or incomplete—you can edit your profile information, update your company details, modify your settings and preferences, and change or delete content you have created whenever you wish through the normal application interface. You have the right to delete specific content you have created, such as individual messages, blog posts, or files, through the normal deletion features provided in the interface. You have the right to close your account entirely if you decide you no longer want to use Noxtm, which you can do through your account settings or by contacting our support team to request account deletion.</p>

                            <p>You have control over certain communications you receive from us. While we need to send you essential transactional and service-related emails for account management and security purposes—and these cannot be opt out of while maintaining an active account—you can unsubscribe from optional marketing emails, newsletters, promotional communications, and other non-essential messages using the unsubscribe link included in such emails or by adjusting your communication preferences in your account settings. You also have some control over how we use cookies and tracking technologies through your browser settings, as explained in the earlier section on cookies.</p>

                            <p>For users located in the European Union or European Economic Area, the General Data Protection Regulation, commonly known as GDPR, provides you with enhanced privacy rights that go beyond the basic controls available to all users. Under GDPR, you have the right to request access to all personal data we hold about you in a structured, commonly used, and machine-readable format, often called a data subject access request. While most of your data is already accessible through the normal Noxtm interface, if you want a comprehensive export of all data we hold about you including log files and metadata that is not normally user-accessible, you can submit a formal access request to our privacy team and we will provide this information within the legally required time frame of thirty days.</p>

                            <p>Under GDPR, you have the right to request that we correct any inaccurate or incomplete personal data we hold about you. While you can make most corrections yourself through the normal interface, if you identify inaccurate data that you cannot correct yourself or if you believe we hold inaccurate information in our backend systems that is not accessible to you, you can submit a correction request and we will investigate and rectify any inaccuracies we confirm. You have the right to request erasure of your personal data, sometimes called the right to be forgotten, which allows you to ask us to delete your information in certain circumstances such as when it is no longer necessary for the purposes for which we collected it, when you withdraw consent that was the legal basis for processing, when you object to processing and we have no overriding legitimate grounds to continue, or when we have processed your data unlawfully. However, this right is not absolute, and we may be required or permitted to retain certain information for legal compliance, to establish or defend legal claims, or for other legitimate purposes specified in GDPR.</p>

                            <p>You have the right under GDPR to request restriction of processing in certain circumstances, which means that while we still store your data, we do not actively use or process it except in limited ways such as with your consent or for legal claims. This might be appropriate if you are contesting the accuracy of data while we verify it, if you have objected to processing while we determine whether our legitimate interests override yours, or if you need us to retain data for legal purposes even though we would otherwise delete it. You have the right to data portability, which allows you to receive your personal data in a structured, commonly used, machine-readable format and to transmit it to another service provider, facilitating your ability to switch between services without being locked in due to data accessibility barriers. We provide data export functionality to support this right.</p>

                            <p>You have the right under GDPR to object to processing of your personal data in certain situations, particularly processing based on legitimate interests or processing for direct marketing purposes. If you object to processing, we must stop processing your data unless we can demonstrate compelling legitimate grounds for continuing that override your interests, rights, and freedoms, or unless the processing is necessary for legal claims. For direct marketing specifically, you have an absolute right to object, and we must stop such processing immediately upon receiving your objection. Additionally, to the extent that we process your data based on your consent as the legal basis (though much of our processing is based on other legal bases such as contract performance or legitimate interests), you have the right to withdraw that consent at any time, though withdrawal of consent does not affect the lawfulness of processing that occurred before the withdrawal.</p>

                            <p>Finally, GDPR gives you the right to lodge a complaint with a supervisory authority, which is the data protection regulatory agency in your EU member state, if you believe we are processing your personal data in violation of GDPR. While we encourage you to contact us first to try to resolve any concerns directly, you have an absolute right to raise complaints with the appropriate supervisory authority, and we will cooperate fully with any regulatory investigations.</p>

                            <p>For users who are California residents, the California Consumer Privacy Act, known as CCPA, and its successor the California Privacy Rights Act, known as CPRA, provide you with specific privacy rights similar to but not identical to GDPR rights. Under CCPA and CPRA, you have the right to know what personal information we have collected about you over the past twelve months, including the categories of information collected, the categories of sources from which it was collected, the business or commercial purposes for which it was collected, and the categories of third parties with whom we have shared it. You can submit a request to know, and we will provide this information within forty-five days (extendable once by forty-five additional days if necessary).</p>

                            <p>You have the right under California law to request deletion of personal information we have collected from you, subject to certain exceptions such as information we need to complete the transaction for which it was collected, to detect and resolve security incidents, to comply with legal obligations, or for other specified purposes. You have the right to opt out of the sale of your personal information—though as we have stated clearly, we do not sell personal information, so this right is not directly applicable to Noxtm's practices, but we want to confirm that you do have this right and that we respect the principle behind it. You have the right to non-discrimination, meaning we cannot deny you goods or services, charge you different prices, or provide you with a different level or quality of service because you exercised any of your CCPA or CPRA privacy rights. Under CPRA, which became effective in 2023, you also have the right to correct inaccurate personal information and the right to limit the use and disclosure of sensitive personal information for purposes beyond what is necessary to provide the services you requested.</p>

                            <p>To exercise any of these privacy rights, whether under GDPR, CCPA, CPRA, or other applicable laws, you can contact our privacy team at privacy@noxtm.com with your request. Please include sufficient information to allow us to verify your identity and understand your request, such as the email address associated with your account, your full name, and a clear description of what right you wish to exercise and what action you want us to take. We may need to ask for additional verification information to confirm your identity before fulfilling requests, as we need to ensure we are not disclosing your personal information to the wrong person or making changes to your account based on fraudulent requests. We will respond to verified requests within the time frames required by applicable law, generally thirty days for GDPR requests and forty-five days for CCPA requests, though complex requests may require additional time and we will notify you if an extension is needed.</p>

                            <p>We do not charge fees for reasonable requests to exercise your privacy rights, but if you make clearly excessive, repetitive, or unfounded requests, we may charge a reasonable administrative fee or refuse to fulfill the request as permitted by law. We encourage you to exercise your rights responsibly and to contact us with any questions or concerns about your privacy before they escalate to formal complaints or legal actions—in most cases, we can address your concerns cooperatively through direct communication.</p>
                        </section>

                        <section>
                            <h2>INTERNATIONAL DATA TRANSFERS AND GLOBAL OPERATIONS</h2>
                            <p>Noxtm operates as a global service with users located around the world, and our technical infrastructure spans multiple countries and regions. This means that your personal information may be transferred to, stored in, and processed in countries other than the one in which you reside, including countries that may have different data protection laws than your home jurisdiction. This section explains how we handle international data transfers and what protections are in place to ensure your information remains secure regardless of where it is physically processed.</p>

                            <p>Our primary infrastructure is currently hosted with major cloud service providers that operate data centers in multiple geographic regions including the United States, Europe, and potentially Asia-Pacific depending on our infrastructure choices and scaling needs. When you create a Noxtm account and use our services, your data may be stored and processed in one or more of these regions depending on factors such as where you are geographically located, which data center region has the best performance characteristics for serving you, and where we have provisioned our database and application servers. We strive to select data center locations strategically to provide good performance to users worldwide while maintaining strong security and privacy protections.</p>

                            <p>If you are located in the European Union or European Economic Area, we recognize that transfers of your personal data to countries outside the EU or EEA, particularly to the United States, raise special considerations under GDPR. GDPR generally prohibits transfers of personal data to third countries that the European Commission has not deemed to provide an adequate level of data protection, unless specific safeguards are in place. To ensure that transfers of EU and EEA user data to other jurisdictions comply with GDPR, we implement appropriate safeguards which may include relying on the European Commission's adequacy decisions for countries that have been deemed to provide adequate protection, using Standard Contractual Clauses approved by the European Commission which are legally binding commitments between data exporters and importers to protect transferred data, and implementing supplementary technical and organizational measures beyond contractual commitments to ensure data security such as encryption and access controls.</p>

                            <p>We stay informed about developments in international data transfer regulations, including evolving guidance from European data protection authorities about what safeguards are necessary and sufficient for transfers to particular countries or in particular contexts. As the legal landscape evolves—such as changes to the EU-US Data Privacy Framework or new adequacy decisions by the European Commission—we update our practices and legal mechanisms accordingly to ensure ongoing compliance. If you have specific questions about where your data is stored or what transfer mechanisms apply to your specific situation, we encourage you to contact our privacy team for detailed information.</p>

                            <p>Regardless of where your data is physically stored or processed, we apply the same high standards of data protection and security across all our operations worldwide. The commitments made in this Privacy Policy apply to all user data regardless of geographic location, and we do not provide lesser protection to users in jurisdictions with weaker data protection laws. We believe in a consistent, global approach to privacy that respects user rights and maintains trust across all markets where we operate.</p>
                        </section>

                        <section>
                            <h2>CHILDREN'S PRIVACY</h2>
                            <p>The Noxtm Platform is designed for business and professional use and is intended for users who are at least eighteen years of age or the age of majority in their jurisdiction, whichever is higher. We do not knowingly collect personal information from children under the age of eighteen (or under the age of sixteen for users in the European Union where GDPR sets a lower threshold for certain processing). If you are under the applicable age threshold, you are not permitted to use Noxtm or provide any personal information through our service.</p>

                            <p>If we become aware that we have inadvertently collected personal information from a child under the applicable age without proper parental consent as required by laws such as the Children's Online Privacy Protection Act in the United States or Article 8 of GDPR in the European Union, we will take steps to delete that information as quickly as possible. If you are a parent or guardian and you become aware that your child has provided personal information to Noxtm without your consent, please contact us at privacy@noxtm.com so we can take appropriate action to remove the information and terminate any account that may have been created.</p>

                            <p>While our Terms of Service prohibit use by individuals under eighteen, we recognize that in rare circumstances a minor who is involved in running a business (such as a teenage entrepreneur) might legitimately want to use our platform. In such cases, we require that a parent or legal guardian create and maintain the account on the minor's behalf, taking full responsibility for compliance with our terms and for ensuring appropriate supervision of the minor's use of the service. However, this is an exception and not the norm, and the burden is on the parent or guardian to ensure they have the legal authority to consent on the minor's behalf and to ensure the minor's use is appropriate and supervised.</p>
                        </section>

                        <section>
                            <h2>THIRD-PARTY INTEGRATIONS AND LINKS</h2>
                            <p>The Noxtm Platform may contain links to third-party websites, services, or resources, and may support integrations with third-party tools or platforms. For example, as discussed earlier, our Botgit Chrome Extension integration enables importing data from LinkedIn, we may provide links to external documentation or resources, and we may in the future support integrations with other business tools such as calendar services, file storage providers, or communication platforms. This Privacy Policy applies only to information collected by Noxtm directly, and does not govern the practices of any third-party websites or services that may be linked from our platform or integrated with it.</p>

                            <p>When you click on a link to a third-party website or when you use a feature that integrates with a third-party service, you are subject to that third party's own privacy policy and terms of service, not ours. We do not control and are not responsible for the privacy practices or content of third-party sites and services. We encourage you to read the privacy policies of every website you visit and every service you use to understand how your information will be collected, used, and shared by those third parties. The fact that we provide a link to a third-party site or enable an integration with a third-party service does not constitute an endorsement of that third party's privacy practices, and you use third-party services at your own risk.</p>

                            <p>Specifically regarding the Botgit Chrome Extension and LinkedIn data scraping, we want to reiterate that Noxtm provides the technical capability to import data you have scraped from LinkedIn, but the act of scraping that data is your responsibility, is governed by LinkedIn's terms of service (not ours), and must comply with all applicable data protection laws. We cannot control how you use the Botgit extension, what data you choose to scrape, or whether you have legal permission to collect and use that data. You are solely responsible for ensuring your use of scraped data is lawful and ethical, and you indemnify Noxtm from any liability arising from your misuse of such tools or data.</p>
                        </section>

                        <section>
                            <h2>CALIFORNIA SHINE THE LIGHT DISCLOSURE</h2>
                            <p>California Civil Code Section 1798.83, commonly known as the "Shine the Light" law, permits California residents who have provided personal information to a business with which they have established a business relationship for personal, family, or household purposes to request certain information regarding the business's disclosure of personal information to third parties for their direct marketing purposes. As stated throughout this Privacy Policy, Noxtm does not sell, rent, or otherwise share your personal information with third parties for their direct marketing purposes. Therefore, no disclosure is required under the Shine the Light law. However, if you are a California resident and you would like to confirm that we have not shared your information for third-party marketing purposes, you may contact us at privacy@noxtm.com.</p>
                        </section>

                        <section>
                            <h2>DO NOT TRACK SIGNALS</h2>
                            <p>Some web browsers incorporate a "Do Not Track" feature or DNT signal that signals to websites you visit that you do not want to have your online activity tracked. Because there is not yet a common understanding of how to interpret DNT signals or a consistent industry standard for responding to them, Noxtm does not currently respond to DNT signals from web browsers. However, as discussed earlier in this policy, we do not track you across third-party websites for advertising purposes, and we do not participate in advertising networks that build behavioral profiles for ad targeting. Our tracking is limited to understanding how you use the Noxtm Platform itself so we can improve our service and provide you with a better experience. You do have the ability to control certain tracking through browser cookie settings and through any cookie preference controls we provide, as explained in the section on cookies.</p>
                        </section>

                        <section>
                            <h2>CHANGES TO THIS PRIVACY POLICY</h2>
                            <p>As Noxtm evolves, as we add new features and capabilities, as we expand into new markets, and as privacy laws and regulations change, we may need to update this Privacy Policy from time to time to accurately reflect our current practices and legal obligations. We reserve the right to modify this Privacy Policy at any time, and we will make updated versions available through the Noxtm Platform and on our website at noxtm.com.</p>

                            <p>When we make changes to this Privacy Policy, we will update the "Last Updated" date at the top of the policy to reflect when the changes became effective. For minor changes that do not materially affect user rights or how we handle data—such as clarifying existing language, fixing typos, or adding examples to illustrate points that were already covered—we may simply post the updated policy without additional notification. However, for material changes that significantly affect what information we collect, how we use it, who we share it with, or what rights you have—such as adding new categories of data collection, sharing data with new types of third parties, or making significant changes to our retention or security practices—we will provide prominent notice of the changes.</p>

                            <p>This prominent notice for material changes may include one or more of the following methods: sending an email notification to the email address associated with your account explaining the key changes and when they will become effective; displaying a prominent banner or notice within the Noxtm Platform when you log in, alerting you that the Privacy Policy has been updated and providing a link to review the changes; posting an announcement on our website or blog describing the nature of the changes and why they are being made; or requiring you to affirmatively acknowledge the updated policy before you can continue using certain features or services if the changes are particularly significant and require your explicit consent. We will typically provide such notice at least thirty days before material changes become effective to give you time to review the changes and make informed decisions about your continued use of the service.</p>

                            <p>Your continued use of the Noxtm Platform after changes to this Privacy Policy become effective constitutes your acceptance of the updated policy. If you do not agree to the changes, you should discontinue use of the service and may request deletion of your account as described in earlier sections of this policy. However, we encourage you to contact us first if you have concerns about policy changes, as we may be able to address your concerns or provide clarifications that make the changes acceptable to you.</p>

                            <p>We maintain an archive of previous versions of this Privacy Policy so that you can review what commitments were in effect at different points in time. If you would like to access previous versions of our Privacy Policy for reference or comparison purposes, please contact us at privacy@noxtm.com and we will provide them.</p>
                        </section>

                        <section>
                            <h2>CONTACT US ABOUT PRIVACY</h2>
                            <p>We are committed to transparency about our privacy practices and to addressing any questions, concerns, or requests you may have regarding how we handle your personal information. If you have any questions about this Privacy Policy, if you want to exercise any of your privacy rights as described in this policy, if you have concerns about how your data is being handled, or if you want to provide feedback on how we can improve our privacy practices, we encourage you to contact our dedicated privacy team.</p>

                            <p>The best way to reach us for privacy-related matters is by email at privacy@noxtm.com. This email address is monitored by our privacy team, and we commit to responding to all privacy inquiries in a timely manner, typically within forty-eight hours for initial acknowledgment and within the time frames required by applicable law for substantive responses to formal privacy rights requests such as access, deletion, or correction requests.</p>

                            <p>When you contact us about privacy matters, please include as much relevant information as possible to help us understand and respond to your inquiry effectively. This might include the email address associated with your Noxtm account, your full name, a detailed description of your question or concern, specific references to sections of this Privacy Policy if applicable, and any relevant dates, transaction identifiers, or other details that will help us investigate or respond to your issue. If you are submitting a formal request to exercise privacy rights such as access, deletion, or correction, please clearly state which right you are exercising and what specific action you want us to take.</p>

                            <p>For users located in the European Union or European Economic Area, our GDPR representative can be contacted through the same privacy@noxtm.com email address, or you may contact us through the data protection officer designated for GDPR compliance purposes if we have appointed one, whose contact information would be provided separately if applicable. If you are not satisfied with our response to a privacy concern and you are located in the EU or EEA, you have the right to lodge a complaint with the supervisory authority in your member state, and we will cooperate fully with any regulatory investigations.</p>

                            <p>We value your privacy and your trust, and we welcome your feedback on how we can continue to improve our data protection practices and make this Privacy Policy even more clear and useful for our users. Privacy is an ongoing commitment, not a one-time compliance exercise, and your input helps us identify areas where we can do better and serve you more effectively.</p>
                        </section>

                        <section>
                            <h2>ACKNOWLEDGMENT AND CONSENT</h2>
                            <p>By creating a Noxtm account, accessing the Noxtm Platform, or using any of our services, you acknowledge that you have read and understood this entire Privacy Policy in its entirety, including all the detailed information about what personal information we collect, how we collect it, how we use it, who we share it with, how long we retain it, how we protect it, and what rights you have regarding your information. You acknowledge that you understand that this Privacy Policy may be updated from time to time, and that you are responsible for reviewing it periodically to stay informed of any changes that may affect you.</p>

                            <p>You further acknowledge that by providing your personal information to Noxtm and by using our services, you are consenting to our collection, use, disclosure, and retention of your information as described in this Privacy Policy and as necessary to provide you with the Noxtm Platform and its various features and capabilities. If you are using Noxtm as part of a company or organization, you acknowledge that company administrators and owners may have access to information you create or store within that company's workspace, and that both Noxtm and your employer or organization may have certain rights regarding that information.</p>

                            <p>You acknowledge your understanding of the special considerations regarding certain features such as the Botgit Chrome Extension integration, and you accept sole responsibility for ensuring that your use of such features, particularly those involving the collection of third-party data, complies with all applicable laws, regulations, and third-party terms of service. You acknowledge that you understand the limitations on our ability to delete data instantaneously and permanently, particularly with respect to backup retention and legal obligations, and you accept these limitations as reasonable and necessary for the secure and compliant operation of our service.</p>

                            <p>Finally, you acknowledge that you understand that you have the right to decline to provide personal information or to withdraw consent at any time, but that doing so may prevent you from using certain features of the Noxtm Platform or may require you to close your account if the information is necessary for providing the basic service. You acknowledge that you have been informed of your privacy rights under applicable laws including GDPR for EU users and CCPA for California users, and you understand how to exercise those rights by contacting our privacy team.</p>

                            <p>Thank you for trusting Noxtm with your personal information and your business data. We are committed to earning and maintaining that trust through transparent, responsible, and security-conscious data practices, and we look forward to providing you with excellent service while respecting and protecting your privacy.</p>
                        </section>

                        <section style={{textAlign: 'center', marginTop: '40px', paddingTop: '20px', borderTop: '1px solid #ddd'}}>
                            <p style={{fontWeight: 'bold'}}>Last Updated: October 25, 2025</p>
                            <p style={{fontWeight: 'bold'}}>Noxtm - All-in-One Business Management Platform</p>
                            <p>© 2025 Noxtm. All rights reserved.</p>
                        </section>
                    </div>
                );            case 'shipping':
                return (
                    <div className="legal-policy-wrapper">
                        <h1>Shipping Policy</h1>
                        <p className="legal-intro">While our platform is primarily digital, certain plans or services may include physical onboarding kits, documents, or hardware tokens. This policy explains how those are handled.</p>
                        <section>
                            <h2>1. Digital Delivery</h2>
                            <p>Access to the platform, credentials, and feature provisioning are delivered electronically immediately after successful payment or activation.</p>
                        </section>
                        <section>
                            <h2>2. Physical Items (If Applicable)</h2>
                            <ul>
                                <li>Items ship within 5–7 business days unless otherwise stated.</li>
                                <li>Tracking details are emailed once dispatched.</li>
                                <li>Delivery windows vary by region (typically 5–14 business days).</li>
                            </ul>
                        </section>
                        <section>
                            <h2>3. Shipping Regions</h2>
                            <p>We currently ship physical materials to major regions where our services are offered. Some remote locations may incur additional carrier surcharges.</p>
                        </section>
                        <section>
                            <h2>4. Customs & Duties</h2>
                            <p>International recipients are responsible for any import duties, taxes, or brokerage fees assessed by local authorities.</p>
                        </section>
                        <section>
                            <h2>5. Address Accuracy</h2>
                            <p>Please verify shipping addresses before finalizing orders. Reshipment due to incorrect addresses may incur additional fees.</p>
                        </section>
                        <section>
                            <h2>6. Lost or Damaged Items</h2>
                            <ul>
                                <li>Report non-delivery within 15 days of the expected arrival date.</li>
                                <li>Report damaged items within 3 days of receipt with photos.</li>
                                <li>We may replace or credit at our discretion after carrier investigation.</li>
                            </ul>
                        </section>
                        <section>
                            <h2>7. Ownership Transfer</h2>
                            <p>Risk of loss passes to you upon confirmed delivery by the carrier. Title transfers upon full payment.</p>
                        </section>
                        <section>
                            <h2>8. Changes & Cancellations</h2>
                            <p>Physical orders can be modified within 12 hours of placement. After fulfillment begins we cannot guarantee interception.</p>
                        </section>
                        <section>
                            <h2>9. Contact</h2>
                            <p>For shipping questions reach out through our Contact page with your order or workspace reference.</p>
                        </section>
                    </div>
                );
            case 'findr-privacy':
                return (
                    <div className="legal-policy-wrapper">
                        <h1>Privacy Policy for findr Chrome Extension</h1>
                        
                        <section className="policy-section">
                            <h2>Introduction</h2>
                            <p>Welcome to findr, a service provided by Noxtm Technologies ("we", "our", or "us").</p>
                            <p>We are committed to protecting your personal information and your right to privacy.</p>
                            <p>This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our website (noxtm.com) and our candidate import services (including the findr Chrome Extension).</p>
                        </section>

                        <section className="policy-section">
                            <h2>Information We Collect</h2>
                            <h3>1. Personal Information</h3>
                            <p>We may collect personal information that you provide directly when using findr, including:</p>
                            <ul>
                                <li>Name</li>
                                <li>Email address</li>
                                <li>Phone number</li>
                                <li>Portfolio or website links</li>
                                <li>City and country</li>
                                <li>LinkedIn profile URL</li>
                                <li>Company or organization details</li>
                            </ul>
                            <p>This information is collected when you import, manage, or organize candidate data through findr.</p>

                            <h3>2. Usage Data</h3>
                            <p>We automatically collect certain information when you interact with our website or extension, such as:</p>
                            <ul>
                                <li>IP address</li>
                                <li>Browser type and version</li>
                                <li>Operating system</li>
                                <li>Access times and duration</li>
                                <li>Pages or features accessed</li>
                            </ul>

                            <h3>3. Cookies and Tracking Technologies</h3>
                            <p>We may use cookies, local storage, and similar tracking technologies to:</p>
                            <ul>
                                <li>Enhance your user experience</li>
                                <li>Analyze service usage and performance</li>
                                <li>Improve our platform functionality</li>
                            </ul>
                            <p>You can choose to disable cookies in your browser settings, though this may affect certain features.</p>
                        </section>

                        <section className="policy-section">
                            <h2>How We Use Your Information</h2>
                            <p>We use the information we collect to:</p>
                            <ul>
                                <li>Provide, operate, and maintain the findr service</li>
                                <li>Improve and personalize your experience</li>
                                <li>Communicate updates, features, or support information</li>
                                <li>Prevent fraudulent, unauthorized, or illegal activities</li>
                                <li>Comply with applicable laws and regulations</li>
                            </ul>
                        </section>

                        <section className="policy-section">
                            <h2>Data Sharing and Disclosure</h2>
                            <p>We do not sell, rent, or trade your personal information.</p>
                            <p>We may share data only in the following situations:</p>
                            <ul>
                                <li><strong>Service Providers:</strong> With trusted third-party vendors who assist in operating our service (under confidentiality agreements).</li>
                                <li><strong>Legal Requirements:</strong> When required by law, regulation, or legal process.</li>
                                <li><strong>Business Transfers:</strong> In connection with any merger, sale, or reorganization of our business (with prior notice where applicable).</li>
                            </ul>
                        </section>

                        <section className="policy-section">
                            <h2>Data Security</h2>
                            <p>We use reasonable technical and organizational measures to protect your personal data.</p>
                            <p>However, please note that no method of electronic storage or transmission over the Internet is 100% secure.</p>
                            <p>We encourage you to protect your login credentials and regularly review your account security.</p>
                        </section>

                        <section className="policy-section">
                            <h2>Third-Party Links and Services</h2>
                            <p>Our website and extension may contain links to external websites or services not operated by us.</p>
                            <p>We are not responsible for the privacy practices, content, or security of third-party websites.</p>
                        </section>

                        <section className="policy-section">
                            <h2>Changes to This Privacy Policy</h2>
                            <p>We may update this Privacy Policy periodically.</p>
                            <p>When we do, we will post the updated version on noxtm.com and update the "Last Updated" date below.</p>
                            <p>We encourage you to review this Policy occasionally to stay informed.</p>
                        </section>

                        <section className="policy-section">
                            <h2>Contact Us</h2>
                            <p>If you have any questions or concerns regarding this Privacy Policy, please contact us at:</p>
                            <p>📩 support@noxtm.com</p>
                        </section>

                        <footer className="policy-footer">
                            <p>Effective Date: September 07, 2025</p>
                            <p>Last Updated: September 07, 2025</p>
                        </footer>
                    </div>
                );
            default:
                return (
                    <div className="legal-policy-wrapper">
                        <h1>Terms & Conditions</h1>
                        <p className="legal-intro">These Terms govern your access to and use of our platform, services, APIs, and related applications. By creating an account or using the platform you agree to be bound by them.</p>
                    </div>
                );
        }
    };

    return (
        <Container fluid className="legal-container">
            <Row>
                <Col md={2} className="legal-sidebar">
                    <div className={`legal-sidebar-item ${activeComponent === 'terms' ? 'legal-active' : ''}`}
                         onClick={() => setActiveComponent('terms')}>
                        Terms & Conditions
                    </div>
                    <div className={`legal-sidebar-item ${activeComponent === 'privacy' ? 'legal-active' : ''}`}
                         onClick={() => setActiveComponent('privacy')}>
                        Privacy Policy
                    </div>
                    <div className={`legal-sidebar-item ${activeComponent === 'cancellation' ? 'legal-active' : ''}`}
                         onClick={() => setActiveComponent('cancellation')}>
                        Cancellation & Refunds
                    </div>
                    <div className={`legal-sidebar-item ${activeComponent === 'shipping' ? 'legal-active' : ''}`}
                         onClick={() => setActiveComponent('shipping')}>
                        Shipping
                    </div>
                    <div className={`legal-sidebar-item ${activeComponent === 'findr-privacy' ? 'legal-active' : ''}`}
                         onClick={() => setActiveComponent('findr-privacy')}>
                        findr Privacy Policy
                    </div>
                </Col>
                <Col md={9} className="legal-content">
                    {renderComponent()}
                </Col>
            </Row>
        </Container>
    );
};

export default Legal;
import React, { useState } from 'react';
import './EmailSetup.css';

const EmailSetup = () => {
    const [emailConfig, setEmailConfig] = useState({
        host: '',
        port: '',
        secure: true,
        auth: {
            user: '',
            pass: ''
        },
        from: ''
    });

    const [status, setStatus] = useState({
        loading: false,
        error: null,
        success: false
    });

    const handleChange = (e) => {
        const { name, value } = e.target;
        if (name.startsWith('auth.')) {
            const authField = name.split('.')[1];
            setEmailConfig(prev => ({
                ...prev,
                auth: {
                    ...prev.auth,
                    [authField]: value
                }
            }));
        } else {
            setEmailConfig(prev => ({
                ...prev,
                [name]: value
            }));
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setStatus({ loading: true, error: null, success: false });

        try {
            const response = await fetch('/api/email/setup', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(emailConfig)
            });

            if (!response.ok) {
                throw new Error('Failed to save email configuration');
            }

            setStatus({
                loading: false,
                error: null,
                success: true
            });
        } catch (error) {
            setStatus({
                loading: false,
                error: error.message,
                success: false
            });
        }
    };

    return (
        <div className="email-setup-container">
            <h2 className="email-setup-title">Business Email Setup</h2>
            <form onSubmit={handleSubmit} className="email-setup-form">
                <div className="form-group">
                    <label htmlFor="host">SMTP Host</label>
                    <input
                        type="text"
                        id="host"
                        name="host"
                        value={emailConfig.host}
                        onChange={handleChange}
                        placeholder="e.g., smtp.gmail.com"
                        required
                    />
                </div>

                <div className="form-group">
                    <label htmlFor="port">Port</label>
                    <input
                        type="number"
                        id="port"
                        name="port"
                        value={emailConfig.port}
                        onChange={handleChange}
                        placeholder="e.g., 587"
                        required
                    />
                </div>

                <div className="form-group">
                    <label htmlFor="auth.user">Email Address</label>
                    <input
                        type="email"
                        id="auth.user"
                        name="auth.user"
                        value={emailConfig.auth.user}
                        onChange={handleChange}
                        placeholder="your@email.com"
                        required
                    />
                </div>

                <div className="form-group">
                    <label htmlFor="auth.pass">Password or App Password</label>
                    <input
                        type="password"
                        id="auth.pass"
                        name="auth.pass"
                        value={emailConfig.auth.pass}
                        onChange={handleChange}
                        placeholder="Enter your password"
                        required
                    />
                </div>

                <div className="form-group">
                    <label htmlFor="from">From Name</label>
                    <input
                        type="text"
                        id="from"
                        name="from"
                        value={emailConfig.from}
                        onChange={handleChange}
                        placeholder="Company Name or Your Name"
                        required
                    />
                </div>

                {status.error && (
                    <div className="error-message">{status.error}</div>
                )}
                
                {status.success && (
                    <div className="success-message">Email configuration saved successfully!</div>
                )}

                <button 
                    type="submit" 
                    className="submit-button"
                    disabled={status.loading}
                >
                    {status.loading ? 'Saving...' : 'Save Configuration'}
                </button>
            </form>
        </div>
    );
};

export default EmailSetup;
import React from 'react';
import { FiMapPin, FiClock, FiBriefcase } from 'react-icons/fi';
import './PublicPages.css';

function CareersPage() {
  const values = [
    {
      emoji: '🎯',
      title: 'Purpose-Driven Work',
      desc: 'Every feature we ship solves a real problem for real businesses. You will see the impact of your work firsthand.'
    },
    {
      emoji: '🧪',
      title: 'Build & Experiment',
      desc: 'We move fast, test ideas early, and iterate based on data. You will have the freedom to explore new approaches.'
    },
    {
      emoji: '🤝',
      title: 'Trust & Ownership',
      desc: 'We hire people we trust, then give them the autonomy to do their best work without micromanagement.'
    },
    {
      emoji: '📚',
      title: 'Always Learning',
      desc: 'Whether it is a new framework or a new market, we encourage continuous growth and skill development.'
    },
    {
      emoji: '🌍',
      title: 'Remote-First',
      desc: 'Work from anywhere. We care about output, not office hours. Async communication is our default.'
    },
    {
      emoji: '⚡',
      title: 'Ship It',
      desc: 'We value progress over perfection. Launch, learn, and improve — not endless planning cycles.'
    },
  ];

  const openings = [
    {
      title: 'Full Stack Developer',
      department: 'Engineering',
      location: 'Remote',
      type: 'Full-time',
    },
    {
      title: 'UI/UX Designer',
      department: 'Design',
      location: 'Remote',
      type: 'Full-time',
    },
    {
      title: 'DevOps Engineer',
      department: 'Infrastructure',
      location: 'Remote',
      type: 'Full-time',
    },
    {
      title: 'Content & Growth Marketing',
      department: 'Marketing',
      location: 'Remote',
      type: 'Full-time',
    },
  ];

  return (
    <div className="public-page">
      <div className="public-page-container">
        {/* Hero */}
        <div className="public-hero">
          <span className="public-hero-badge">Careers</span>
          <h1>Build the future of work with us</h1>
          <p>
            Noxtm is building the all-in-one platform that businesses actually want to use. We're looking for people who ship fast, think clearly, and care about craft.
          </p>
        </div>

        {/* Values */}
        <h2 className="public-section-title">What we believe</h2>
        <p className="public-section-subtitle">The principles that guide how we work together.</p>
        <div className="careers-values-grid">
          {values.map((v, i) => (
            <div className="careers-value-card" key={i}>
              <div style={{ fontSize: '24px', marginBottom: '12px' }}>{v.emoji}</div>
              <h3>{v.title}</h3>
              <p>{v.desc}</p>
            </div>
          ))}
        </div>

        <hr className="public-divider" />

        {/* Perks */}
        <h2 className="public-section-title">Perks & Benefits</h2>
        <p className="public-section-subtitle">We take care of our team so they can focus on great work.</p>
        <div className="public-cards-grid public-cards-grid-2" style={{ marginBottom: '56px' }}>
          <div className="public-card">
            <h3>💰 Competitive Salary</h3>
            <p>Market-rate compensation reviewed regularly. We pay well because we expect great work.</p>
          </div>
          <div className="public-card">
            <h3>🏖️ Flexible Time Off</h3>
            <p>Take the time you need. We trust you to manage your schedule and recharge when necessary.</p>
          </div>
          <div className="public-card">
            <h3>💻 Equipment Budget</h3>
            <p>Get the tools you need — laptop, monitor, chair, or software. We provide a setup allowance for every new hire.</p>
          </div>
          <div className="public-card">
            <h3>📈 Growth Budget</h3>
            <p>Annual learning budget for courses, conferences, and books. Invest in yourself on us.</p>
          </div>
        </div>

        <hr className="public-divider" />

        {/* Open Positions */}
        <h2 className="public-section-title">Open Positions</h2>
        <p className="public-section-subtitle">Join our team. All roles are remote-first.</p>

        {openings.length > 0 ? (
          <div style={{ marginBottom: '56px' }}>
            {openings.map((job, i) => (
              <div className="careers-job-card" key={i}>
                <div className="careers-job-info">
                  <h3>{job.title}</h3>
                  <div className="careers-job-meta">
                    <span><FiBriefcase size={13} /> {job.department}</span>
                    <span><FiMapPin size={13} /> {job.location}</span>
                    <span><FiClock size={13} /> {job.type}</span>
                  </div>
                </div>
                <a
                  href="mailto:careers@noxtm.com"
                  className="careers-apply-btn"
                  style={{ textDecoration: 'none' }}
                >
                  Apply
                </a>
              </div>
            ))}
          </div>
        ) : (
          <div className="careers-no-openings">
            <h3>No open positions right now</h3>
            <p>Check back soon or send your resume to careers@noxtm.com</p>
          </div>
        )}

        {/* CTA */}
        <div className="public-cta">
          <h2>Don't see your role?</h2>
          <p>We're always interested in meeting talented people. Send us your resume.</p>
          <a href="mailto:careers@noxtm.com" className="public-btn public-btn-primary" style={{ textDecoration: 'none' }}>
            careers@noxtm.com
          </a>
        </div>
      </div>
    </div>
  );
}

export default CareersPage;

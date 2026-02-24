import React from 'react';
import {
  FiMapPin, FiClock, FiBriefcase, FiHeart,
  FiStar, FiArrowRight, FiSend, FiUsers
} from 'react-icons/fi';
import './PublicPages.css';

function CareersPage() {
  const values = [
    {
      emoji: '\uD83C\uDFAF',
      title: 'Purpose-Driven Work',
      desc: 'Every feature we ship solves a real problem for real businesses. You will see the impact of your work firsthand.'
    },
    {
      emoji: '\uD83E\uDDEA',
      title: 'Build & Experiment',
      desc: 'We move fast, test ideas early, and iterate based on data. You will have the freedom to explore new approaches.'
    },
    {
      emoji: '\uD83E\uDD1D',
      title: 'Trust & Ownership',
      desc: 'We hire people we trust, then give them the autonomy to do their best work without micromanagement.'
    },
    {
      emoji: '\uD83D\uDCDA',
      title: 'Always Learning',
      desc: 'Whether facing a new framework or a new market, we encourage continuous growth and skill development.'
    },
    {
      emoji: '\uD83C\uDF0D',
      title: 'Remote-First',
      desc: 'Work from anywhere. We care about output, not office hours. Async communication is our default.'
    },
    {
      emoji: '\u26A1',
      title: 'Ship It',
      desc: 'We value progress over perfection. Launch, learn, and improve \u2014 not endless planning cycles.'
    },
  ];

  const perks = [
    { icon: '\uD83D\uDCB0', title: 'Competitive Salary', desc: 'Market-rate compensation reviewed regularly. We pay well because we expect great work.' },
    { icon: '\uD83C\uDFD6\uFE0F', title: 'Flexible Time Off', desc: 'Take the time you need. We trust you to manage your schedule and recharge when necessary.' },
    { icon: '\uD83D\uDCBB', title: 'Equipment Budget', desc: 'Laptop, monitor, chair, or software. We provide a setup allowance for every new hire.' },
    { icon: '\uD83D\uDCC8', title: 'Growth Budget', desc: 'Annual learning budget for courses, conferences, and books. Invest in yourself on us.' },
    { icon: '\uD83C\uDFE5', title: 'Health Benefits', desc: 'Comprehensive health coverage for you and your family. Because your well-being matters.' },
    { icon: '\uD83C\uDF1F', title: 'Equity Options', desc: 'As an early team member, share in the company growth with stock option grants.' },
  ];

  const openings = [
    {
      title: 'Full Stack Developer',
      department: 'Engineering',
      location: 'Remote',
      type: 'Full-time',
      desc: 'Build and ship features across our React frontend and Node.js backend. Work on real products used by businesses daily.'
    },
    {
      title: 'UI/UX Designer',
      department: 'Design',
      location: 'Remote',
      type: 'Full-time',
      desc: 'Design intuitive interfaces for a complex platform. Simplify workflows and create delightful user experiences.'
    },
    {
      title: 'DevOps Engineer',
      department: 'Infrastructure',
      location: 'Remote',
      type: 'Full-time',
      desc: 'Manage deployment pipelines, server infrastructure, and monitoring. Keep our platform fast and reliable.'
    },
    {
      title: 'Content & Growth Marketing',
      department: 'Marketing',
      location: 'Remote',
      type: 'Full-time',
      desc: 'Drive organic growth through content strategy, SEO, and community building. Tell the Noxtm story.'
    },
  ];

  return (
    <div className="public-page">
      <div className="public-page-container">

        {/* Hero */}
        <div className="public-hero">
          <span className="public-hero-badge"><FiHeart style={{ fontSize: 12 }} /> Careers</span>
          <h1>Build the future of<br />work with us</h1>
          <p>
            Noxtm is building the all-in-one platform that businesses actually want to use. We are looking for people who ship fast, think clearly, and care about craft.
          </p>
          <div className="careers-hero-stats">
            <div className="careers-hero-stat">
              <FiUsers />
              <span>Small, focused team</span>
            </div>
            <div className="careers-hero-stat">
              <FiMapPin />
              <span>100% remote</span>
            </div>
            <div className="careers-hero-stat">
              <FiStar />
              <span>Early-stage opportunity</span>
            </div>
          </div>
        </div>

        {/* Values */}
        <div className="products-section-heading">
          <span className="products-section-label">Our Values</span>
          <h2 className="public-section-title">What we believe</h2>
          <p className="public-section-subtitle">The principles that guide how we work together every day.</p>
        </div>
        <div className="careers-values-grid">
          {values.map((v, i) => (
            <div className="careers-value-card" key={i}>
              <div className="careers-value-emoji">{v.emoji}</div>
              <h3>{v.title}</h3>
              <p>{v.desc}</p>
            </div>
          ))}
        </div>

        <hr className="public-divider" />

        {/* Perks */}
        <div className="products-section-heading">
          <span className="products-section-label">Benefits</span>
          <h2 className="public-section-title">Perks & benefits</h2>
          <p className="public-section-subtitle">We take care of our team so they can focus on doing great work.</p>
        </div>
        <div className="careers-perks-grid">
          {perks.map((p, i) => (
            <div className="careers-perk-card" key={i}>
              <div className="careers-perk-icon">{p.icon}</div>
              <h3>{p.title}</h3>
              <p>{p.desc}</p>
            </div>
          ))}
        </div>

        <hr className="public-divider" />

        {/* Open Positions */}
        <div className="products-section-heading">
          <span className="products-section-label">Open Roles</span>
          <h2 className="public-section-title">Join our team</h2>
          <p className="public-section-subtitle">All roles are remote-first. Apply by emailing your resume.</p>
        </div>

        <div className="careers-jobs-list">
          {openings.map((job, i) => (
            <div className="careers-job-card" key={i}>
              <div className="careers-job-info">
                <h3>{job.title}</h3>
                <p className="careers-job-desc">{job.desc}</p>
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
                Apply <FiArrowRight size={14} />
              </a>
            </div>
          ))}
        </div>

        {/* CTA */}
        <div className="public-cta" style={{ marginTop: 48 }}>
          <FiSend style={{ fontSize: 28, color: '#9ca3af', marginBottom: 12 }} />
          <h2>Don't see your role?</h2>
          <p>We are always interested in meeting talented people. Send us your resume and we will keep you in mind.</p>
          <a href="mailto:careers@noxtm.com" className="public-btn public-btn-primary" style={{ textDecoration: 'none' }}>
            careers@noxtm.com
          </a>
        </div>
      </div>
    </div>
  );
}

export default CareersPage;

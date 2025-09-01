import React from 'react';
import './home.css';
import { ReactComponent as GrowthIcon } from './image/growth.svg';
import { ReactComponent as CreativeFuelLogo } from './image/creativefuel.svg';
import { ReactComponent as EfdStudioLogo } from './image/efd_studio.svg';
import { ReactComponent as MaxternLogo } from './image/maxtern.svg';
import { ReactComponent as OperaLogo } from './image/opera.svg';
import { ReactComponent as DesignIcon } from './image/design.svg';
import { ReactComponent as WebDevIcon } from './image/webdev.svg';
import { ReactComponent as MediaBuyingIcon } from './image/media_buying.svg';
import { ReactComponent as JobPlacementIcon } from './image/job_placement.svg';

function Home({ user }) {
  return (
    <div className="home">
      <div className="container">
        <div className="hero-section">
          <div className="tagline">
            <GrowthIcon className="growth-icon" /> A NEW WAY OF MARKETING
          </div>
          <h1>Master of Marketing<br />& Management</h1>
          <p className="hero-description">
            We help brands tell their story, connect with people, and grow with purpose. Merging creativity 
            and strategy, We build meaningful growth for businesses and their audiences.
          </p>
          
          <div className="cta-buttons">
            <button className="btn btn-primary btn-small">Work with us</button>
            <span className="quote-text">Get a Quote ?</span>
          </div>

          <div className="trusted-companies">
            <h3 className="trusted-title">Trusted by the world leaders</h3>
            <div className="logos-container">
              <div className="logos-scroll">
                <div className="logo-item">
                  <CreativeFuelLogo className="company-logo" />
                </div>
                <div className="logo-item">
                  <EfdStudioLogo className="company-logo" />
                </div>
                <div className="logo-item">
                  <MaxternLogo className="company-logo" />
                </div>
                <div className="logo-item">
                  <OperaLogo className="company-logo" />
                </div>
                {/* Duplicate logos for seamless loop */}
                <div className="logo-item">
                  <CreativeFuelLogo className="company-logo" />
                </div>
                <div className="logo-item">
                  <EfdStudioLogo className="company-logo" />
                </div>
                <div className="logo-item">
                  <MaxternLogo className="company-logo" />
                </div>
                <div className="logo-item">
                  <OperaLogo className="company-logo" />
                </div>
              </div>
            </div>
          </div>

          {/* Services Section */}
          <div className="services-section">
            <div className="service-container">
              <div className="services-grid">
                {/* Identity & Design */}
                <div className="service-card">
                  <div className="service-icon">
                    <DesignIcon />
                  </div>
                  <h3 className="service-title">Identity & Design</h3>
                  <p className="service-description">We create impactful brand identities and visuals that inspire trust, stand out, and drive interconnection.</p>
                  <div className="service-footer">
                    <div className="service-pricing">
                      <span className="pricing-label">Starting from</span>
                      <span className="pricing-amount">$10</span>
                    </div>
                    <button className="service-btn">See More</button>
                  </div>
                </div>

                {/* Web Development */}
                <div className="service-card">
                  <div className="service-icon">
                    <WebDevIcon />
                  </div>
                  <h3 className="service-title">Web Development</h3>
                  <p className="service-description">We craft fast, modern, and conversion focused websites that attract, engage, and grow your business.</p>
                  <div className="service-footer">
                    <div className="service-pricing">
                      <span className="pricing-label">Starting from</span>
                      <span className="pricing-amount">$100</span>
                    </div>
                    <button className="service-btn">See More</button>
                  </div>
                </div>

                {/* Media Planning & Buying */}
                <div className="service-card">
                  <div className="service-icon">
                    <MediaBuyingIcon />
                  </div>
                  <h3 className="service-title">Media Planning & Buying</h3>
                  <p className="service-description">Connecting your brand with the right people, at the right moment, for real connections and measurable growth.</p>
                  <div className="service-footer">
                    <div className="service-pricing">
                      <span className="pricing-label">Starting from</span>
                      <span className="pricing-amount">$150</span>
                    </div>
                    <button className="service-btn">See More</button>
                  </div>
                </div>

                {/* Job Placement */}
                <div className="service-card">
                  <div className="service-icon">
                    <JobPlacementIcon />
                  </div>
                  <h3 className="service-title">Job Placement</h3>
                  <p className="service-description">Helping people find meaningful careers and businesses discover the talent they can truly grow with.</p>
                  <div className="service-footer">
                    <div className="service-pricing">
                      <span className="pricing-label">Starting from</span>
                      <span className="pricing-amount">Free</span>
                    </div>
                    <button className="service-btn">See More</button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Home;

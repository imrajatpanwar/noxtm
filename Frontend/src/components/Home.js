import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useRole } from '../contexts/RoleContext';
import './home.css';
import api from '../config/api';
import { ReactComponent as CreativeFuelLogo } from './image/creativefuel.svg';
import { ReactComponent as EfdStudioLogo } from './image/efd_studio.svg';
import { ReactComponent as MaxternLogo } from './image/maxtern.svg';
import { ReactComponent as OperaLogo } from './image/opera.svg';
// Blog images (fallback)
import blogImage1 from './image/Blog1.jpg';
import blogImage2 from './image/Blog2.jpg';
import blogImage3 from './image/Blog3.jpg';
import { ReactComponent as LinkArrow } from './image/link_arrow_white.svg';
// Mountain chair images
import mountainChairBg from './image/Mountain_chair_bg.webp';
import mountainChairOverlay from './image/Mountain_chair_bg_uperlayer.webp';
import chairMountain from './image/chair_mountain.webp';
import jessicaNotification from './image/Jassica_notification.png';
import realTimeData from './image/real-time-data.svg';
// Problem-solution card images
import poorTeamCommunication from './image/poor_team_communication.svg';
import unorganizedSystem from './image/unorganized_system.svg';
import manualHR from './image/manual_HR.svg';
import hiddenExpenses from './image/hidden_expenses.svg';
import wastingMoney from './image/Wasting_money.svg';
import busyToRead from './image/busy_to_read.svg';

function Home({ user }) {
  const navigate = useNavigate();
  const { currentUser } = useRole();
  const [featuredBlogs, setFeaturedBlogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const notificationRef = useRef(null);
  const realTimeDataRef = useRef(null);
  const mountainBgRef = useRef(null);

  // Fallback blog data in case no blogs are available
  const fallbackBlogs = useMemo(() => [
    {
      id: 'fallback-1',
      title: 'The Broken Bridge Between Research and Real-World Change',
      metaDescription: 'Exploring the gap between academic research and practical implementation in modern business environments.',
      category: { name: 'Lab Updates' },
      featuredImage: { path: blogImage1, altText: 'Research and Innovation' },
      slug: '#'
    },
    {
      id: 'fallback-2',
      title: 'How to Set a Hook Line for the New Customer for Meta Ads?',
      metaDescription: 'Master the art of creating compelling ad copy that captures attention and drives conversions on Meta platforms.',
      category: { name: 'Digital Insights' },
      featuredImage: { path: blogImage2, altText: 'Digital Marketing' },
      slug: '#'
    },
    {
      id: 'fallback-3',
      title: 'Building Meaningful Growth Through Creative Strategy',
      metaDescription: 'Discover how strategic creativity can drive sustainable business growth and meaningful customer connections.',
      category: { name: 'Creative Fuel' },
      featuredImage: { path: blogImage3, altText: 'Creative Strategy' },
      slug: '#'
    }
  ], []);

  const fetchFeaturedBlogs = useCallback(async () => {
    setLoading(true);
    try {
      const response = await api.get('/api/blogs?status=published&limit=3');
      if (response.data.blogs && response.data.blogs.length > 0) {
        setFeaturedBlogs(response.data.blogs);
      } else {
        setFeaturedBlogs(fallbackBlogs);
      }
    } catch (error) {
      console.error('Error fetching blogs:', error);
      setFeaturedBlogs(fallbackBlogs);
    } finally {
      setLoading(false);
    }
  }, [fallbackBlogs]);

  useEffect(() => {
    fetchFeaturedBlogs();
  }, [fetchFeaturedBlogs]);

  // Scroll animation for Jessica notification and real-time data (one-time animation)
  useEffect(() => {
    const handleScroll = () => {
      if (notificationRef.current) {
        const rect = notificationRef.current.getBoundingClientRect();
        const isVisible = rect.top <= window.innerHeight * 0.8 && rect.bottom >= 0;

        if (isVisible && !notificationRef.current.classList.contains('animate-in')) {
          // Show notification once
          notificationRef.current.classList.add('animate-in');
        }
      }

      if (realTimeDataRef.current) {
        const rect = realTimeDataRef.current.getBoundingClientRect();
        const isVisible = rect.top <= window.innerHeight * 0.8 && rect.bottom >= 0;

        if (isVisible && !realTimeDataRef.current.classList.contains('animate-in')) {
          // Show real-time data once
          realTimeDataRef.current.classList.add('animate-in');
        }
      }
    };

    window.addEventListener('scroll', handleScroll);
    handleScroll(); // Check on mount

    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Hover effect for mountain background (triggered by jessica-notification)
  useEffect(() => {
    let hoverTimeout = null;

    const handleMouseEnter = () => {
      if (mountainBgRef.current) {
        mountainBgRef.current.classList.add('show-bg');

        // Clear any existing timeout
        if (hoverTimeout) clearTimeout(hoverTimeout);

        // Remove after 2 seconds
        hoverTimeout = setTimeout(() => {
          if (mountainBgRef.current) {
            mountainBgRef.current.classList.remove('show-bg');
          }
        }, 2000);
      }
    };

    const notification = notificationRef.current;
    if (notification) {
      notification.addEventListener('mouseenter', handleMouseEnter);
    }

    return () => {
      if (notification) {
        notification.removeEventListener('mouseenter', handleMouseEnter);
      }
      if (hoverTimeout) clearTimeout(hoverTimeout);
    };
  }, []);

  const truncateText = (text, maxLength) => {
    if (!text) return '';
    if (text.length <= maxLength) return text;
    return text.substr(0, maxLength) + '...';
  };

  const getImageUrl = (blog) => {
    if (blog.featuredImage?.path) {
      // If it's already a full URL or imported image, use it directly
      if (blog.featuredImage.path.startsWith('http') || 
          blog.featuredImage.path.includes('static/media/')) {
        return blog.featuredImage.path;
      }
      // Otherwise, construct the API URL (remove /api from the end for static files)
      return `https://noxtm.com${blog.featuredImage.path}`;
    }
    // Fallback to default images
    const fallbackImages = [blogImage1, blogImage2, blogImage3];
    return fallbackImages[Math.floor(Math.random() * fallbackImages.length)];
  };

  const renderBlogCard = (blog, index) => {
    const isRealBlog = !blog.id?.includes('fallback');
    const blogUrl = isRealBlog ? `/blog/${blog.slug}` : '#';
    
    return (
      <div key={blog._id || blog.id} className="blog-journal-card">
        <div className="blog-journal-image">
          <img 
            src={getImageUrl(blog)} 
            alt={blog.featuredImage?.altText || blog.title} 
            className="blog-journal-bg-image" 
          />
          <div className="lab-updates-tag">
            {blog.category?.name || 'Insights'}
          </div>
          {isRealBlog ? (
            <Link to={blogUrl} className="blog-journal-action-btn" aria-label="Read more">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M3.5 8H12.5M12.5 8L8.5 4M12.5 8L8.5 12" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </Link>
          ) : (
            <button className="blog-journal-action-btn" aria-label="Read more">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M3.5 8H12.5M12.5 8L8.5 4M12.5 8L8.5 12" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
          )}
        </div>
        <div className="blog-link-circle">
          <LinkArrow className="blog-link-arrow" />
        </div>
        <div className="blog-journal-content">
          <h3>{truncateText(blog.title, 70)}</h3>
          <p>{truncateText(blog.metaDescription, 120)}</p>
        </div>
      </div>
    );
  };
  return (
    <div className="home">
      <div className="Container-home">
        <div className="hero-section">
          <div 
            className="masterpiece-form masterpiece-bg"
            style={{
              backgroundColor: '#ffffff',
              borderRadius: '20px'
            }}
          >
            <div className="masterpiece-content">
              <h1>Management of Your Masterpiece</h1>
                <p className="masterpiece-subtitle">Manage your projects, clients, and team with real-time insights and complete control always at your fingertips.</p>
                <div className="masterpiece-buttons">
                  <button
                    type="button"
                    className="btn-try-free"
                    onClick={() => {
                      if (currentUser && localStorage.getItem('token')) {
                        navigate('/dashboard');
                      } else {
                        navigate('/signup');
                      }
                    }}
                    aria-label={currentUser && localStorage.getItem('token') ? 'Go to Dashboard' : 'Try Noxtm for Free'}
                  >
                    {currentUser && localStorage.getItem('token') ? 'Dashboard' : 'Try Noxtm for Free'}
                  </button>
                  <Link to="/products" className="btn-products">Products</Link>
                </div>
            </div>
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
                {/* First duplicate set for seamless loop */}
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
                {/* Second duplicate set for extra smooth loop */}
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
        </div>
      </div>

      {/* Mountain Decision Section - Full Width Outside Container */}
      <div className="mountain-decision-section">
        <div
          ref={mountainBgRef}
          className="mountain-bg-base"
          style={{ backgroundImage: `url(${mountainChairBg})` }}
        ></div>
        <div
          className="mountain-bg-overlay"
          style={{ backgroundImage: `url(${mountainChairOverlay})` }}
        ></div>
        <div
          className="mountain-chair"
          style={{ backgroundImage: `url(${chairMountain})` }}
        ></div>
        <img
          ref={notificationRef}
          src={jessicaNotification}
          alt="Jessica notification"
          className="jessica-notification"
        />
        <img
          ref={realTimeDataRef}
          src={realTimeData}
          alt="Real-time data"
          className="real-time-data"
        />
        <div className="mountain-text-overlay">
          <h2 className="decision-line-1">Decisions are being made without you.</h2>
          <h2 className="decision-line-2">Act before it's too late.</h2>
        </div>
      </div>

      {/* Statistics Section - Below Mountain */}
      <div className="statistics-section">
        <div className="Container-home">
          <div className="stats-grid">
            <div className="stat-item">
              <h3 className="stat-number">581</h3>
              <p className="stat-label">tasks automated by Noxtm</p>
            </div>
            <div className="stat-item">
              <h3 className="stat-number">&gt;2 million</h3>
              <p className="stat-label">data processed by our agents each month</p>
            </div>
            <div className="stat-item">
              <h3 className="stat-number">62</h3>
              <p className="stat-label">tools available across 19+ integrations</p>
            </div>
            <div className="stat-item">
              <h3 className="stat-number">02</h3>
              <p className="stat-label">AI Agent's for repetitive tasks</p>
            </div>
            <div className="stat-item">
              <h3 className="stat-number">6hr</h3>
              <p className="stat-label">Saved per teammate per week</p>
            </div>
          </div>
        </div>
      </div>

      {/* Problem-Solution Cards Section */}
      <div className="Container-home">
        <div className="noxtm-must-section">
          <h2 className="noxtm-must-heading">Here's some of the things Noxtm can do for you</h2>

          <div className="noxtm-must-grid">
            {/* Card 1 - Team Communication */}
            <div className="noxtm-must-card">
              <div className="noxtm-must-card-content">
                <h3 className="noxtm-must-card-title">Is poor team communication costing you projects?</h3>
                <p className="noxtm-must-card-description">
                  Get instant messaging, email, and meeting management all in one place. Keep your entire team connected and collaborating seamlessly.
                </p>
              </div>
              <div className="noxtm-must-card-visual noxtm-must-card-visual-communication">
                <img src={poorTeamCommunication} alt="Team Communication Solution" className="noxtm-must-card-image noxtm-must-card-image-communication" />
              </div>
            </div>

            {/* Card 2 - Organized System */}
            <div className="noxtm-must-card">
              <div className="noxtm-must-card-content">
                <h3 className="noxtm-must-card-title">Is your unorganized system leaking client data?</h3>
                <p className="noxtm-must-card-description">
                  Noxtm keeps all your project details in one safe place. You can track clients and tasks from start to finish, so you'll always know your private info is secure.
                </p>
              </div>
              <div className="noxtm-must-card-visual noxtm-must-card-visual-system">
                <img src={unorganizedSystem} alt="Organized System Solution" className="noxtm-must-card-image noxtm-must-card-image-system" />
              </div>
            </div>

            {/* Card 3 - HR Automation */}
            <div className="noxtm-must-card">
              <div className="noxtm-must-card-content">
                <h3 className="noxtm-must-card-title">Is manual HR slowing down your growth?</h3>
                <p className="noxtm-must-card-description">
                  Automate attendance tracking, manage interviews, schedule holidays, and handle the complete employee lifecycle with intelligent automation.
                </p>
              </div>
              <div className="noxtm-must-card-visual noxtm-must-card-visual-hr">
                <img src={manualHR} alt="HR Automation Solution" className="noxtm-must-card-image noxtm-must-card-image-hr" />
              </div>
            </div>

            {/* Card 4 - Financial Control */}
            <div className="noxtm-must-card">
              <div className="noxtm-must-card-content">
                <h3 className="noxtm-must-card-title">Are hidden expenses draining your profits?</h3>
                <p className="noxtm-must-card-description">
                  Manage billing, track payments, generate invoices, and control expenses with complete financial transparency and automated workflows.
                </p>
              </div>
              <div className="noxtm-must-card-visual noxtm-must-card-visual-expenses">
                <img src={hiddenExpenses} alt="Financial Control Solution" className="noxtm-must-card-image noxtm-must-card-image-expenses" />
              </div>
            </div>

            {/* Card 5 - Marketing Analytics */}
            <div className="noxtm-must-card">
              <div className="noxtm-must-card-content">
                <h3 className="noxtm-must-card-title">Wasting money on marketing that doesn't work?</h3>
                <p className="noxtm-must-card-description">
                  Launch email campaigns, WhatsApp marketing, and track analytics across multiple channels. Drive conversions with data-driven insights.
                </p>
              </div>
              <div className="noxtm-must-card-visual noxtm-must-card-visual-marketing">
                <img src={wastingMoney} alt="Marketing Analytics Solution" className="noxtm-must-card-image noxtm-must-card-image-marketing" />
              </div>
            </div>

            {/* Card 6 - AI Reports */}
            <div className="noxtm-must-card">
              <div className="noxtm-must-card-content">
                <h3 className="noxtm-must-card-title">Too busy to read every single report?</h3>
                <p className="noxtm-must-card-description">
                  Let our AI do it. It reads all the data and gives you a simple summary of what's really going on.
                </p>
              </div>
              <div className="noxtm-must-card-visual noxtm-must-card-visual-reports">
                <img src={busyToRead} alt="AI Reports Solution" className="noxtm-must-card-image noxtm-must-card-image-reports" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Blog Journal Section - Back Inside Container */}
      <div className="Container-home">
        <div className="hero-section">
          {/* Blog Journal Section - Dynamic Content */}
          <div className="blog-journal-section">
            <div className="blog-journal-layout">
              <div className="blog-journal-heading">
                <h2 className="blog-story-text">Your Story,</h2>
                <h2 className="blog-insights-text">Our Insights.</h2>
              </div>
              
              <div className="blog-journal-grid">
                {loading ? (
                  <div className="blog-loading">
                    <p>Loading latest insights...</p>
                  </div>
                ) : (
                  featuredBlogs.map((blog, index) => renderBlogCard(blog, index))
                )}
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}

export default Home;

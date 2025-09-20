import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import './home.css';
import api from '../config/api';
import { ReactComponent as CreativeFuelLogo } from './image/creativefuel.svg';
import { ReactComponent as EfdStudioLogo } from './image/efd_studio.svg';
import { ReactComponent as MaxternLogo } from './image/maxtern.svg';
import { ReactComponent as OperaLogo } from './image/opera.svg';
import { ReactComponent as DesignIcon } from './image/design.svg';
import { ReactComponent as WebDevIcon } from './image/webdev.svg';
import { ReactComponent as MediaBuyingIcon } from './image/media_buying.svg';
import { ReactComponent as JobPlacementIcon } from './image/job_placement.svg';
import WhiteOverlaySvg from './image/White_Overlay.svg';
// Blog images (fallback)
import blogImage1 from './image/Blog1.jpg';
import blogImage2 from './image/Blog2.jpg';
import blogImage3 from './image/Blog3.jpg';
import { ReactComponent as LinkArrow } from './image/link_arrow_white.svg';

function Home({ user }) {
  const [featuredBlogs, setFeaturedBlogs] = useState([]);
  const [loading, setLoading] = useState(true);

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
      return `https://noxtmstudio.com${blog.featuredImage.path}`;
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
      <div className="container">
        <div className="hero-section">
          <div 
            className="masterpiece-form"
            style={{
              backgroundImage: `url(${WhiteOverlaySvg})`,
              backgroundRepeat: 'no-repeat',
              backgroundPosition: 'center center',
              backgroundSize: '100%'
            }}
          >
            <div className="masterpiece-content">
              <h1>Management of Your Masterpiece</h1>
              <div className="form-container">
                <input 
                  type="email" 
                  placeholder="you@company.com" 
                  className="email-input"
                />
                <button className="get-free-btn">Get It Free</button>
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

          {/* Blog Journal Section - Dynamic Content */}
          <div className="blog-journal-section">
            <div className="blog-journal-layout">
              <div className="blog-journal-heading">
                <h2 className="blog-story-text">Your Story,</h2>
                <h2 className="blog-insights-text">Our Insights.</h2>
                <Link to="/blog" className="read-all-journals">
                  <span>Read All Journals</span>
                  <svg width="20" height="20" viewBox="0 0 12 13" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <line y1="2.06159" x2="11.4127" y2="2.06159" stroke="black" strokeWidth="2.12341"/>
                    <line x1="10.6728" y1="0.976868" x2="10.9215" y2="12.3896" stroke="black" strokeWidth="2.12341"/>
                    <line x1="10.9617" y1="1.75074" x2="1.35094" y2="11.3615" stroke="black" strokeWidth="2.12341"/>
                  </svg>
                </Link>
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

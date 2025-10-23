import React from 'react';
import '../styles/About.css';

export default function About() {
  return (
    <div className="about-container">
      {/* Hero Section */}
      <section className="about-hero">
        <div className="container">
          <h1>About Nutritionix</h1>
          <p className="hero-subtitle">
            Empowering healthier lifestyles through intelligent nutrition tracking and AI-powered insights
          </p>
        </div>
      </section>

      {/* Mission Section */}
      <section className="mission">
        <div className="container">
          <div className="mission-content">
            <div className="mission-text">
              <h2>Our Mission</h2>
              <p>
                At Nutritionix, we believe that everyone deserves access to intelligent, personalized nutrition guidance. 
                Our mission is to revolutionize how people approach their health by combining cutting-edge AI technology 
                with comprehensive nutrition science to make healthy living accessible, engaging, and sustainable.
              </p>
              <p>
                We're addressing the critical challenge of maintaining proper nutrition in today's fast-paced world, 
                where busy schedules and information overload often lead to poor dietary choices. Our platform serves 
                as your digital nutrition companion, providing the insights and tools you need to make informed decisions 
                about your health.
              </p>
            </div>
            <div className="mission-visual">
              <div className="vision-card">
                <h3>🎯 Our Vision</h3>
                <p>To become the world's most trusted AI-powered nutrition platform, helping millions achieve their health goals through intelligent, personalized guidance.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Technology Section */}
      <section className="technology">
        <div className="container">
          <h2 className="section-title">Powered by Advanced Technology</h2>
          <div className="tech-grid">
            
            <div className="tech-card">
              <div className="tech-icon">🤖</div>
              <h3>AI Health Analysis Engine</h3>
              <p>Our proprietary AI system analyzes nutritional data and provides personalized health scores (0-100), 
              smart warnings, and healthier alternatives for every food choice.</p>
              <div className="tech-features">
                <span>Multi-factor scoring algorithm</span>
                <span>Real-time health recommendations</span>
                <span>Intelligent food categorization</span>
              </div>
            </div>

            <div className="tech-card">
              <div className="tech-icon">⚛️</div>
              <h3>Modern Frontend Architecture</h3>
              <p>Built with React.js and modern web technologies, our responsive interface provides seamless 
              user experience across all devices with real-time updates and intuitive navigation.</p>
              <div className="tech-features">
                <span>React functional components</span>
                <span>Custom hooks & context</span>
                <span>Mobile-responsive design</span>
              </div>
            </div>

            <div className="tech-card">
              <div className="tech-icon">🔧</div>
              <h3>Robust Backend Infrastructure</h3>
              <p>Our Go-powered backend ensures fast, secure, and reliable data processing with JWT authentication, 
              PostgreSQL database, and comprehensive API endpoints.</p>
              <div className="tech-features">
                <span>Go with Gin framework</span>
                <span>PostgreSQL database</span>
                <span>JWT authentication</span>
              </div>
            </div>

            <div className="tech-card">
              <div className="tech-icon">📊</div>
              <h3>Comprehensive Data Management</h3>
              <p>Access to extensive nutrition databases with real-time search capabilities, multiple measurement 
              units, and detailed macro/micronutrient tracking for accurate analysis.</p>
              <div className="tech-features">
                <span>10,000+ food database</span>
                <span>Multiple measurement units</span>
                <span>Real-time calculations</span>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* Features Deep Dive */}
      <section className="features-deep">
        <div className="container">
          <h2 className="section-title">What Makes Us Different</h2>
          
          <div className="feature-deep-grid">
            
            <div className="feature-deep">
              <div className="feature-deep-header">
                <span className="feature-number">01</span>
                <h3>AI-Powered Intelligence</h3>
              </div>
              <div className="feature-deep-content">
                <p>Our advanced AI doesn't just count calories – it analyzes nutritional density, evaluates food quality, 
                and provides personalized recommendations based on your individual health profile.</p>
                <ul>
                  <li><strong>Health Scoring:</strong> 0-100 point system for every food</li>
                  <li><strong>Smart Warnings:</strong> Alerts for high sugar, sodium, or processed foods</li>
                  <li><strong>Personalized Tips:</strong> Contextual advice for better nutrition</li>
                  <li><strong>Alternative Suggestions:</strong> Healthier swaps for poor choices</li>
                </ul>
              </div>
            </div>

            <div className="feature-deep">
              <div className="feature-deep-header">
                <span className="feature-number">02</span>
                <h3>Comprehensive Tracking</h3>
              </div>
              <div className="feature-deep-content">
                <p>Track every aspect of your health journey with our integrated meal planning and workout tracking system, 
                designed for real-world usage and flexibility.</p>
                <ul>
                  <li><strong>Meal Planning:</strong> 4-column layout (Breakfast, Lunch, Dinner, Snack)</li>
                  <li><strong>Workout Tracking:</strong> Custom names across 4 categories</li>
                  <li><strong>Goal Management:</strong> Set and track personalized objectives</li>
                  <li><strong>History Tracking:</strong> Monthly organization with easy navigation</li>
                </ul>
              </div>
            </div>

            <div className="feature-deep">
              <div className="feature-deep-header">
                <span className="feature-number">03</span>
                <h3>User-Centric Design</h3>
              </div>
              <div className="feature-deep-content">
                <p>Every feature is designed with user experience in mind, from intuitive navigation to powerful 
                customization options that adapt to your lifestyle and preferences.</p>
                <ul>
                  <li><strong>Intuitive Interface:</strong> Clean, modern design that's easy to navigate</li>
                  <li><strong>Flexible Input:</strong> Multiple ways to add and track information</li>
                  <li><strong>Real-time Updates:</strong> Instant feedback and calculations</li>
                  <li><strong>Mobile Optimized:</strong> Full functionality on any device</li>
                </ul>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* Team Section */}
      <section className="team">
        <div className="container">
          <h2 className="section-title">Built for Health Enthusiasts</h2>
          <div className="audience-grid">
            
            <div className="audience-card">
              <div className="audience-icon">🏃‍♀️</div>
              <h3>Fitness Enthusiasts</h3>
              <p>Track workouts, monitor nutrition, and optimize performance with detailed insights and AI-powered recommendations tailored for active lifestyles.</p>
            </div>

            <div className="audience-card">
              <div className="audience-icon">🥗</div>
              <h3>Health-Conscious Individuals</h3>
              <p>Make informed food choices with our comprehensive nutrition analysis, health scoring, and personalized guidance for better well-being.</p>
            </div>

            <div className="audience-card">
              <div className="audience-icon">📊</div>
              <h3>Nutrition Professionals</h3>
              <p>Access detailed nutritional data, comprehensive tracking tools, and client management features to support professional nutrition counseling.</p>
            </div>

            <div className="audience-card">
              <div className="audience-icon">🎯</div>
              <h3>Goal-Oriented Users</h3>
              <p>Set specific health and fitness objectives, track progress systematically, and receive intelligent insights to achieve your targets efficiently.</p>
            </div>

          </div>
        </div>
      </section>

      {/* Technology Stack */}
      <section className="tech-stack">
        <div className="container">
          <h2 className="section-title">Technology Stack</h2>
          <div className="stack-categories">
            
            <div className="stack-category">
              <h3>Frontend</h3>
              <div className="stack-items">
                <span className="stack-item">React.js</span>
                <span className="stack-item">CSS3</span>
                <span className="stack-item">Vite</span>
                <span className="stack-item">React Router</span>
                <span className="stack-item">Context API</span>
              </div>
            </div>

            <div className="stack-category">
              <h3>Backend</h3>
              <div className="stack-items">
                <span className="stack-item">Go (Golang)</span>
                <span className="stack-item">Gin Framework</span>
                <span className="stack-item">PostgreSQL</span>
                <span className="stack-item">JWT Auth</span>
                <span className="stack-item">RESTful API</span>
              </div>
            </div>

            <div className="stack-category">
              <h3>AI & Data</h3>
              <div className="stack-items">
                <span className="stack-item">Custom AI Engine</span>
                <span className="stack-item">Health Scoring Algorithm</span>
                <span className="stack-item">Nutrition Database</span>
                <span className="stack-item">Real-time Analysis</span>
                <span className="stack-item">Pattern Recognition</span>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="about-cta">
        <div className="container">
          <div className="cta-content">
            <h2>Ready to Start Your Health Journey?</h2>
            <p>Join thousands of users who trust Nutritionix to guide their path to better health and wellness.</p>
            <div className="cta-stats">
              <div className="cta-stat">
                <strong>10,000+</strong>
                <span>Foods Analyzed</span>
              </div>
              <div className="cta-stat">
                <strong>AI-Powered</strong>
                <span>Health Insights</span>
              </div>
              <div className="cta-stat">
                <strong>24/7</strong>
                <span>Tracking Available</span>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

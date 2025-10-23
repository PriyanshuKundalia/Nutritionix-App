import React, { useContext } from 'react';
import { Link } from 'react-router-dom';
import { AuthContext } from '../contexts/AuthContext';
import '../styles/Home.css';

export default function Home() {
  const { authToken, isAuthenticated } = useContext(AuthContext);
  const user = authToken; // Simple check - if token exists, user is logged in

  return (
    <div className="home-container">
      {/* Hero Section */}
      <section className="hero">
        <div className="hero-content">
          <h1 className="hero-title">
            Transform Your Health with 
            <span className="highlight"> AI-Powered Nutrition</span>
          </h1>
          <p className="hero-subtitle">
            Track meals, plan workouts, and achieve your fitness goals with intelligent recommendations 
            and comprehensive nutrition analysis powered by advanced AI technology.
          </p>
          <div className="hero-buttons">
            {authToken ? (
              <Link to="/dashboard" className="btn btn-primary">
                Go to Dashboard
              </Link>
            ) : (
              <>
                <Link to="/register" className="btn btn-primary">
                  Start Your Journey
                </Link>
                <Link to="/login" className="btn btn-secondary">
                  Sign In
                </Link>
              </>
            )}
          </div>
        </div>
        <div className="hero-image">
          <div className="nutrition-card-demo">
            <div className="demo-card">
              <h4>🥗 Today's Nutrition</h4>
              <div className="demo-stats">
                <span>1,850 / 2,200 cal</span>
                <span>AI Score: 85/100 ✅</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="features">
        <div className="container">
          <h2 className="section-title">Powerful Features for Your Health Journey</h2>
          <div className="features-grid">
            
            <div className="feature-card">
              <div className="feature-icon">🤖</div>
              <h3>AI-Powered Health Analysis</h3>
              <p>Get intelligent health scores (0-100), personalized recommendations, and smart warnings for every food choice with our advanced AI engine.</p>
              <ul className="feature-list">
                <li>Real-time health scoring</li>
                <li>Personalized nutrition tips</li>
                <li>Healthier alternative suggestions</li>
              </ul>
            </div>

            <div className="feature-card">
              <div className="feature-icon">🍽️</div>
              <h3>Smart Meal Planning</h3>
              <p>Plan your meals with our intuitive 4-column layout (Breakfast, Lunch, Dinner, Snack) and track nutrition across different time periods.</p>
              <ul className="feature-list">
                <li>Daily meal organization</li>
                <li>Monthly history tracking</li>
                <li>Nutritional totals & analysis</li>
              </ul>
            </div>

            <div className="feature-card">
              <div className="feature-icon">💪</div>
              <h3>Comprehensive Workout Tracking</h3>
              <p>Track all workout types with custom names and durations. Organize by Cardio, Strength, Flexibility, and Sports categories.</p>
              <ul className="feature-list">
                <li>Custom workout names</li>
                <li>Duration & calorie tracking</li>
                <li>Smart categorization</li>
              </ul>
            </div>

            <div className="feature-card">
              <div className="feature-icon">🎯</div>
              <h3>Goal Management</h3>
              <p>Set personalized fitness and nutrition goals, track progress, and get insights to stay motivated on your health journey.</p>
              <ul className="feature-list">
                <li>Custom goal setting</li>
                <li>Progress tracking</li>
                <li>Achievement insights</li>
              </ul>
            </div>

            <div className="feature-card">
              <div className="feature-icon">📊</div>
              <h3>Detailed Nutrition Database</h3>
              <p>Access comprehensive nutritional information with real-time search, multiple units, and detailed macro/micronutrient tracking.</p>
              <ul className="feature-list">
                <li>Searchable food database</li>
                <li>Multiple measurement units</li>
                <li>Complete nutrition profiles</li>
              </ul>
            </div>

            <div className="feature-card">
              <div className="feature-icon">📱</div>
              <h3>Modern User Experience</h3>
              <p>Enjoy a clean, responsive design that works seamlessly across all devices with real-time updates and intuitive navigation.</p>
              <ul className="feature-list">
                <li>Mobile-responsive design</li>
                <li>Real-time calculations</li>
                <li>Secure authentication</li>
              </ul>
            </div>

          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="stats">
        <div className="container">
          <h2 className="section-title">Why Choose Nutritionix?</h2>
          <div className="stats-grid">
            <div className="stat-card">
              <div className="stat-number">85/100</div>
              <div className="stat-label">Average AI Health Score</div>
            </div>
            <div className="stat-card">
              <div className="stat-number">10,000+</div>
              <div className="stat-label">Foods in Database</div>
            </div>
            <div className="stat-card">
              <div className="stat-number">4</div>
              <div className="stat-label">Workout Categories</div>
            </div>
            <div className="stat-card">
              <div className="stat-number">24/7</div>
              <div className="stat-label">Real-time Tracking</div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="cta">
        <div className="container">
          <div className="cta-content">
            <h2>Ready to Transform Your Health?</h2>
            <p>Join thousands of users who are already achieving their fitness goals with Nutritionix</p>
            {!authToken && (
              <Link to="/register" className="btn btn-primary btn-large">
                Get Started for Free
              </Link>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}

import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../contexts/AuthContext';
import '../styles/Dashboard.css';

export default function Dashboard() {
  const { authToken } = useContext(AuthContext);
  const [userData, setUserData] = useState(null);
  const [meals, setMeals] = useState([]);
  const [workouts, setWorkouts] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  const getValidToken = () => {
    const token = authToken || localStorage.getItem('token');
    if (!token) return null;
    
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      const currentTime = Math.floor(Date.now() / 1000);
      if (payload.exp < currentTime) {
        localStorage.removeItem('token');
        return null;
      }
      return token;
    } catch {
      localStorage.removeItem('token');
      return null;
    }
  };

  useEffect(() => {
    async function fetchDashboardData() {
      const token = getValidToken();
      if (!token) {
        setError('Please log in to view your dashboard');
        setLoading(false);
        return;
      }

      try {
        // Fetch all data in parallel
        const [userResponse, mealsResponse, workoutsResponse] = await Promise.all([
          fetch('http://localhost:8080/user/profile', {
            headers: { Authorization: `Bearer ${token}` },
          }),
          fetch('http://localhost:8080/user/meals', {
            headers: { Authorization: `Bearer ${token}` },
          }),
          fetch('http://localhost:8080/user/workouts', {
            headers: { Authorization: `Bearer ${token}` },
          }),
        ]);

        if (userResponse.ok) {
          const userData = await userResponse.json();
          setUserData(userData);
        }

        if (mealsResponse.ok) {
          const mealsData = await mealsResponse.json();
          setMeals(Array.isArray(mealsData) ? mealsData : []);
        }

        if (workoutsResponse.ok) {
          const workoutsData = await workoutsResponse.json();
          setWorkouts(Array.isArray(workoutsData) ? workoutsData : []);
        }

      } catch (err) {
        console.error('Dashboard fetch error:', err);
        setError('Failed to load dashboard data');
      } finally {
        setLoading(false);
      }
    }

    fetchDashboardData();
  }, [authToken]);

  // Helper functions
  const isSameDate = (d1, d2) => {
    const date1 = new Date(d1);
    const date2 = new Date(d2);
    return (
      date1.getFullYear() === date2.getFullYear() &&
      date1.getMonth() === date2.getMonth() &&
      date1.getDate() === date2.getDate()
    );
  };

  const today = new Date();
  const todayString = today.getFullYear() + '-' + 
    String(today.getMonth() + 1).padStart(2, '0') + '-' + 
    String(today.getDate()).padStart(2, '0');

  // Filter today's data
  const todaysMeals = meals.filter(meal => isSameDate(meal.date, today));
  const todaysWorkouts = workouts.filter(workout => isSameDate(workout.date, today));

  // Calculate workout totals for today
  const workoutTotals = todaysWorkouts.reduce((totals, workout) => {
    totals.totalDuration += workout.duration_min || 0;
    totals.totalCaloriesBurned += workout.calories_burned || 0;
    totals.totalWorkouts += 1;
    return totals;
  }, { totalDuration: 0, totalCaloriesBurned: 0, totalWorkouts: 0 });

  // Recent activity (last 7 days)
  const last7Days = new Date();
  last7Days.setDate(last7Days.getDate() - 7);
  const recentMeals = meals.filter(meal => new Date(meal.date) >= last7Days);
  const recentWorkouts = workouts.filter(workout => new Date(workout.date) >= last7Days);

  if (loading) {
    return (
      <div className="dashboard-container">
        <div className="loading">Loading your dashboard...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="dashboard-container">
        <div className="error">{error}</div>
      </div>
    );
  }

  const user = userData?.data || {};

  return (
    <div className="dashboard-container">
      <div className="dashboard-header">
        <h1>Health & Fitness Dashboard</h1>
        <p>Welcome back, {user.name || user.email || 'User'}!</p>
        <p className="dashboard-date">{today.toLocaleDateString('en-US', { 
          weekday: 'long', 
          year: 'numeric', 
          month: 'long', 
          day: 'numeric' 
        })}</p>
      </div>

      <div className="dashboard-grid">
        {/* Today's Summary */}
        <div className="dashboard-card today-summary">
          <h2>Today's Summary</h2>
          <div className="summary-stats">
            <div className="stat-item">
              <span className="stat-number">{todaysMeals.length}</span>
              <span className="stat-label">Meals Logged</span>
            </div>
            <div className="stat-item">
              <span className="stat-number">{workoutTotals.totalWorkouts}</span>
              <span className="stat-label">Workouts</span>
            </div>
            <div className="stat-item">
              <span className="stat-number">{workoutTotals.totalDuration}</span>
              <span className="stat-label">Minutes Active</span>
            </div>
            <div className="stat-item">
              <span className="stat-number">{workoutTotals.totalCaloriesBurned}</span>
              <span className="stat-label">Calories Burned</span>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="dashboard-card quick-actions">
          <h2>Quick Actions</h2>
          <div className="action-buttons">
            <a href="/mealplanner" className="action-btn meal-btn">
              🍽️ Log Meal
            </a>
            <a href="/workoutplanner" className="action-btn workout-btn">
              💪 Log Workout
            </a>
            <a href="/nutritionlog" className="action-btn nutrition-btn">
              📊 Nutrition Log
            </a>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="dashboard-card recent-activity">
          <h2>Recent Activity (Last 7 Days)</h2>
          <div className="activity-summary">
            <div className="activity-item">
              <span className="activity-icon">🍽️</span>
              <span className="activity-text">{recentMeals.length} meals logged</span>
            </div>
            <div className="activity-item">
              <span className="activity-icon">💪</span>
              <span className="activity-text">{recentWorkouts.length} workouts completed</span>
            </div>
          </div>
        </div>

        {/* Today's Meals Preview */}
        <div className="dashboard-card todays-meals">
          <h2>Today's Meals</h2>
          {todaysMeals.length === 0 ? (
            <div className="no-data">
              <p>No meals logged today</p>
              <a href="/mealplanner" className="link-btn">Log Your First Meal</a>
            </div>
          ) : (
            <div className="meals-preview">
              {todaysMeals.slice(0, 4).map(meal => (
                <div key={meal.id} className="meal-preview-item">
                  <span className="meal-type">{meal.meal_type}</span>
                  <span className="meal-time">
                    {new Date(meal.created_at).toLocaleTimeString('en-US', { 
                      hour: '2-digit', 
                      minute: '2-digit' 
                    })}
                  </span>
                </div>
              ))}
              {todaysMeals.length > 4 && (
                <a href="/mealplanner" className="link-btn">View All Meals</a>
              )}
            </div>
          )}
        </div>

        {/* Today's Workouts Preview */}
        <div className="dashboard-card todays-workouts">
          <h2>Today's Workouts</h2>
          {todaysWorkouts.length === 0 ? (
            <div className="no-data">
              <p>No workouts logged today</p>
              <a href="/workoutplanner" className="link-btn">Log Your First Workout</a>
            </div>
          ) : (
            <div className="workouts-preview">
              {todaysWorkouts.slice(0, 4).map(workout => (
                <div key={workout.id} className="workout-preview-item">
                  <span className="workout-name">{workout.name}</span>
                  <span className="workout-duration">
                    {workout.duration_min > 0 ? `${workout.duration_min} min` : 'No duration set'}
                  </span>
                </div>
              ))}
              {todaysWorkouts.length > 4 && (
                <a href="/workoutplanner" className="link-btn">View All Workouts</a>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

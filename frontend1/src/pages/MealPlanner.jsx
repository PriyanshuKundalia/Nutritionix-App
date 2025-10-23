import React, { useState, useEffect, useContext } from "react";
import { AuthContext } from "../contexts/AuthContext";
import MealFoods from "./MealFoods";

export default function MealPlanner() {
  const { authToken } = useContext(AuthContext || {});
  const [meals, setMeals] = useState([]);
  const [error, setError] = useState("");
  const [date, setDate] = useState("");
  const [mealType, setMealType] = useState("");
  const [selectedMealId, setSelectedMealId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [showHistory, setShowHistory] = useState(false);
  const [expandedDates, setExpandedDates] = useState(new Set());
  const [expandedMonths, setExpandedMonths] = useState(new Set([new Date().toISOString().slice(0, 7)])); // Current month expanded by default
  const [mealSummaries, setMealSummaries] = useState({});
  const [fullScreenMealType, setFullScreenMealType] = useState(null);
  const [fullScreenMeal, setFullScreenMeal] = useState(null);

  const getValidToken = () => {
    const token = authToken || localStorage.getItem('token');
    if (!token) return null;
    
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      const currentTime = Math.floor(Date.now() / 1000);
      if (payload.exp < currentTime) {
        localStorage.removeItem('token');
        setError("❌ Session expired. Please log in again.");
        return null;
      }
      return token;
    } catch {
      localStorage.removeItem('token');
      return null;
    }
  };

  useEffect(() => {
    async function fetchMeals() {
      const token = getValidToken();
      if (!token) {
        setError("Please log in to view your meals");
        return;
      }

      setLoading(true);
      setError("");
      try {
        const res = await fetch("http://localhost:8080/user/meals", {
          headers: { Authorization: `Bearer ${token}` },
        });
        
        if (!res.ok) {
          if (res.status === 401) {
            setError("❌ Session expired. Please log in again.");
            localStorage.removeItem('token');
          } else {
            setError("Failed to fetch meals");
          }
          setMeals([]);
          return;
        }
        
        const data = await res.json().catch(() => []);
        setMeals(Array.isArray(data) ? data : []);
      } catch (e) {
        console.error('Fetch meals error:', e);
        setError("Network error");
      } finally {
        setLoading(false);
      }
    }

    fetchMeals();
  }, [authToken, refreshKey]);

  async function handleAddMeal(e) {
    e.preventDefault();
    const token = getValidToken();
    if (!token) return;

    setError("");
    if (!date || !mealType) {
      setError("Please select date and meal type");
      return;
    }
    
    try {
      const res = await fetch("http://localhost:8080/user/meals", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ date, meal_type: mealType }),
      });
      
      if (!res.ok) {
        if (res.status === 401) {
          setError("❌ Session expired. Please log in again.");
          localStorage.removeItem('token');
        } else {
          setError("Failed to add meal");
        }
        return;
      }
      
      const newMeal = await res.json();
      setMeals(prev => [newMeal, ...(prev || [])]);
      setDate("");
      setMealType("");
      setSelectedMealId(newMeal.id);
      setError("✅ Meal added successfully!");
      setTimeout(() => setError(""), 3000);
    } catch (err) {
      console.error('Add meal error:', err);
      setError("Network error");
    }
  }

  async function handleDeleteMeal(meal, e) {
    e.stopPropagation();
    
    const token = getValidToken();
    if (!token) {
      setError("❌ Please log in to delete meals");
      return;
    }
    
    if (!window.confirm(`Delete ${meal.meal_type} on ${new Date(meal.date).toLocaleDateString()}?`)) {
      return;
    }
    
    try {
      const res = await fetch(`http://localhost:8080/user/meals/${meal.id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      
      if (!res.ok) {
        if (res.status === 401) {
          setError("❌ Session expired. Please log in again.");
          localStorage.removeItem('token');
        } else {
          setError("❌ Failed to delete meal");
        }
        return;
      }
      
      setMeals(prev => prev.filter(m => m.id !== meal.id));
      
      if (selectedMealId === meal.id) {
        setSelectedMealId(null);
      }
      
      setError("✅ Meal deleted successfully!");
      setTimeout(() => setError(""), 3000);
      
    } catch (err) {
      console.error("Delete meal error:", err);
      setError("❌ Network error when deleting meal");
    }
  }

  function handleSelectMeal(meal, e) {
    e?.preventDefault();
    e?.stopPropagation();
    
    // Open meal in fullscreen instead of inline
    openFullScreenMeal(meal);
  }

  function toggleDateExpansion(dateKey) {
    setExpandedDates(prev => {
      const newSet = new Set(prev);
      if (newSet.has(dateKey)) {
        newSet.delete(dateKey);
      } else {
        newSet.add(dateKey);
      }
      return newSet;
    });
  }

  async function fetchMealSummary(mealId) {
    const token = getValidToken();
    if (!token || !mealId) return null;

    try {
      const response = await fetch(`http://localhost:8080/user/meals/${mealId}/foods`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      
      if (!response.ok) return null;
      
      const foods = await response.json();
      if (!Array.isArray(foods) || foods.length === 0) {
        return { foodCount: 0, totalCalories: 0, totalProtein: 0 };
      }
      
      const totalCalories = foods.reduce((sum, food) => sum + (food.calories || 0), 0);
      const totalProtein = foods.reduce((sum, food) => sum + (food.protein || 0), 0);
      
      return {
        foodCount: foods.length,
        totalCalories: Math.round(totalCalories),
        totalProtein: Math.round(totalProtein * 10) / 10
      };
    } catch (err) {
      console.error('Error fetching meal summary:', err);
      return null;
    }
  }

  // Fetch summaries for all meals
  useEffect(() => {
    async function loadMealSummaries() {
      if (meals.length === 0) return;
      
      const summaries = {};
      await Promise.all(
        meals.map(async (meal) => {
          const summary = await fetchMealSummary(meal.id);
          if (summary) {
            summaries[meal.id] = summary;
          }
        })
      );
      
      setMealSummaries(summaries);
    }
    
    loadMealSummaries();
  }, [meals, refreshKey]);

  function openFullScreenMealType(mealType) {
    setFullScreenMealType(mealType);
  }

  function closeFullScreenMealType() {
    setFullScreenMealType(null);
  }

  function openFullScreenMeal(meal) {
    setFullScreenMeal(meal);
    setSelectedMealId(null); // Close any compact view
  }

  function closeFullScreenMeal() {
    setFullScreenMeal(null);
  }

  async function addMealToDate(date, mealType) {
    console.log('addMealToDate called with:', date, mealType);
    
    // Ensure date is in YYYY-MM-DD format
    const dateOnly = date.includes('T') ? date.split('T')[0] : date.slice(0, 10);
    console.log('Formatted date:', dateOnly);
    
    const token = getValidToken();
    if (!token) {
      console.log('No valid token');
      return;
    }

    setError("");
    
    try {
      console.log('Making API call to add meal');
      const requestBody = { date: dateOnly, meal_type: mealType };
      console.log('Request body:', requestBody);
      
      const res = await fetch("http://localhost:8080/user/meals", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(requestBody),
      });
      
      console.log('API response status:', res.status);
      
      if (!res.ok) {
        const errorText = await res.text();
        console.log('API error response:', errorText);
        if (res.status === 401) {
          setError("❌ Session expired. Please log in again.");
          localStorage.removeItem('token');
        } else {
          setError(`Failed to add meal: ${errorText}`);
        }
        return;
      }
      
      const newMeal = await res.json();
      console.log('New meal created:', newMeal);
      setMeals(prev => [newMeal, ...(prev || [])]);
      setError("✅ Meal added successfully!");
      setTimeout(() => setError(""), 3000);
      
      // Open the newly created meal in fullscreen
      openFullScreenMeal(newMeal);
      
    } catch (err) {
      console.error('Add meal error:', err);
      setError("Network error");
    }
  }

  function toggleMonthExpansion(monthKey) {
    setExpandedMonths(prev => {
      const newSet = new Set(prev);
      if (newSet.has(monthKey)) {
        newSet.delete(monthKey);
      } else {
        newSet.add(monthKey);
      }
      return newSet;
    });
  }

  function getMonthName(monthKey) {
    const date = new Date(monthKey + '-01');
    return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  }

  function organizeMealsByMonth(meals) {
    const monthGroups = {};
    
    meals.forEach(meal => {
      const monthKey = meal.date.slice(0, 7); // "2025-09"
      if (!monthGroups[monthKey]) {
        monthGroups[monthKey] = {};
      }
      if (!monthGroups[monthKey][meal.date]) {
        monthGroups[monthKey][meal.date] = [];
      }
      monthGroups[monthKey][meal.date].push(meal);
    });
    
    return monthGroups;
  }

  function renderMealSummary(meal) {
    const summary = mealSummaries[meal.id];
    
    if (!summary) {
      return (
        <div className="meal-summary">
          <span className="food-count loading-summary">Loading...</span>
        </div>
      );
    }
    
    if (summary.foodCount === 0) {
      return (
        <div className="meal-summary">
          <span className="food-count empty-meal">No foods added</span>
          <span className="nutrition-summary">Click to add foods</span>
        </div>
      );
    }
    
    return (
      <div className="meal-summary">
        <span className="food-count">
          {summary.foodCount} food{summary.foodCount !== 1 ? 's' : ''}
        </span>
        <span className="nutrition-summary">
          {summary.totalCalories} cal • {summary.totalProtein}g protein
        </span>
      </div>
    );
  }

  const selectedMeal = meals.find(meal => meal.id === selectedMealId);

  function isSameDate(d1, d2) {
    const date1 = new Date(d1);
    const date2 = new Date(d2);
    return (
      date1.getFullYear() === date2.getFullYear() &&
      date1.getMonth() === date2.getMonth() &&
      date1.getDate() === date2.getDate()
    );
  }

  const today = new Date();
  const todaysMeals = meals.filter(meal => isSameDate(meal.date, today));
  
  // Group today's meals by type
  const todaysMealsByType = {
    breakfast: todaysMeals.filter(meal => meal.meal_type === 'breakfast'),
    lunch: todaysMeals.filter(meal => meal.meal_type === 'lunch'),
    dinner: todaysMeals.filter(meal => meal.meal_type === 'dinner'),
    snack: todaysMeals.filter(meal => meal.meal_type === 'snack')
  };
  
  // Organize history meals by month, then by date
  const historyMeals = meals.filter(meal => !isSameDate(meal.date, today));
  const historyMealsByMonth = organizeMealsByMonth(historyMeals);

  return (
    <div className="mealplanner-container">
      <h1 className="title">Meal Planner</h1>

      {error && (
        <p className={`error ${error.startsWith('✅') ? 'success' : ''}`}>
          {error}
        </p>
      )}

      <form onSubmit={handleAddMeal} className="add-meal-form">
        <label>
          Date:
          <input
            type="date"
            value={date}
            onChange={e => setDate(e.target.value)}
            required
            className="input"
          />
        </label>
        <label>
          Meal Type:
          <select
            value={mealType}
            onChange={e => setMealType(e.target.value)}
            required
            className="input"
          >
            <option value="">Select Meal Type</option>
            <option value="breakfast">Breakfast</option>
            <option value="lunch">Lunch</option>
            <option value="dinner">Dinner</option>
            <option value="snack">Snack</option>
          </select>
        </label>
        <button type="submit" className="add-btn">
          Add Meal
        </button>
      </form>

      {selectedMeal && (
        <div className="selected-meal-indicator">
          📌 Selected: {new Date(selectedMeal.date).toLocaleDateString()} — {selectedMeal.meal_type.charAt(0).toUpperCase() + selectedMeal.meal_type.slice(1)}
        </div>
      )}

      <h2 className="subtitle">Your Meals (Today)</h2>
      {loading ? (
        <p className="loading">Loading meals...</p>
      ) : (
        <div className="todays-meals-grid">
          {['breakfast', 'lunch', 'dinner', 'snack'].map(mealType => (
            <div key={mealType} className="meal-type-column">
              <h3 
                className="meal-type-header clickable"
                onClick={() => openFullScreenMealType(mealType)}
              >
                {mealType.charAt(0).toUpperCase() + mealType.slice(1)}
                <span className="meal-count">({todaysMealsByType[mealType].length})</span>
              </h3>
              <div className="meal-type-content">
                {todaysMealsByType[mealType].length === 0 ? (
                  <div 
                    className="no-meals-today clickable-area"
                    onClick={() => openFullScreenMealType(mealType)}
                  >
                    <p>No {mealType} tracked</p>
                    <span className="click-hint">Click to add</span>
                  </div>
                ) : (
                  todaysMealsByType[mealType].map(meal => (
                    <div
                      key={meal.id}
                      className="meal-item compact"
                    >
                      <div 
                        className="meal-header compact clickable-meal"
                        onClick={(e) => handleSelectMeal(meal, e)}
                      >
                        {renderMealSummary(meal)}
                        <button
                          onClick={(e) => handleDeleteMeal(meal, e)}
                          className="delete-btn compact"
                          title="Delete meal"
                        >
                          🗑️
                        </button>
                      </div>
                    </div>
                  ))
                )}
                <button 
                  className="add-meal-quick-btn"
                  onClick={() => openFullScreenMealType(mealType)}
                >
                  + Add {mealType}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="history-section">
        <div className="history-header">
          <h2 className="subtitle" style={{ marginTop: "36px", marginBottom: "15px" }}>
            Meal History
          </h2>
          <button 
            className="toggle-history-btn"
            onClick={() => setShowHistory(!showHistory)}
          >
            {showHistory ? "Hide History" : "Show History"}
          </button>
        </div>
        
        {showHistory && (
          <>
            {Object.keys(historyMealsByMonth).length === 0 ? (
              <p className="no-data">No past meals.</p>
            ) : (
              Object.keys(historyMealsByMonth)
                .sort((a, b) => new Date(b) - new Date(a)) // Sort months newest first
                .map(monthKey => {
                  const isMonthExpanded = expandedMonths.has(monthKey);
                  const monthMeals = historyMealsByMonth[monthKey];
                  const totalMealsInMonth = Object.values(monthMeals).flat().length;
                  
                  return (
                    <div key={monthKey} className="history-month-group">
                      <div
                        className="history-month-header"
                        onClick={() => toggleMonthExpansion(monthKey)}
                      >
                        <div className="month-info">
                          <span className="month-text">{getMonthName(monthKey)}</span>
                          <span className="month-stats">({totalMealsInMonth} meals)</span>
                        </div>
                        <span className="month-expand-icon">
                          {isMonthExpanded ? '▼' : '▶'}
                        </span>
                      </div>
                      
                      {isMonthExpanded && (
                        <div className="history-month-content">
                          {Object.keys(monthMeals)
                            .sort((a, b) => new Date(b) - new Date(a)) // Sort dates newest first
                            .map(dateKey => {
                              const dateMeals = monthMeals[dateKey];
                              const isDateExpanded = expandedDates.has(dateKey);
                              
                              // Group meals by type for this date
                              const dateMealsByType = {
                                breakfast: dateMeals.filter(meal => meal.meal_type === 'breakfast'),
                                lunch: dateMeals.filter(meal => meal.meal_type === 'lunch'),
                                dinner: dateMeals.filter(meal => meal.meal_type === 'dinner'),
                                snack: dateMeals.filter(meal => meal.meal_type === 'snack')
                              };
                              
                              return (
                                <div key={dateKey} className="history-date-group">
                                  <div
                                    className="history-date-header clickable"
                                    onClick={() => toggleDateExpansion(dateKey)}
                                  >
                                    <span className="date-text">
                                      {new Date(dateKey).toLocaleDateString()}
                                    </span>
                                    <div className="date-info">
                                      <span className="date-meal-count">({dateMeals.length} meals)</span>
                                      <span className="expand-icon">
                                        {isDateExpanded ? '▼' : '▶'}
                                      </span>
                                    </div>
                                  </div>
                                  
                                  {isDateExpanded && (
                                    <div className="history-meals-grid">
                                      {['breakfast', 'lunch', 'dinner', 'snack'].map(mealType => (
                                        <div key={mealType} className="history-meal-type-column">
                                          <h4 className="history-meal-type-header">
                                            {mealType.charAt(0).toUpperCase() + mealType.slice(1)}
                                            <span className="meal-count">({dateMealsByType[mealType].length})</span>
                                          </h4>
                                          <div className="history-meal-type-content">
                                            {dateMealsByType[mealType].length === 0 ? (
                                              <div 
                                                className="no-meals-history clickable-add"
                                                onClick={(e) => {
                                                  e.preventDefault();
                                                  e.stopPropagation();
                                                  console.log('Clicked add meal for:', dateKey, mealType);
                                                  addMealToDate(dateKey, mealType);
                                                }}
                                              >
                                                <p onClick={(e) => e.stopPropagation()}>No {mealType}</p>
                                                <span className="add-hint" onClick={(e) => e.stopPropagation()}>Click to add</span>
                                              </div>
                                            ) : (
                                              dateMealsByType[mealType].map(meal => (
                                                <div
                                                  key={meal.id}
                                                  className="meal-item compact history"
                                                >
                                                  <div 
                                                    className="meal-header compact clickable-meal"
                                                    onClick={(e) => handleSelectMeal(meal, e)}
                                                  >
                                                    {renderMealSummary(meal)}
                                                    <button
                                                      onClick={(e) => handleDeleteMeal(meal, e)}
                                                      className="delete-btn compact"
                                                      title="Delete meal"
                                                    >
                                                      🗑️
                                                    </button>
                                                  </div>
                                                </div>
                                              ))
                                            )}
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                        </div>
                      )}
                    </div>
                  );
                })
            )}
          </>
        )}
      </div>

      {/* Full-Screen Meal Type Modal */}
      {fullScreenMealType && (
        <div className="fullscreen-modal">
          <div className="fullscreen-modal-content">
            <div className="fullscreen-header">
              <h2>{fullScreenMealType.charAt(0).toUpperCase() + fullScreenMealType.slice(1)} - {new Date().toLocaleDateString()}</h2>
              <button 
                className="close-fullscreen-btn"
                onClick={closeFullScreenMealType}
              >
                ✕
              </button>
            </div>
            
            <div className="fullscreen-body">
              <div className="add-meal-section">
                <button
                  onClick={async (e) => {
                    e.preventDefault();
                    // Use local date instead of UTC to avoid timezone issues
                    const today = new Date();
                    const localDateString = today.getFullYear() + '-' + 
                      String(today.getMonth() + 1).padStart(2, '0') + '-' + 
                      String(today.getDate()).padStart(2, '0');
                    
                    console.log('Creating meal for date:', localDateString);
                    
                    const token = getValidToken();
                    if (!token) return;

                    try {
                      const res = await fetch("http://localhost:8080/user/meals", {
                        method: "POST",
                        headers: {
                          "Content-Type": "application/json",
                          Authorization: `Bearer ${token}`,
                        },
                        body: JSON.stringify({ date: localDateString, meal_type: fullScreenMealType }),
                      });
                      
                      if (res.ok) {
                        const newMeal = await res.json();
                        console.log('Meal created:', newMeal);
                        setMeals(prev => [newMeal, ...(prev || [])]);
                        setSelectedMealId(newMeal.id);
                        setRefreshKey(prev => prev + 1);
                      } else {
                        const errorText = await res.text();
                        console.error('Failed to create meal:', errorText);
                      }
                    } catch (err) {
                      console.error('Add meal error:', err);
                    }
                  }}
                  className="add-new-meal-btn"
                >
                  + Add New {fullScreenMealType.charAt(0).toUpperCase() + fullScreenMealType.slice(1)} Entry
                </button>
              </div>

              <div className="existing-meals-section">
                <h3>Today's {fullScreenMealType.charAt(0).toUpperCase() + fullScreenMealType.slice(1)} Entries</h3>
                {todaysMealsByType[fullScreenMealType].length === 0 ? (
                  <p className="no-meals-fullscreen">No {fullScreenMealType} entries for today</p>
                ) : (
                  <div className="fullscreen-meals-list">
                    {todaysMealsByType[fullScreenMealType].map(meal => (
                      <div key={meal.id} className="fullscreen-meal-item">
                        <div className="fullscreen-meal-header">
                          <div className="meal-info">
                            {renderMealSummary(meal)}
                          </div>
                          <button
                            onClick={(e) => handleDeleteMeal(meal, e)}
                            className="delete-btn fullscreen"
                            title="Delete meal"
                          >
                            🗑️ Delete
                          </button>
                        </div>
                        <div className="fullscreen-meal-foods">
                          <MealFoods key={`fullscreen-${meal.id}-${refreshKey}`} mealID={meal.id} onFoodAdded={() => setRefreshKey(prev => prev + 1)} />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Full-Screen Individual Meal Modal */}
      {fullScreenMeal && (
        <div className="fullscreen-modal">
          <div className="fullscreen-modal-content">
            <div className="fullscreen-header">
              <h2>
                {fullScreenMeal.meal_type.charAt(0).toUpperCase() + fullScreenMeal.meal_type.slice(1)} - {new Date(fullScreenMeal.date).toLocaleDateString()}
              </h2>
              <button 
                className="close-fullscreen-btn"
                onClick={closeFullScreenMeal}
              >
                ✕
              </button>
            </div>
            
            <div className="fullscreen-body single-meal">
              <div className="meal-summary-header">
                {renderMealSummary(fullScreenMeal)}
              </div>
              
              <div className="meal-management-area">
                <MealFoods 
                  key={`fullscreen-single-${fullScreenMeal.id}-${refreshKey}`} 
                  mealID={fullScreenMeal.id} 
                  onFoodAdded={() => setRefreshKey(prev => prev + 1)} 
                />
              </div>
              
              <div className="meal-actions">
                <button
                  onClick={(e) => {
                    handleDeleteMeal(fullScreenMeal, e);
                    closeFullScreenMeal();
                  }}
                  className="delete-meal-btn"
                >
                  🗑️ Delete This Meal
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .mealplanner-container { 
          max-width: 720px; 
          margin: 40px auto; 
          padding: 30px; 
          background: #121214; 
          border-radius: 12px; 
          box-shadow: 0 8px 30px rgba(0,0,0,0.5); 
          color: #e6eef2; 
          font-family: 'Segoe UI', system-ui, -apple-system, 'Helvetica Neue', Arial; 
        }
        
        .title { 
          text-align: center; 
          font-size: 2.2rem; 
          color: #66d7ff; 
          margin: 0 0 25px; 
          font-weight: 800; 
        }
        
        .error { 
          color: #ff6b6b; 
          text-align: center; 
          margin-bottom: 20px; 
          font-weight: 700; 
          padding: 12px; 
          border-radius: 6px; 
          background: rgba(255, 107, 107, 0.1);
        }
        
        .error.success { 
          color: #4ade80; 
          background: rgba(74,222,128,0.1); 
          border: 1px solid rgba(74,222,128,0.2); 
        }
        
        .selected-meal-indicator { 
          background: rgba(102,215,255,0.1); 
          border: 1px solid rgba(102,215,255,0.2); 
          color: #66d7ff; 
          padding: 12px; 
          border-radius: 8px; 
          margin-bottom: 20px; 
          text-align: center; 
          font-weight: 600; 
        }
        
        .add-meal-form { 
          display: flex; 
          flex-wrap: wrap; 
          gap: 20px; 
          justify-content: center; 
          margin-bottom: 30px; 
          align-items: flex-end; 
          padding: 20px;
          background: rgba(255,255,255,0.02);
          border-radius: 10px;
          box-sizing: border-box;
        }
        
        label { 
          display: flex; 
          flex-direction: column; 
          color: #9fdfff; 
          font-weight: 700; 
          min-width: 180px; 
          flex: 1;
        }
        
        .input { 
          margin-top: 8px; 
          padding: 12px; 
          border-radius: 8px; 
          border: 1px solid rgba(255,255,255,0.1); 
          background: #0b0d10; 
          color: #e6eef2; 
          font-size: 1rem;
          transition: border-color 0.3s ease;
          width: 100%;
          box-sizing: border-box;
        }
        
        .input:focus {
          outline: none;
          border-color: #66d7ff;
          box-shadow: 0 0 8px rgba(102, 215, 255, 0.2);
        }
        
        .add-btn { 
          background: linear-gradient(90deg,#39d6c0,#66d7ff); 
          border: none; 
          padding: 12px 24px; 
          border-radius: 10px; 
          color: #001214; 
          font-weight: 800; 
          cursor: pointer; 
          font-size: 1rem;
          min-width: 140px;
          transition: transform 0.2s ease;
          align-self: flex-end;
        }
        
        .add-btn:hover {
          transform: translateY(-1px);
        }
        
        .subtitle { 
          color: #9aa3ad; 
          font-weight: 800; 
          font-size: 1.2rem; 
          margin: 30px 0 15px; 
          border-bottom: 2px solid #333;
          padding-bottom: 8px;
        }
        
        .loading, .no-data { 
          text-align: center; 
          color: #9aa3ad; 
          padding: 20px;
          font-style: italic;
        }
        
        .meals-list { 
          list-style: none; 
          padding: 0; 
          margin: 15px 0; 
          display: flex;
          flex-direction: column;
          gap: 12px; 
        }
        
        .todays-meals-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
          gap: 20px;
          margin: 20px 0;
        }
        
        .meal-type-column {
          background: rgba(255,255,255,0.02);
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 12px;
          padding: 0;
          overflow: hidden;
        }
        
        .meal-type-header {
          background: linear-gradient(90deg, rgba(102,215,255,0.1), rgba(57,214,192,0.1));
          border-bottom: 1px solid rgba(255,255,255,0.1);
          padding: 15px 20px;
          margin: 0;
          font-size: 1.1rem;
          font-weight: 700;
          color: #66d7ff;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        
        .meal-type-header.clickable {
          cursor: pointer;
          transition: background 0.2s ease;
        }
        
        .meal-type-header.clickable:hover {
          background: linear-gradient(90deg, rgba(102,215,255,0.15), rgba(57,214,192,0.15));
        }
        
        .meal-count {
          font-size: 0.85rem;
          color: #9aa3ad;
          font-weight: 500;
        }
        
        .meal-type-content {
          padding: 15px;
          min-height: 100px;
        }
        
        .no-meals-today {
          text-align: center;
          color: #9aa3ad;
          font-style: italic;
          padding: 20px 10px;
          margin: 0;
        }
        
        .no-meals-today.clickable-area {
          cursor: pointer;
          border: 1px dashed rgba(255,255,255,0.2);
          border-radius: 8px;
          margin: 10px;
          padding: 25px 15px;
          transition: all 0.2s ease;
        }
        
        .no-meals-today.clickable-area:hover {
          border-color: #66d7ff;
          background: rgba(102,215,255,0.05);
        }
        
        .click-hint {
          display: block;
          margin-top: 5px;
          font-size: 0.75rem;
          color: #66d7ff;
          font-weight: 500;
        }
        
        .add-meal-quick-btn {
          width: 100%;
          padding: 10px;
          margin-top: 10px;
          background: linear-gradient(90deg, rgba(102,215,255,0.1), rgba(57,214,192,0.1));
          border: 1px solid rgba(102,215,255,0.3);
          color: #66d7ff;
          border-radius: 6px;
          cursor: pointer;
          font-size: 0.85rem;
          font-weight: 600;
          transition: all 0.2s ease;
        }
        
        .add-meal-quick-btn:hover {
          background: linear-gradient(90deg, rgba(102,215,255,0.15), rgba(57,214,192,0.15));
          transform: translateY(-1px);
        }
        
        .meal-item { 
          border-radius: 10px; 
          background: linear-gradient(180deg, rgba(255,255,255,0.03), rgba(255,255,255,0.01)); 
          border: 1px solid rgba(255,255,255,0.05); 
          transition: all 0.2s ease;
          width: 100%;
          box-sizing: border-box;
        }
        
        .meal-item.selected { 
          box-shadow: 0 10px 30px rgba(54,210,190,0.1); 
          border-color: rgba(54,210,190,0.3); 
          background: linear-gradient(180deg, rgba(54,210,190,0.06), rgba(54,210,190,0.02));
        }
        
        .meal-item.compact {
          margin-bottom: 8px;
          border-radius: 8px;
        }
        
        .meal-item.compact.selected {
          box-shadow: 0 5px 15px rgba(54,210,190,0.15);
        }
        
        .meal-header { 
          display: flex; 
          justify-content: space-between; 
          align-items: center; 
          width: 100%; 
          padding: 15px 20px;
          cursor: pointer;
          user-select: none;
          box-sizing: border-box;
        }
        
        .meal-header:hover {
          background: rgba(255,255,255,0.03);
        }
        
        .meal-header.compact {
          padding: 12px 15px;
          min-height: 60px;
          align-items: flex-start;
        }
        
        .meal-header.compact.expanded {
          border-bottom: 1px solid rgba(255,255,255,0.1);
          background: rgba(255,255,255,0.02);
        }
        
        .clickable-meal {
          cursor: pointer;
          transition: all 0.2s ease;
        }
        
        .clickable-meal:hover {
          background: rgba(102,215,255,0.05);
          transform: translateY(-1px);
        }
        
        .meal-text.compact {
          font-size: 0.9rem;
        }
        
        .meal-summary {
          display: flex;
          flex-direction: column;
          gap: 4px;
          flex: 1;
          min-height: 40px;
        }
        
        .food-count {
          font-weight: 600;
          color: #e6eef2;
          font-size: 0.9rem;
          display: flex;
          align-items: center;
          gap: 4px;
        }
        
        .expanded-badge {
          color: #66d7ff;
          font-size: 0.8rem;
          font-weight: 500;
        }
        
        .expand-indicator {
          color: #66d7ff;
          font-size: 0.75rem;
          font-weight: 500;
          margin-top: 2px;
        }
        
        .nutrition-summary {
          font-size: 0.8rem;
          color: #9aa3ad;
          font-weight: 500;
        }
        
        .loading-summary {
          color: #9aa3ad;
          font-style: italic;
          font-size: 0.85rem;
        }
        
        .empty-meal {
          color: #ff9f43;
          font-style: italic;
          font-size: 0.85rem;
        }
        
        .fullscreen-modal {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0,0,0,0.8);
          z-index: 1000;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 20px;
        }
        
        .fullscreen-modal-content {
          background: #121214;
          border-radius: 12px;
          width: 90vw;
          max-width: 1000px;
          height: 85vh;
          display: flex;
          flex-direction: column;
          box-shadow: 0 20px 60px rgba(0,0,0,0.5);
          border: 1px solid rgba(255,255,255,0.1);
        }
        
        .fullscreen-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 20px 30px;
          border-bottom: 1px solid rgba(255,255,255,0.1);
          background: linear-gradient(90deg, rgba(102,215,255,0.05), rgba(57,214,192,0.05));
        }
        
        .fullscreen-header h2 {
          color: #66d7ff;
          margin: 0;
          font-size: 1.5rem;
          font-weight: 700;
        }
        
        .close-fullscreen-btn {
          background: rgba(255,107,107,0.1);
          border: 1px solid rgba(255,107,107,0.3);
          color: #ff6b6b;
          padding: 8px 12px;
          border-radius: 6px;
          cursor: pointer;
          font-size: 1.1rem;
          font-weight: 600;
          transition: all 0.2s ease;
        }
        
        .close-fullscreen-btn:hover {
          background: rgba(255,107,107,0.2);
          transform: scale(1.05);
        }
        
        .fullscreen-body {
          flex: 1;
          padding: 30px;
          overflow-y: auto;
          display: flex;
          flex-direction: column;
          gap: 30px;
        }
        
        .add-meal-section {
          text-align: center;
        }
        
        .add-new-meal-btn {
          background: linear-gradient(90deg,#39d6c0,#66d7ff);
          border: none;
          padding: 15px 30px;
          border-radius: 10px;
          color: #001214;
          font-weight: 800;
          cursor: pointer;
          font-size: 1.1rem;
          transition: transform 0.2s ease;
        }
        
        .add-new-meal-btn:hover {
          transform: translateY(-2px);
        }
        
        .existing-meals-section h3 {
          color: #9fdfff;
          font-size: 1.2rem;
          margin-bottom: 20px;
          font-weight: 700;
        }
        
        .no-meals-fullscreen {
          text-align: center;
          color: #9aa3ad;
          font-style: italic;
          padding: 40px;
          font-size: 1.1rem;
        }
        
        .fullscreen-meals-list {
          display: flex;
          flex-direction: column;
          gap: 20px;
        }
        
        .fullscreen-meal-item {
          background: rgba(255,255,255,0.02);
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 10px;
          overflow: hidden;
        }
        
        .fullscreen-meal-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 20px;
          border-bottom: 1px solid rgba(255,255,255,0.1);
          background: rgba(255,255,255,0.01);
        }
        
        .delete-btn.fullscreen {
          background: rgba(255,107,107,0.1);
          border: 1px solid rgba(255,107,107,0.2);
          color: #ff6b6b;
          padding: 10px 15px;
          border-radius: 6px;
          cursor: pointer;
          font-size: 0.9rem;
          font-weight: 600;
          transition: all 0.2s ease;
        }
        
        .delete-btn.fullscreen:hover {
          background: rgba(255,107,107,0.2);
          transform: translateY(-1px);
        }
        
        .fullscreen-meal-foods {
          padding: 20px;
        }
        
        .fullscreen-body.single-meal {
          gap: 20px;
        }
        
        .meal-summary-header {
          background: rgba(102,215,255,0.05);
          border: 1px solid rgba(102,215,255,0.2);
          border-radius: 10px;
          padding: 20px;
          text-align: center;
        }
        
        .meal-summary-header .meal-summary {
          align-items: center;
        }
        
        .meal-summary-header .food-count {
          font-size: 1.2rem;
        }
        
        .meal-summary-header .nutrition-summary {
          font-size: 1rem;
        }
        
        .meal-management-area {
          flex: 1;
          background: rgba(255,255,255,0.01);
          border-radius: 10px;
          padding: 20px;
          border: 1px solid rgba(255,255,255,0.05);
        }
        
        .meal-actions {
          text-align: center;
          padding-top: 20px;
          border-top: 1px solid rgba(255,255,255,0.1);
        }
        
        .delete-meal-btn {
          background: rgba(255,107,107,0.1);
          border: 1px solid rgba(255,107,107,0.3);
          color: #ff6b6b;
          padding: 12px 25px;
          border-radius: 8px;
          cursor: pointer;
          font-size: 1rem;
          font-weight: 600;
          transition: all 0.2s ease;
        }
        
        .delete-meal-btn:hover {
          background: rgba(255,107,107,0.2);
          transform: translateY(-1px);
        }
        
        .meal-text { 
          flex: 1; 
          font-weight: 600;
        }
        
        .delete-btn { 
          background: rgba(255,107,107,0.1); 
          border: 1px solid rgba(255,107,107,0.2); 
          color: #ff6b6b; 
          padding: 6px 10px; 
          border-radius: 6px; 
          cursor: pointer; 
          font-size: 14px; 
          margin-left: 12px; 
          transition: background 0.2s;
          flex-shrink: 0;
        }
        
        .delete-btn:hover { 
          background: rgba(255,107,107,0.2); 
        }
        
        .delete-btn.compact {
          padding: 4px 8px;
          font-size: 12px;
          margin-left: 8px;
        }
        
        .meal-foods-container { 
          margin: 0;
          width: 100%; 
          padding: 20px;
          box-sizing: border-box;
          border-top: 1px solid rgba(255,255,255,0.1);
        }
        
        .history-date-group {
          margin-bottom: 25px;
          width: 100%;
        }
        
        .history-month-group {
          margin-bottom: 30px;
          width: 100%;
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 12px;
          overflow: hidden;
          background: rgba(255,255,255,0.01);
        }
        
        .history-month-header {
          cursor: pointer;
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 20px 25px;
          background: linear-gradient(90deg, rgba(128,198,255,0.08), rgba(102,215,255,0.08));
          border-bottom: 1px solid rgba(255,255,255,0.1);
          transition: all 0.2s ease;
        }
        
        .history-month-header:hover {
          background: linear-gradient(90deg, rgba(128,198,255,0.12), rgba(102,215,255,0.12));
        }
        
        .month-info {
          display: flex;
          align-items: center;
          gap: 12px;
        }
        
        .month-text {
          font-weight: 700;
          color: #80c6ff;
          font-size: 1.3rem;
        }
        
        .month-stats {
          color: #9aa3ad;
          font-size: 0.9rem;
          font-weight: 500;
        }
        
        .month-expand-icon {
          color: #66d7ff;
          font-size: 1.1rem;
          transition: transform 0.2s ease;
        }
        
        .history-month-content {
          padding: 20px 25px;
        }
        
        .history-date-group {
          margin-bottom: 20px;
          border: 1px solid rgba(255,255,255,0.05);
          border-radius: 8px;
          overflow: hidden;
          background: rgba(255,255,255,0.005);
        }
        
        .history-date-header {
          padding: 12px 0;
          margin-bottom: 10px;
          border-bottom: 1px solid rgba(255,255,255,0.1);
        }
        
        .history-date-header.clickable {
          cursor: pointer;
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 15px 20px;
          background: rgba(255,255,255,0.015);
          border-bottom: 1px solid rgba(255,255,255,0.06);
          transition: all 0.2s ease;
        }
        
        .history-date-header.clickable:hover {
          background: rgba(255,255,255,0.03);
          border-color: rgba(102,215,255,0.15);
        }
        
        .date-text {
          font-weight: 600;
          color: #9fdfff;
          font-size: 1rem;
        }
        
        .date-info {
          display: flex;
          align-items: center;
          gap: 10px;
        }
        
        .date-meal-count {
          color: #9aa3ad;
          font-size: 0.85rem;
          font-weight: 500;
        }
        
        .expand-icon {
          color: #66d7ff;
          font-size: 1rem;
          transition: transform 0.2s ease;
        }
        
        .history-meals-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 12px;
          margin-top: 0;
          padding: 15px 20px;
          background: rgba(255,255,255,0.005);
        }
        
        .history-meal-type-column {
          background: rgba(255,255,255,0.015);
          border: 1px solid rgba(255,255,255,0.06);
          border-radius: 8px;
          overflow: hidden;
        }
        
        .history-meal-type-header {
          background: linear-gradient(90deg, rgba(128,198,255,0.08), rgba(102,215,255,0.08));
          border-bottom: 1px solid rgba(255,255,255,0.08);
          padding: 12px 15px;
          margin: 0;
          font-size: 0.95rem;
          font-weight: 600;
          color: #9fdfff;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        
        .history-meal-type-content {
          padding: 12px;
          min-height: 60px;
        }
        
        .no-meals-history {
          text-align: center;
          color: #9aa3ad;
          font-style: italic;
          font-size: 0.85rem;
          padding: 15px 5px;
          margin: 0;
        }
        
        .no-meals-history.clickable-add {
          cursor: pointer;
          border: 1px dashed rgba(255,255,255,0.15);
          border-radius: 6px;
          margin: 8px;
          padding: 18px 10px;
          transition: all 0.2s ease;
          background: rgba(255,255,255,0.005);
          user-select: none;
          pointer-events: auto;
        }
        
        .no-meals-history.clickable-add:hover {
          border-color: #66d7ff;
          background: rgba(102,215,255,0.03);
          color: #66d7ff;
          transform: translateY(-1px);
        }
        
        .no-meals-history.clickable-add:active {
          transform: translateY(0);
          background: rgba(102,215,255,0.05);
        }
        
        .add-hint {
          display: block;
          margin-top: 4px;
          font-size: 0.7rem;
          color: #66d7ff;
          font-weight: 500;
          opacity: 0.8;
        }
        
        .meal-item.history {
          margin-bottom: 6px;
          border-radius: 6px;
        }
        
        .history-section {
          margin-top: 30px;
        }
        
        .history-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 20px;
          flex-wrap: wrap;
          gap: 15px;
        }
        
        .toggle-history-btn {
          background: linear-gradient(90deg, #4f46e5, #7c3aed);
          border: none;
          padding: 10px 20px;
          border-radius: 8px;
          color: white;
          font-weight: 600;
          cursor: pointer;
          font-size: 0.9rem;
          transition: transform 0.2s ease, box-shadow 0.2s ease;
          white-space: nowrap;
        }
        
        .toggle-history-btn:hover {
          transform: translateY(-1px);
          box-shadow: 0 4px 15px rgba(79, 70, 229, 0.3);
        }
        
        @media (max-width:700px) { 
          .mealplanner-container { 
            margin: 20px 12px; 
            padding: 20px; 
          } 
          .add-meal-form { 
            gap: 15px; 
            padding: 15px;
            flex-direction: column;
            align-items: stretch;
          } 
          label { 
            min-width: auto;
            flex: none;
          }
          .add-btn {
            align-self: stretch;
            margin-top: 10px;
          }
          .meal-header {
            padding: 12px 15px;
          }
          .meal-foods-container {
            padding: 15px;
          }
          .history-header {
            flex-direction: column;
            align-items: stretch;
            gap: 10px;
          }
          .toggle-history-btn {
            align-self: center;
            min-width: 150px;
          }
          .todays-meals-grid {
            grid-template-columns: 1fr;
            gap: 15px;
          }
          .meal-type-header {
            padding: 12px 15px;
            font-size: 1rem;
          }
          .meal-type-content {
            padding: 12px;
          }
          .history-meals-grid {
            grid-template-columns: 1fr;
            gap: 10px;
            padding: 0 5px;
          }
          .history-meal-type-header {
            padding: 10px 12px;
            font-size: 0.9rem;
          }
          .history-meal-type-content {
            padding: 10px;
          }
          .history-date-header.clickable {
            padding: 12px 15px;
          }
          .date-text {
            font-size: 1rem;
          }
          .meal-summary {
            gap: 2px;
          }
          .food-count {
            font-size: 0.85rem;
          }
          .nutrition-summary {
            font-size: 0.75rem;
          }
          .month-text {
            font-size: 1.1rem;
          }
          .history-month-header {
            padding: 15px 20px;
          }
          .history-month-content {
            padding: 15px 20px;
          }
          .history-meals-grid {
            padding: 10px 15px;
          }
          .date-meal-count {
            font-size: 0.8rem;
          }
          .no-meals-history.clickable-add {
            margin: 6px;
            padding: 15px 8px;
          }
          .add-hint {
            font-size: 0.65rem;
          }
        }
      `}</style>
    </div>
  );
}
import React, { useState, useEffect, useContext } from "react";
import { AuthContext } from "../contexts/AuthContext";

// Helper function to determine workout type from name or type field
function getWorkoutCategory(workout) {
  // If workout has a type field (new workouts), use it
  if (workout.type && ['cardio', 'strength', 'flexibility', 'sports'].includes(workout.type.toLowerCase())) {
    return workout.type.toLowerCase();
  }
  
  // For backwards compatibility or when type field is missing
  const name = workout.name.toLowerCase();
  
  // Check if it's exactly the old type name
  if (['cardio', 'strength', 'flexibility', 'sports'].includes(name)) {
    return name;
  }
  
  // Check if it starts with "Custom" + type name (our new naming convention)
  if (name.startsWith('custom cardio')) return 'cardio';
  if (name.startsWith('custom strength')) return 'strength';
  if (name.startsWith('custom flexibility')) return 'flexibility';
  if (name.startsWith('custom sports')) return 'sports';
  
  // Try to infer from common workout names
  if (name.includes('run') || name.includes('jog') || name.includes('bike') || name.includes('swim') || name.includes('cardio')) {
    return 'cardio';
  }
  if (name.includes('dead') || name.includes('hang') || name.includes('lift') || name.includes('strength') || name.includes('press') || name.includes('squat')) {
    return 'strength';
  }
  if (name.includes('yoga') || name.includes('stretch') || name.includes('flexibility')) {
    return 'flexibility';
  }
  if (name.includes('sport') || name.includes('tennis') || name.includes('basketball') || name.includes('football')) {
    return 'sports';
  }
  
  // If we can't determine the category, return null (workout won't be displayed)
  return null;
}

export default function WorkoutPlanner() {
  const { authToken } = useContext(AuthContext || {});
  const [workouts, setWorkouts] = useState([]);
  const [error, setError] = useState("");
  const [date, setDate] = useState("");
  const [workoutType, setWorkoutType] = useState("");
  const [selectedWorkoutId, setSelectedWorkoutId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [showHistory, setShowHistory] = useState(false);
  const [expandedDates, setExpandedDates] = useState(new Set());
  const [expandedMonths, setExpandedMonths] = useState(new Set([new Date().toISOString().slice(0, 7)])); // Current month expanded by default
  const [fullScreenWorkoutType, setFullScreenWorkoutType] = useState(null);
  const [fullScreenWorkout, setFullScreenWorkout] = useState(null);

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
    async function fetchWorkouts() {
      const token = getValidToken();
      if (!token) {
        setError("Please log in to view your workouts");
        return;
      }

      setLoading(true);
      setError("");
      try {
        const res = await fetch("http://localhost:8080/user/workouts", {
          headers: { Authorization: `Bearer ${token}` },
        });
        
        if (!res.ok) {
          if (res.status === 401) {
            setError("❌ Session expired. Please log in again.");
            localStorage.removeItem('token');
          } else {
            setError("Failed to fetch workouts");
          }
          setWorkouts([]);
          return;
        }
        
        const data = await res.json().catch(() => []);
        setWorkouts(Array.isArray(data) ? data : []);
      } catch (e) {
        console.error('Fetch workouts error:', e);
        setError("Network error");
      } finally {
        setLoading(false);
      }
    }

    fetchWorkouts();
  }, [authToken, refreshKey]);

  async function handleAddWorkout(e) {
    e.preventDefault();
    const token = getValidToken();
    if (!token) return;

    setError("");
    if (!date || !workoutType) {
      setError("Please select date and workout type");
      return;
    }
    
    try {
      // Send only the fields the backend expects
      const requestBody = { 
        date, 
        name: `Custom ${workoutType}`, // Default name that indicates the type
        duration_min: 0,
        calories_burned: 0
      };
      
      const res = await fetch("http://localhost:8080/user/workouts", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(requestBody),
      });
      
      if (!res.ok) {
        if (res.status === 401) {
          setError("❌ Session expired. Please log in again.");
          localStorage.removeItem('token');
        } else {
          const errorText = await res.text();
          setError(`Failed to add workout: ${errorText}`);
        }
        return;
      }
      
      const newWorkout = await res.json();
      // Add type to the workout object for frontend categorization
      newWorkout.type = workoutType;
      setWorkouts(prev => [newWorkout, ...(prev || [])]);
      setDate("");
      setWorkoutType("");
      setSelectedWorkoutId(newWorkout.id);
      setError("✅ Workout added successfully!");
      setTimeout(() => setError(""), 3000);
    } catch (err) {
      console.error('Add workout error:', err);
      setError("Network error");
    }
  }

  async function handleDeleteWorkout(workout, e) {
    e.stopPropagation();
    
    const token = getValidToken();
    if (!token) {
      setError("❌ Please log in to delete workouts");
      return;
    }
    
    if (!window.confirm(`Delete ${workout.name} on ${new Date(workout.date).toLocaleDateString()}?`)) {
      return;
    }
    
    try {
      const res = await fetch(`http://localhost:8080/user/workouts/${workout.id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      
      if (!res.ok) {
        if (res.status === 401) {
          setError("❌ Session expired. Please log in again.");
          localStorage.removeItem('token');
        } else {
          setError("❌ Failed to delete workout");
        }
        return;
      }
      
      setWorkouts(prev => prev.filter(w => w.id !== workout.id));
      
      if (selectedWorkoutId === workout.id) {
        setSelectedWorkoutId(null);
      }
      
      setError("✅ Workout deleted successfully!");
      setTimeout(() => setError(""), 3000);
      
    } catch (err) {
      console.error("Delete workout error:", err);
      setError("❌ Network error when deleting workout");
    }
  }

  function handleSelectWorkout(workout, e) {
    e?.preventDefault();
    e?.stopPropagation();
    
    // Open workout in fullscreen instead of inline
    openFullScreenWorkout(workout);
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

  function organizeWorkoutsByMonth(workouts) {
    const monthGroups = {};
    
    workouts.forEach(workout => {
      const monthKey = workout.date.slice(0, 7); // "2025-09"
      if (!monthGroups[monthKey]) {
        monthGroups[monthKey] = {};
      }
      if (!monthGroups[monthKey][workout.date]) {
        monthGroups[monthKey][workout.date] = [];
      }
      monthGroups[monthKey][workout.date].push(workout);
    });
    
    return monthGroups;
  }

  async function addWorkoutToDate(date, workoutType) {
    console.log('addWorkoutToDate called with:', date, workoutType);
    
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
      console.log('Making API call to add workout');
      // Send only the fields the backend expects
      const requestBody = { 
        date: dateOnly, 
        name: `Custom ${workoutType}`, // Default name that indicates the type
        duration_min: 0,
        calories_burned: 0
      };
      console.log('Request body:', requestBody);
      
      const res = await fetch("http://localhost:8080/user/workouts", {
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
          setError(`Failed to add workout: ${errorText}`);
        }
        return;
      }
      
      const newWorkout = await res.json();
      console.log('New workout created:', newWorkout);
      // Add type to the workout object for frontend categorization
      newWorkout.type = workoutType;
      setWorkouts(prev => [newWorkout, ...(prev || [])]);
      setError("✅ Workout added successfully!");
      setTimeout(() => setError(""), 3000);
      
      // Open the newly created workout in fullscreen
      openFullScreenWorkout(newWorkout);
      
    } catch (err) {
      console.error('Add workout error:', err);
      setError("Network error");
    }
  }

  function openFullScreenWorkoutType(workoutType) {
    setFullScreenWorkoutType(workoutType);
  }

  function closeFullScreenWorkoutType() {
    setFullScreenWorkoutType(null);
  }

  function openFullScreenWorkout(workout) {
    setFullScreenWorkout(workout);
    setSelectedWorkoutId(null); // Close any compact view
  }

  function closeFullScreenWorkout() {
    setFullScreenWorkout(null);
  }

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
  const todaysWorkouts = workouts.filter(workout => isSameDate(workout.date, today));
  
  // Debug: Log all workouts to see their structure
  console.log('All workouts:', workouts);
  console.log('Today\'s workouts:', todaysWorkouts);
  
  // Debug each workout individually
  todaysWorkouts.forEach((workout, index) => {
    console.log(`Workout ${index}:`, {
      id: workout.id,
      name: workout.name,
      type: workout.type,
      date: workout.date
    });
  });

  // Group today's workouts by type - improved approach
  const todaysWorkoutsByType = {
    cardio: [],
    strength: [],
    flexibility: [],
    sports: []
  };
  
  // Categorize workouts using the helper function
  todaysWorkouts.forEach(workout => {
    const category = getWorkoutCategory(workout);
    console.log(`Workout "${workout.name}" (type: ${workout.type}) categorized as: ${category}`);
    if (category && todaysWorkoutsByType[category]) {
      todaysWorkoutsByType[category].push(workout);
    }
  });
  
  console.log('Today\'s workouts by type:', todaysWorkoutsByType);
  
  // Organize history workouts by month, then by date
  const historyWorkouts = workouts.filter(workout => !isSameDate(workout.date, today));
  const historyWorkoutsByMonth = organizeWorkoutsByMonth(historyWorkouts);

  return (
    <div className="workoutplanner-container">
      <h1 className="title">Workout Planner</h1>

      {error && (
        <p className={`error ${error.startsWith('✅') ? 'success' : ''}`}>
          {error}
        </p>
      )}

      <form onSubmit={handleAddWorkout} className="add-workout-form">
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
          Workout Type:
          <select
            value={workoutType}
            onChange={e => setWorkoutType(e.target.value)}
            required
            className="input"
          >
            <option value="">Select Workout Type</option>
            <option value="cardio">Cardio</option>
            <option value="strength">Strength</option>
            <option value="flexibility">Flexibility</option>
            <option value="sports">Sports</option>
          </select>
        </label>
        <button type="submit" className="add-btn">
          Add Workout
        </button>
      </form>

      <h2 className="subtitle">Your Workouts (Today)</h2>
      {loading ? (
        <p className="loading">Loading workouts...</p>
      ) : (
        <div className="todays-workouts-grid">
          {['cardio', 'strength', 'flexibility', 'sports'].map(workoutType => (
            <div key={workoutType} className="workout-type-column">
              <h3 
                className="workout-type-header clickable"
                onClick={() => openFullScreenWorkoutType(workoutType)}
              >
                {workoutType.charAt(0).toUpperCase() + workoutType.slice(1)}
                <span className="workout-count">({todaysWorkoutsByType[workoutType].length})</span>
              </h3>
              <div className="workout-type-content">
                {todaysWorkoutsByType[workoutType].length === 0 ? (
                  <div 
                    className="no-workouts-today clickable-area"
                    onClick={() => openFullScreenWorkoutType(workoutType)}
                  >
                    <p>No {workoutType} tracked</p>
                    <span className="click-hint">Click to add</span>
                  </div>
                ) : (
                  todaysWorkoutsByType[workoutType].map(workout => (
                    <div
                      key={workout.id}
                      className="workout-item compact"
                    >
                      <div 
                        className="workout-header compact clickable-workout"
                        onClick={(e) => handleSelectWorkout(workout, e)}
                      >
                        <div className="workout-summary">
                          <span className="workout-type-label">{workoutType.charAt(0).toUpperCase() + workoutType.slice(1)}</span>
                          <span className="workout-name">{workout.name}</span>
                          <span className="workout-info">
                            {workout.duration_min > 0 ? `${workout.duration_min} min` : 'Click to set duration'}
                          </span>
                          <span className="calories-info">
                            {workout.calories_burned > 0 ? `${workout.calories_burned} cal burned` : '0 cal burned'}
                          </span>
                        </div>
                        <button
                          onClick={(e) => handleDeleteWorkout(workout, e)}
                          className="delete-btn compact"
                          title="Delete workout"
                        >
                          🗑️
                        </button>
                      </div>
                    </div>
                  ))
                )}
                <button 
                  className="add-workout-quick-btn"
                  onClick={() => openFullScreenWorkoutType(workoutType)}
                >
                  + Add {workoutType}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="history-section">
        <div className="history-header">
          <h2 className="subtitle" style={{ marginTop: "36px", marginBottom: "15px" }}>
            Workout History
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
            {Object.keys(historyWorkoutsByMonth).length === 0 ? (
              <p className="no-data">No past workouts.</p>
            ) : (
              Object.keys(historyWorkoutsByMonth)
                .sort((a, b) => new Date(b) - new Date(a)) // Sort months newest first
                .map(monthKey => {
                  const isMonthExpanded = expandedMonths.has(monthKey);
                  const monthWorkouts = historyWorkoutsByMonth[monthKey];
                  const totalWorkoutsInMonth = Object.values(monthWorkouts).flat().length;
                  
                  return (
                    <div key={monthKey} className="history-month-group">
                      <div
                        className="history-month-header"
                        onClick={() => toggleMonthExpansion(monthKey)}
                      >
                        <div className="month-info">
                          <span className="month-text">{getMonthName(monthKey)}</span>
                          <span className="month-stats">({totalWorkoutsInMonth} workouts)</span>
                        </div>
                        <span className="month-expand-icon">
                          {isMonthExpanded ? '▼' : '▶'}
                        </span>
                      </div>
                      
                      {isMonthExpanded && (
                        <div className="history-month-content">
                          {Object.keys(monthWorkouts)
                            .sort((a, b) => new Date(b) - new Date(a)) // Sort dates newest first
                            .map(dateKey => {
                              const dateWorkouts = monthWorkouts[dateKey];
                              const isDateExpanded = expandedDates.has(dateKey);
                              
                              // Group workouts by type for this date using the helper function
                              const dateWorkoutsByType = {
                                cardio: dateWorkouts.filter(workout => getWorkoutCategory(workout) === 'cardio'),
                                strength: dateWorkouts.filter(workout => getWorkoutCategory(workout) === 'strength'),
                                flexibility: dateWorkouts.filter(workout => getWorkoutCategory(workout) === 'flexibility'),
                                sports: dateWorkouts.filter(workout => getWorkoutCategory(workout) === 'sports')
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
                                      <span className="date-workout-count">({dateWorkouts.length} workouts)</span>
                                      <span className="expand-icon">
                                        {isDateExpanded ? '▼' : '▶'}
                                      </span>
                                    </div>
                                  </div>
                                  
                                  {isDateExpanded && (
                                    <div className="history-workouts-grid">
                                      {['cardio', 'strength', 'flexibility', 'sports'].map(workoutType => (
                                        <div key={workoutType} className="history-workout-type-column">
                                          <h4 className="history-workout-type-header">
                                            {workoutType.charAt(0).toUpperCase() + workoutType.slice(1)}
                                            <span className="workout-count">({dateWorkoutsByType[workoutType].length})</span>
                                          </h4>
                                          <div className="history-workout-type-content">
                                            {dateWorkoutsByType[workoutType].length === 0 ? (
                                              <div 
                                                className="no-workouts-history clickable-add"
                                                onClick={(e) => {
                                                  e.preventDefault();
                                                  e.stopPropagation();
                                                  console.log('Clicked add workout for:', dateKey, workoutType);
                                                  addWorkoutToDate(dateKey, workoutType);
                                                }}
                                              >
                                                <p onClick={(e) => e.stopPropagation()}>No {workoutType}</p>
                                                <span className="add-hint" onClick={(e) => e.stopPropagation()}>Click to add</span>
                                              </div>
                                            ) : (
                                              dateWorkoutsByType[workoutType].map(workout => (
                                                <div
                                                  key={workout.id}
                                                  className="workout-item compact history"
                                                >
                                                  <div 
                                                    className="workout-header compact clickable-workout"
                                                    onClick={(e) => handleSelectWorkout(workout, e)}
                                                  >
                                                    <div className="workout-summary">
                                                      <span className="workout-type-label">{workoutType.charAt(0).toUpperCase() + workoutType.slice(1)}</span>
                                                      <span className="workout-name">{workout.name}</span>
                                                      <span className="workout-info">
                                                        {workout.duration_min > 0 ? `${workout.duration_min} min` : 'Click to set duration'}
                                                      </span>
                                                      <span className="calories-info">
                                                        {workout.calories_burned > 0 ? `${workout.calories_burned} cal burned` : '0 cal burned'}
                                                      </span>
                                                    </div>
                                                    <button
                                                      onClick={(e) => handleDeleteWorkout(workout, e)}
                                                      className="delete-btn compact"
                                                      title="Delete workout"
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

      {/* Full-Screen Workout Type Modal */}
      {fullScreenWorkoutType && (
        <div className="fullscreen-modal">
          <div className="fullscreen-modal-content">
            <div className="fullscreen-header">
              <h2>{fullScreenWorkoutType.charAt(0).toUpperCase() + fullScreenWorkoutType.slice(1)} - {new Date().toLocaleDateString()}</h2>
              <button 
                className="close-fullscreen-btn"
                onClick={closeFullScreenWorkoutType}
              >
                ✕
              </button>
            </div>
            
            <div className="fullscreen-body">
              <div className="add-workout-section">
                <button
                  onClick={async (e) => {
                    e.preventDefault();
                    // Use local date instead of UTC to avoid timezone issues
                    const today = new Date();
                    const localDateString = today.getFullYear() + '-' + 
                      String(today.getMonth() + 1).padStart(2, '0') + '-' + 
                      String(today.getDate()).padStart(2, '0');
                    
                    console.log('Creating workout for date:', localDateString);
                    
                    const token = getValidToken();
                    if (!token) return;

                    try {
                      // Send only the fields the backend expects
                      const requestBody = { 
                        date: localDateString, 
                        name: `Custom ${fullScreenWorkoutType}`, // Default name that indicates the type
                        duration_min: 0,
                        calories_burned: 0
                      };
                      
                      const res = await fetch("http://localhost:8080/user/workouts", {
                        method: "POST",
                        headers: {
                          "Content-Type": "application/json",
                          Authorization: `Bearer ${token}`,
                        },
                        body: JSON.stringify(requestBody),
                      });
                      
                      if (res.ok) {
                        const newWorkout = await res.json();
                        // Add type to the workout object for frontend categorization
                        newWorkout.type = fullScreenWorkoutType;
                        setWorkouts(prev => [newWorkout, ...(prev || [])]);
                        setSelectedWorkoutId(newWorkout.id);
                        setRefreshKey(prev => prev + 1);
                      } else {
                        const errorText = await res.text();
                        console.error('Failed to create workout:', errorText);
                      }
                    } catch (err) {
                      console.error('Add workout error:', err);
                    }
                  }}
                  className="add-new-workout-btn"
                >
                  + Add New {fullScreenWorkoutType.charAt(0).toUpperCase() + fullScreenWorkoutType.slice(1)} Entry
                </button>
              </div>

              <div className="existing-workouts-section">
                <h3>Today's {fullScreenWorkoutType.charAt(0).toUpperCase() + fullScreenWorkoutType.slice(1)} Entries</h3>
                {todaysWorkoutsByType[fullScreenWorkoutType].length === 0 ? (
                  <p className="no-workouts-fullscreen">No {fullScreenWorkoutType} entries for today</p>
                ) : (
                  <div className="fullscreen-workouts-list">
                    {todaysWorkoutsByType[fullScreenWorkoutType].map(workout => (
                      <div key={workout.id} className="fullscreen-workout-item">
                        <div className="fullscreen-workout-header">
                          <div className="workout-info">
                            <div className="workout-summary">
                              <span className="workout-info">
                                {workout.duration_min > 0 ? `${workout.duration_min} min` : 'Click to set duration'}
                              </span>
                              {workout.calories_burned > 0 && (
                                <span className="calories-info">{workout.calories_burned} cal burned</span>
                              )}
                            </div>
                          </div>
                          <button
                            onClick={(e) => handleDeleteWorkout(workout, e)}
                            className="delete-btn fullscreen"
                            title="Delete workout"
                          >
                            🗑️ Delete
                          </button>
                        </div>
                        <div className="fullscreen-workout-details">
                          <WorkoutEditor workout={workout} onUpdate={() => setRefreshKey(prev => prev + 1)} />
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

      {/* Full-Screen Individual Workout Modal */}
      {fullScreenWorkout && (
        <div className="fullscreen-modal">
          <div className="fullscreen-modal-content">
            <div className="fullscreen-header">
              <h2>
                {fullScreenWorkout.name.charAt(0).toUpperCase() + fullScreenWorkout.name.slice(1)} - {new Date(fullScreenWorkout.date).toLocaleDateString()}
              </h2>
              <button 
                className="close-fullscreen-btn"
                onClick={closeFullScreenWorkout}
              >
                ✕
              </button>
            </div>
            
            <div className="fullscreen-body single-workout">
              <div className="workout-summary-header">
                <div className="workout-summary">
                  <span className="workout-info">
                    {fullScreenWorkout.duration_min > 0 ? `${fullScreenWorkout.duration_min} min` : 'Duration not set'}
                  </span>
                  {fullScreenWorkout.calories_burned > 0 && (
                    <span className="calories-info">{fullScreenWorkout.calories_burned} cal burned</span>
                  )}
                </div>
              </div>
              
              <div className="workout-management-area">
                <WorkoutEditor 
                  workout={fullScreenWorkout} 
                  onUpdate={() => {
                    setRefreshKey(prev => prev + 1);
                    setError("✅ Workout updated successfully!");
                    setTimeout(() => setError(""), 3000);
                    // Close the fullscreen modal after update
                    setTimeout(() => closeFullScreenWorkout(), 1000);
                  }} 
                />
              </div>
              
              <div className="workout-actions">
                <button
                  onClick={(e) => {
                    handleDeleteWorkout(fullScreenWorkout, e);
                    closeFullScreenWorkout();
                  }}
                  className="delete-workout-btn"
                >
                  🗑️ Delete This Workout
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .workoutplanner-container { 
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
        
        .selected-workout-indicator { 
          background: rgba(102,215,255,0.1); 
          border: 1px solid rgba(102,215,255,0.2); 
          color: #66d7ff; 
          padding: 12px; 
          border-radius: 8px; 
          margin-bottom: 20px; 
          text-align: center; 
          font-weight: 600; 
        }
        
        .add-workout-form { 
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
        
        .todays-workouts-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
          gap: 20px;
          margin: 20px 0;
        }
        
        .workout-type-column {
          background: rgba(255,255,255,0.02);
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 12px;
          padding: 0;
          overflow: hidden;
        }
        
        .workout-type-header {
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
        
        .workout-type-header.clickable {
          cursor: pointer;
          transition: background 0.2s ease;
        }
        
        .workout-type-header.clickable:hover {
          background: linear-gradient(90deg, rgba(102,215,255,0.15), rgba(57,214,192,0.15));
        }
        
        .workout-count {
          font-size: 0.85rem;
          color: #9aa3ad;
          font-weight: 500;
        }
        
        .workout-type-content {
          padding: 15px;
          min-height: 100px;
        }
        
        .no-workouts-today {
          text-align: center;
          color: #9aa3ad;
          font-style: italic;
          padding: 20px 10px;
          margin: 0;
        }
        
        .no-workouts-today.clickable-area {
          cursor: pointer;
          border: 1px dashed rgba(255,255,255,0.2);
          border-radius: 8px;
          margin: 10px;
          padding: 25px 15px;
          transition: all 0.2s ease;
        }
        
        .no-workouts-today.clickable-area:hover {
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
        
        .add-workout-quick-btn {
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
        
        .add-workout-quick-btn:hover {
          background: linear-gradient(90deg, rgba(102,215,255,0.15), rgba(57,214,192,0.15));
          transform: translateY(-1px);
        }
        
        .workout-item { 
          border-radius: 10px; 
          background: linear-gradient(180deg, rgba(255,255,255,0.03), rgba(255,255,255,0.01)); 
          border: 1px solid rgba(255,255,255,0.05); 
          transition: all 0.2s ease;
          width: 100%;
          box-sizing: border-box;
        }
        
        .workout-item.compact {
          margin-bottom: 8px;
          border-radius: 8px;
        }
        
        .workout-header { 
          display: flex; 
          justify-content: space-between; 
          align-items: center; 
          width: 100%; 
          padding: 15px 20px;
          cursor: pointer;
          user-select: none;
          box-sizing: border-box;
        }
        
        .workout-header:hover {
          background: rgba(255,255,255,0.03);
        }
        
        .workout-header.compact {
          padding: 12px 15px;
          min-height: 60px;
          align-items: flex-start;
        }
        
        .clickable-workout {
          cursor: pointer;
          transition: all 0.2s ease;
        }
        
        .clickable-workout:hover {
          background: rgba(102,215,255,0.05);
          transform: translateY(-1px);
        }
        
        .workout-summary {
          display: flex;
          flex-direction: column;
          gap: 4px;
          flex: 1;
          min-height: 40px;
        }
        
        .workout-type-label {
          font-size: 0.75rem;
          color: #66d7ff;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          opacity: 0.9;
        }
        
        .workout-name {
          font-size: 0.85rem;
          color: #e6eef2;
          font-weight: 600;
          margin-top: 2px;
        }
        
        .workout-info {
          font-weight: 600;
          color: #e6eef2;
          font-size: 0.9rem;
        }
        
        .calories-info {
          font-size: 0.8rem;
          color: #9aa3ad;
          font-weight: 500;
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
        
        .date-workout-count {
          color: #9aa3ad;
          font-size: 0.85rem;
          font-weight: 500;
        }
        
        .expand-icon {
          color: #66d7ff;
          font-size: 1rem;
          transition: transform 0.2s ease;
        }
        
        .history-workouts-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 12px;
          margin-top: 0;
          padding: 15px 20px;
          background: rgba(255,255,255,0.005);
        }
        
        .history-workout-type-column {
          background: rgba(255,255,255,0.015);
          border: 1px solid rgba(255,255,255,0.06);
          border-radius: 8px;
          overflow: hidden;
        }
        
        .history-workout-type-header {
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
        
        .history-workout-type-content {
          padding: 12px;
          min-height: 60px;
        }
        
        .no-workouts-history {
          text-align: center;
          color: #9aa3ad;
          font-style: italic;
          font-size: 0.85rem;
          padding: 15px 5px;
          margin: 0;
        }
        
        .no-workouts-history.clickable-add {
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
        
        .no-workouts-history.clickable-add:hover {
          border-color: #66d7ff;
          background: rgba(102,215,255,0.03);
          color: #66d7ff;
          transform: translateY(-1px);
        }
        
        .no-workouts-history.clickable-add:active {
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
        
        .workout-item.history {
          margin-bottom: 6px;
          border-radius: 6px;
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
        
        .add-workout-section {
          text-align: center;
        }
        
        .add-new-workout-btn {
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
        
        .add-new-workout-btn:hover {
          transform: translateY(-2px);
        }
        
        .existing-workouts-section h3 {
          color: #9fdfff;
          font-size: 1.2rem;
          margin-bottom: 20px;
          font-weight: 700;
        }
        
        .no-workouts-fullscreen {
          text-align: center;
          color: #9aa3ad;
          font-style: italic;
          padding: 40px;
          font-size: 1.1rem;
        }
        
        .fullscreen-workouts-list {
          display: flex;
          flex-direction: column;
          gap: 20px;
        }
        
        .fullscreen-workout-item {
          background: rgba(255,255,255,0.02);
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 10px;
          overflow: hidden;
        }
        
        .fullscreen-workout-header {
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
        
        .fullscreen-workout-details {
          padding: 20px;
        }
        
        .fullscreen-body.single-workout {
          gap: 20px;
        }
        
        .workout-summary-header {
          background: rgba(102,215,255,0.05);
          border: 1px solid rgba(102,215,255,0.2);
          border-radius: 10px;
          padding: 20px;
          text-align: center;
        }
        
        .workout-summary-header .workout-summary {
          align-items: center;
        }
        
        .workout-summary-header .workout-info {
          font-size: 1.2rem;
        }
        
        .workout-summary-header .calories-info {
          font-size: 1rem;
        }
        
        .workout-management-area {
          flex: 1;
          background: rgba(255,255,255,0.01);
          border-radius: 10px;
          padding: 20px;
          border: 1px solid rgba(255,255,255,0.05);
        }
        
        .workout-actions {
          text-align: center;
          padding-top: 20px;
          border-top: 1px solid rgba(255,255,255,0.1);
        }
        
        .delete-workout-btn {
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
        
        .delete-workout-btn:hover {
          background: rgba(255,107,107,0.2);
          transform: translateY(-1px);
        }
        
        @media (max-width:700px) { 
          .workoutplanner-container { 
            margin: 20px 12px; 
            padding: 20px; 
          } 
          .add-workout-form { 
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
          .workout-header {
            padding: 12px 15px;
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
          .todays-workouts-grid {
            grid-template-columns: 1fr;
            gap: 15px;
          }
          .workout-type-header {
            padding: 12px 15px;
            font-size: 1rem;
          }
          .workout-type-content {
            padding: 12px;
          }
          .history-workouts-grid {
            grid-template-columns: 1fr;
            padding: 10px 15px;
          }
          .history-workout-type-header {
            padding: 10px 12px;
            font-size: 0.9rem;
          }
          .history-workout-type-content {
            padding: 10px;
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
          .date-workout-count {
            font-size: 0.8rem;
          }
          .no-workouts-history.clickable-add {
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

// Simple WorkoutEditor component for editing workout details
function WorkoutEditor({ workout, onUpdate }) {
  const [name, setName] = useState(workout.name || '');
  const [duration, setDuration] = useState(workout.duration_min || 0);
  const [calories, setCalories] = useState(workout.calories_burned || 0);
  const [loading, setLoading] = useState(false);
  const { authToken } = useContext(AuthContext);

  const handleUpdate = async () => {
    const token = authToken || localStorage.getItem('token');
    if (!token) return;

    setLoading(true);
    try {
      console.log('Updating workout with:', {
        name: name.trim() || workout.name,
        duration_min: parseInt(duration) || 0,
        calories_burned: parseInt(calories) || 0
      });
      
      const res = await fetch(`http://localhost:8080/user/workouts/${workout.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          ...workout,
          name: name.trim() || workout.name,
          duration_min: parseInt(duration) || 0,
          calories_burned: parseInt(calories) || 0,
        }),
      });

      console.log('Update response status:', res.status);
      
      if (res.ok) {
        console.log('✅ Workout updated successfully, calling onUpdate');
        onUpdate();
      } else {
        console.error('❌ Failed to update workout:', res.status);
      }
    } catch (err) {
      console.error('Update workout error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        <label style={{ flex: 1, minWidth: '250px' }}>
          Workout Name:
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g., Running, Bench Press, Yoga..."
            style={{
              marginTop: '8px',
              padding: '12px',
              borderRadius: '8px',
              border: '1px solid rgba(255,255,255,0.1)',
              background: '#0b0d10',
              color: '#e6eef2',
              fontSize: '1rem',
              width: '100%',
              boxSizing: 'border-box'
            }}
          />
        </label>
        <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
          <label style={{ flex: 1, minWidth: '150px' }}>
            Duration (minutes):
            <input
              type="number"
              value={duration}
              onChange={(e) => setDuration(e.target.value)}
              style={{
                marginTop: '8px',
                padding: '12px',
                borderRadius: '8px',
                border: '1px solid rgba(255,255,255,0.1)',
                background: '#0b0d10',
                color: '#e6eef2',
                fontSize: '1rem',
                width: '100%',
                boxSizing: 'border-box'
              }}
            />
          </label>
          <label style={{ flex: 1, minWidth: '150px' }}>
            Calories Burned:
            <input
              type="number"
              value={calories}
              onChange={(e) => setCalories(e.target.value)}
              style={{
                marginTop: '8px',
                padding: '12px',
                borderRadius: '8px',
                border: '1px solid rgba(255,255,255,0.1)',
                background: '#0b0d10',
                color: '#e6eef2',
                fontSize: '1rem',
                width: '100%',
                boxSizing: 'border-box'
              }}
            />
          </label>
        </div>
      </div>
      <button
        onClick={handleUpdate}
        disabled={loading}
        style={{
          background: 'linear-gradient(90deg,#39d6c0,#66d7ff)',
          border: 'none',
          padding: '12px 24px',
          borderRadius: '8px',
          color: '#001214',
          fontWeight: '800',
          cursor: loading ? 'not-allowed' : 'pointer',
          fontSize: '1rem',
          opacity: loading ? 0.7 : 1,
          alignSelf: 'flex-start'
        }}
      >
        {loading ? 'Updating...' : 'Update Workout'}
      </button>
    </div>
  );
}


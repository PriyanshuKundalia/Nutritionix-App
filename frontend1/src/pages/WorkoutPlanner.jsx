import { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../contexts/AuthContext';
import WorkoutList from '../components/Workout/WorkoutList';
import WorkoutForm from '../components/Workout/WorkoutForm';

export default function WorkoutPlanner() {
  const { authToken } = useContext(AuthContext);
  const [workouts, setWorkouts] = useState([]);
  const [selectedWorkout, setSelectedWorkout] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Track expanded dates in history
  const [expandedDates, setExpandedDates] = useState({});

  useEffect(() => {
    async function fetchWorkouts() {
      setLoading(true);
      setError('');
      if (!authToken) {
        setError('Not authenticated');
        setLoading(false);
        return;
      }
      try {
        const response = await fetch('http://localhost:8080/user/workouts', {
          headers: {
            Authorization: `Bearer ${authToken}`,
          },
        });
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          setError(errorData.error || 'Failed to fetch workouts');
          setLoading(false);
          return;
        }
        const data = await response.json();
        setWorkouts(Array.isArray(data) ? data : []);
      } catch {
        setError('Network error');
      }
      setLoading(false);
    }
    fetchWorkouts();
  }, [authToken]);

  async function handleSave(workout) {
    setError('');
    if (!authToken) {
      setError('Not authenticated');
      return;
    }
    try {
      const method = selectedWorkout ? 'PUT' : 'POST';
      const url = selectedWorkout
        ? `http://localhost:8080/user/workouts/${selectedWorkout.id}`
        : `http://localhost:8080/user/workouts`;

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify(workout),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        setError(errorData.error || 'Failed to save workout');
        return;
      }

      await refreshWorkouts();
      setShowForm(false);
      setSelectedWorkout(null);
    } catch {
      setError('Network error');
    }
  }

  async function refreshWorkouts() {
    if (!authToken) return;
    try {
      const response = await fetch('http://localhost:8080/user/workouts', {
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      });
      if (response.ok) {
        const data = await response.json();
        setWorkouts(Array.isArray(data) ? data : []);
      }
    } catch {}
  }

  async function handleDelete(workout) {
    if (!window.confirm(`Delete workout "${workout.name}"?`)) return;
    if (!authToken) {
      setError('Not authenticated');
      return;
    }
    try {
      const response = await fetch(`http://localhost:8080/user/workouts/${workout.id}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      });
      if (!response.ok) {
        setError('Failed to delete workout');
        return;
      }
      await refreshWorkouts();
      if (selectedWorkout && selectedWorkout.id === workout.id) {
        setSelectedWorkout(null);
        setShowForm(false);
      }
    } catch {
      setError('Network error');
    }
  }

  function handleSelect(workout) {
    setSelectedWorkout(workout);
    setShowForm(true);
    setError('');
  }

  function handleAddNew() {
    setSelectedWorkout(null);
    setShowForm(true);
    setError('');
  }

  // Compare two dates ignoring time
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

  // Partition workouts into today's and history by date
  const todaysWorkouts = workouts.filter(w => w.date && isSameDate(w.date, today));
  const historyWorkoutsByDate = workouts
    .filter(w => w.date && !isSameDate(w.date, today))
    .reduce((acc, w) => {
      acc[w.date] = acc[w.date] ? [...acc[w.date], w] : [w];
      return acc;
    }, {});

  return (
    <div className="workout-planner-container">
      <h1>Workout Planner</h1>

      {error && <p className="error-msg">{error}</p>}

      {!showForm && (
        <>
          <button className="add-new-btn" onClick={handleAddNew}>
            + Add Workout
          </button>

          {loading ? (
            <p>Loading workouts...</p>
          ) : (
            <>
              <h2>Your Workouts (Today)</h2>
              {todaysWorkouts.length === 0 ? (
                <p>No workouts logged for today.</p>
              ) : (
                <WorkoutList
                  workouts={todaysWorkouts}
                  selectedWorkout={selectedWorkout}
                  onSelect={handleSelect}
                  onDelete={handleDelete}
                />
              )}

              <h2 style={{ marginTop: '36px' }}>Workout History</h2>
              {Object.keys(historyWorkoutsByDate).length === 0 ? (
                <p>No past workouts.</p>
              ) : (
                Object.keys(historyWorkoutsByDate)
                  .sort((a, b) => new Date(b) - new Date(a))
                  .map(dateKey => (
                    <div key={dateKey} className="history-date-group">
                      <div
                        className="history-date-header"
                        onClick={() =>
                          setExpandedDates(prev => ({
                            ...prev,
                            [dateKey]: !prev[dateKey],
                          }))
                        }
                        style={{
                          cursor: 'pointer',
                          fontWeight: '700',
                          color: '#80c6ff',
                          marginBottom: '6px',
                        }}
                      >
                        {new Date(dateKey).toLocaleDateString()} {expandedDates[dateKey] ? '▲' : '▼'}
                      </div>
                      {expandedDates[dateKey] &&
                        historyWorkoutsByDate[dateKey].map(workout => (
                          <WorkoutList
                            key={workout.id}
                            workouts={[workout]}
                            selectedWorkout={selectedWorkout}
                            onSelect={handleSelect}
                            onDelete={handleDelete}
                          />
                        ))}
                    </div>
                  ))
              )}
            </>
          )}
        </>
      )}

      {showForm && (
        <WorkoutForm
          initialData={selectedWorkout || {}}
          onSubmit={handleSave}
          onCancel={() => {
            setShowForm(false);
            setSelectedWorkout(null);
            setError('');
          }}
        />
      )}

      <style jsx>{`
        .workout-planner-container {
          max-width: 600px;
          margin: 30px auto;
          padding: 30px;
          background-color: #181818;
          border-radius: 10px;
          box-shadow: 0 4px 15px rgba(0, 0, 0, 0.3);
          color: #e0e0e0;
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
        }
        h1 {
          text-align: center;
          font-size: 2.4rem;
          font-weight: 700;
          color: #61dafb;
          margin-bottom: 20px;
        }
        .error-msg {
          color: #ff5757;
          font-weight: 700;
          text-align: center;
          margin-bottom: 20px;
        }
        .add-new-btn {
          background-color: #27ae60;
          border: none;
          padding: 12px 28px;
          border-radius: 6px;
          font-weight: 700;
          color: white;
          cursor: pointer;
          font-size: 1rem;
          margin-bottom: 25px;
          display: block;
          width: 100%;
          max-width: 200px;
          margin-left: auto;
          margin-right: auto;
          transition: background-color 0.3s ease;
        }
        .add-new-btn:hover {
          background-color: #1f864d;
        }
      `}</style>
    </div>
  );
}

import { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../contexts/AuthContext';

const TIME_FRAMES = ['daily', 'weekly', 'monthly'];

export default function GoalsPage() {
  const { authToken } = useContext(AuthContext);

  const [goals, setGoals] = useState([]);
  const [selectedGoal, setSelectedGoal] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Form fields state
  const [goalType, setGoalType] = useState('');
  const [targetValue, setTargetValue] = useState('');
  const [progressValue, setProgressValue] = useState('');
  const [timeFrame, setTimeFrame] = useState('daily');
  const [isCompleted, setIsCompleted] = useState(false);

  // Log authToken for debugging
  useEffect(() => {
    console.log('Auth token:', authToken);
    if (authToken) {
      fetchGoals();
    }
  }, [authToken]);

  // Fetch goals from backend with Authorization header
  async function fetchGoals() {
    setLoading(true);
    setError('');
    try {
      const response = await fetch(
        'http://localhost:8080/goals?include_archived=true&limit=50',
        {
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${authToken}`,
          },
        }
      );
      if (!response.ok) {
        setError('Failed to fetch goals');
        setLoading(false);
        return;
      }
      const data = await response.json();
      setGoals(data);
    } catch (err) {
      console.error('Network error:', err);
      setError('Network error');
    }
    setLoading(false);
  }

  // Reset form fields for new or editing goal
  function resetFormFields(goal = null) {
    if (goal) {
      setGoalType(goal.goal_type || '');
      setTargetValue(goal.target_value || '');
      setProgressValue(goal.progress_value ?? '');
      setTimeFrame(goal.time_frame || 'daily');
      setIsCompleted(goal.is_completed || false);
    } else {
      setGoalType('');
      setTargetValue('');
      setProgressValue('');
      setTimeFrame('daily');
      setIsCompleted(false);
    }
  }

  // Handle form submit (create or update)
  async function handleSave(e) {
    e.preventDefault();
    setError('');
    // Validation
    if (!goalType.trim()) {
      setError('Goal type is required.');
      return;
    }
    if (!targetValue || targetValue <= 0) {
      setError('Target value must be greater than zero.');
      return;
    }
    if (progressValue < 0) {
      setError('Progress value cannot be negative.');
      return;
    }
    if (!TIME_FRAMES.includes(timeFrame)) {
      setError('Invalid time frame.');
      return;
    }

    const payload = {
      goal_type: goalType.trim(),
      target_value: Number(targetValue),
      progress_value: Number(progressValue),
      time_frame: timeFrame,
      is_completed: progressValue >= targetValue ? true : isCompleted,
    };

    try {
      const method = selectedGoal ? 'PUT' : 'POST';
      const url = selectedGoal
        ? `http://localhost:8080/goals/${selectedGoal.id}`
        : 'http://localhost:8080/goals';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const data = await response.json();
        setError(data.error || 'Failed to save goal');
        return;
      }

      await fetchGoals();
      setShowForm(false);
      setSelectedGoal(null);
      resetFormFields();
    } catch (err) {
      console.error('Network error:', err);
      setError('Network error');
    }
  }

  // Handle archive goal
  async function handleArchive(goal) {
    setError('');
    try {
      const response = await fetch(`http://localhost:8080/goals/${goal.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${authToken}` },
      });
      if (!response.ok) {
        setError('Failed to archive goal');
        return;
      }
      await fetchGoals();
      if (selectedGoal && selectedGoal.id === goal.id) {
        setSelectedGoal(null);
        setShowForm(false);
        resetFormFields();
      }
    } catch (err) {
      console.error('Network error:', err);
      setError('Network error');
    }
  }

  // Handle restore archived goal
  async function handleRestore(goal) {
    setError('');
    try {
      const response = await fetch(
        `http://localhost:8080/goals/${goal.id}/restore`,
        {
          method: 'PUT',
          headers: { Authorization: `Bearer ${authToken}` },
        }
      );
      if (!response.ok) {
        setError('Failed to restore goal');
        return;
      }
      await fetchGoals();
    } catch (err) {
      console.error('Network error:', err);
      setError('Network error');
    }
  }

  // Start editing a goal
  function handleEdit(goal) {
    setSelectedGoal(goal);
    resetFormFields(goal);
    setShowForm(true);
  }

  // Start adding new goal
  function handleAddNew() {
    setSelectedGoal(null);
    resetFormFields();
    setShowForm(true);
  }

  return (
    <div className="container">
      <h1>User Goals</h1>

      {error && <p className="error">{error}</p>}

      {!showForm ? (
        <>
          <button className="btn add-btn" onClick={handleAddNew}>
            + Add Goal
          </button>

          {loading ? (
            <p>Loading goals...</p>
          ) : goals.length === 0 ? (
            <p>No goals found.</p>
          ) : (
            <ul className="goals-list">
              {goals.map((goal) => (
                <li
                  key={goal.id}
                  className={`goal-item ${goal.archived ? 'archived' : ''}`}
                >
                  <div>
                    <strong>{goal.goal_type}</strong> — Target: {goal.target_value}, Progress:{' '}
                    {goal.progress_value}, Time Frame: {goal.time_frame}
                    {goal.is_completed && (
                      <span className="completed"> ✓ Completed</span>
                    )}
                    {goal.archived && <span className="archived-label"> Archived</span>}
                  </div>
                  <div className="actions">
                    {!goal.archived && <button onClick={() => handleEdit(goal)}>Edit</button>}
                    {!goal.archived && (
                      <button onClick={() => handleArchive(goal)}>Archive</button>
                    )}
                    {goal.archived && (
                      <button onClick={() => handleRestore(goal)}>Restore</button>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </>
      ) : (
        <form onSubmit={handleSave} className="goal-form">
          <label>
            Goal Type:
            <input
              type="text"
              value={goalType}
              onChange={(e) => setGoalType(e.target.value)}
              maxLength={50}
              required
            />
          </label>

          <label>
            Target Value:
            <input
              type="number"
              value={targetValue}
              onChange={(e) => setTargetValue(e.target.value)}
              min={1}
              max={1000000}
              required
            />
          </label>

          <label>
            Progress Value:
            <input
              type="number"
              value={progressValue}
              onChange={(e) => setProgressValue(e.target.value)}
              min={0}
              max={1000000}
            />
          </label>

          <label>
            Time Frame:
            <select value={timeFrame} onChange={(e) => setTimeFrame(e.target.value)}>
              {TIME_FRAMES.map((tf) => (
                <option key={tf} value={tf}>
                  {tf.charAt(0).toUpperCase() + tf.slice(1)}
                </option>
              ))}
            </select>
          </label>

          <div className="form-buttons">
            <button type="submit" className="btn save-btn">
              Save Goal
            </button>
            <button
              type="button"
              className="btn cancel-btn"
              onClick={() => {
                setShowForm(false);
                setSelectedGoal(null);
                resetFormFields();
                setError('');
              }}
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      <style jsx>{`
        .container {
          max-width: 720px;
          margin: 40px auto;
          padding: 30px;
          background-color: #181818;
          border-radius: 10px;
          box-shadow: 0 4px 15px rgba(0, 0, 0, 0.3);
          color: #e0e0e0;
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
        }
        h1 {
          text-align: center;
          color: #61dafb;
          margin-bottom: 25px;
          font-weight: 700;
          font-size: 2.2rem;
        }
        .error {
          color: #ff5757;
          font-weight: 700;
          text-align: center;
          margin-bottom: 20px;
          padding: 12px;
          background: rgba(255, 87, 87, 0.1);
          border-radius: 6px;
        }
        .btn {
          cursor: pointer;
          font-weight: 700;
          border-radius: 6px;
          border: none;
          padding: 12px 28px;
          color: white;
          font-size: 1rem;
          transition: background-color 0.3s ease;
        }
        .add-btn {
          background-color: #27ae60;
          display: block;
          width: 100%;
          max-width: 220px;
          margin: 0 auto 30px auto;
        }
        .add-btn:hover {
          background-color: #1f864d;
        }
        .goals-list {
          list-style-type: none;
          padding: 0;
          display: grid;
          gap: 12px;
        }
        .goal-item {
          background: #222;
          border-radius: 8px;
          padding: 18px 20px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          color: #e0e0e0;
          border: 1px solid #333;
          transition: background 0.2s ease;
        }
        .goal-item:hover {
          background: #2a2a2a;
        }
        .goal-item.archived {
          opacity: 0.6;
          font-style: italic;
        }
        .actions button {
          margin-left: 12px;
          padding: 8px 14px;
          border-radius: 5px;
          border: none;
          font-weight: 600;
          background-color: #27ae60;
          color: white;
          cursor: pointer;
          font-size: 0.9rem;
          transition: background-color 0.3s ease;
        }
        .actions button:hover {
          background-color: #1f864d;
        }
        .completed {
          color: #61dafb;
          margin-left: 12px;
          font-weight: 700;
        }
        .archived-label {
          margin-left: 12px;
          color: #ff6f61;
        }
        form.goal-form {
          background: #222;
          padding: 25px;
          border-radius: 8px;
          display: flex;
          flex-direction: column;
          gap: 20px;
          border: 1px solid #333;
        }
        label {
          display: flex;
          flex-direction: column;
          font-weight: 600;
          font-size: 1rem;
          color: #80c6ff;
        }
        input,
        select {
          margin-top: 10px;
          padding: 12px;
          border-radius: 6px;
          border: 1.5px solid #444;
          background: #181818;
          color: #e0e0e0;
          font-size: 1rem;
          transition: border-color 0.3s ease;
        }
        input:focus,
        select:focus {
          outline: none;
          border-color: #61dafb;
          box-shadow: 0 0 8px rgba(97, 218, 251, 0.2);
        }
        .form-buttons {
          display: flex;
          gap: 15px;
          justify-content: center;
          margin-top: 15px;
        }
        .save-btn {
          background-color: #27ae60;
          flex: 1;
        }
        .save-btn:hover {
          background-color: #1f864d;
        }
        .cancel-btn {
          background-color: #888;
          flex: 1;
        }
        .cancel-btn:hover {
          background-color: #555;
        }
        
        @media (max-width: 600px) {
          .container {
            margin: 20px 12px;
            padding: 20px;
          }
          .goal-item {
            flex-direction: column;
            align-items: flex-start;
            gap: 12px;
          }
          .actions {
            align-self: stretch;
            display: flex;
            justify-content: flex-end;
          }
          .actions button {
            margin-left: 8px;
          }
        }
      `}</style>
    </div>
  );
}
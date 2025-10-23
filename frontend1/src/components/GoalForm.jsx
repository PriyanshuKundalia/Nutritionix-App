import { useState, useEffect } from 'react';

const TIME_FRAMES = ['daily', 'weekly', 'monthly'];

export default function GoalForm({ initialData = {}, onSubmit, onCancel }) {
  const [goalType, setGoalType] = useState(initialData.goal_type || '');
  const [targetValue, setTargetValue] = useState(initialData.target_value || '');
  const [progressValue, setProgressValue] = useState(initialData.progress_value ?? '');
  const [timeFrame, setTimeFrame] = useState(initialData.time_frame || 'daily');
  const [isCompleted, setIsCompleted] = useState(initialData.is_completed || false);
  const [error, setError] = useState('');

  useEffect(() => {
    // If progressValue >= targetValue, mark complete
    if (targetValue && progressValue >= targetValue) {
      setIsCompleted(true);
    } else {
      setIsCompleted(false);
    }
  }, [targetValue, progressValue]);

  function validateAndSubmit(e) {
    e.preventDefault();
    setError('');
    if (!goalType.trim()) {
      setError('Goal type is required.');
      return;
    }
    if (targetValue <= 0) {
      setError('Target value must be greater than zero.');
      return;
    }
    if (progressValue < 0) {
      setError('Progress value cannot be negative.');
      return;
    }
    if (!TIME_FRAMES.includes(timeFrame)) {
      setError('Invalid time frame selected.');
      return;
    }
    onSubmit({
      goal_type: goalType.trim(),
      target_value: Number(targetValue),
      progress_value: Number(progressValue),
      time_frame: timeFrame,
      is_completed: isCompleted,
    });
  }

  return (
    <form onSubmit={validateAndSubmit} className="goal-form">
      <label>
        Goal Type:
        <input
          type="text"
          value={goalType}
          onChange={e => setGoalType(e.target.value)}
          required
          maxLength={50}
        />
      </label>

      <label>
        Target Value:
        <input
          type="number"
          value={targetValue}
          onChange={e => setTargetValue(e.target.value)}
          required
          min={1}
          max={1000000}
        />
      </label>

      <label>
        Progress Value:
        <input
          type="number"
          value={progressValue}
          onChange={e => setProgressValue(e.target.value)}
          min={0}
          max={1000000}
        />
      </label>

      <label>
        Time Frame:
        <select value={timeFrame} onChange={e => setTimeFrame(e.target.value)}>
          {TIME_FRAMES.map(tf => (
            <option key={tf} value={tf}>
              {tf.charAt(0).toUpperCase() + tf.slice(1)}
            </option>
          ))}
        </select>
      </label>

      {error && <p className="error-msg">{error}</p>}

      <div className="buttons">
        <button type="submit">Save Goal</button>
        {onCancel && (
          <button type="button" onClick={onCancel} className="cancel-btn">
            Cancel
          </button>
        )}
      </div>

      <style jsx>{`
        .goal-form {
          max-width: 500px;
          margin: 20px auto;
          padding: 20px;
          background: #222;
          border-radius: 8px;
          color: #e0e0e0;
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
          display: flex;
          flex-direction: column;
          gap: 15px;
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
          margin-top: 5px;
          padding: 8px 12px;
          border-radius: 5px;
          border: 1.5px solid #444;
          background: #181818;
          color: #e0e0e0;
          font-size: 1rem;
        }
        .error-msg {
          color: #ff5757;
          font-weight: 700;
          text-align: center;
        }
        .buttons {
          display: flex;
          gap: 12px;
          justify-content: center;
          margin-top: 10px;
        }
        button {
          background: #27ae60;
          border: none;
          padding: 10px 24px;
          border-radius: 6px;
          color: white;
          font-weight: 700;
          cursor: pointer;
          transition: background 0.3s ease;
          flex: 1;
        }
        button:hover {
          background: #1f864d;
        }
        .cancel-btn {
          background: #888;
        }
        .cancel-btn:hover {
          background: #555;
        }
      `}</style>
    </form>
  );
}

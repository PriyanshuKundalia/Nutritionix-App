import { useState } from 'react';

export default function WorkoutForm({ initialData = {}, onSubmit, onCancel }) {
  const [name, setName] = useState(initialData.name || '');
  const [durationMinutes, setDurationMinutes] = useState(initialData.duration_minutes || '');
  const [caloriesBurned, setCaloriesBurned] = useState(
    initialData.calories_burned !== undefined && initialData.calories_burned !== null
      ? initialData.calories_burned
      : ''
  );
  const [date, setDate] = useState(initialData.date || '');

  function handleSubmit(e) {
    e.preventDefault();
    onSubmit({
      name: name.trim(),
      duration_minutes: Number(durationMinutes),
      calories_burned: caloriesBurned === '' ? null : Number(caloriesBurned),
      date,  // Include the date here
    });
  }

  return (
    <form onSubmit={handleSubmit} className="workout-form">
      <label>
        Workout Name:
        <input type="text" required value={name} onChange={e => setName(e.target.value)} />
      </label>

      <label>
        Duration (minutes):
        <input
          type="number"
          required
          min={1}
          value={durationMinutes}
          onChange={e => setDurationMinutes(e.target.value)}
        />
      </label>

      <label>
        Calories Burned (optional):
        <input
          type="number"
          min={0}
          value={caloriesBurned}
          onChange={e => setCaloriesBurned(e.target.value)}
        />
      </label>

      <label>
        Date:
        <input
          type="date"
          required
          value={date}
          onChange={e => setDate(e.target.value)}
        />
      </label>

      <div className="buttons">
        <button type="submit">Save</button>
        {onCancel && (
          <button type="button" onClick={onCancel}>
            Cancel
          </button>
        )}
      </div>

      <style jsx>{`
        form.workout-form {
          display: flex;
          flex-direction: column;
          gap: 15px;
          max-width: 400px;
          margin: 20px auto;
        }
        label {
          font-weight: 600;
          display: flex;
          flex-direction: column;
          gap: 6px;
          color: #80c6ff;
        }
        input {
          padding: 10px;
          border-radius: 6px;
          border: 1.5px solid #444;
          background: #222;
          color: #e0e0e0;
          font-size: 1rem;
          outline: none;
          transition: border-color 0.3s;
        }
        input:focus {
          border-color: #61dafb;
          box-shadow: 0 0 8px #61dafb88;
        }
        .buttons {
          display: flex;
          gap: 12px;
          justify-content: center;
        }
        button {
          background-color: #27ae60;
          border: none;
          color: white;
          padding: 10px 28px;
          font-weight: 700;
          border-radius: 6px;
          cursor: pointer;
          transition: background-color 0.3s ease;
          flex: 1;
        }
        button:hover {
          background-color: #1f864d;
        }
        button[type='button'] {
          background-color: #888;
        }
        button[type='button']:hover {
          background-color: #555;
        }
      `}</style>
    </form>
  );
}

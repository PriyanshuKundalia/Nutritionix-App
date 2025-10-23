export default function WorkoutList({ workouts, selectedWorkout, onSelect, onDelete }) {
  return (
    <ul className="workout-list">
      {workouts.map(workout => {
        // Extract calories value if valid, else empty string
        let calories = '';
        if (workout.calories_burned && typeof workout.calories_burned === 'object') {
          if (workout.calories_burned.Valid) {
            calories = workout.calories_burned.Int32;
          }
        } else if (typeof workout.calories_burned === 'number') {
          calories = workout.calories_burned;
        }

        // Display duration if positive
        const duration = workout.duration_min > 0 ? workout.duration_min : '';

        return (
          <li
            key={workout.id}
            className={`workout-item ${selectedWorkout && selectedWorkout.id === workout.id ? 'selected' : ''}`}
            onClick={() => onSelect(workout)}
          >
            <div>
              <strong>{workout.name}</strong>
              <div style={{ fontSize: '0.9rem', marginTop: '4px', color: '#a0aec0' }}>
                {workout.date ? new Date(workout.date).toLocaleDateString() : 'No Date'}
              </div>
              {duration !== '' && <div>{duration} min</div>}
              {calories !== '' && <div>{calories} kcal</div>}
            </div>

            <button
              className="delete-btn"
              onClick={e => {
                e.stopPropagation();
                onDelete(workout);
              }}
              title="Delete Workout"
            >
              ×
            </button>
          </li>
        );
      })}

      <style jsx>{`
        ul.workout-list {
          list-style: none;
          padding: 0;
          margin: 20px 0;
          max-width: 400px;
          margin-left: auto;
          margin-right: auto;
        }
        li.workout-item {
          background: #2c3e50;
          color: #ecf0f1;
          padding: 12px 18px;
          margin-bottom: 12px;
          border-radius: 8px;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: space-between;
          font-size: 1.1rem;
          transition: background-color 0.3s ease;
        }
        li.workout-item.selected {
          background: #27ae60;
          color: #181818;
          box-shadow: 0 0 12px #27ae6022;
        }
        li.workout-item:hover:not(.selected) {
          background-color: #34495e;
        }
        .delete-btn {
          background: transparent;
          border: none;
          color: #f44336;
          font-size: 1.4rem;
          cursor: pointer;
          padding: 0 4px;
          line-height: 1;
        }
        .delete-btn:hover {
          color: #b71c1c;
        }
      `}</style>
    </ul>
  );
}

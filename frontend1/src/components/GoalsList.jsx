export default function GoalsList({ goals, onEdit, onArchive, onRestore }) {
  if (goals.length === 0) return <p>No goals found.</p>;

  return (
    <ul className="goals-list">
      {goals.map(goal => (
        <li key={goal.id} className={`goal-item ${goal.archived ? 'archived' : ''}`}>
          <div>
            <strong>{goal.goal_type}</strong> — Target: {goal.target_value}, Progress: {goal.progress_value}, Time Frame: {goal.time_frame}
            {goal.is_completed && <span className="completed">✓ Completed</span>}
            {goal.archived && <span className="archived-label">Archived</span>}
          </div>
          <div className="actions">
            {!goal.archived && <button onClick={() => onEdit(goal)}>Edit</button>}
            {!goal.archived && <button onClick={() => onArchive(goal)}>Archive</button>}
            {goal.archived && <button onClick={() => onRestore(goal)}>Restore</button>}
          </div>
        </li>
      ))}

      <style jsx>{`
        .goals-list {
          list-style: none;
          padding: 0;
          max-width: 600px;
          margin: 20px auto;
        }
        .goal-item {
          background: #222;
          color: #e0e0e0;
          margin-bottom: 10px;
          padding: 15px 20px;
          border-radius: 8px;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .goal-item.archived {
          opacity: 0.6;
          font-style: italic;
        }
        .actions button {
          margin-left: 10px;
          padding: 6px 12px;
          font-weight: 600;
          border-radius: 5px;
          border: none;
          cursor: pointer;
          background-color: #27ae60;
          color: white;
          transition: background-color 0.3s ease;
        }
        .actions button:hover {
          background-color: #1f864d;
        }
        .completed {
          color: #61dafb;
          margin-left: 10px;
          font-weight: 700;
        }
        .archived-label {
          margin-left: 10px;
          color: #ff6f61;
        }
      `}</style>
    </ul>
  );
}

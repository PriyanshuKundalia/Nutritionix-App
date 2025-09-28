import { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../contexts/AuthContext';
import MealFoods from './MealFoods';
import FoodLogger from "../components/nutrition/FoodLogger"; // Updated import path

export default function MealPlanner() {
  const { authToken } = useContext(AuthContext);
  const [meals, setMeals] = useState([]);
  const [error, setError] = useState('');
  const [date, setDate] = useState('');
  const [mealType, setMealType] = useState('');
  const [selectedMeal, setSelectedMeal] = useState(null);
  const [loading, setLoading] = useState(false);
  const [expandedDates, setExpandedDates] = useState({});

  useEffect(() => {
    async function fetchMeals() {
      setLoading(true);
      setError('');
      try {
        const response = await fetch('http://localhost:8080/user/meals', {
          headers: { Authorization: `Bearer ${authToken}` },
        });
        if (!response.ok) {
          setError('Failed to fetch meals');
          setLoading(false);
          return;
        }
        const data = await response.json();
        setMeals(Array.isArray(data) ? data : []);
      } catch {
        setError('Network error');
      }
      setLoading(false);
    }
    if (authToken) fetchMeals();
  }, [authToken]);

  async function handleAddMeal(e) {
    e.preventDefault();
    setError('');
    if (!date || !mealType) {
      setError('Please select date and meal type');
      return;
    }
    try {
      const response = await fetch('http://localhost:8080/user/meals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${authToken}` },
        body: JSON.stringify({ date, meal_type: mealType }),
      });
      if (!response.ok) {
        setError('Failed to add meal');
        return;
      }
      setError('');
      const newMeal = await response.json();
      setMeals([newMeal, ...(meals || [])]);
      setDate('');
      setMealType('');
      setSelectedMeal(newMeal);
    } catch {
      setError('Network error');
    }
  }

  async function handleSaveFood(foodData) {
    try {
      const response = await fetch('http://localhost:8080/user/foods', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${authToken}` },
        body: JSON.stringify(foodData),
      });
      if (!response.ok) {
        setError('Failed to save food item');
        return;
      }
      // Optionally you can refresh the meals or update UI if needed here
    } catch {
      setError('Network error when saving food');
    }
  }

  function handleSelectMeal(meal) {
    if (selectedMeal && selectedMeal.id === meal.id) {
      setSelectedMeal(null);
    } else {
      setSelectedMeal(meal);
    }
  }

  function toggleDate(dateKey) {
    setExpandedDates(prev => ({
      ...prev,
      [dateKey]: !prev[dateKey],
    }));
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

  const todaysMeals = meals.filter(meal => isSameDate(meal.date, today));

  const historyMealsByDate = meals
    .filter(meal => !isSameDate(meal.date, today))
    .reduce((acc, meal) => {
      acc[meal.date] = acc[meal.date] ? [...acc[meal.date], meal] : [meal];
      return acc;
    }, {});

  return (
    <div className="mealplanner-container">
      <h1 className="title">Meal Planner</h1>

      {error && <p className="error">{error}</p>}

      {/* Form to add new meal (date + type) */}
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

      {/* FoodLogger for logging food items with nutrition info */}
      <FoodLogger onSave={handleSaveFood} />

      <h2 className="subtitle">Your Meals (Today)</h2>
      {loading ? (
        <p className="loading">Loading meals...</p>
      ) : !todaysMeals.length ? (
        <p className="no-data">No meals tracked for today.</p>
      ) : (
        <ul className="meals-list">
          {todaysMeals.map(meal => (
            <li
              key={meal.id}
              onClick={() => handleSelectMeal(meal)}
              className={`meal-item${selectedMeal && selectedMeal.id === meal.id ? ' selected' : ''}`}
            >
              {new Date(meal.date).toLocaleDateString()} —{' '}
              {meal.meal_type.charAt(0).toUpperCase() + meal.meal_type.slice(1)}

              {selectedMeal && selectedMeal.id === meal.id && (
                <div className="meal-foods-container" onClick={e => e.stopPropagation()}>
                  <MealFoods mealID={meal.id} />
                </div>
              )}
            </li>
          ))}
        </ul>
      )}

      <h2 className="subtitle" style={{ marginTop: '36px' }}>
        Meal History
      </h2>
      {Object.keys(historyMealsByDate).length === 0 ? (
        <p className="no-data">No past meals.</p>
      ) : (
        Object.keys(historyMealsByDate)
          .sort((a, b) => new Date(b) - new Date(a))
          .map(dateKey => (
            <div key={dateKey} className="history-date-group">
              <div
                className="history-date-header"
                onClick={() => toggleDate(dateKey)}
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
                historyMealsByDate[dateKey].map(meal => (
                  <li
                    key={meal.id}
                    className={`meal-item${selectedMeal && selectedMeal.id === meal.id ? ' selected' : ''}`}
                    style={{ listStyle: 'none', marginBottom: '6px', cursor: 'pointer' }}
                    onClick={() => handleSelectMeal(meal)}
                  >
                    {meal.meal_type.charAt(0).toUpperCase() + meal.meal_type.slice(1)}

                    {selectedMeal && selectedMeal.id === meal.id && (
                      <div className="meal-foods-container" onClick={e => e.stopPropagation()}>
                        <MealFoods mealID={meal.id} />
                      </div>
                    )}
                  </li>
                ))}
            </div>
          ))
      )}

      <style jsx>{`
        .mealplanner-container {
          max-width: 650px;
          margin: 30px auto;
          padding: 30px;
          background: #181818;
          border-radius: 10px;
          box-shadow: 0 4px 15px rgba(0, 0, 0, 0.3);
          color: #e0e0e0;
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
        }
        .title {
          text-align: center;
          font-size: 2.4rem;
          font-weight: 700;
          color: #61dafb;
          margin: 0 0 25px;
        }
        .error {
          color: #ff5757;
          text-align: center;
          margin-bottom: 20px;
          font-weight: 700;
          font-size: 1.1rem;
        }
        .add-meal-form {
          display: flex;
          flex-wrap: wrap;
          gap: 20px;
          justify-content: center;
          margin-bottom: 35px;
        }
        label {
          font-weight: 600;
          display: flex;
          flex-direction: column;
          color: #80c6ff;
          min-width: 160px;
        }
        .input {
          margin-top: 6px;
          padding: 8px 12px;
          border-radius: 6px;
          border: 1.5px solid #444;
          background: #222;
          color: #e0e0e0;
          font-size: 1rem;
          transition: border-color 0.3s;
        }
        .input:focus {
          outline: none;
          border-color: #61dafb;
          box-shadow: 0 0 8px #61dafb88;
        }
        .add-btn {
          background: #27ae60;
          border: none;
          padding: 12px 22px;
          color: white;
          font-weight: 700;
          border-radius: 6px;
          cursor: pointer;
          font-size: 1rem;
          height: fit-content;
          align-self: flex-end;
          transition: background-color 0.3s;
        }
        .add-btn:hover {
          background: #1f864d;
        }
        .subtitle {
          color: #34495e;
          border-bottom: 2px solid #34495e;
          padding-bottom: 8px;
          font-weight: 700;
          font-size: 1.6rem;
          margin: 0 0 20px;
        }
        .loading,
        .no-data {
          text-align: center;
          font-size: 1.1rem;
          color: #ccc;
        }
        .meals-list {
          list-style: none;
          margin: 0;
          padding: 0;
        }
        .meal-item {
          cursor: pointer;
          padding: 15px 20px;
          border-radius: 8px;
          background: #2c3e50;
          color: #ecf0f1;
          box-shadow: none;
          transition: background-color 0.3s, box-shadow 0.3s;
        }
        .meal-item:hover {
          background: #34495e;
        }
        .meal-item.selected {
          background: #2ecc71;
          color: #181818;
          box-shadow: 0 0 15px #27ae601f;
        }
        .meal-foods-container {
          margin-top: 16px;
        }
      `}</style>
    </div>
  );
}

import { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../contexts/AuthContext';

export default function MealFoods({ mealID }) {
  const { authToken } = useContext(AuthContext);
  const [foods, setFoods] = useState([]);
  const [error, setError] = useState('');
  const [foodName, setFoodName] = useState('');
  const [quantity, setQuantity] = useState('');
  const [calories, setCalories] = useState('');
  const [protein, setProtein] = useState('');
  const [carbs, setCarbs] = useState('');
  const [fat, setFat] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);

  useEffect(() => {
    async function fetchFoods() {
      setError('');
      try {
        const response = await fetch(`http://localhost:8080/user/mealfoods/${mealID}`, {
          headers: { Authorization: `Bearer ${authToken}` },
        });
        if (!response.ok) {
          setError('Failed to fetch foods');
          return;
        }
        const data = await response.json();
        setFoods(Array.isArray(data) ? data : []);
      } catch {
        setError('Network error');
      }
    }
    if (authToken && mealID) fetchFoods();
  }, [authToken, mealID]);

  async function handleAddFood(e) {
    e.preventDefault();
    setError('');
    if (!foodName.trim()) {
      setError('Food name is required');
      return;
    }
    try {
      const response = await fetch('http://localhost:8080/user/mealfoods', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          meal_id: mealID,
          food_name: foodName.trim(),
          quantity: parseFloat(quantity) || 0,
          calories: parseInt(calories) || 0,
          protein: parseFloat(protein) || 0,
          carbs: parseFloat(carbs) || 0,
          fat: parseFloat(fat) || 0,
        }),
      });
      if (!response.ok) {
        setError('Failed to add food');
        return;
      }
      const newFood = await response.json();
      setFoods([newFood, ...foods]);
      setFoodName('');
      setQuantity('');
      setCalories('');
      setProtein('');
      setCarbs('');
      setFat('');
      setShowAddForm(false);
    } catch {
      setError('Network error');
    }
  }

  if (!mealID)
    return (
      <p style={{ color: '#ccc', textAlign: 'center' }}>
        Please select a meal to see and add foods.
      </p>
    );

  return (
    <div className="meal-foods-container" onClick={e => e.stopPropagation()}>
      {!showAddForm ? (
        <button
          type="button"
          className="add-food-btn"
          onClick={() => setShowAddForm(true)}
        >
          + Add Food
        </button>
      ) : (
        <form onSubmit={handleAddFood} className="add-food-form">
          <input
            type="text"
            placeholder="Food Name"
            value={foodName}
            onChange={(e) => setFoodName(e.target.value)}
            required
            className="input-text"
          />
          <input
            type="number"
            placeholder="Quantity"
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            step="any"
            className="input-num"
          />
          <input
            type="number"
            placeholder="Calories"
            value={calories}
            onChange={(e) => setCalories(e.target.value)}
            className="input-num"
          />
          <input
            type="number"
            placeholder="Protein (g)"
            value={protein}
            onChange={(e) => setProtein(e.target.value)}
            step="any"
            className="input-num"
          />
          <input
            type="number"
            placeholder="Carbs (g)"
            value={carbs}
            onChange={(e) => setCarbs(e.target.value)}
            step="any"
            className="input-num"
          />
          <input
            type="number"
            placeholder="Fat (g)"
            value={fat}
            onChange={(e) => setFat(e.target.value)}
            step="any"
            className="input-num"
          />
          <div className="buttons">
            <button type="submit" className="submit-btn">
              Add Food
            </button>
            <button
              type="button"
              className="cancel-btn"
              onClick={() => {
                setShowAddForm(false);
                setError('');
              }}
            >
              Cancel
            </button>
          </div>
          {error && <p className="error-msg">{error}</p>}
        </form>
      )}

      <h4 className="foods-title">Foods in this meal</h4>
      {foods.length > 0 ? (
        <ul className="foods-list">
          {foods.map((food) => (
            <li key={food.id} className="food-item">
              <strong>{food.food_name}</strong> — Qty: {food.quantity}, Calories: {food.calories}, Protein: {food.protein}g, Carbs: {food.carbs}g, Fat: {food.fat}g
            </li>
          ))}
        </ul>
      ) : (
        <p className="no-foods-text">No foods added yet.</p>
      )}

      <style>{`
        .meal-foods-container {
          background-color: #fefefe;
          padding: 20px;
          border-radius: 12px;
          box-shadow: 0 2px 10px rgba(0,0,0,0.1);
          max-width: 550px;
          margin: 24px auto;
          color: #222;
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
        }
        .add-food-btn {
          display: block;
          margin: 0 auto 18px auto;
          background: #27ae60;
          color: white;
          font-weight: 700;
          font-size: 1.05em;
          border: none;
          border-radius: 6px;
          padding: 10px 28px;
          cursor: pointer;
          box-shadow: 0 1px 6px rgba(39,174,96,0.3);
          letter-spacing: 1px;
          transition: background 0.3s ease;
        }
        .add-food-btn:hover {
          background: #219150;
        }
        form.add-food-form {
          display: flex;
          flex-wrap: wrap;
          gap: 10px;
          margin-bottom: 20px;
          justify-content: center;
        }
        .input-text {
          flex: 2 1 180px;
          padding: 8px;
          border-radius: 4px;
          border: 1px solid #ccc;
          font-size: 1rem;
          outline: none;
          transition: border-color 0.3s;
        }
        .input-text:focus {
          border-color: #27ae60;
          box-shadow: 0 0 6px #27ae601a;
        }
        .input-num {
          flex: 1 1 80px;
          padding: 8px;
          border-radius: 4px;
          border: 1px solid #ccc;
          font-size: 1rem;
          outline: none;
          transition: border-color 0.3s;
        }
        .input-num:focus {
          border-color: #27ae60;
          box-shadow: 0 0 6px #27ae601a;
        }
        .buttons {
          flex-basis: 100%;
          display: flex;
          gap: 15px;
          justify-content: center;
        }
        .submit-btn {
          background-color: #2980b9;
          color: white;
          border: none;
          padding: 10px 28px;
          font-weight: 700;
          border-radius: 4px;
          cursor: pointer;
          transition: background-color 0.3s ease;
          flex: 1;
        }
        .submit-btn:hover {
          background-color: #1c5d86;
        }
        .cancel-btn {
          background-color: #d1d5db;
          color: #333;
          border: none;
          padding: 10px 28px;
          font-weight: 700;
          border-radius: 4px;
          cursor: pointer;
          transition: background-color 0.3s ease;
          flex: 1;
        }
        .cancel-btn:hover {
          background-color: #a7abb0;
        }
        .error-msg {
          flex-basis: 100%;
          color: #ff5757;
          font-weight: 600;
          text-align: center;
          margin-top: 5px;
          user-select: none;
        }
        .foods-title {
          border-bottom: 1px solid #eee;
          padding-bottom: 6px;
          color: #34495e;
          margin-top: 10px;
          font-weight: 600;
          font-size: 1.1rem;
        }
        .foods-list {
          padding-left: 15px;
          line-height: 1.6;
          color: #2c3e50;
          font-size: 1.02rem;
          margin-top: 12px;
          list-style: disc inside;
        }
        .food-item {
          margin-bottom: 6px;
        }
        .no-foods-text {
          color: #7f8c8d;
          font-style: italic;
          margin-top: 12px;
          text-align: center;
          user-select: none;
        }
      `}</style>
    </div>
  );
}

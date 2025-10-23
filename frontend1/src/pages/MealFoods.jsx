import { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../contexts/AuthContext';
import FoodSelector from '../components/nutrition/FoodSelector';

export default function MealFoods({ mealID, onFoodAdded }) {
  const { authToken } = useContext(AuthContext);
  const [foods, setFoods] = useState([]);
  const [error, setError] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [clearFoodSelector, setClearFoodSelector] = useState(false);

  // Get token with validation
  const getValidToken = () => {
    const token = authToken || localStorage.getItem('token');
    if (!token) return null;
    
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      const currentTime = Math.floor(Date.now() / 1000);
      if (payload.exp < currentTime) {
        localStorage.removeItem('token');
        setError("Session expired. Please log in again.");
        return null;
      }
      return token;
    } catch {
      localStorage.removeItem('token');
      return null;
    }
  };

  useEffect(() => {
    async function fetchFoods() {
      const token = getValidToken();
      if (!token || !mealID) return;

      setLoading(true);
      setError('');
      
      try {
        console.log('Fetching foods for meal:', mealID);
        
        // Fixed API endpoint - should match your backend route
        const response = await fetch(`http://localhost:8080/user/meals/${mealID}/foods`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        
        console.log('Fetch foods response status:', response.status);
        
        if (!response.ok) {
          if (response.status === 401) {
            setError('Session expired. Please log in again.');
            localStorage.removeItem('token');
          } else {
            setError('Failed to fetch foods');
          }
          return;
        }
        
        const data = await response.json();
        console.log('Foods fetched:', data);
        setFoods(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error('Fetch foods error:', err);
        setError('Network error');
      } finally {
        setLoading(false);
      }
    }
    
    if (mealID) {
      fetchFoods();
    }
  }, [mealID]); // Removed authToken dependency to prevent unnecessary refetches

  async function handleAddFoodFromSelector({ food, quantity, unit, nutrition }) {
    const token = getValidToken();
    if (!token) return;

    setError('');
    
    try {
      console.log('Adding food to meal:', mealID);
      
      const foodData = {
        meal_id: mealID,
        food_id: food.id,
        food_name: food.name,
        quantity: quantity,
        unit: unit,
        calories: nutrition.calories,
        protein: nutrition.protein,
        carbs: nutrition.carbs,
        fat: nutrition.total_fat,
        fiber: nutrition.fiber,
        sugar: nutrition.sugar,
        sodium: nutrition.sodium,
        calcium: nutrition.calcium,
        iron: nutrition.iron,
        potassium: nutrition.potassium,
        serving_size: food.serving_size,
      };
      
      console.log('Food data to save:', foodData);
      
      const response = await fetch('http://localhost:8080/user/mealfoods', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(foodData),
      });
      
      console.log('Add food response status:', response.status);
      
      if (!response.ok) {
        const errorData = await response.text().catch(() => "");
        console.error('Add food failed:', response.status, errorData);
        
        if (response.status === 401) {
          setError('Session expired. Please log in again.');
          localStorage.removeItem('token');
        } else {
          setError('Failed to add food');
        }
        return;
      }
      
      const newFood = await response.json();
      console.log('Food added successfully:', newFood);
      
      // Update foods list
      setFoods(prev => [newFood, ...prev]);
      
      // Clear the food selector
      setClearFoodSelector(true);
      setTimeout(() => setClearFoodSelector(false), 100);
      
      // Notify parent component
      onFoodAdded?.();
      
      setError('✅ Food added successfully!');
      setTimeout(() => setError(''), 3000);
      
    } catch (err) {
      console.error('Add food error:', err);
      setError('Network error');
    }
  }

  async function handleDeleteFood(foodId) {
    const token = getValidToken();
    if (!token) return;

    if (!window.confirm('Delete this food item?')) return;

    try {
      console.log('Deleting food:', foodId);
      
      const response = await fetch(`http://localhost:8080/user/mealfoods/${foodId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      
      console.log('Delete food response status:', response.status);
      
      if (!response.ok) {
        if (response.status === 401) {
          setError('Session expired. Please log in again.');
          localStorage.removeItem('token');
        } else {
          setError('Failed to delete food');
        }
        return;
      }
      
      // Remove from local state
      setFoods(prev => prev.filter(f => f.id !== foodId));
      onFoodAdded?.(); // Refresh parent
      console.log('Food deleted successfully');
      
    } catch (err) {
      console.error('Delete food error:', err);
      setError('Network error');
    }
  }

  // Calculate totals
  const totalCalories = foods.reduce((sum, food) => sum + (food.calories || 0), 0);
  const totalProtein = foods.reduce((sum, food) => sum + (food.protein || 0), 0);
  const totalCarbs = foods.reduce((sum, food) => sum + (food.carbs || 0), 0);
  const totalFat = foods.reduce((sum, food) => sum + (food.fat || 0), 0);
  const totalFiber = foods.reduce((sum, food) => sum + (food.fiber || 0), 0);
  const totalSugar = foods.reduce((sum, food) => sum + (food.sugar || 0), 0);
  const totalSodium = foods.reduce((sum, food) => sum + (food.sodium || 0), 0);

  if (!mealID) {
    return (
      <p style={{ color: '#ccc', textAlign: 'center' }}>
        Please select a meal to see and add foods.
      </p>
    );
  }

  return (
    <div className="meal-foods-container" onClick={e => e.stopPropagation()}>
      {error && (
        <div className={`error-msg ${error.startsWith('✅') ? 'success' : ''}`}>
          {error}
        </div>
      )}
      
      {/* AI-Powered Food Selector */}
      <div className="add-food-section">
        <h4>Add Food to Meal</h4>
        <FoodSelector 
          onFoodSelect={handleAddFoodFromSelector}
          clearSelection={clearFoodSelector}
        />
      </div>

      <div className="foods-header">
        <h4 className="foods-title">Foods in this meal</h4>
        {foods.length > 0 && (
          <div className="totals">
            <strong>
              Total: {Math.round(totalCalories)} cal | 
              P: {totalProtein.toFixed(1)}g | 
              C: {totalCarbs.toFixed(1)}g | 
              F: {totalFat.toFixed(1)}g
              {totalFiber > 0 && ` | Fiber: ${totalFiber.toFixed(1)}g`}
              {totalSodium > 0 && ` | Na: ${Math.round(totalSodium)}mg`}
            </strong>
          </div>
        )}
      </div>

      {loading ? (
        <p className="loading-text">Loading foods...</p>
      ) : foods.length > 0 ? (
        <ul className="foods-list">
          {foods.map((food) => (
            <li key={food.id} className="food-item">
              <div className="food-info">
                <strong>{food.food_name}</strong>
                <div className="food-details">
                  {food.quantity} {food.unit || 'g'} | {food.calories || 0} cal | 
                  P: {food.protein || 0}g | C: {food.carbs || 0}g | F: {food.fat || 0}g
                  {(food.fiber > 0 || food.sugar > 0 || food.sodium > 0) && (
                    <div style={{ fontSize: '11px', marginTop: '2px', color: '#999' }}>
                      {food.fiber > 0 && `Fiber: ${food.fiber}g `}
                      {food.sugar > 0 && `Sugar: ${food.sugar}g `}
                      {food.sodium > 0 && `Sodium: ${Math.round(food.sodium)}mg`}
                    </div>
                  )}
                </div>
              </div>
              <button
                onClick={() => handleDeleteFood(food.id)}
                className="delete-food-btn"
                title="Delete food"
              >
                🗑️
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="no-foods-text">No foods added yet.</p>
      )}

      <style>{`
        .meal-foods-container {
          background-color: #1e1e1e;
          padding: 24px;
          border-radius: 12px;
          box-shadow: 0 4px 15px rgba(0,0,0,0.3);
          margin: 15px 0;
          color: #e6eef2;
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
        }
        
        .error-msg {
          background: rgba(255, 107, 107, 0.1);
          border: 1px solid rgba(255, 107, 107, 0.3);
          color: #ff6b6b;
          padding: 12px;
          border-radius: 6px;
          margin-bottom: 20px;
          text-align: center;
          font-weight: 600;
        }
        
        .error-msg.success {
          background: rgba(74, 222, 128, 0.1);
          border: 1px solid rgba(74, 222, 128, 0.3);
          color: #4ade80;
        }
        
        .add-food-section {
          margin-bottom: 30px;
          padding: 24px;
          background: rgba(255,255,255,0.02);
          border-radius: 12px;
          border: 1px solid rgba(255,255,255,0.05);
        }
        
        .add-food-section h4 {
          margin: 0 0 20px 0;
          color: #66d7ff;
          font-weight: 600;
          font-size: 1.3rem;
        }
        
        .foods-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 20px;
          flex-wrap: wrap;
          gap: 15px;
          padding-bottom: 10px;
          border-bottom: 2px solid #333;
        }
        
        .foods-title {
          color: #66d7ff;
          margin: 0;
          font-weight: 600;
          font-size: 1.2rem;
          flex: 1;
        }
        
        .totals {
          color: #4ade80;
          font-size: 13px;
          background: rgba(74, 222, 128, 0.1);
          padding: 8px 12px;
          border-radius: 6px;
          white-space: nowrap;
          font-weight: 600;
        }
        
        .loading-text {
          color: #9ca3af;
          text-align: center;
          font-style: italic;
          margin: 25px 0;
          padding: 20px;
        }
        
        .foods-list {
          padding: 0;
          margin: 0;
          list-style: none;
          display: grid;
          gap: 10px;
        }
        
        .food-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          background: rgba(255,255,255,0.03);
          margin-bottom: 0;
          padding: 15px;
          border-radius: 8px;
          border: 1px solid rgba(255,255,255,0.05);
          transition: background 0.2s;
        }
        
        .food-item:hover {
          background: rgba(255,255,255,0.05);
        }
        
        .food-info {
          flex: 1;
        }
        
        .food-info strong {
          display: block;
          margin-bottom: 6px;
          color: #e6eef2;
          font-size: 1.05rem;
        }
        
        .food-details {
          font-size: 13px;
          color: #9ca3af;
          line-height: 1.4;
        }
        
        .delete-food-btn {
          background: rgba(255, 107, 107, 0.1);
          border: 1px solid rgba(255, 107, 107, 0.2);
          color: #ff6b6b;
          padding: 6px 10px;
          border-radius: 6px;
          cursor: pointer;
          font-size: 14px;
          margin-left: 15px;
          transition: background 0.2s;
        }
        
        .delete-food-btn:hover {
          background: rgba(255, 107, 107, 0.2);
        }
        
        .no-foods-text {
          color: #6b7280;
          font-style: italic;
          text-align: center;
          margin: 25px 0;
          padding: 25px;
          background: rgba(255,255,255,0.02);
          border-radius: 8px;
          border: 1px solid rgba(255,255,255,0.05);
        }
        
        @media (max-width: 600px) {
          .meal-foods-container {
            padding: 20px;
          }
          
          .add-food-section {
            padding: 20px;
          }
          
          .foods-header {
            flex-direction: column;
            align-items: flex-start;
            gap: 12px;
          }
          
          .totals {
            font-size: 12px;
            align-self: stretch;
            text-align: center;
          }
          
          .food-item {
            flex-direction: column;
            align-items: flex-start;
            gap: 12px;
            padding: 12px;
          }
          
          .delete-food-btn {
            align-self: flex-end;
            margin: 0;
          }
        }
      `}</style>
    </div>
  );
}
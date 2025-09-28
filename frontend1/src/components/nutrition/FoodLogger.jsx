import React, { useState } from "react";

const FoodLogger = ({ onSave }) => {
  const [foodQuery, setFoodQuery] = useState("");
  const [nutritionData, setNutritionData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchNutrition = async () => {
    if (!foodQuery.trim()) {
      setError("Please enter a food name and quantity.");
      return;
    }
    setLoading(true);
    setError(null);

    try {
      // Use full backend URL to reach your API properly
      const res = await fetch("http://localhost:8080/api/nutrition", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: foodQuery }),
      });

      if (!res.ok) {
        throw new Error(`API error: ${res.status}`);
      }

      const data = await res.json();

      if (data && data.food_name) {
        setNutritionData({
          food_name: data.food_name,
          nf_calories: data.calories,
          nf_protein: data.protein,
          nf_total_carbohydrate: data.carbs,
          nf_total_fat: data.fat,
          serving_qty: data.serving_qty,
          serving_unit: data.serving_unit,
          serving_weight_grams: data.serving_weight_grams,
          photo: { thumb: data.photo || null },
        });
      } else {
        setError("No nutrition data found for this input.");
      }
    } catch (err) {
      setError("Failed to fetch nutrition data. Try again.");
      console.error(err);
    }

    setLoading(false);
  };

  const handleSave = () => {
    if (!nutritionData) {
      setError("Please fetch nutrition data before saving.");
      return;
    }

    onSave({
      name: nutritionData.food_name,
      calories: nutritionData.nf_calories,
      protein: nutritionData.nf_protein,
      carbs: nutritionData.nf_total_carbohydrate,
      fat: nutritionData.nf_total_fat,
      serving_qty: nutritionData.serving_qty,
      serving_unit: nutritionData.serving_unit,
      serving_weight_grams: nutritionData.serving_weight_grams,
      photo: nutritionData.photo?.thumb || null,
    });

    setFoodQuery("");
    setNutritionData(null);
    setError(null);
  };

  return (
    <div style={{ maxWidth: 400, margin: "auto", padding: 20 }}>
      <h2>Log a Food Item</h2>
      <textarea
        rows={3}
        placeholder="e.g., 2 slices of bread, 1 cup rice"
        value={foodQuery}
        onChange={(e) => setFoodQuery(e.target.value)}
        style={{ width: "100%", padding: 8, fontSize: 16 }}
      />

      <button onClick={fetchNutrition} disabled={loading} style={{ margin: "10px 0" }}>
        {loading ? "Fetching..." : "Get Nutrition Info"}
      </button>

      {error && <p style={{ color: "red" }}>{error}</p>}

      {nutritionData && (
        <div
          style={{
            border: "1px solid #ccc",
            padding: 15,
            borderRadius: 5,
            marginTop: 15,
          }}
        >
          <h3>{nutritionData.food_name}</h3>
          <p>Calories: {nutritionData.nf_calories}</p>
          <p>Protein: {nutritionData.nf_protein} g</p>
          <p>Carbs: {nutritionData.nf_total_carbohydrate} g</p>
          <p>Fat: {nutritionData.nf_total_fat} g</p>
          <p>
            Serving: {nutritionData.serving_qty} {nutritionData.serving_unit} (
            {nutritionData.serving_weight_grams} g)
          </p>
          {nutritionData.photo?.thumb && (
            <img src={nutritionData.photo.thumb} alt={nutritionData.food_name} />
          )}
          <button onClick={handleSave} style={{ marginTop: 10, padding: "8px 14px" }}>
            Save Food
          </button>
        </div>
      )}
    </div>
  );
};

export default FoodLogger;

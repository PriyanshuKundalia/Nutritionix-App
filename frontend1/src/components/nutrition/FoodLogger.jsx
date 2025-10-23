import React, { useState, useContext } from "react";
import { AuthContext } from "../../contexts/AuthContext";

export default function FoodLogger({ onSave, mealID }) {
  const { authToken } = useContext(AuthContext || {});
  const [foodQuery, setFoodQuery] = useState("");
  const [nutritionData, setNutritionData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  async function fetchNutrition() {
    setError(null);
    if (!foodQuery.trim()) {
      setError("Please enter a food name and quantity.");
      return;
    }
    setLoading(true);

    try {
      const res = await fetch("http://localhost:8080/api/nutrition", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
        },
        body: JSON.stringify({ query: foodQuery.trim() }),
      });

      const raw = await res.text().catch(() => "");
      let data = null;
      try {
        data = raw ? JSON.parse(raw) : null;
      } catch (e) {
        // server returned non-JSON text; keep raw for debugging
        console.warn("Non-JSON response from /api/nutrition:", raw);
      }

      if (!res.ok) {
        const msg = (data && (data.error || data.details)) || `API error ${res.status}`;
        setError(msg);
        setLoading(false);
        return;
      }

      if (!data || !data.food_name) {
        setError("No usable nutrition data returned. Try a different description.");
        setLoading(false);
        return;
      }

      // Normalize to shape used in UI / save
      setNutritionData({
        food_name: data.food_name,
        calories: data.calories ?? data.nf_calories ?? null,
        protein: data.protein ?? data.nf_protein ?? null,
        carbs: data.carbs ?? data.nf_total_carbohydrate ?? null,
        fat: data.fat ?? data.nf_total_fat ?? null,
        serving_qty: data.serving_qty ?? data.serving_quantity ?? 1,
        serving_unit: data.serving_unit ?? data.serving_unit_name ?? "",
        serving_weight_grams: data.serving_weight_grams ?? null,
        photo: (data.photo && data.photo.thumb) ? data.photo.thumb : (data.photo || null),
        raw: data,
      });
    } catch (err) {
      console.error("Fetch nutrition error:", err);
      setError("Failed to fetch nutrition data. Check server logs or API key.");
    } finally {
      setLoading(false);
    }
  }

  async function handleSave() {
    setError(null);
    if (!nutritionData) {
      setError("Please fetch nutrition data before saving.");
      return;
    }

    const payload = {
      food_name: nutritionData.food_name,
      calories: nutritionData.calories,
      protein: nutritionData.protein,
      carbs: nutritionData.carbs,
      fat: nutritionData.fat,
      serving_qty: nutritionData.serving_qty,
      serving_unit: nutritionData.serving_unit,
      serving_weight_grams: nutritionData.serving_weight_grams,
      photo: nutritionData.photo || null,
      ...(mealID ? { meal_id: mealID } : {}),
    };

    try {
      if (typeof onSave === "function") {
        await onSave(payload);
      } else {
        // fallback: POST directly to mealfoods if no onSave provided and mealID exists
        if (!mealID) {
          setError("No handler provided to save and no meal selected.");
          return;
        }
        const res = await fetch("http://localhost:8080/user/mealfoods", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
          },
          body: JSON.stringify({
            meal_id: mealID,
            food_name: payload.food_name,
            quantity: payload.serving_qty ?? 1,
            calories: Math.round(payload.calories ?? 0),
            protein: Number(payload.protein ?? 0),
            carbs: Number(payload.carbs ?? 0),
            fat: Number(payload.fat ?? 0),
          }),
        });
        if (!res.ok) {
          const t = await res.text().catch(() => "");
          let parsed = null;
          try { parsed = t ? JSON.parse(t) : null } catch {}
          setError((parsed && (parsed.error || parsed.details)) || `Save failed ${res.status}`);
          return;
        }
      }

      // success: clear inputs
      setFoodQuery("");
      setNutritionData(null);
      setError(null);
    } catch (err) {
      console.error("Save food error:", err);
      setError("Failed to save food. See console for details.");
    }
  }

  return (
    <div style={{ maxWidth: 720, margin: "20px auto", padding: 20, background: "#1e1e1e", borderRadius: 12, boxShadow: "0 4px 15px rgba(0,0,0,0.3)" }}>
      <div style={{ display: "flex", gap: 15, alignItems: "flex-start", flexWrap: "wrap" }}>
        <textarea
          rows={3}
          placeholder="e.g., 200g grilled chicken, 1 cup cooked rice"
          value={foodQuery}
          onChange={(e) => setFoodQuery(e.target.value)}
          style={{
            flex: 1,
            minHeight: 90,
            padding: 12,
            borderRadius: 10,
            border: "1px solid rgba(255,255,255,0.1)",
            background: "#0b0d10",
            color: "#e6eef2",
            fontSize: 15,
            resize: "vertical",
            minWidth: 280,
          }}
        />

        <div style={{ display: "flex", flexDirection: "column", gap: 10, minWidth: 120 }}>
          <button
            onClick={fetchNutrition}
            disabled={loading}
            style={{
              padding: "12px 16px",
              borderRadius: 10,
              background: "#39d6c0",
              border: "none",
              color: "#011217",
              fontWeight: 700,
              cursor: "pointer",
              fontSize: "1rem",
              transition: "background 0.3s ease",
            }}
          >
            {loading ? "Analyzing..." : "Get Nutrition"}
          </button>

          <button
            type="button"
            onClick={() => { setFoodQuery(""); setNutritionData(null); setError(null); }}
            style={{
              padding: "10px 12px",
              borderRadius: 10,
              background: "transparent",
              border: "1px solid rgba(255,255,255,0.1)",
              color: "#9fdfff",
              cursor: "pointer",
              fontSize: "0.9rem",
              transition: "background 0.3s ease",
            }}
          >
            Clear
          </button>
        </div>
      </div>

      {error && <div style={{ color: "#ff6b6b", marginTop: 15, fontWeight: 700, padding: 12, background: "rgba(255,107,107,0.1)", borderRadius: 6, textAlign: "center" }}>{error}</div>}

      {nutritionData && (
        <div
          style={{
            marginTop: 20,
            padding: 20,
            borderRadius: 12,
            background: "linear-gradient(180deg, rgba(255,255,255,0.03), rgba(255,255,255,0.01))",
            border: "1px solid rgba(255,255,255,0.05)",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 15, marginBottom: 15 }}>
            <div>
              <h3 style={{ margin: 0, color: "#66d7ff", fontSize: "1.3rem", fontWeight: 600 }}>{nutritionData.food_name}</h3>
              <div style={{ color: "#9aa3ad", marginTop: 8, fontSize: "0.95rem" }}>
                {nutritionData.serving_qty} {nutritionData.serving_unit} • {nutritionData.serving_weight_grams ?? "—"} g
              </div>
            </div>

            <div style={{ textAlign: "right" }}>
              <div style={{ fontWeight: 800, fontSize: 20, color: "#4ade80" }}>{nutritionData.calories ?? "—"} kcal</div>
              <div style={{ color: "#9aa3ad", marginTop: 8, fontSize: "0.9rem" }}>
                P: {nutritionData.protein ?? "—"} g • C: {nutritionData.carbs ?? "—"} g • F: {nutritionData.fat ?? "—"} g
              </div>
            </div>
          </div>

          {nutritionData.photo && (
            <div style={{ marginTop: 15, textAlign: "center" }}>
              <img src={nutritionData.photo} alt={nutritionData.food_name} style={{ maxWidth: 140, borderRadius: 8, boxShadow: "0 2px 8px rgba(0,0,0,0.3)" }} />
            </div>
          )}

          <div style={{ display: "flex", gap: 12, justifyContent: "flex-end", marginTop: 20 }}>
            <button onClick={handleSave} style={{ padding: "12px 20px", borderRadius: 10, background: "#39d6c0", border: "none", fontWeight: 700, cursor: "pointer", fontSize: "1rem", transition: "background 0.3s ease" }}>
              Save Food
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

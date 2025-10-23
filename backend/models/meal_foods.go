package models

type MealFood struct {
	ID          string  `db:"id" json:"id"`
	MealID      string  `db:"meal_id" json:"meal_id"`
	FoodID      *int64  `db:"food_id" json:"food_id,omitempty"` // Reference to food database
	FoodName    string  `db:"food_name" json:"food_name"`
	Quantity    float32 `db:"quantity" json:"quantity"`
	Unit        string  `db:"unit" json:"unit"` // g, kg, oz, cup, piece, etc.
	Calories    int64   `db:"calories" json:"calories"`
	Protein     float32 `db:"protein" json:"protein"`
	Carbs       float32 `db:"carbs" json:"carbs"`
	Fat         float32 `db:"fat" json:"fat"`
	Fiber       float32 `db:"fiber" json:"fiber"`
	Sugar       float32 `db:"sugar" json:"sugar"`
	Sodium      float32 `db:"sodium" json:"sodium"`
	Calcium     float32 `db:"calcium" json:"calcium"`
	Iron        float32 `db:"iron" json:"iron"`
	Potassium   float32 `db:"potassium" json:"potassium"`
	ServingSize string  `db:"serving_size" json:"serving_size"` // Original serving size from database
}

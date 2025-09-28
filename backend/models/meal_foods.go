package models

type MealFood struct {
	ID       string  `db:"id" json:"id"`
	MealID   string  `db:"meal_id" json:"meal_id"`
	FoodName string  `db:"food_name" json:"food_name"`
	Quantity float32 `db:"quantity" json:"quantity"`
	Calories int64   `db:"calories" json:"calories"`
	Protein  float32 `db:"protein" json:"protein"`
	Carbs    float32 `db:"carbs" json:"carbs"`
	Fat      float32 `db:"fat" json:"fat"`
}

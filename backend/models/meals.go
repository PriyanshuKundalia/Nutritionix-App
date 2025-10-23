package models

import "time"

type Meal struct {
	ID        string    `db:"id" json:"id"`
	UserID    string    `db:"user_id" json:"user_id"`
	Date      string    `db:"date" json:"date"` // Format: "YYYY-MM-DD"
	MealType  string    `db:"meal_type" json:"meal_type"`
	CreatedAt time.Time `db:"created_at" json:"created_at"`
}

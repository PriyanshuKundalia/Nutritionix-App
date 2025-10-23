package models

import (
	"database/sql"
	"time"

	"github.com/google/uuid"
)

type Workout struct {
	ID             uuid.UUID       `gorm:"type:uuid;default:gen_random_uuid();primaryKey" json:"id"`
	UserID         uuid.UUID       `gorm:"type:uuid;not null" json:"user_id"`
	Name           string          `gorm:"type:text;not null" json:"name"`
	Type           string          `gorm:"type:text" json:"type"` // workout category: cardio, strength, flexibility, sports
	DurationMin    int             `gorm:"type:int;not null" json:"duration_min"`
	Weight         sql.NullFloat64 `gorm:"type:decimal(5,2)" json:"weight"` // weight in kg/lbs for strength training
	Reps           sql.NullInt32   `gorm:"type:int" json:"reps"`            // repetitions for strength training
	CaloriesBurned sql.NullInt32   `gorm:"type:int" json:"calories_burned"`
	Date           sql.NullTime    `gorm:"type:date" json:"-"`
	DateString     string          `json:"date"` // JSON visible date string
	CreatedAt      time.Time       `gorm:"autoCreateTime" json:"created_at"`
}

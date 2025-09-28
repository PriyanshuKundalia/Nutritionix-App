package models

import (
	"time"

	"github.com/google/uuid"
)

type UserGoal struct {
	ID            uuid.UUID `gorm:"type:uuid;primary_key;default:uuid_generate_v4()" json:"id"`
	UserID        uuid.UUID `gorm:"type:uuid;not null" json:"user_id"`
	GoalType      string    `gorm:"type:varchar(50);not null" json:"goal_type"`
	TargetValue   int       `gorm:"not null" json:"target_value"`
	ProgressValue int       `gorm:"not null;default:0" json:"progress_value"`
	TimeFrame     string    `gorm:"type:varchar(20);not null" json:"time_frame"`
	IsCompleted   bool      `gorm:"type:boolean;not null;default:false" json:"is_completed"`
	Archived      bool      `gorm:"type:boolean;not null;default:false" json:"archived"` // NEW
	CreatedAt     time.Time `gorm:"not null;default:current_timestamp" json:"created_at"`
	UpdatedAt     time.Time `gorm:"not null;default:current_timestamp" json:"updated_at"`
}

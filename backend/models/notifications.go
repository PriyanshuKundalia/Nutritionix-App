package models

import (
	"time"

	"github.com/google/uuid"
)

type Notification struct {
	ID        uuid.UUID  `gorm:"type:uuid;default:gen_random_uuid();primaryKey" json:"id"`
	UserID    uuid.UUID  `gorm:"type:uuid;not null" json:"user_id"`
	GoalID    *uuid.UUID `gorm:"type:uuid" json:"goal_id,omitempty"`
	Message   string     `gorm:"type:text" json:"message"`
	IsRead    bool       `gorm:"default:false" json:"is_read"`
	CreatedAt time.Time  `gorm:"autoCreateTime" json:"created_at"`
	UpdatedAt time.Time  `gorm:"autoUpdateTime" json:"updated_at"`
}

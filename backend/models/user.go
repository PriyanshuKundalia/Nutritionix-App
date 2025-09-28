package models

import (
	"time"

	"github.com/google/uuid"
)

type User struct {
	ID        uuid.UUID `gorm:"type:uuid;default:gen_random_uuid();primaryKey" json:"id"`
	Email     string    `gorm:"type:text;unique;not null" json:"email"`
	Password  string    `gorm:"type:text;not null" json:"password"`
	Name      string    `gorm:"type:text;not null" json:"name"`
	Role      string    `gorm:"type:text;default:'user';not null" json:"role"`
	Age       int64     `gorm:"type:int8" json:"age"`
	Height    int64     `gorm:"type:int8" json:"height"`
	Weight    int64     `gorm:"type:int8" json:"weight"`
	CreatedAt time.Time `gorm:"autoCreateTime" json:"created_at"`
}

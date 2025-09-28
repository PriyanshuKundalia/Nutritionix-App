package handlers

import (
	"database/sql"
	"net/http"
	"time"

	"nutritionix/backend/config"
	"nutritionix/backend/utils"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

// GetProfile returns the current user's profile
func GetProfile(c *gin.Context) {
	userIDStr := c.GetString(utils.ContextUserIDKey)
	userID, err := uuid.Parse(userIDStr)
	if err != nil {
		utils.JSONError(c, http.StatusBadRequest, "Invalid user ID")
		return
	}

	var user struct {
		ID        uuid.UUID     `json:"id"`
		Email     string        `json:"email"`
		Name      string        `json:"name"`
		Role      string        `json:"role"`
		Age       sql.NullInt64 `json:"age"`
		Height    sql.NullInt64 `json:"height"`
		Weight    sql.NullInt64 `json:"weight"`
		CreatedAt time.Time     `json:"-"`
	}

	err = config.DB.QueryRow(
		`SELECT id, email, name, role, age, height, weight, created_at 
         FROM users 
         WHERE id=$1`,
		userID,
	).Scan(&user.ID, &user.Email, &user.Name, &user.Role, &user.Age, &user.Height, &user.Weight, &user.CreatedAt)

	if err != nil {
		if err == sql.ErrNoRows {
			utils.JSONError(c, http.StatusNotFound, "User not found")
			return
		}
		utils.JSONError(c, http.StatusInternalServerError, err.Error())
		return
	}

	resp := gin.H{
		"id":         user.ID,
		"email":      user.Email,
		"name":       user.Name,
		"role":       user.Role,
		"created_at": user.CreatedAt.Format(time.RFC3339),
	}

	// Handle nullable int64 fields for JSON response
	if user.Age.Valid {
		resp["age"] = user.Age.Int64
	} else {
		resp["age"] = nil
	}
	if user.Height.Valid {
		resp["height"] = user.Height.Int64
	} else {
		resp["height"] = nil
	}
	if user.Weight.Valid {
		resp["weight"] = user.Weight.Int64
	} else {
		resp["weight"] = nil
	}

	utils.JSONResponse(c, http.StatusOK, resp)
}

// UpdateProfile updates the logged-in user's profile
func UpdateProfile(c *gin.Context) {
	userIDStr := c.GetString(utils.ContextUserIDKey)
	userID, err := uuid.Parse(userIDStr)
	if err != nil {
		utils.JSONError(c, http.StatusBadRequest, "Invalid user ID")
		return
	}

	var req struct {
		Name   string `json:"name"`
		Age    *int64 `json:"age"`
		Height *int64 `json:"height"`
		Weight *int64 `json:"weight"`
	}
	if !utils.BindJSON(c, &req) {
		return
	}

	if req.Name == "" {
		utils.JSONError(c, http.StatusBadRequest, "Name cannot be empty")
		return
	}

	res, err := config.DB.Exec(
		`UPDATE users SET name=$1, age=$2, height=$3, weight=$4 WHERE id=$5`,
		req.Name, req.Age, req.Height, req.Weight, userID,
	)
	if err != nil {
		utils.JSONError(c, http.StatusInternalServerError, err.Error())
		return
	}

	rows, _ := res.RowsAffected()
	if rows == 0 {
		utils.JSONError(c, http.StatusNotFound, "User not found")
		return
	}

	// Fetch updated user details after update
	var user struct {
		ID        uuid.UUID     `json:"id"`
		Email     string        `json:"email"`
		Name      string        `json:"name"`
		Role      string        `json:"role"`
		Age       sql.NullInt64 `json:"age"`
		Height    sql.NullInt64 `json:"height"`
		Weight    sql.NullInt64 `json:"weight"`
		CreatedAt time.Time     `json:"-"`
	}

	err = config.DB.QueryRow(
		`SELECT id, email, name, role, age, height, weight, created_at FROM users WHERE id=$1`,
		userID,
	).Scan(&user.ID, &user.Email, &user.Name, &user.Role, &user.Age, &user.Height, &user.Weight, &user.CreatedAt)

	if err != nil {
		utils.JSONError(c, http.StatusInternalServerError, err.Error())
		return
	}

	resp := gin.H{
		"id":         user.ID,
		"email":      user.Email,
		"name":       user.Name,
		"role":       user.Role,
		"created_at": user.CreatedAt.Format(time.RFC3339),
	}

	if user.Age.Valid {
		resp["age"] = user.Age.Int64
	} else {
		resp["age"] = nil
	}
	if user.Height.Valid {
		resp["height"] = user.Height.Int64
	} else {
		resp["height"] = nil
	}
	if user.Weight.Valid {
		resp["weight"] = user.Weight.Int64
	} else {
		resp["weight"] = nil
	}

	utils.JSONResponse(c, http.StatusOK, resp)
}

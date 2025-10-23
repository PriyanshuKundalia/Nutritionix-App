package handlers

import (
	"log"
	"net/http"
	"strings"
	"time"

	"nutritionix/backend/config"
	"nutritionix/backend/models"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

// CreateWorkout creates a new workout for the logged-in user
func CreateWorkout(c *gin.Context) {
	userIDStr := c.GetString("user_id")
	userID, err := uuid.Parse(userIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid user ID"})
		return
	}

	var input struct {
		Name           string `json:"name"`
		DurationMin    int    `json:"duration_min"`
		CaloriesBurned int    `json:"calories_burned"`
		Date           string `json:"date"`
	}
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if strings.TrimSpace(input.Name) == "" || input.DurationMin < 0 || input.CaloriesBurned < 0 || input.Date == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid workout data"})
		return
	}

	// Validate date format "YYYY-MM-DD"
	if _, err := time.Parse("2006-01-02", input.Date); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "date must be in YYYY-MM-DD format"})
		return
	}

	var workoutID uuid.UUID
	err = config.DB.QueryRow(
		`INSERT INTO workouts (user_id, name, duration_minutes, calories_burned, date, created_at) 
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING id`,
		userID, input.Name, input.DurationMin, input.CaloriesBurned, input.Date, time.Now(),
	).Scan(&workoutID)
	if err != nil {
		log.Printf("Failed to create workout: %v", err)
		log.Printf("Values: userID=%s, name=%s, duration=%d, calories=%d, date=%s",
			userID, input.Name, input.DurationMin, input.CaloriesBurned, input.Date)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create workout"})
		return
	}

	_ = CreateNotification(userID, &workoutID, "💪 New workout scheduled: "+input.Name)

	// Return the workout object in frontend-compatible format
	response := map[string]interface{}{
		"id":              workoutID,
		"user_id":         userID,
		"name":            input.Name,
		"duration_min":    input.DurationMin,
		"calories_burned": input.CaloriesBurned,
		"date":            input.Date,
		"created_at":      time.Now(),
	}

	c.JSON(http.StatusCreated, response)
}

// GetWorkouts lists the workouts for the logged-in user
func GetWorkouts(c *gin.Context) {
	userIDStr := c.GetString("user_id")
	userID, err := uuid.Parse(userIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid user ID"})
		return
	}

	rows, err := config.DB.Query(
		`SELECT id, user_id, name, duration_minutes, calories_burned, date, created_at
         FROM workouts 
         WHERE user_id=$1
         ORDER BY date DESC, created_at DESC`,
		userID,
	)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get workouts"})
		return
	}
	defer rows.Close()

	var workouts []models.Workout
	for rows.Next() {
		var w models.Workout
		if err := rows.Scan(
			&w.ID, &w.UserID, &w.Name, &w.DurationMin, &w.CaloriesBurned, &w.Date, &w.CreatedAt,
		); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to parse workouts"})
			return
		}
		// Convert Date sql.NullTime to string DateString for frontend
		if w.Date.Valid {
			w.DateString = w.Date.Time.Format("2006-01-02")
		} else {
			w.DateString = ""
		}
		workouts = append(workouts, w)
	}

	// Convert workouts to a format suitable for frontend
	var responseWorkouts []map[string]interface{}
	for _, w := range workouts {
		caloriesBurned := 0
		if w.CaloriesBurned.Valid {
			caloriesBurned = int(w.CaloriesBurned.Int32)
		}

		responseWorkouts = append(responseWorkouts, map[string]interface{}{
			"id":              w.ID,
			"user_id":         w.UserID,
			"name":            w.Name,
			"duration_min":    w.DurationMin,
			"calories_burned": caloriesBurned,
			"date":            w.DateString,
			"created_at":      w.CreatedAt,
		})
	}

	c.JSON(http.StatusOK, responseWorkouts)
}

// UpdateWorkout updates an existing workout
func UpdateWorkout(c *gin.Context) {
	userIDStr := c.GetString("user_id")
	userID, err := uuid.Parse(userIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid user ID"})
		return
	}

	workoutIDParam := c.Param("id")
	workoutID, err := uuid.Parse(workoutIDParam)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid workout ID"})
		return
	}

	var input struct {
		Name           string `json:"name"`
		DurationMin    int    `json:"duration_min"`
		CaloriesBurned int    `json:"calories_burned"`
		Date           string `json:"date"`
	}
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if strings.TrimSpace(input.Name) == "" || input.DurationMin < 0 || input.CaloriesBurned < 0 || input.Date == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid workout data"})
		return
	}

	// Validate date format "YYYY-MM-DD"
	if _, err := time.Parse("2006-01-02", input.Date); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "date must be in YYYY-MM-DD format"})
		return
	}

	_, err = config.DB.Exec(
		`UPDATE workouts 
         SET name=$1, duration_minutes=$2, calories_burned=$3, date=$4
         WHERE id=$5 AND user_id=$6`,
		input.Name, input.DurationMin, input.CaloriesBurned, input.Date, workoutID, userID,
	)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update workout"})
		return
	}

	_ = CreateNotification(userID, &workoutID, "✏️ Your workout '"+input.Name+"' was updated.")

	c.JSON(http.StatusOK, gin.H{"message": "Workout updated successfully"})
}

// DeleteWorkout deletes an existing workout
func DeleteWorkout(c *gin.Context) {
	userIDStr := c.GetString("user_id")
	userID, err := uuid.Parse(userIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid user ID"})
		return
	}

	workoutIDParam := c.Param("id")
	workoutID, err := uuid.Parse(workoutIDParam)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid workout ID"})
		return
	}

	res, err := config.DB.Exec(
		`DELETE FROM workouts WHERE id=$1 AND user_id=$2`,
		workoutID, userID,
	)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete workout"})
		return
	}

	count, _ := res.RowsAffected()
	if count == 0 {
		c.JSON(http.StatusNotFound, gin.H{"error": "Workout not found"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Workout deleted successfully"})
}

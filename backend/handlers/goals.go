package handlers

import (
	"database/sql"
	"fmt"
	"log"
	"net/http"
	"nutritionix/backend/config"
	"nutritionix/backend/models"
	"regexp"
	"strconv"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

const (
	MAX_VALUE = 1000000
	MIN_GOAL  = 3
	MAX_GOAL  = 50
)

// sanitizeGoalType trims/lowercases input and ensures it’s valid
func sanitizeGoalType(gt string) (string, error) {
	gt = strings.TrimSpace(gt)
	gt = strings.ToLower(gt)
	validGoalType := regexp.MustCompile(`^[a-z0-9 _-]+$`)
	if len(gt) < MIN_GOAL || len(gt) > MAX_GOAL || !validGoalType.MatchString(gt) {
		return "", fmt.Errorf("goal_type must be %d-%d chars and only letters, numbers, spaces, underscores, or hyphens allowed", MIN_GOAL, MAX_GOAL)
	}
	return gt, nil
}

// validateGoalValues enforces target/progress value rules
func validateGoalValues(target int, progress *int) (int, error) {
	if target <= 0 || target > MAX_VALUE {
		return 0, fmt.Errorf("target_value must be between 1 and %d", MAX_VALUE)
	}
	progressValue := 0
	if progress != nil {
		if *progress < 0 || *progress > MAX_VALUE {
			return 0, fmt.Errorf("progress_value must be between 0 and %d", MAX_VALUE)
		}
		progressValue = *progress
	}
	return progressValue, nil
}

// CreateOrUpdateGoal creates a new goal or updates the existing one
func CreateOrUpdateGoal(c *gin.Context) {
	userIDStr := c.GetString("user_id")
	userID, err := uuid.Parse(userIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid user ID"})
		return
	}

	var input struct {
		GoalType      string `json:"goal_type"`
		TargetValue   int    `json:"target_value"`
		ProgressValue *int   `json:"progress_value"`
		TimeFrame     string `json:"time_frame"`
		IsCompleted   *bool  `json:"is_completed"`
	}
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid input: " + err.Error()})
		return
	}

	goalType, err := sanitizeGoalType(input.GoalType)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	progressValue, err := validateGoalValues(input.TargetValue, input.ProgressValue)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if input.TimeFrame != "daily" && input.TimeFrame != "weekly" && input.TimeFrame != "monthly" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "time_frame must be daily, weekly, or monthly"})
		return
	}

	isCompleted := false
	if input.IsCompleted != nil {
		isCompleted = *input.IsCompleted
	}
	if progressValue >= input.TargetValue {
		isCompleted = true
	}

	var existingID uuid.UUID
	err = config.DB.QueryRow(
		"SELECT id FROM user_goals WHERE user_id=$1 AND goal_type=$2",
		userID, goalType,
	).Scan(&existingID)

	if err != nil && err != sql.ErrNoRows {
		log.Println("DB SELECT ERROR:", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Database error"})
		return
	}

	if err == nil {
		_, updateErr := config.DB.Exec(
			`UPDATE user_goals 
			 SET target_value=$1, progress_value=$2, time_frame=$3, updated_at=$4, is_completed=$5, archived=false
			 WHERE id=$6`,
			input.TargetValue, progressValue, input.TimeFrame, time.Now(), isCompleted, existingID,
		)
		if updateErr != nil {
			log.Println("DB UPDATE ERROR:", updateErr)
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update goal"})
			return
		}

		completedMsg := fmt.Sprintf("🎯 Congratulations! Your goal '%s' is completed.", goalType)
		nearlyMsg := fmt.Sprintf("💪 You're close! Your goal '%s' is 80%% complete.", goalType)

		if isCompleted && !HasRecentNotification(userID, existingID, completedMsg) {
			CreateNotification(userID, &existingID, completedMsg)
		} else if !isCompleted &&
			float64(progressValue) >= float64(input.TargetValue)*0.8 &&
			!HasRecentNotification(userID, existingID, nearlyMsg) {
			CreateNotification(userID, &existingID, nearlyMsg)
		}

		c.JSON(http.StatusOK, gin.H{"message": "Goal updated successfully"})
		return
	}

	var newGoalID uuid.UUID
	err = config.DB.QueryRow(
		`INSERT INTO user_goals (user_id, goal_type, target_value, progress_value, time_frame, is_completed, archived, created_at, updated_at)
		 VALUES ($1, $2, $3, $4, $5, $6, false, $7, $8)
		 RETURNING id`,
		userID, goalType, input.TargetValue, progressValue, input.TimeFrame, isCompleted, time.Now(), time.Now(),
	).Scan(&newGoalID)
	if err != nil {
		log.Println("DB INSERT ERROR:", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create goal"})
		return
	}

	completedMsg := fmt.Sprintf("🎯 Congratulations! Your goal '%s' is completed.", goalType)
	nearlyMsg := fmt.Sprintf("💪 You're close! Your goal '%s' is 80%% complete.", goalType)

	if isCompleted && !HasRecentNotification(userID, newGoalID, completedMsg) {
		CreateNotification(userID, &newGoalID, completedMsg)
	} else if !isCompleted &&
		float64(progressValue) >= float64(input.TargetValue)*0.8 &&
		!HasRecentNotification(userID, newGoalID, nearlyMsg) {
		CreateNotification(userID, &newGoalID, nearlyMsg)
	}

	c.JSON(http.StatusCreated, gin.H{"message": "Goal created successfully"})
}

// GetGoals fetches goals for a user
func GetGoals(c *gin.Context) {
	userIDStr := c.GetString("user_id")
	userID, err := uuid.Parse(userIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid user ID"})
		return
	}

	completed := c.Query("completed")
	includeArchived := c.Query("include_archived")
	sortBy := c.DefaultQuery("sort_by", "created_at")
	order := strings.ToLower(c.DefaultQuery("order", "desc"))
	limitStr := c.DefaultQuery("limit", "10")
	offsetStr := c.DefaultQuery("offset", "0")

	limit, err := strconv.Atoi(limitStr)
	if err != nil || limit <= 0 {
		limit = 10
	}
	if limit > 50 {
		limit = 50
	}
	offset, err := strconv.Atoi(offsetStr)
	if err != nil || offset < 0 {
		offset = 0
	}

	allowedSort := map[string]bool{
		"created_at":     true,
		"target_value":   true,
		"goal_type":      true,
		"progress_value": true,
	}
	if !allowedSort[sortBy] {
		sortBy = "created_at"
	}
	if order != "asc" && order != "desc" {
		order = "desc"
	}

	var args []interface{}
	query := `
		SELECT id, user_id, goal_type, target_value, progress_value, time_frame, is_completed, archived, created_at, updated_at
		FROM user_goals
		WHERE user_id = $1
	`
	args = append(args, userID)

	if includeArchived != "true" {
		query += ` AND archived = false`
	}
	if completed != "" {
		if completed == "true" || completed == "false" {
			args = append(args, completed == "true")
			query += ` AND is_completed = $` + strconv.Itoa(len(args))
		}
	}

	query += ` ORDER BY ` + sortBy + ` ` + order
	args = append(args, limit, offset)
	query += ` LIMIT $` + strconv.Itoa(len(args)-1) + ` OFFSET $` + strconv.Itoa(len(args))

	rows, err := config.DB.Query(query, args...)
	if err != nil {
		log.Println("DB SELECT ERROR:", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch goals"})
		return
	}
	defer rows.Close()

	var goals []models.UserGoal
	for rows.Next() {
		var g models.UserGoal
		if err := rows.Scan(
			&g.ID, &g.UserID, &g.GoalType, &g.TargetValue, &g.ProgressValue, &g.TimeFrame,
			&g.IsCompleted, &g.Archived, &g.CreatedAt, &g.UpdatedAt,
		); err != nil {
			log.Println("DB SCAN ERROR:", err)
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to parse goals"})
			return
		}
		goals = append(goals, g)
	}
	c.JSON(http.StatusOK, goals)
}

// UpdateGoal updates a goal
func UpdateGoal(c *gin.Context) {
	userIDStr := c.GetString("user_id")
	userID, err := uuid.Parse(userIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid user ID"})
		return
	}

	goalIDParam := c.Param("id")
	goalID, err := uuid.Parse(goalIDParam)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid goal ID"})
		return
	}

	var input struct {
		TargetValue   int    `json:"target_value"`
		ProgressValue *int   `json:"progress_value"`
		TimeFrame     string `json:"time_frame"`
		IsCompleted   *bool  `json:"is_completed"`
	}

	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid input: " + err.Error()})
		return
	}

	progressValue, err := validateGoalValues(input.TargetValue, input.ProgressValue)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	if input.TimeFrame != "daily" && input.TimeFrame != "weekly" && input.TimeFrame != "monthly" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "time_frame must be daily, weekly, or monthly"})
		return
	}

	isCompleted := false
	if input.IsCompleted != nil {
		isCompleted = *input.IsCompleted
	}
	if progressValue >= input.TargetValue {
		isCompleted = true
	}

	res, err := config.DB.Exec(
		`UPDATE user_goals 
		 SET target_value=$1, progress_value=$2, time_frame=$3, updated_at=$4, is_completed=$5
		 WHERE id=$6 AND user_id=$7`,
		input.TargetValue, progressValue, input.TimeFrame, time.Now(), isCompleted, goalID, userID,
	)
	if err != nil {
		log.Println("DB UPDATE ERROR:", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update goal"})
		return
	}

	count, _ := res.RowsAffected()
	if count == 0 {
		c.JSON(http.StatusNotFound, gin.H{"error": "Goal not found"})
		return
	}

	completedMsg := "🎯 Congratulations! Your goal is completed."
	nearlyMsg := "💪 You're close! Your goal is 80% complete."

	if isCompleted && !HasRecentNotification(userID, goalID, completedMsg) {
		CreateNotification(userID, &goalID, completedMsg)
	} else if !isCompleted &&
		float64(progressValue) >= float64(input.TargetValue)*0.8 &&
		!HasRecentNotification(userID, goalID, nearlyMsg) {
		CreateNotification(userID, &goalID, nearlyMsg)
	}

	c.JSON(http.StatusOK, gin.H{"message": "Goal updated successfully"})
}

// DeleteGoal archives a goal
func DeleteGoal(c *gin.Context) {
	userIDStr := c.GetString("user_id")
	userID, err := uuid.Parse(userIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid user ID"})
		return
	}

	goalIDParam := c.Param("id")
	goalID, err := uuid.Parse(goalIDParam)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid goal ID"})
		return
	}

	res, err := config.DB.Exec(
		`UPDATE user_goals SET archived = true, updated_at = $1
		 WHERE id = $2 AND user_id = $3 AND archived = false`,
		time.Now(), goalID, userID,
	)
	if err != nil {
		log.Println("DB SOFT DELETE ERROR:", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to archive goal"})
		return
	}

	count, _ := res.RowsAffected()
	if count == 0 {
		c.JSON(http.StatusNotFound, gin.H{"error": "Goal not found or already archived"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "Goal archived successfully"})
}

// RestoreGoal unarchives a goal
func RestoreGoal(c *gin.Context) {
	userIDStr := c.GetString("user_id")
	userID, err := uuid.Parse(userIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid user ID"})
		return
	}

	goalIDParam := c.Param("id")
	goalID, err := uuid.Parse(goalIDParam)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid goal ID"})
		return
	}

	res, err := config.DB.Exec(
		`UPDATE user_goals SET archived = false, updated_at = $1
		 WHERE id = $2 AND user_id = $3 AND archived = true`,
		time.Now(), goalID, userID,
	)
	if err != nil {
		log.Println("DB RESTORE ERROR:", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to restore goal"})
		return
	}

	count, _ := res.RowsAffected()
	if count == 0 {
		c.JSON(http.StatusNotFound, gin.H{"error": "Goal not found or not archived"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "Goal restored successfully"})
}

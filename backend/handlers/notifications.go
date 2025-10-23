package handlers

import (
	"database/sql"
	"log"
	"net/http"
	"strconv"
	"time"

	"nutritionix/backend/config"
	"nutritionix/backend/models"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

const notificationCooldownHours = 24

// GetNotifications fetches notifications for the logged-in user with optional filters and pagination
func GetNotifications(c *gin.Context) {
	userIDStr := c.GetString("user_id")
	userID, err := uuid.Parse(userIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid user ID"})
		return
	}

	isReadFilter := c.Query("is_read")

	limit, err := strconv.Atoi(c.DefaultQuery("limit", "10"))
	if err != nil || limit <= 0 {
		limit = 10
	}
	if limit > 50 {
		limit = 50
	}

	offset, err := strconv.Atoi(c.DefaultQuery("offset", "0"))
	if err != nil || offset < 0 {
		offset = 0
	}

	query := `
		SELECT id, user_id, goal_id, message, is_read, created_at, updated_at
		FROM notifications
		WHERE user_id = $1
	`
	args := []interface{}{userID}

	if isReadFilter == "true" {
		query += " AND is_read = true"
	} else if isReadFilter == "false" {
		query += " AND is_read = false"
	}

	query += " ORDER BY created_at DESC LIMIT $2 OFFSET $3"
	args = append(args, limit, offset)

	rows, err := config.DB.Query(query, args...)
	if err != nil {
		log.Println("DB SELECT ERROR (GetNotifications):", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch notifications"})
		return
	}
	defer rows.Close()

	var notifications []models.Notification
	for rows.Next() {
		var n models.Notification
		if err := rows.Scan(
			&n.ID,
			&n.UserID,
			&n.GoalID, // must be *uuid.UUID in models.Notification if nullable
			&n.Message,
			&n.IsRead,
			&n.CreatedAt,
			&n.UpdatedAt,
		); err != nil {
			log.Println("DB SCAN ERROR (GetNotifications):", err)
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to parse notifications"})
			return
		}
		notifications = append(notifications, n)
	}

	c.JSON(http.StatusOK, notifications)
}

// MarkNotificationRead marks a specific notification as read
func MarkNotificationRead(c *gin.Context) {
	userIDStr := c.GetString("user_id")
	userID, err := uuid.Parse(userIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid user ID"})
		return
	}

	notificationIDStr := c.Param("id")
	notificationID, err := uuid.Parse(notificationIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid notification ID"})
		return
	}

	res, err := config.DB.Exec(
		`UPDATE notifications 
		 SET is_read = true, updated_at = $1
		 WHERE id = $2 AND user_id = $3 AND is_read = false`,
		time.Now(), notificationID, userID,
	)
	if err != nil {
		log.Println("DB UPDATE ERROR (MarkNotificationRead):", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to mark notification as read"})
		return
	}

	count, _ := res.RowsAffected()
	if count == 0 {
		c.JSON(http.StatusNotFound, gin.H{"error": "Notification not found or already read"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Notification marked as read"})
}

// MarkAllNotificationsRead marks all unread notifications for the user as read
func MarkAllNotificationsRead(c *gin.Context) {
	userIDStr := c.GetString("user_id")
	userID, err := uuid.Parse(userIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid user ID"})
		return
	}

	res, err := config.DB.Exec(
		`UPDATE notifications
		 SET is_read = true, updated_at = $1
		 WHERE user_id = $2 AND is_read = false`,
		time.Now(), userID,
	)
	if err != nil {
		log.Println("DB UPDATE ERROR (MarkAllNotificationsRead):", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to mark all notifications as read"})
		return
	}

	count, _ := res.RowsAffected()
	c.JSON(http.StatusOK, gin.H{
		"message":               "All notifications marked as read",
		"updated_notifications": count,
	})
}

// CreateNotification inserts a new notification
func CreateNotification(userID uuid.UUID, goalID *uuid.UUID, message string) error {
	_, err := config.DB.Exec(
		`INSERT INTO notifications (user_id, goal_id, message, is_read, created_at, updated_at)
		 VALUES ($1, $2, $3, false, $4, $5)`,
		userID, goalID, message, time.Now(), time.Now(),
	)
	if err != nil {
		log.Println("DB INSERT ERROR (CreateNotification):", err)
	}
	return err
}

// HasRecentNotification checks if a similar notification exists within cooldown
func HasRecentNotification(userID uuid.UUID, goalID uuid.UUID, message string) bool {
	var exists bool
	query := `
		SELECT true
		FROM notifications
		WHERE user_id = $1
		  AND goal_id = $2
		  AND message = $3
		  AND created_at >= NOW() - ($4 || ' hours')::interval
		LIMIT 1
	`
	err := config.DB.QueryRow(query, userID, goalID, message, strconv.Itoa(notificationCooldownHours)).Scan(&exists)
	if err != nil {
		if err != sql.ErrNoRows {
			log.Println("DB CHECK ERROR (HasRecentNotification):", err)
		}
		return false
	}
	return exists
}

// ClearAllNotifications deletes all notifications for the logged-in user
func ClearAllNotifications(c *gin.Context) {
	userIDStr := c.GetString("user_id")
	userID, err := uuid.Parse(userIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid user ID"})
		return
	}

	res, err := config.DB.Exec(
		`DELETE FROM notifications WHERE user_id = $1`,
		userID,
	)
	if err != nil {
		log.Println("DB DELETE ERROR (ClearAllNotifications):", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to clear notifications"})
		return
	}

	count, _ := res.RowsAffected()
	c.JSON(http.StatusOK, gin.H{
		"message":               "All notifications cleared",
		"deleted_notifications": count,
	})
}

// DeleteNotification deletes a single notification
func DeleteNotification(c *gin.Context) {
	userIDStr := c.GetString("user_id")
	userID, err := uuid.Parse(userIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid user ID"})
		return
	}

	notificationIDStr := c.Param("id")
	notificationID, err := uuid.Parse(notificationIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid notification ID"})
		return
	}

	res, err := config.DB.Exec(
		`DELETE FROM notifications WHERE id = $1 AND user_id = $2`,
		notificationID, userID,
	)
	if err != nil {
		log.Println("DB DELETE ERROR (DeleteNotification):", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete notification"})
		return
	}

	count, _ := res.RowsAffected()
	if count == 0 {
		c.JSON(http.StatusNotFound, gin.H{"error": "Notification not found"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "Notification deleted successfully",
	})
}

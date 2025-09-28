package main

import (
	"context"
	"encoding/json"
	"errors"
	"log"
	"net/http"
	"os"
	"strings"
	"time"

	"nutritionix/backend/config"
	"nutritionix/backend/handlers"
	"nutritionix/backend/middleware"
	"nutritionix/backend/utils"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"

	openai "github.com/sashabaranov/go-openai"
)

func main() {
	if os.Getenv("GIN_MODE") == "release" {
		gin.SetMode(gin.ReleaseMode)
	}

	// Load configs, JWT, DB connection
	config.LoadConfig()
	utils.InitJWT()
	config.ConnectDatabase()

	// Check OpenAI API key is set
	openAiKey := os.Getenv("OPENAI_API_KEY")
	if openAiKey == "" {
		log.Fatal("OPENAI_API_KEY environment variable is not set")
	}
	log.Println("OpenAI API key loaded successfully")

	mealHandler := handlers.NewHandler(config.DB)

	r := gin.Default()
	r.Use(cors.New(cors.Config{
		AllowOrigins:     []string{"http://localhost:5173", "http://127.0.0.1:5173"},
		AllowMethods:     []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"},
		AllowHeaders:     []string{"Origin", "Content-Type", "Authorization", "Accept"},
		ExposeHeaders:    []string{"Content-Length"},
		AllowCredentials: true,
		MaxAge:           12 * time.Hour,
	}))

	r.GET("/cors-test", func(c *gin.Context) {
		c.JSON(200, gin.H{"cors": "ok"})
	})
	r.OPTIONS("/*path", func(c *gin.Context) {
		c.Status(http.StatusOK)
	})

	// Health check endpoint
	r.GET("/health", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"status": "ok"})
	})

	// Auth routes
	r.POST("/auth/register", handlers.Register)
	r.POST("/auth/login", handlers.Login)
	r.POST("/auth/request-reset", handlers.RequestPasswordReset)
	r.POST("/auth/reset-password", handlers.ResetPassword)

	// User routes with auth middleware
	user := r.Group("/user")
	user.Use(utils.AuthMiddleware())
	{
		user.GET("/profile", handlers.GetProfile)
		user.PUT("/profile", handlers.UpdateProfile)

		user.POST("/meals", mealHandler.CreateMeal)
		user.GET("/meals", mealHandler.ListMeals)

		user.POST("/mealfoods", mealHandler.CreateMealFood)
		user.GET("/mealfoods/:mealID", mealHandler.ListMealFoods)
	}

	// New route: Nutrition info via OpenAI ChatGPT
	r.POST("/api/nutrition", func(c *gin.Context) {
		var req struct {
			Query string `json:"query"`
		}
		if err := c.ShouldBindJSON(&req); err != nil || req.Query == "" {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid query"})
			return
		}

		nutritionData, err := GetNutritionFromOpenAI(req.Query, openAiKey)
		if err != nil {
			log.Println("OpenAI API Error:", err)
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get nutrition data"})
			return
		}

		c.JSON(http.StatusOK, nutritionData)
	})

	// Workouts routes with auth middleware
	workouts := r.Group("/user/workouts")
	workouts.Use(utils.AuthMiddleware())
	{
		workouts.POST("", handlers.CreateWorkout)
		workouts.GET("", handlers.GetWorkouts)
		workouts.PUT("/:id", handlers.UpdateWorkout)
		workouts.DELETE("/:id", handlers.DeleteWorkout)
	}

	// Goal routes with auth middleware
	goals := r.Group("/goals")
	goals.Use(middleware.AuthMiddleware())
	{
		goals.POST("/", handlers.CreateOrUpdateGoal)
		goals.GET("/", handlers.GetGoals)
		goals.PUT("/:id", handlers.UpdateGoal)
		goals.DELETE("/:id", handlers.DeleteGoal)
		goals.PUT("/:id/restore", handlers.RestoreGoal)
	}

	// Notification routes with auth middleware
	notifications := r.Group("/notifications")
	notifications.Use(utils.AuthMiddleware())
	{
		notifications.GET("/", handlers.GetNotifications)
		notifications.PUT("/:id/read", handlers.MarkNotificationRead)
		notifications.PUT("/read-all", handlers.MarkAllNotificationsRead)
		notifications.DELETE("/clear-all", handlers.ClearAllNotifications)
		notifications.DELETE("/:id", handlers.DeleteNotification)
	}

	// Background scheduled jobs
	go scheduleDaily(9, 0, runOverdueGoalNotifications)
	go scheduleDaily(8, 0, runTomorrowWorkoutReminders)
	go func() {
		ticker := time.NewTicker(30 * time.Minute)
		for range ticker.C {
			runSameDayWorkoutReminders()
		}
	}()

	log.Printf("🚀 Server running on port %s", config.AppConfig.Port)
	if err := r.Run(":" + config.AppConfig.Port); err != nil {
		log.Fatalf("❌ Failed to start server: %v", err)
	}
}

// GetNutritionFromOpenAI queries OpenAI and safely parses the JSON nutrition info
func GetNutritionFromOpenAI(foodQuery string, apiKey string) (map[string]interface{}, error) {
	client := openai.NewClient(apiKey)
	ctx := context.Background()

	prompt := `
Provide detailed nutrition info in JSON format with these fields:
{
  "food_name": string,
  "calories": float,
  "protein": float,
  "carbs": float,
  "fat": float,
  "serving_qty": float,
  "serving_unit": string,
  "serving_weight_grams": float
}
For this food description: "` + foodQuery + `"
`

	resp, err := client.CreateChatCompletion(ctx, openai.ChatCompletionRequest{
		Model: openai.GPT4,
		Messages: []openai.ChatCompletionMessage{
			{Role: openai.ChatMessageRoleSystem, Content: "You are a helpful nutrition assistant."},
			{Role: openai.ChatMessageRoleUser, Content: prompt},
		},
		Temperature: 0.2,
	})
	if err != nil {
		return nil, err
	}

	responseText := resp.Choices[0].Message.Content
	log.Println("Raw OpenAI response:", responseText)

	// Clean response removing Markdown code block if present
	// Clean response by removing Markdown code block if present
	responseText = strings.TrimSpace(responseText)

	if strings.HasPrefix(responseText, "```") {
		responseText = strings.TrimPrefix(responseText, "```")
		responseText = strings.TrimSpace(responseText)

		if strings.HasPrefix(responseText, "json") {
			responseText = strings.TrimPrefix(responseText, "json")
			responseText = strings.TrimSpace(responseText)
		}

		if idx := strings.Index(responseText, "\n"); idx != -1 {
			responseText = responseText[idx+1:]
		}

		responseText = strings.TrimSuffix(responseText, "```")
		responseText = strings.TrimSpace(responseText)
	}

	var nutritionData map[string]interface{}
	if err := json.Unmarshal([]byte(responseText), &nutritionData); err != nil {
		log.Println("JSON unmarshal error:", err)
		return nil, errors.New("failed to parse nutrition data from OpenAI response")
	}

	return nutritionData, nil
}

// scheduleDaily schedules a job to run daily at the specified hour and minute
func scheduleDaily(hour, min int, job func()) {
	for {
		now := time.Now()
		nextRun := time.Date(now.Year(), now.Month(), now.Day(), hour, min, 0, 0, now.Location())
		if now.After(nextRun) {
			nextRun = nextRun.Add(24 * time.Hour)
		}
		sleepDuration := time.Until(nextRun)
		log.Printf("⏳ Scheduler: next run at %v (%v from now)", nextRun, sleepDuration)
		time.Sleep(sleepDuration)
		job()
	}
}

// runOverdueGoalNotifications sends reminders for goals not updated in 3 days
func runOverdueGoalNotifications() {
	log.Println("📢 Running overdue goal notifications job...")
	query := `
		SELECT id, user_id, goal_type
		FROM user_goals
		WHERE is_completed = false
		  AND archived = false
		  AND updated_at <= NOW() - INTERVAL '3 days'
	`
	rows, err := config.DB.Query(query)
	if err != nil {
		log.Println("DB SELECT ERROR (Overdue goals):", err)
		return
	}
	defer rows.Close()

	for rows.Next() {
		var goalID, userID uuid.UUID
		var goalType string
		if err := rows.Scan(&goalID, &userID, &goalType); err != nil {
			log.Println("DB SCAN ERROR (Overdue goals):", err)
			continue
		}
		msg := "⏰ Reminder: You have not updated your goal '" + goalType + "' for 3 days."
		if !handlers.HasRecentNotification(userID, goalID, msg) {
			handlers.CreateNotification(userID, &goalID, msg)
		}
	}
}

// runTomorrowWorkoutReminders sends reminders for workouts scheduled tomorrow
func runTomorrowWorkoutReminders() {
	log.Println("📢 Running tomorrow's workout reminders job...")
	query := `
		SELECT id, user_id, name
		FROM workouts
		WHERE workout_date::date = (CURRENT_DATE + INTERVAL '1 day')
	`
	rows, err := config.DB.Query(query)
	if err != nil {
		log.Println("DB SELECT ERROR (Tomorrow workouts):", err)
		return
	}
	defer rows.Close()

	for rows.Next() {
		var workoutID, userID uuid.UUID
		var name string
		if err := rows.Scan(&workoutID, &userID, &name); err != nil {
			log.Println("DB SCAN ERROR (Tomorrow workouts):", err)
			continue
		}
		msg := "⏰ Reminder: Your workout '" + name + "' is scheduled for tomorrow."
		if !handlers.HasRecentNotification(userID, workoutID, msg) {
			handlers.CreateNotification(userID, &workoutID, msg)
		}
	}
}

// runSameDayWorkoutReminders sends reminders for workouts scheduled for today in next 3 hours
func runSameDayWorkoutReminders() {
	log.Println("📢 Running same-day workout reminders job...")
	query := `
		SELECT id, user_id, name, workout_date
		FROM workouts
		WHERE DATE(workout_date) = CURRENT_DATE
		  AND workout_date > NOW()
		  AND workout_date <= NOW() + INTERVAL '3 hours'
	`
	rows, err := config.DB.Query(query)
	if err != nil {
		log.Println("DB SELECT ERROR (Same-day workouts):", err)
		return
	}
	defer rows.Close()

	for rows.Next() {
		var workoutID, userID uuid.UUID
		var name string
		var workoutDate time.Time
		if err := rows.Scan(&workoutID, &userID, &name, &workoutDate); err != nil {
			log.Println("DB SCAN ERROR (Same-day workouts):", err)
			continue
		}
		msg := "⏰ Get ready! Your workout '" + name + "' starts at " + workoutDate.Format("15:04")
		if !handlers.HasRecentNotification(userID, workoutID, msg) {
			handlers.CreateNotification(userID, &workoutID, msg)
		}
	}
}

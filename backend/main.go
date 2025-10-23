package main

import (
	"context"
	"encoding/json"
	"errors"
	"log"
	"net/http"
	"os"
	"regexp"
	"strings"
	"time"

	"nutritionix/backend/config"
	"nutritionix/backend/handlers"
	"nutritionix/backend/utils"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"

	"github.com/joho/godotenv"

	openai "github.com/sashabaranov/go-openai"
)

func main() {

	godotenv.Load()

	log.Printf("DEBUG: OPENAI_API_KEY = '%s'", os.Getenv("OPENAI_API_KEY"))

	if os.Getenv("GIN_MODE") == "release" {
		gin.SetMode(gin.ReleaseMode)
	}

	// Load config, JWT, DB connection
	config.LoadConfig()
	utils.InitJWT()
	config.ConnectDatabase()

	// Read OpenAI API key (optional; handler will return clear error if missing)
	openAiKey := os.Getenv("OPENAI_API_KEY")
	if openAiKey == "" {
		log.Println("WARNING: OPENAI_API_KEY is not set — /api/nutrition will return an error until provided")
	} else {
		log.Println("OpenAI API key loaded")
	}

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

	// quick CORS test and preflight
	r.GET("/cors-test", func(c *gin.Context) { c.JSON(200, gin.H{"cors": "ok"}) })
	r.OPTIONS("/*path", func(c *gin.Context) { c.Status(http.StatusOK) })

	// Health check
	r.GET("/health", func(c *gin.Context) { c.JSON(http.StatusOK, gin.H{"status": "ok"}) })

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

		// Meal routes
		user.POST("/meals", mealHandler.CreateMeal)
		user.GET("/meals", mealHandler.ListMeals)

		// DELETE MEAL ROUTE - Fixed user_id issue
		user.DELETE("/meals/:id", func(c *gin.Context) {
			userIDStr, exists := c.Get("user_id") // Changed from "userID" to "user_id"
			if !exists {
				log.Println("user_id not found in context")
				c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
				return
			}

			mealID := c.Param("id")
			if mealID == "" {
				c.JSON(http.StatusBadRequest, gin.H{"error": "meal ID required"})
				return
			}

			log.Printf("Deleting meal %s for user %v", mealID, userIDStr)

			// Delete the meal (this will cascade delete meal_foods due to foreign key)
			result, err := config.DB.Exec(`
                DELETE FROM meals 
                WHERE id = $1 AND user_id = $2
            `, mealID, userIDStr)

			if err != nil {
				log.Printf("Error deleting meal: %v", err)
				c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to delete meal"})
				return
			}

			rowsAffected, _ := result.RowsAffected()
			if rowsAffected == 0 {
				c.JSON(http.StatusNotFound, gin.H{"error": "meal not found"})
				return
			}

			log.Printf("Successfully deleted meal %s", mealID)
			c.JSON(http.StatusOK, gin.H{"message": "meal deleted successfully"})
		})

		// Meal Food routes
		user.POST("/mealfoods", mealHandler.CreateMealFood)
		user.GET("/mealfoods/:mealID", mealHandler.ListMealFoods)

		// ADD MISSING ROUTES - Get foods for a meal (alternative endpoint)
		user.GET("/meals/:mealId/foods", func(c *gin.Context) {
			mealID := c.Param("mealId")
			userIDStr, exists := c.Get("user_id")
			if !exists {
				c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
				return
			}

			log.Printf("Fetching foods for meal %s, user %v", mealID, userIDStr)

			// Query meal_foods table
			rows, err := config.DB.Query(`
                SELECT mf.id, mf.food_name, mf.quantity, mf.calories, mf.protein, mf.carbs, mf.fat
                FROM meal_foods mf
                JOIN meals m ON mf.meal_id = m.id
                WHERE m.id = $1 AND m.user_id = $2
            `, mealID, userIDStr)

			if err != nil {
				log.Printf("Error fetching meal foods: %v", err)
				c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to fetch foods"})
				return
			}
			defer rows.Close()

			var foods []map[string]interface{}
			for rows.Next() {
				var id, foodName string
				var quantity, calories, protein, carbs, fat float64

				err := rows.Scan(&id, &foodName, &quantity, &calories, &protein, &carbs, &fat)
				if err != nil {
					log.Printf("Error scanning food row: %v", err)
					continue
				}

				foods = append(foods, map[string]interface{}{
					"id":        id,
					"food_name": foodName,
					"quantity":  quantity,
					"calories":  calories,
					"protein":   protein,
					"carbs":     carbs,
					"fat":       fat,
				})
			}

			log.Printf("Found %d foods for meal %s", len(foods), mealID)
			c.JSON(http.StatusOK, foods)
		})

		// DELETE MEAL FOOD ROUTE
		user.DELETE("/mealfoods/:id", func(c *gin.Context) {
			userIDStr, exists := c.Get("user_id")
			if !exists {
				c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
				return
			}

			foodID := c.Param("id")
			if foodID == "" {
				c.JSON(http.StatusBadRequest, gin.H{"error": "food ID required"})
				return
			}

			log.Printf("Deleting food %s for user %v", foodID, userIDStr)

			// Delete the meal food (with user verification through join)
			result, err := config.DB.Exec(`
                DELETE FROM meal_foods mf
                USING meals m
                WHERE mf.meal_id = m.id 
                  AND mf.id = $1 
                  AND m.user_id = $2
            `, foodID, userIDStr)

			if err != nil {
				log.Printf("Error deleting meal food: %v", err)
				c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to delete food"})
				return
			}

			rowsAffected, _ := result.RowsAffected()
			if rowsAffected == 0 {
				c.JSON(http.StatusNotFound, gin.H{"error": "food not found"})
				return
			}

			log.Printf("Successfully deleted food %s", foodID)
			c.JSON(http.StatusOK, gin.H{"message": "food deleted successfully"})
		})
	}

	// Nutrition endpoint using Mock Data (since OpenAI has quota issues)
	r.POST("/api/nutrition", func(c *gin.Context) {
		var req struct {
			Query string `json:"query"`
		}
		if err := c.ShouldBindJSON(&req); err != nil || strings.TrimSpace(req.Query) == "" {
			c.JSON(http.StatusBadRequest, gin.H{"error": "invalid request"})
			return
		}

		// Mock responses for different foods
		query := strings.ToLower(strings.TrimSpace(req.Query))
		var mockResponse map[string]interface{}

		if strings.Contains(query, "rice") {
			mockResponse = map[string]interface{}{
				"food_name":            "Cooked White Rice",
				"calories":             130.0,
				"protein":              2.7,
				"carbs":                28.0,
				"fat":                  0.3,
				"serving_qty":          1.0,
				"serving_unit":         "cup",
				"serving_weight_grams": 158.0,
			}
		} else if strings.Contains(query, "chicken") {
			mockResponse = map[string]interface{}{
				"food_name":            "Grilled Chicken Breast",
				"calories":             165.0,
				"protein":              31.0,
				"carbs":                0.0,
				"fat":                  3.6,
				"serving_qty":          100.0,
				"serving_unit":         "grams",
				"serving_weight_grams": 100.0,
			}
		} else if strings.Contains(query, "apple") {
			mockResponse = map[string]interface{}{
				"food_name":            "Apple",
				"calories":             95.0,
				"protein":              0.5,
				"carbs":                25.0,
				"fat":                  0.3,
				"serving_qty":          1.0,
				"serving_unit":         "medium apple",
				"serving_weight_grams": 182.0,
			}
		} else if strings.Contains(query, "banana") {
			mockResponse = map[string]interface{}{
				"food_name":            "Banana",
				"calories":             105.0,
				"protein":              1.3,
				"carbs":                27.0,
				"fat":                  0.4,
				"serving_qty":          1.0,
				"serving_unit":         "medium banana",
				"serving_weight_grams": 118.0,
			}
		} else if strings.Contains(query, "egg") {
			mockResponse = map[string]interface{}{
				"food_name":            "Large Egg",
				"calories":             70.0,
				"protein":              6.0,
				"carbs":                0.6,
				"fat":                  5.0,
				"serving_qty":          1.0,
				"serving_unit":         "large egg",
				"serving_weight_grams": 50.0,
			}
		} else if strings.Contains(query, "bread") {
			mockResponse = map[string]interface{}{
				"food_name":            "White Bread",
				"calories":             80.0,
				"protein":              2.3,
				"carbs":                15.0,
				"fat":                  1.0,
				"serving_qty":          1.0,
				"serving_unit":         "slice",
				"serving_weight_grams": 28.0,
			}
		} else {
			mockResponse = map[string]interface{}{
				"food_name":            strings.Title(query),
				"calories":             100.0,
				"protein":              5.0,
				"carbs":                15.0,
				"fat":                  3.0,
				"serving_qty":          1.0,
				"serving_unit":         "serving",
				"serving_weight_grams": 100.0,
			}
		}

		c.JSON(http.StatusOK, mockResponse)
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

	// Goal routes with auth middleware - DISABLED (requires mobile step counter)
	// goals := r.Group("/goals")
	// goals.Use(middleware.AuthMiddleware())
	// {
	// 	goals.POST("/", handlers.CreateOrUpdateGoal)
	// 	goals.GET("/", handlers.GetGoals)
	// 	goals.PUT("/:id", handlers.UpdateGoal)
	// 	goals.DELETE("/:id", handlers.DeleteGoal)
	// 	goals.PUT("/:id/restore", handlers.RestoreGoal)
	// }

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
	// go scheduleDaily(9, 0, runOverdueGoalNotifications) // DISABLED - Goals feature removed
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
	// set a timeout for the whole call
	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	// choose model via env or default to gpt-3.5-turbo
	modelName := os.Getenv("OPENAI_MODEL")
	if modelName == "" {
		modelName = "gpt-3.5-turbo"
	}
	log.Printf("Using OpenAI model: %s", modelName)

	prompt := `Provide detailed nutrition info in JSON format with these fields:
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
Return only the JSON object. For this food description: "` + foodQuery + `"
`

	maxRetries := 3
	var lastErr error
	var resp openai.ChatCompletionResponse

	for attempt := 1; attempt <= maxRetries; attempt++ {
		resp, lastErr = client.CreateChatCompletion(ctx, openai.ChatCompletionRequest{
			Model: modelName,
			Messages: []openai.ChatCompletionMessage{
				{Role: openai.ChatMessageRoleSystem, Content: "You are a helpful nutrition assistant that returns a single JSON object."},
				{Role: openai.ChatMessageRoleUser, Content: prompt},
			},
			Temperature: 0.2,
		})
		if lastErr != nil {
			// detect rate limit / quota errors by inspecting error text
			errText := strings.ToLower(lastErr.Error())
			if strings.Contains(errText, "status code: 429") || strings.Contains(errText, "too many requests") || strings.Contains(errText, "quota") {
				if attempt < maxRetries {
					backoff := time.Duration((1<<uint(attempt-1))*500) * time.Millisecond // 500ms,1s,2s
					log.Printf("OpenAI rate limit detected, retrying in %v (attempt %d/%d)", backoff, attempt, maxRetries)
					time.Sleep(backoff)
					continue
				}
				// exhausted retries -> return rate limit error
				return nil, errors.New("openai rate limit / quota exceeded: " + lastErr.Error())
			}
			// other errors -> return immediately
			log.Printf("OpenAI request error: %v", lastErr)
			return nil, lastErr
		}
		// success -> break loop
		break
	}

	// If we have no response (all attempts failed)
	if resp.Choices == nil || len(resp.Choices) == 0 {
		return nil, errors.New("no response from OpenAI")
	}

	responseText := strings.TrimSpace(resp.Choices[0].Message.Content)
	log.Println("Raw OpenAI response:", responseText)

	// extract first JSON object using regex (robust against fences)
	re := regexp.MustCompile(`(?s)\{.*\}`)
	jsonText := re.FindString(responseText)
	if jsonText == "" {
		log.Printf("Could not locate JSON object in OpenAI response")
		return nil, errors.New("invalid OpenAI response format: no JSON object found")
	}
	jsonText = strings.TrimSpace(jsonText)

	var nutritionData map[string]interface{}
	if err := json.Unmarshal([]byte(jsonText), &nutritionData); err != nil {
		log.Printf("JSON unmarshal error: %v\nextracted JSON: %s\nfull response: %s", err, jsonText, responseText)
		return nil, errors.New("failed to parse nutrition JSON from OpenAI response")
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

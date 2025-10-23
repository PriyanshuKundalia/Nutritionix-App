package handlers

import (
	"database/sql"
	"log"
	"net/http"
	"time"

	"nutritionix/backend/models"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

// Handler struct to hold dependencies like DB connection
type Handler struct {
	DB *sql.DB
}

// NewHandler creates a new handler instance
func NewHandler(db *sql.DB) *Handler {
	return &Handler{DB: db}
}

// CreateMeal handles POST /meals
func (h *Handler) CreateMeal(c *gin.Context) {
	var input struct {
		Date     string `json:"date" binding:"required"`      // date string from client
		MealType string `json:"meal_type" binding:"required"` // breakfast/lunch/etc
	}
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	userID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}

	// Parse input date string with expected YYYY-MM-DD format first
	parsedDate, err := time.Parse("2006-01-02", input.Date)
	if err != nil {
		// Fallback parse MM/DD/YYYY format if needed
		parsedDate, err = time.Parse("01/02/2006", input.Date)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "date format must be YYYY-MM-DD or MM/DD/YYYY"})
			return
		}
	}

	// Normalize date to YYYY-MM-DD string format for storage consistency
	normalizedDate := parsedDate.Format("2006-01-02")

	meal := models.Meal{
		ID:        uuid.New().String(),
		UserID:    userID.(string),
		Date:      normalizedDate,
		MealType:  input.MealType,
		CreatedAt: time.Now().UTC(),
	}

	query := `INSERT INTO meals (id, user_id, date, meal_type, created_at) VALUES ($1, $2, $3, $4, $5)`
	if _, err := h.DB.Exec(query, meal.ID, meal.UserID, meal.Date, meal.MealType, meal.CreatedAt); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "could not create meal"})
		return
	}

	c.JSON(http.StatusCreated, meal)
}

// ListMeals handles GET /meals; returns all meals for the user ordered by date and created_at descending
func (h *Handler) ListMeals(c *gin.Context) {
	userID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}

	query := `
        SELECT id, user_id, date, meal_type, created_at 
        FROM meals 
        WHERE user_id = $1 
        ORDER BY date DESC, created_at DESC
    `
	rows, err := h.DB.Query(query, userID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "database error"})
		return
	}
	defer rows.Close()

	var meals []models.Meal
	for rows.Next() {
		var m models.Meal
		if err := rows.Scan(&m.ID, &m.UserID, &m.Date, &m.MealType, &m.CreatedAt); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "database scan error"})
			return
		}
		meals = append(meals, m)
	}

	c.JSON(http.StatusOK, meals)
}

// CreateMealFood handles POST /mealfoods to add a food item to a meal
func (h *Handler) CreateMealFood(c *gin.Context) {
	var input struct {
		MealID      string   `json:"meal_id" binding:"required"`
		FoodID      *float64 `json:"food_id,omitempty"` // Changed to float64 to handle frontend data
		FoodName    string   `json:"food_name" binding:"required"`
		Quantity    float32  `json:"quantity"`
		Unit        string   `json:"unit"`
		Calories    int64    `json:"calories"`
		Protein     float32  `json:"protein"`
		Carbs       float32  `json:"carbs"`
		Fat         float32  `json:"fat"`
		Fiber       float32  `json:"fiber"`
		Sugar       float32  `json:"sugar"`
		Sodium      float32  `json:"sodium"`
		Calcium     float32  `json:"calcium"`
		Iron        float32  `json:"iron"`
		Potassium   float32  `json:"potassium"`
		ServingSize string   `json:"serving_size"`
	}
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Set default values
	if input.Unit == "" {
		input.Unit = "g"
	}
	if input.ServingSize == "" {
		input.ServingSize = "100 g"
	}

	foodID := uuid.New().String()
	query := `INSERT INTO meal_foods (id, meal_id, food_id, food_name, quantity, unit, calories, protein, carbs, fat, fiber, sugar, sodium, calcium, iron, potassium, serving_size) 
              VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)`

	// Convert FoodID from float64 to int64 if it exists
	var dbFoodID *int64
	if input.FoodID != nil {
		convertedID := int64(*input.FoodID)
		dbFoodID = &convertedID
	}

	if _, err := h.DB.Exec(query, foodID, input.MealID, dbFoodID, input.FoodName, input.Quantity, input.Unit, input.Calories, input.Protein, input.Carbs, input.Fat, input.Fiber, input.Sugar, input.Sodium, input.Calcium, input.Iron, input.Potassium, input.ServingSize); err != nil {
		log.Printf("Database error inserting meal food: %v", err)
		log.Printf("Query: %s", query)
		log.Printf("Values: foodID=%s, mealID=%s, foodID=%v, foodName=%s, quantity=%f, unit=%s, calories=%d",
			foodID, input.MealID, dbFoodID, input.FoodName, input.Quantity, input.Unit, input.Calories)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "could not add food item", "details": err.Error()})
		return
	}

	response := models.MealFood{
		ID:          foodID,
		MealID:      input.MealID,
		FoodID:      dbFoodID,
		FoodName:    input.FoodName,
		Quantity:    input.Quantity,
		Unit:        input.Unit,
		Calories:    input.Calories,
		Protein:     input.Protein,
		Carbs:       input.Carbs,
		Fat:         input.Fat,
		Fiber:       input.Fiber,
		Sugar:       input.Sugar,
		Sodium:      input.Sodium,
		Calcium:     input.Calcium,
		Iron:        input.Iron,
		Potassium:   input.Potassium,
		ServingSize: input.ServingSize,
	}

	c.JSON(http.StatusCreated, response)
}

// ListMealFoods handles GET /mealfoods/:mealID to list all foods for a meal
func (h *Handler) ListMealFoods(c *gin.Context) {
	mealID := c.Param("mealID")
	if mealID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "mealID is required"})
		return
	}

	query := `SELECT id, meal_id, COALESCE(food_id, 0) as food_id, food_name, quantity, unit, calories, protein, carbs, fat, fiber, sugar, sodium, calcium, iron, potassium, serving_size 
			  FROM meal_foods WHERE meal_id = $1 ORDER BY id`
	rows, err := h.DB.Query(query, mealID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "database query error"})
		return
	}
	defer rows.Close()

	var foods []models.MealFood
	for rows.Next() {
		var food models.MealFood
		var foodID int64
		if err := rows.Scan(&food.ID, &food.MealID, &foodID, &food.FoodName, &food.Quantity, &food.Unit,
			&food.Calories, &food.Protein, &food.Carbs, &food.Fat, &food.Fiber, &food.Sugar,
			&food.Sodium, &food.Calcium, &food.Iron, &food.Potassium, &food.ServingSize); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "scan error"})
			return
		}
		if foodID != 0 {
			food.FoodID = &foodID
		}
		foods = append(foods, food)
	}
	c.JSON(http.StatusOK, foods)
}

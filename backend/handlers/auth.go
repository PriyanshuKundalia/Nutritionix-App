package handlers

import (
	"database/sql"
	"log"
	"net/http"
	"strings"
	"time"

	"nutritionix/backend/config"
	"nutritionix/backend/models"
	"nutritionix/backend/utils"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/lib/pq"
	"golang.org/x/crypto/bcrypt"
)

// Register handles user registration
func Register(c *gin.Context) {
	var input struct {
		Email    string `json:"email"`
		Password string `json:"password"`
		Name     string `json:"name"`
	}

	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	email := strings.ToLower(strings.TrimSpace(input.Email))
	name := strings.TrimSpace(input.Name)
	password := strings.TrimSpace(input.Password)

	if email == "" || password == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Email and password are required"})
		return
	}
	if err := utils.ValidateEmail(email); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	if err := utils.ValidatePassword(password); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	hashedPass, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Error hashing password"})
		return
	}

	_, err = config.DB.Exec(
		`INSERT INTO users (email, password, name, created_at) 
		 VALUES ($1, $2, $3, $4)`,
		email, string(hashedPass), name, time.Now(),
	)
	if err != nil {
		if pqErr, ok := err.(*pq.Error); ok && pqErr.Code == "23505" {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Email already exists"})
			return
		}
		log.Println("DB INSERT ERROR (Register):", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to register user"})
		return
	}

	c.JSON(http.StatusCreated, gin.H{"message": "User registered successfully"})
}

// Login authenticates the user and returns a JWT
func Login(c *gin.Context) {
	var input struct {
		Email    string `json:"email"`
		Password string `json:"password"`
	}
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	var user models.User
	err := config.DB.QueryRow(
		"SELECT id, password FROM users WHERE email=$1",
		strings.ToLower(strings.TrimSpace(input.Email)),
	).Scan(&user.ID, &user.Password)

	if err == sql.ErrNoRows {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid email or password"})
		return
	} else if err != nil {
		log.Println("DB SELECT ERROR (Login):", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Database error"})
		return
	}

	if bcrypt.CompareHashAndPassword([]byte(user.Password), []byte(input.Password)) != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid email or password"})
		return
	}

	// user.ID is uuid.UUID
	token, err := utils.GenerateToken(user.ID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to generate token"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"token": token})
}

// RequestPasswordReset sends a password reset link to the user
func RequestPasswordReset(c *gin.Context) {
	var input struct {
		Email string `json:"email"`
	}
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid input"})
		return
	}

	email := strings.ToLower(strings.TrimSpace(input.Email))
	if err := utils.ValidateEmail(email); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	var userID uuid.UUID
	err := config.DB.QueryRow("SELECT id FROM users WHERE email=$1", email).Scan(&userID)
	if err == sql.ErrNoRows {
		// Hide whether user exists
		c.JSON(http.StatusOK, gin.H{"message": "If the email exists, you will receive a reset link"})
		return
	} else if err != nil {
		log.Println("DB SELECT ERROR (RequestPasswordReset):", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Database error"})
		return
	}

	token, err := utils.GenerateSecureToken(utils.ResetTokenBytes)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to generate token"})
		return
	}

	expiresAt := time.Now().Add(utils.ResetTokenExpiry)
	_, err = config.DB.Exec(
		`INSERT INTO password_resets (user_id, token, expires_at) VALUES ($1, $2, $3)`,
		userID, token, expiresAt,
	)
	if err != nil {
		log.Println("DB INSERT ERROR (password_resets):", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to store reset token"})
		return
	}

	resetURL := utils.BuildPasswordResetURL(token)
	_ = utils.SendPasswordResetEmail(email, resetURL)

	// DEV: Return reset link/token for testing
	c.JSON(http.StatusOK, gin.H{
		"message":   "If the email exists, you will receive a reset link",
		"reset_url": resetURL,
		"token":     token,
	})
}

// ResetPassword verifies the token and updates the user's password
func ResetPassword(c *gin.Context) {
	var input struct {
		Token       string `json:"token"`
		NewPassword string `json:"new_password"`
	}
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid input"})
		return
	}

	if strings.TrimSpace(input.Token) == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Token is required"})
		return
	}
	if err := utils.ValidatePassword(input.NewPassword); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	var userID uuid.UUID
	var expiresAt time.Time
	err := config.DB.QueryRow(
		"SELECT user_id, expires_at FROM password_resets WHERE token=$1",
		strings.TrimSpace(input.Token),
	).Scan(&userID, &expiresAt)
	if err == sql.ErrNoRows {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid or expired token"})
		return
	} else if err != nil {
		log.Println("DB SELECT ERROR (ResetPassword):", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Database error"})
		return
	}

	if time.Now().After(expiresAt) {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Token has expired"})
		return
	}

	hashedPass, err := bcrypt.GenerateFromPassword([]byte(input.NewPassword), bcrypt.DefaultCost)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to hash password"})
		return
	}

	_, err = config.DB.Exec("UPDATE users SET password=$1 WHERE id=$2", string(hashedPass), userID)
	if err != nil {
		log.Println("DB UPDATE ERROR (ResetPassword):", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update password"})
		return
	}

	_, _ = config.DB.Exec("DELETE FROM password_resets WHERE token=$1", input.Token)

	c.JSON(http.StatusOK, gin.H{"message": "Password reset successful"})
}

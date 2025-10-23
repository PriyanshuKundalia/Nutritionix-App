package utils

import (
	"errors"
	"log"
	"strings"
	"time"

	"nutritionix/backend/config"

	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"
	"github.com/google/uuid"
)

var jwtSecret []byte

// InitJWT should be called after config.LoadConfig()
func InitJWT() {
	jwtSecret = []byte(config.AppConfig.JWTSecret)
	if len(jwtSecret) == 0 {
		log.Fatal("❌ JWT secret is not set in environment variables")
	}
	log.Println("🔑 JWT secret initialized")
}

// GenerateToken creates a JWT for a given user ID (uuid.UUID)
func GenerateToken(userID uuid.UUID) (string, error) {
	claims := jwt.MapClaims{
		"user_id": userID.String(), // store UUID as string in token
		"exp":     time.Now().Add(time.Hour * time.Duration(config.AppConfig.TokenExpiryHr)).Unix(),
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString(jwtSecret)
}

// ParseToken validates and extracts claims from a JWT
func ParseToken(tokenString string) (jwt.MapClaims, error) {
	token, err := jwt.Parse(tokenString, func(token *jwt.Token) (interface{}, error) {
		// Ensure signing method is HMAC
		if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, errors.New("unexpected signing method")
		}
		return jwtSecret, nil
	})

	if err != nil || !token.Valid {
		return nil, errors.New("invalid token")
	}

	if claims, ok := token.Claims.(jwt.MapClaims); ok {
		return claims, nil
	}
	return nil, errors.New("unable to parse claims")
}

// AuthMiddleware for Gin – validates JWT in Authorization header with debug logging
func AuthMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		authHeader := c.GetHeader("Authorization")
		log.Printf("Auth header received: %s", authHeader) // Debug log

		if authHeader == "" {
			c.JSON(401, gin.H{"error": "Authorization header missing"})
			c.Abort()
			return
		}

		// Support "Bearer <token>" format
		parts := strings.Fields(authHeader)
		if len(parts) == 2 && strings.ToLower(parts[0]) == "bearer" {
			authHeader = parts[1] // extract actual token
		}

		claims, err := ParseToken(authHeader)
		if err != nil {
			log.Printf("JWT parse error: %v", err) // Debug log
			c.JSON(401, gin.H{"error": "Invalid or expired token"})
			c.Abort()
			return
		}

		// Save user_id to context for handlers
		if uid, ok := claims["user_id"].(string); ok {
			log.Printf("JWT claims user_id: %s", uid) // Debug log
			c.Set("user_id", uid)
		} else {
			log.Println("JWT claims missing user_id")
			c.JSON(401, gin.H{"error": "Invalid token claims"})
			c.Abort()
			return
		}

		c.Next()
	}
}

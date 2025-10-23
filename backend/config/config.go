package config

import (
	"log"
	"os"
	"strconv"

	"github.com/joho/godotenv"
)

type Config struct {
	Port               string
	SupabaseURL        string
	SupabaseAnonKey    string
	SupabaseServiceKey string
	HuggingFaceAPIKey  string
	OpenAIAPIKey       string // Changed from Nutritionix to OpenAI
	JWTSecret          string
	FrontendURL        string
	TokenExpiryHr      int // token expiry in hours
}

var AppConfig Config

func LoadConfig() {
	_ = godotenv.Load() // load .env, ignore error if already set via env

	AppConfig = Config{
		Port:               getEnv("PORT", "8080"),
		SupabaseURL:        mustGetEnv("SUPABASE_URL"),
		SupabaseAnonKey:    mustGetEnv("SUPABASE_ANON_KEY"),
		SupabaseServiceKey: mustGetEnv("SUPABASE_SERVICE_ROLE_KEY"),
		HuggingFaceAPIKey:  mustGetEnv("HUGGINGFACE_API_KEY"),
		OpenAIAPIKey:       mustGetEnv("OPENAI_API_KEY"), // Load OpenAI key now
		JWTSecret:          mustGetEnv("JWT_SECRET"),
		FrontendURL:        mustGetEnv("FRONTEND_URL"),
		TokenExpiryHr:      getEnvAsInt("TOKEN_EXPIRY_HR", 72), // default 72 hours
	}
}

func getEnv(key string, defaultVal string) string {
	if value, exists := os.LookupEnv(key); exists {
		return value
	}
	return defaultVal
}

func mustGetEnv(key string) string {
	if value, exists := os.LookupEnv(key); exists {
		return value
	}
	log.Fatalf("Environment variable %s not set", key)
	return ""
}

func getEnvAsInt(key string, defaultVal int) int {
	if value, exists := os.LookupEnv(key); exists {
		if intVal, err := strconv.Atoi(value); err == nil {
			return intVal
		}
		log.Printf("⚠️ WARN: Environment variable %s is not a valid integer. Using default %d.", key, defaultVal)
	}
	return defaultVal
}

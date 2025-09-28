package config

import (
	"database/sql"
	"log"
	"os"

	_ "github.com/lib/pq"
)

var DB *sql.DB

func ConnectDatabase() {
	connStr := os.Getenv("DATABASE_URL")
	if connStr == "" {
		log.Fatal("❌ DATABASE_URL environment variable not set")
	}

	var err error
	DB, err = sql.Open("postgres", connStr)
	if err != nil {
		log.Fatalf("❌ Database connection failed: %v", err)
	}

	if err = DB.Ping(); err != nil {
		log.Fatalf("❌ Database ping failed: %v", err)
	}

	log.Println("✅ Connected to Supabase PostgreSQL")
}

package utils

import (
	"crypto/rand"
	"encoding/hex"
	"log"
	"time"

	"nutritionix/backend/config"
)

// ResetTokenBytes defines how many random bytes to generate for reset token
const ResetTokenBytes = 32

// ResetTokenExpiry defines how long a password reset token is valid
var ResetTokenExpiry = time.Hour // 1 hour validity

// GenerateSecureToken generates a secure random token of the given byte length.
// The token is returned as a hex-encoded string.
func GenerateSecureToken(length int) (string, error) {
	bytes := make([]byte, length)
	if _, err := rand.Read(bytes); err != nil {
		return "", err
	}
	return hex.EncodeToString(bytes), nil
}

// BuildPasswordResetURL builds the frontend reset-password link with the token
func BuildPasswordResetURL(token string) string {
	// Example: https://yourfrontend.com/reset-password?token=xxxx
	return config.AppConfig.FrontendURL + "/reset-password?token=" + token
}

// SendPasswordResetEmail sends the password reset URL to the user's email.
//
// NOTE: This is just a stub for now — replace log.Println with actual email sending logic
// using your preferred email service (SMTP, SendGrid, SES, etc.)
func SendPasswordResetEmail(email, resetURL string) error {
	log.Printf("📧 [DEV MODE] Sending password reset email to %s: %s", email, resetURL)
	return nil
}

package utils

import (
	"errors"
	"regexp"
	"strings"
)

// ValidateEmail checks if email is valid and returns error if not
func ValidateEmail(email string) error {
	email = strings.TrimSpace(email)
	regex := regexp.MustCompile(`^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$`)
	if !regex.MatchString(email) {
		return errors.New("invalid email format")
	}
	return nil
}

// ValidatePassword checks for minimum strength and returns error if weak
func ValidatePassword(password string) error {
	if len(password) < 8 {
		return errors.New("password must be at least 8 characters")
	}
	if !regexp.MustCompile(`[A-Z]`).MatchString(password) {
		return errors.New("password must contain at least one uppercase letter")
	}
	if !regexp.MustCompile(`[a-z]`).MatchString(password) {
		return errors.New("password must contain at least one lowercase letter")
	}
	if !regexp.MustCompile(`[0-9]`).MatchString(password) {
		return errors.New("password must contain at least one number")
	}
	// OPTIONAL: enable this if you want special chars required
	// if !regexp.MustCompile(`[!@#~$%^&*()+|_\\-]`).MatchString(password) {
	//     return errors.New("password must contain at least one special character")
	// }
	return nil
}

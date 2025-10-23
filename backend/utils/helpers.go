package utils

import (
	"net/http"

	"github.com/gin-gonic/gin"
)

// JSONResponse sends a JSON response with a given status and data
func JSONResponse(c *gin.Context, status int, data interface{}) {
	c.JSON(status, gin.H{"data": data})
}

// JSONError sends a JSON error message and status code
func JSONError(c *gin.Context, status int, message string) {
	c.JSON(status, gin.H{"error": message})
}

// BindJSON binds the request body JSON to obj and returns false if invalid
func BindJSON(c *gin.Context, obj interface{}) bool {
	if err := c.ShouldBindJSON(obj); err != nil {
		JSONError(c, http.StatusBadRequest, "Invalid request body: "+err.Error())
		return false
	}
	return true
}

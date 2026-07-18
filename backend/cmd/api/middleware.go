package main

import (
	"log/slog"
	"net/http"
	"strings"
	"time"

	"github.com/clerk/clerk-sdk-go/v2/jwt"
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/saranv740/paydash/internal/app"
	"github.com/saranv740/paydash/internal/response"
)

func requestIDMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		requestID := c.GetHeader("X-Request-ID")
		if requestID == "" {
			requestID = uuid.New().String()
		}
		c.Set("request_id", requestID)
		c.Header("X-Request-ID", requestID)
		c.Next()
	}
}

func slogMiddleware(logger *slog.Logger) gin.HandlerFunc {
	return func(c *gin.Context) {
		start := time.Now()

		c.Next()

		rID, exists := c.Get("request_id")

		var requestID string
		if exists {
			requestID = rID.(string)
		} else {
			requestID = ""
		}

		logger.Info(
			"request",
			slog.String("request_id", requestID),
			slog.String("method", c.Request.Method),
			slog.String("path", c.Request.URL.Path),
			slog.Int("status", c.Writer.Status()),
			slog.Duration("latency", time.Since(start)),
		)
	}
}

func clerkAuthMiddleware(logger *slog.Logger) gin.HandlerFunc {
	return func(c *gin.Context) {
		if app.Environment() == "development" && app.AllowMockAuth() {
			userID := c.GetHeader("X-Mock-UserID")
			c.Set("userID", userID)
			c.Next()
			return
		}

		authHeader := c.GetHeader("Authorization")
		if authHeader == "" {
			logger.Error("auth", "msg", "Authorization header missing")
			c.Abort()
			response.SendError(c, http.StatusUnauthorized, "Authorization is required")
			return
		}

		parts := strings.Split(authHeader, " ")
		if len(parts) != 2 || parts[0] != "Bearer" {
			logger.Error("auth", "msg", "Invalid Authorization header format")
			c.Abort()
			response.SendError(c, http.StatusUnauthorized, "Authorization is required")
			return
		}

		sessionToken := parts[1]

		claims, err := jwt.Verify(c.Request.Context(), &jwt.VerifyParams{
			Token: sessionToken,
		})
		if err != nil {
			logger.Error("auth", "msg", "Invalid token")
			c.Abort()
			response.SendError(c, http.StatusUnauthorized, "Authorization is required")
			return
		}

		c.Set("userID", claims.Subject)
		c.Next()
	}
}

func securityHeadersMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		c.Header("X-Content-Type-Options", "nosniff")
		c.Header("X-Frame-Options", "DENY")
		c.Header("X-XSS-Protection", "1; mode=block")
		c.Header("Referrer-Policy", "strict-origin-when-cross-origin")
		c.Header("Content-Security-Policy", "default-src 'none'; frame-ancestors 'none'; sandbox")
		if app.IsProd() {
			c.Header("Strict-Transport-Security", "max-age=31536000; includeSubDomains")
		}
		c.Next()
	}
}

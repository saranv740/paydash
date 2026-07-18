package main

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/saranv740/paydash/internal/app"
	"github.com/saranv740/paydash/internal/handlers"
	"github.com/saranv740/paydash/internal/store"
)

func router(config *app.Config) *gin.Engine {
	router := gin.New()
	router.Use(requestIDMiddleware())
	router.Use(slogMiddleware(config.Logger))
	router.Use(gin.Recovery())

	// Initialize store and handlers
	s := store.New(config.DB)
	h := handlers.New(config.Logger, s)

	api := router.Group("/v1")
	api.GET("/healthcheck", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{
			"status":      "online",
			"version":     config.Version,
			"environment": app.Environment(),
		})
	})

	private := router.Group("/v1")
	private.Use(clerkAuthMiddleware(config.Logger))

	private.POST("/upload", h.UploadBatch)

	return router
}

package main

import (
	"net/http"
	"time"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
	"github.com/saranv740/paydash/internal/app"
	"github.com/saranv740/paydash/internal/handlers"
	"github.com/saranv740/paydash/internal/store"
)

func router(config *app.Config) *gin.Engine {
	router := gin.New()

	corsConfig := cors.Config{
		AllowMethods:     []string{"POST", "OPTIONS", "GET", "PUT", "PATCH", "DELETE"},
		AllowHeaders:     []string{"Content-Type", "Content-Length", "Accept-Encoding", "X-CSRF-Token", "Authorization", "accept", "origin", "Cache-Control", "X-Requested-With", "X-Mock-UserID"},
		ExposeHeaders:    []string{"Content-Length"},
		AllowCredentials: true,
		MaxAge:           12 * time.Hour,
	}

	if app.IsProd() {
		corsConfig.AllowOrigins = []string{"http://paydash.codebysaran.in", "https://paydash.codebysaran.in"}
	} else {
		corsConfig.AllowOrigins = []string{"http://localhost:3001", "http://127.0.0.1:3001"}
	}

	router.Use(rateLimiter())
	router.Use(cors.New(corsConfig))
	router.Use(requestIDMiddleware())
	router.Use(securityHeadersMiddleware())
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
	private.GET("/batches", h.ListBatches)
	private.GET("/batches/:id/report", h.GetBatchReport)
	private.PATCH("/batches/:id", h.UpdateBatchName)
	private.DELETE("/batches/:id", h.DeleteBatch)
	private.PATCH("/discrepancies/:id/resolution", h.UpdateDiscrepancyResolution)
	private.GET("/discrepancies/:id", h.GetDiscrepancyDetail)
	private.GET("/discrepancies/:id/explain", h.ExplainDiscrepancy)

	return router
}

package response

import (
	"github.com/gin-gonic/gin"
)

func Send(c *gin.Context, status string, statusCode int, message any) {
	res := gin.H{
		"status": status,
	}

	switch status {
	case "success":
		res["data"] = message
	case "fail":
		res["data"] = message
	case "error":
		res["message"] = message
	}

	c.JSON(statusCode, res)
}

func SendFail(c *gin.Context, statusCode int, message any) {
	Send(c, "fail", statusCode, message)
}

func SendSuccess(c *gin.Context, statusCode int, message any) {
	Send(c, "success", statusCode, message)
}

func SendError(c *gin.Context, statusCode int, message string) {
	Send(c, "error", statusCode, message)
}

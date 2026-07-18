package response

import (
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/saranv740/paydash/internal/app"
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

func AddCookie(c *gin.Context, name string, value string, maxAge int) {
	cookie := &http.Cookie{
		Name:     name,
		Value:    value,
		Path:     "/",
		MaxAge:   maxAge,
		Secure:   app.IsProd(),
		HttpOnly: true,
		SameSite: http.SameSiteLaxMode,
	}

	c.SetCookieData(cookie)
}

func RemoveCookie(c *gin.Context, name string) {
	cookie := &http.Cookie{
		Name:     name,
		Value:    "",
		Path:     "/",
		Expires:  time.Unix(0, 0),
		Secure:   app.IsProd(),
		HttpOnly: true,
		SameSite: http.SameSiteLaxMode,
	}

	c.SetCookieData(cookie)
}

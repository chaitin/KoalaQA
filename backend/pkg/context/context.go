package context

import (
	"context"
	"errors"
	"net/http"
	"strconv"

	"github.com/chaitin/koalaqa/model"
	"github.com/chaitin/koalaqa/pkg/glog"
	"github.com/chaitin/koalaqa/pkg/trace"
	"github.com/gin-gonic/gin"
)

var (
	logger = glog.Module("context").Skip(1)
)

type Context struct {
	user model.UserInfo
	*gin.Context
}

func Background() context.Context {
	return context.Background()
}

const koalaCtxKey = "_koala_ctx"

func GetContext(ctx *gin.Context) *Context {
	v, ok := ctx.Get(koalaCtxKey)
	if !ok {
		nCtx := NewContext(ctx)
		ctx.Set(koalaCtxKey, nCtx)
		return nCtx
	}

	return v.(*Context)
}

func NewContext(ctx *gin.Context) *Context {
	return &Context{Context: ctx}
}

func (ctx *Context) SetUser(u model.UserInfo) {
	ctx.user = u
}

func (ctx *Context) GetUser() model.UserInfo {
	return ctx.user
}

func (ctx *Context) Logined() bool {
	return ctx.user.UID > 0
}

func (ctx *Context) IsAdmin() bool {
	return ctx.user.IsAdmin()
}

func (c *Context) Success(obj any) {
	c.Context.JSON(http.StatusOK, Response{
		Success: true,
		Data:    obj,
		TraceID: trace.TraceIDString(c),
	})
}

func (c *Context) InternalError(err error, msg string) {
	logger.WithContext(c).WithErr(err).Error(msg)
	c.Context.JSON(http.StatusInternalServerError, Response{
		Success: false,
		Msg:     msg,
		Err:     err.Error(),
		TraceID: trace.TraceIDString(c),
	})
}

func (c *Context) BadRequest(err error) {
	logger.WithContext(c).WithErr(err).Error("bad request")
	c.Context.JSON(http.StatusBadRequest, Response{
		Success: false,
		Msg:     "bad request",
		Err:     err.Error(),
		TraceID: trace.TraceIDString(c),
	})
}

func (c *Context) Unauthorized(msg string) {
	c.Context.JSON(http.StatusUnauthorized, Response{
		Success: false,
		Msg:     "unauthorized",
		Err:     msg,
		TraceID: trace.TraceIDString(c),
	})
}

func (c *Context) Forbidden(msg string) {
	c.Context.JSON(http.StatusForbidden, Response{
		Success: false,
		Msg:     "forbidden",
		Err:     msg,
		TraceID: trace.TraceIDString(c),
	})
}

func (c *Context) ParamUint(key string) (uint, error) {
	strVal := c.Param(key)
	if strVal == "" {
		return 0, errors.New("param not found")
	}

	val, err := strconv.ParseUint(strVal, 10, 64)
	if err != nil {
		return 0, err
	}

	return uint(val), nil
}

func (c *Context) QueryUint(key string) (uint, error) {
	strVal := c.Query(key)
	if strVal == "" {
		return 0, errors.New("query param not found")
	}

	val, err := strconv.ParseUint(strVal, 10, 64)
	if err != nil {
		return 0, err
	}
	return uint(val), nil
}

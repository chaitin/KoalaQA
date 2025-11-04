package router

import (
	goCtx "context"
	"encoding/json"
	"net/http"
	"time"

	"github.com/chaitin/koalaqa/model"
	"github.com/chaitin/koalaqa/pkg/context"
	"github.com/chaitin/koalaqa/pkg/glog"
	"github.com/chaitin/koalaqa/pkg/mq"
	"github.com/chaitin/koalaqa/pkg/topic"
	"github.com/chaitin/koalaqa/server"
	"github.com/chaitin/koalaqa/svc"
	"github.com/gorilla/websocket"
	"go.uber.org/fx"
)

type userAuth struct {
	in userAuthIn

	logger *glog.Logger
}

// Logout
// @Summary user logout
// @Tags user
// @Produce json
// @Success 200 {object} context.Response
// @Router /user/logout [post]
func (u *userAuth) Logout(ctx *context.Context) {
	err := u.in.SvcU.Logout(ctx, ctx.GetUser().UID)
	if err != nil {
		ctx.InternalError(err, "user logout failed")
		return
	}

	ctx.SetCookie("auth_token", "", -1, "/", "", false, true)

	ctx.Success(nil)
}

var upgrader = websocket.Upgrader{
	ReadBufferSize:   1024,
	WriteBufferSize:  1024 * 1024 * 4,
	HandshakeTimeout: 30 * time.Second,
	CheckOrigin: func(r *http.Request) bool {
		return true
	},
}

// Detail
// @Summary user detail
// @Tags user
// @Produce json
// @Success 200 {object} context.Response{data=model.UserInfo}
// @Router /user [get]
func (u *userAuth) Detail(ctx *context.Context) {
	ctx.Success(ctx.GetUser())
}

// Update
// @Summary update user
// @Tags user
// @Accept multipart/form-data
// @Param avatar formData file false "avatar"
// @Param req formData svc.UserUpdateInfoReq true "req param"
// @Produce json
// @Success 200 {object} context.Response
// @Router /user [put]
func (u *userAuth) Update(ctx *context.Context) {
	var req svc.UserUpdateInfoReq
	err := ctx.ShouldBind(&req)
	if err != nil {
		ctx.BadRequest(err)
		return
	}
	err = u.in.SvcU.UpdateInfo(ctx, ctx.GetUser().UID, req)
	if err != nil {
		ctx.InternalError(err, "update user info failed")
		return
	}

	ctx.Success(nil)
}

type notifyType uint

const (
	notifyTypeUnread notifyType = iota + 1
	notifyTypeRead
	notifyTypeInfo
	notifyTypePing
	notifyTypePong
)

type notifyRes struct {
	Type notifyType `json:"type"`
	Data any        `json:"data"`
}

type notifyReq struct {
	Type notifyType `json:"type"`
	ID   uint       `json:"id"`
}

func (u *userAuth) Notify(ctx *context.Context) {
	conn, err := upgrader.Upgrade(ctx.Writer, ctx.Request, nil)
	if err != nil {
		ctx.InternalError(err, "upgrade websocket failed")
		return
	}

	t := topic.NewMessageNotifyUser(ctx.GetUser().UID)
	logger := u.logger.WithContext(ctx).With("user_id", ctx.GetUser().UID)

	defer conn.Close()

	read := false
	go func() {
		listRes, e := u.in.SvcNotify.ListNotifyInfo(ctx, ctx.GetUser().UID, svc.ListNotifyInfoReq{
			Read: &read,
		})
		if e != nil {
			logger.WithErr(e).Warn("list user failed")
			return
		}

		for _, item := range listRes.Items {
			err = conn.WriteJSON(notifyRes{
				Type: notifyTypeInfo,
				Data: item,
			})
			if err != nil {
				logger.WithErr(e).Warn("list message failed")
				return
			}
		}

		e = u.in.Sub.Subscribe(ctx, t, func(ctx goCtx.Context, data mq.Message) error {
			notifyData, ok := data.(model.MessageNotifyInfo)
			if !ok {
				logger.With("data", data).Warn("invalid data type")
				return nil
			}

			subErr := conn.WriteJSON(notifyRes{
				Type: notifyTypeInfo,
				Data: notifyData,
			})
			if subErr != nil {
				logger.WithErr(subErr).With("notify_data", notifyData).Warn("send notify data failed")
				return nil
			}

			return nil
		})
		if e != nil {
			logger.WithErr(e).Warn("subscribe failed")
		}
	}()

	for {
		mt, message, err := conn.ReadMessage()
		if err != nil {
			if websocket.IsUnexpectedCloseError(err) {
				return
			}

			logger.WithErr(err).Debug("read ws message error")
			return
		}

		switch mt {
		case websocket.TextMessage:
			var req notifyReq
			err = json.Unmarshal(message, &req)
			if err != nil {
				logger.WithErr(err).With("message", string(message)).Warn("unmarshal message failed")
				continue
			}

			switch req.Type {
			case notifyTypePing:
				err = conn.WriteJSON(notifyRes{
					Type: notifyTypePong,
					Data: struct{}{},
				})
				if err != nil {
					logger.WithErr(err).Warn("send pong failed")
				}
			case notifyTypeUnread:
				num, err := u.in.SvcNotify.UnreadTotal(ctx, ctx.GetUser().UID)
				if err != nil {
					logger.WithErr(err).Warn("unread total failed")
					continue
				}
				err = conn.WriteJSON(notifyRes{
					Type: notifyTypeUnread,
					Data: num,
				})
				if err != nil {
					logger.WithErr(err).Warn("send unread failse")
					continue
				}
			case notifyTypeRead:
				err = u.in.SvcNotify.Read(ctx, ctx.GetUser().UID, svc.NotifyReadReq{
					ID: req.ID,
				})
				if err != nil {
					logger.WithErr(err).With("id", req.ID).Warn("set notify read failed")
					continue
				}
			}
		case websocket.PingMessage:
			err = conn.WriteMessage(websocket.PongMessage, []byte("pong"))
			if err != nil {
				logger.WithErr(err).Error("write pong failed")
			}
		case websocket.CloseMessage:
			logger.Info("receive close message")
			return
		}
	}
}

// ListNotify
// @Summary list notify message
// @Tags user
// @Produce json
// @Param req query svc.ListNotifyInfoReq true "req params"
// @Success 200 {object} context.Response{data=model.ListRes{items=[]model.MessageNotifyInfo}}
// @Router /user/notify/list [get]
func (u *userAuth) ListNotify(ctx *context.Context) {
	var req svc.ListNotifyInfoReq
	err := ctx.ShouldBindQuery(&req)
	if err != nil {
		ctx.BadRequest(err)
		return
	}

	res, err := u.in.SvcNotify.ListNotifyInfo(ctx, ctx.GetUser().UID, req)
	if err != nil {
		ctx.InternalError(err, "list notify failed")
		return
	}

	ctx.Success(res)
}

// NotifyRead
// @Summary read notify message
// @Tags user
// @Produce json
// @Accept json
// @Param req body svc.NotifyReadReq true "req params"
// @Success 200 {object} context.Response
// @Router /user/notify/read [post]
func (u *userAuth) NotifyRead(ctx *context.Context) {
	var req svc.NotifyReadReq
	err := ctx.ShouldBindJSON(&req)
	if err != nil {
		ctx.BadRequest(err)
		return
	}

	err = u.in.SvcNotify.Read(ctx, ctx.GetUser().UID, req)
	if err != nil {
		ctx.InternalError(err, "failed to read notify")
		return
	}

	ctx.Success(nil)
}

func (u *userAuth) Route(h server.Handler) {
	g := h.Group("/user")
	g.POST("/logout", u.Logout)
	g.GET("", u.Detail)
	g.PUT("", u.Update)

	{
		notifyG := g.Group("/notify")
		notifyG.GET("", u.Notify)
		notifyG.POST("/read", u.NotifyRead)
		notifyG.GET("/list", u.ListNotify)
	}
}

type userAuthIn struct {
	fx.In

	SvcU      *svc.User
	SvcNotify *svc.MessageNotify
	Sub       mq.SubscriberWithHandler `name:"memory_mq"`
}

func newUserAuth(in userAuthIn) server.Router {
	return &userAuth{in: in, logger: glog.Module("router", "user_auth")}
}

func init() {
	registerApiAuthRouter(newUserAuth)
}

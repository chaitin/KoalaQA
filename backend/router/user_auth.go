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
	err := u.in.SvcU.Logout(ctx)
	if err != nil {
		ctx.InternalError(err, "user logout failed")
		return
	}

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

type notifyType uint

const (
	notifyTypeUnread notifyType = iota + 1
	notifyTypeRead
	notifyTypeInfo
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
	userID, err := ctx.ParamUint("user_id")
	if err != nil {
		ctx.BadRequest(err)
		return
	}

	conn, err := upgrader.Upgrade(ctx.Writer, ctx.Request, nil)
	if err != nil {
		ctx.InternalError(err, "upgrade websocket failed")
		return
	}

	t := topic.NewMessageNotifyUser(userID)
	logger := u.logger.WithContext(ctx).With("user_id", userID)

	defer func(c *websocket.Conn) {
		u.in.Sub.Close(t)
		_ = c.Close()
	}(conn)

	go func() {
		defer conn.Close()

		listRes, e := u.in.SvcNotify.ListNotifyInfo(ctx, userID)
		if e != nil {
			logger.WithContext(ctx).WithErr(e).Warn("list user failed")
			return
		}

		for _, item := range listRes {
			err = conn.WriteJSON(notifyRes{
				Type: notifyTypeInfo,
				Data: item,
			})
			if err != nil {
				logger.WithContext(ctx).WithErr(e).Warn("list message failed")
				return
			}
		}

		e = u.in.Sub.Subscribe(ctx, t, func(ctx goCtx.Context, data mq.Message) error {
			notifyData, ok := data.(model.MessageNotifyInfo)
			if !ok {
				logger.WithContext(ctx).With("data", data).Warn("invalid data type")
				return nil
			}

			subErr := conn.WriteJSON(notifyRes{
				Type: notifyTypeInfo,
				Data: notifyData,
			})
			if subErr != nil {
				logger.WithContext(ctx).WithErr(subErr).With("notify_data", notifyData).Warn("send notify data failed")
				return nil
			}

			return nil
		})
		if e != nil {
			logger.WithContext(ctx).WithErr(e).Warn("subscribe failed")
		}
	}()

	for {
		mt, message, err := conn.ReadMessage()
		if err != nil {
			if websocket.IsUnexpectedCloseError(err) {
				logger.Info("receive websocket close error")
				return
			}

			logger.WithContext(ctx).WithErr(err).Error("read ws message error")
			return
		}

		switch mt {
		case websocket.TextMessage:
			var req notifyReq
			err = json.Unmarshal(message, &req)
			if err != nil {
				logger.WithContext(ctx).WithErr(err).With("message", string(message)).Warn("unmarshal message failed")
				continue
			}

			switch req.Type {
			case notifyTypeUnread:
				num, err := u.in.SvcNotify.UnreadTotal(ctx, userID)
				if err != nil {
					logger.WithContext(ctx).WithErr(err).Warn("unread total failed")
					continue
				}
				err = conn.WriteJSON(notifyRes{
					Type: notifyTypeUnread,
					Data: num,
				})
				if err != nil {
					logger.WithContext(ctx).WithErr(err).Warn("send unread failse")
					continue
				}
			case notifyTypeRead:
				err = u.in.SvcNotify.Read(ctx, userID, req.ID)
				if err != nil {
					logger.WithContext(ctx).WithErr(err).With("id", req.ID).Warn("set notify read failed")
					continue
				}
			}
		case websocket.PingMessage:
			err = conn.WriteMessage(websocket.PongMessage, []byte("pong"))
			if err != nil {
				logger.WithContext(ctx).WithErr(err).Error("write pong failed")
			}
		case websocket.CloseMessage:
			logger.Info("receive close message")
			return
		}
	}
}

func (u *userAuth) Route(h server.Handler) {
	g := h.Group("/user")
	g.POST("/logout", u.Logout)
	g.GET("", u.Detail)
	g.GET("/:user_id/notify", u.Notify)
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

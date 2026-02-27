package router

import (
	goCtx "context"
	"encoding/json"
	"net/http"
	"net/url"
	"time"

	"github.com/chaitin/koalaqa/model"
	"github.com/chaitin/koalaqa/pkg/context"
	"github.com/chaitin/koalaqa/pkg/glog"
	"github.com/chaitin/koalaqa/pkg/mq"
	"github.com/chaitin/koalaqa/pkg/topic"
	"github.com/chaitin/koalaqa/server"
	"github.com/chaitin/koalaqa/svc"
	"github.com/gin-contrib/sessions"
	"github.com/google/uuid"
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
	user := ctx.GetUser()
	user.Salt = ""
	user.Key = ""
	ctx.Success(user)
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

// ListPoint
// @Summary list user point
// @Tags user
// @Produce json
// @Param req query svc.UserListPointReq false "req params"
// @Success 200 {object} context.Response{data=model.ListRes{items=[]model.UserPointRecord}}
// @Router /user/point [get]
func (u *userAuth) ListPoint(ctx *context.Context) {
	var req svc.UserListPointReq
	err := ctx.ShouldBindQuery(&req)
	if err != nil {
		ctx.BadRequest(err)
		return
	}

	res, err := u.in.SvcU.ListPoint(ctx, ctx.GetUser().UID, req)
	if err != nil {
		ctx.InternalError(err, "list user point failed")
		return
	}

	ctx.Success(res)
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

type notifyInfo struct {
	model.MessageNotifyInfo
	New bool `json:"new"`
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
	writeC := make(chan notifyRes, 100)
	connClosed := false

	defer func() {
		connClosed = true
		conn.Close()
	}()

	go func() {
		for data := range writeC {
			if connClosed {
				continue
			}

			err := conn.WriteJSON(data)
			if err != nil {
				logger.WithErr(err).With("notify_data", data).Warn("send notify data failed")
			}
		}
	}()

	go func() {
		read := false
		listRes, e := u.in.SvcNotify.ListNotifyInfo(ctx, ctx.GetUser().UID, svc.ListNotifyInfoReq{
			Read: &read,
		}, "created_at ASC")
		if e != nil {
			logger.WithErr(e).Warn("list user failed")
		} else {
			for _, item := range listRes.Items {
				select {
				case <-ctx.Done():
				case writeC <- notifyRes{
					Type: notifyTypeInfo,
					Data: notifyInfo{
						MessageNotifyInfo: model.MessageNotifyInfo{
							ID:                  item.ID,
							MessageNotifyCommon: item.MessageNotifyCommon,
						},
						New: false,
					},
				}:
				}

			}
		}

		e = u.in.Sub.Subscribe(ctx, t, func(ctx goCtx.Context, data mq.Message) error {
			notifyData, ok := data.(model.MessageNotifyInfo)
			if !ok {
				logger.With("data", data).Warn("invalid data type")
				return nil
			}

			select {
			case <-ctx.Done():
			case writeC <- notifyRes{
				Type: notifyTypeInfo,
				Data: notifyInfo{
					MessageNotifyInfo: notifyData,
					New:               true,
				},
			}:
			}

			return nil
		})
		if e != nil {
			logger.WithErr(e).Warn("subscribe failed")
		}

		close(writeC)
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
				select {
				case <-ctx.Done():
				case writeC <- notifyRes{
					Type: notifyTypePong,
					Data: struct{}{},
				}:
				}
			case notifyTypeRead:
				err = u.in.SvcNotify.Read(ctx, ctx.GetUser().UID, svc.NotifyReadReq{
					ID: req.ID,
				})
				if err != nil {
					logger.WithErr(err).With("id", req.ID).Warn("set notify read failed")
					continue
				}

				// 需要返回未读数量
				fallthrough
			case notifyTypeUnread:
				num, err := u.in.SvcNotify.UnreadTotal(ctx, ctx.GetUser().UID)
				if err != nil {
					logger.WithErr(err).Warn("unread total failed")
					continue
				}

				select {
				case <-ctx.Done():
				case writeC <- notifyRes{
					Type: notifyTypeUnread,
					Data: num,
				}:
				}
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
// @Success 200 {object} context.Response{data=model.ListRes{items=[]model.MessageNotify}}
// @Router /user/notify/list [get]
func (u *userAuth) ListNotify(ctx *context.Context) {
	var req svc.ListNotifyInfoReq
	err := ctx.ShouldBindQuery(&req)
	if err != nil {
		ctx.BadRequest(err)
		return
	}

	res, err := u.in.SvcNotify.ListNotifyInfo(ctx, ctx.GetUser().UID, req, "created_at DESC")
	if err != nil {
		ctx.InternalError(err, "list notify failed")
		return
	}

	ctx.Success(res)
}

// GetUnread
// @Summary get notify message unread num
// @Tags user
// @Produce json
// @Success 200 {object} context.Response{data=int}
// @Router /user/notify/unread [get]
func (u *userAuth) GetUnread(ctx *context.Context) {
	res, err := u.in.SvcNotify.UnreadTotal(ctx, ctx.GetUser().UID)
	if err != nil {
		ctx.InternalError(err, "get unread num failed")
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

// UpdateWeb
// @Summary update notify web switch
// @Tags user
// @Produce json
// @Accept json
// @Param req body svc.UpdateWebNotifyReq true "req params"
// @Success 200 {object} context.Response
// @Router /user/notify/web [post]
func (u *userAuth) UpdateWeb(ctx *context.Context) {
	var req svc.UpdateWebNotifyReq
	err := ctx.ShouldBindJSON(&req)
	if err != nil {
		ctx.BadRequest(err)
		return
	}

	err = u.in.SvcU.UpdateWebNotify(ctx, ctx.GetUser().UID, req)
	if err != nil {
		ctx.InternalError(err, "update notify web failed")
		return
	}

	ctx.Success(nil)
}

// QuickReplyList
// @Summary list user quick reply
// @Tags user_quick_reply
// @Produce json
// @Success 200 {object} context.Response{data=model.ListRes{items=[]model.UserQuickReply}}
// @Router /user/quick_reply [get]
func (u *userAuth) QuickReplyList(ctx *context.Context) {
	res, err := u.in.SvcUserQR.List(ctx, ctx.GetUser())
	if err != nil {
		ctx.InternalError(err, "list user quick reply failed")
		return
	}

	ctx.Success(res)
}

// QuickReplyCreate
// @Summary create user quick reply
// @Tags user_quick_reply
// @Produce json
// @Accept json
// @Param req body svc.UserQuickReplyReq true "req params"
// @Success 200 {object} context.Response{data=uint}
// @Router /user/quick_reply [post]
func (u *userAuth) QuickReplyCreate(ctx *context.Context) {
	var req svc.UserQuickReplyReq
	err := ctx.ShouldBindJSON(&req)
	if err != nil {
		ctx.BadRequest(err)
		return
	}

	id, err := u.in.SvcUserQR.Create(ctx, ctx.GetUser(), req)
	if err != nil {
		ctx.InternalError(err, "create user quick reply failed")
		return
	}

	ctx.Success(id)
}

// QuickReplyUpdate
// @Summary update user quick reply
// @Tags user_quick_reply
// @Produce json
// @Accept json
// @Param req body svc.UserQuickReplyReq true "req params"
// @Param quick_reply_id path uint true "quick_reply_id"
// @Success 200 {object} context.Response
// @Router /user/quick_reply/{quick_reply_id} [put]
func (u *userAuth) QuickReplyUpdate(ctx *context.Context) {
	quickReplyID, err := ctx.ParamUint("quick_reply_id")
	if err != nil {
		ctx.BadRequest(err)
		return
	}

	var req svc.UserQuickReplyReq
	err = ctx.ShouldBindJSON(&req)
	if err != nil {
		ctx.BadRequest(err)
		return
	}

	err = u.in.SvcUserQR.Update(ctx, ctx.GetUser(), quickReplyID, req)
	if err != nil {
		ctx.InternalError(err, "update quick reply failed")
		return
	}

	ctx.Success(nil)
}

// QuickReplyDelete
// @Summary delete user quick reply
// @Tags user_quick_reply
// @Produce json
// @Param quick_reply_id path uint true "quick_reply_id"
// @Success 200 {object} context.Response
// @Router /user/quick_reply/{quick_reply_id} [delete]
func (u *userAuth) QuickReplyDelete(ctx *context.Context) {
	quickReplyID, err := ctx.ParamUint("quick_reply_id")
	if err != nil {
		ctx.BadRequest(err)
		return
	}

	err = u.in.SvcUserQR.Delete(ctx, ctx.GetUser(), quickReplyID)
	if err != nil {
		ctx.InternalError(err, "delete quick reply failed")
		return
	}

	ctx.Success(nil)
}

// QuickReplyReindex
// @Summary reindex user quick reply
// @Tags user_quick_reply
// @Produce json
// @Accept json
// @Param req body svc.QuickReplyReindexReq true "req params"
// @Success 200 {object} context.Response
// @Router /user/quick_reply/reindex [put]
func (u *userAuth) QuickReplyReindex(ctx *context.Context) {
	var req svc.QuickReplyReindexReq
	err := ctx.ShouldBindJSON(&req)
	if err != nil {
		ctx.BadRequest(err)
		return
	}

	err = u.in.SvcUserQR.Reindex(ctx, ctx.GetUser(), req)
	if err != nil {
		ctx.InternalError(err, "reindex user quick reply failed")
		return
	}

	ctx.Success(nil)
}

const notifySubStateKey = "user_notify_sub_state"

// SubBindAuthURL
// @Summary get user notify sub bind url
// @Tags user
// @Param req query svc.NotifySubBindAuthURLReq true "request params"
// @Produce json
// @Success 200 {object} context.Response{data=string}
// @Router /user/notify_sub/auth_url [get]
func (u *userAuth) SubBindAuthURL(ctx *context.Context) {
	var req svc.NotifySubBindAuthURLReq
	err := ctx.ShouldBindQuery(&req)
	if err != nil {
		ctx.BadRequest(err)
		return
	}

	state := uuid.NewString()
	res, err := u.in.SvcU.SubBindAuthURL(ctx, state, req)
	if err != nil {
		ctx.InternalError(err, "get sub bind auth url failed")
		return
	}

	session := sessions.Default(ctx.Context)
	session.Set(notifySubStateKey, state)
	session.Save()

	ctx.Success(res)
}

func (u *userAuth) SubBindCallbackDingtalk(ctx *context.Context) {
	u.subBindCallback(ctx, model.MessageNotifySubTypeDingtalk)
}

func (u *userAuth) subBindCallback(ctx *context.Context, typ model.MessageNotifySubType) {
	query := make(url.Values)
	query.Set("tab", "4")
	query.Set("notify_sub", "true")

	defer func() {
		ctx.Redirect(http.StatusFound, "/profile?"+query.Encode())
	}()

	var req svc.NotifySubBindCallbackReq
	err := ctx.ShouldBindQuery(&req)
	if err != nil {
		query.Set("error", err.Error())
		return
	}

	session := sessions.Default(ctx.Context)
	stateI := session.Get(notifySubStateKey)
	state, ok := stateI.(string)
	if !ok || state != req.State {
		query.Set("error", "invalid state")
		return
	}

	session.Delete(stateKey)
	session.Save()

	err = u.in.SvcU.SubBindCallback(ctx, ctx.GetUser().UID, typ, req)
	if err != nil {
		query.Set("error", err.Error())
		return
	}
}

// ListNotifySub
// @Summary list notify sub
// @Tags user
// @Produce json
// @Success 200 {object} context.Response{data=model.ListRes{items=[]model.UserNotiySub}}
// @Router /user/notify_sub/bind [get]
func (u *userAuth) ListNotifySubBind(ctx *context.Context) {
	res, err := u.in.SvcU.ListNotifySub(ctx, ctx.GetUser().UID)
	if err != nil {
		ctx.InternalError(err, "list notify sub failed")
		return
	}

	ctx.Success(res)
}

// NotifySubUnbind
// @Summary unbind user notifu sub
// @Tags user
// @Produce json
// @Accept json
// @Param req body svc.UnbindNotifySubReq true "req params"
// @Success 200 {object} context.Response
// @Router /user/notify_sub [delete]
func (u *userAuth) NotifySubUnbind(ctx *context.Context) {
	var req svc.UnbindNotifySubReq
	err := ctx.ShouldBindJSON(&req)
	if err != nil {
		ctx.BadRequest(err)
		return
	}

	err = u.in.SvcU.UnbindNotifySub(ctx, ctx.GetUser().UID, req)
	if err != nil {
		ctx.InternalError(err, "unbind user notify sub failed")
		return
	}

	ctx.Success(nil)
}

// NotifySubWechatOfficialAccount
// @Summary get user qrcode
// @Tags user
// @Produce image/jpg
// @Router /user/notify_sub/wechat_official_account/qrcode [get]
func (u *userAuth) NotifySubWechatOfficialAccount(ctx *context.Context) {
	img, err := u.in.SvcU.WechatOfficialAccountQrcode(ctx, ctx.GetUser().UID)
	if err != nil {
		ctx.InternalError(err, "get qrcode failed")
		return
	}
	ctx.Data(http.StatusOK, "image/jpg", img)
}

func (u *userAuth) Route(h server.Handler) {
	g := h.Group("/user")
	g.POST("/logout", u.Logout)
	g.GET("", u.Detail)
	g.PUT("", u.Update)
	g.GET("/point", u.ListPoint)

	{
		notifyG := g.Group("/notify")
		notifyG.GET("", u.Notify)
		notifyG.GET("/unread", u.GetUnread)
		notifyG.POST("/read", u.NotifyRead)
		notifyG.GET("/list", u.ListNotify)
		notifyG.POST("/web", u.UpdateWeb)
	}

	{
		notifySubG := g.Group("/notify_sub")
		notifySubG.GET("/auth_url", u.SubBindAuthURL)
		notifySubG.GET("/bind", u.ListNotifySubBind)
		notifySubG.DELETE("", u.NotifySubUnbind)
		notifySubG.GET("/wechat_official_account/qrcode", u.NotifySubWechatOfficialAccount)

		{
			callbackG := notifySubG.Group("/callback")
			callbackG.GET("/dingtalk", u.SubBindCallbackDingtalk)
		}
	}

	{
		qrG := g.Group("/quick_reply")
		qrG.GET("", u.QuickReplyList)
		qrG.POST("", u.QuickReplyCreate)
		qrG.PUT("/reindex", u.QuickReplyReindex)
		{
			qrDetailG := qrG.Group(":quick_reply_id")
			qrDetailG.DELETE("", u.QuickReplyDelete)
			qrDetailG.PUT("", u.QuickReplyUpdate)
		}
	}
}

type userAuthIn struct {
	fx.In

	SvcUserQR *svc.UserQuickReply
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

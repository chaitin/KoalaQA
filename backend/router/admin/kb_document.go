package admin

import (
	"encoding/gob"
	"errors"
	"fmt"
	"net/http"
	"net/url"
	"strconv"

	"github.com/chaitin/koalaqa/model"
	"github.com/chaitin/koalaqa/pkg/anydoc"
	"github.com/chaitin/koalaqa/pkg/context"
	"github.com/chaitin/koalaqa/pkg/util"
	"github.com/chaitin/koalaqa/server"
	"github.com/chaitin/koalaqa/svc"
	"github.com/gin-contrib/sessions"
	"github.com/google/uuid"
)

type kbDocument struct {
	svcDoc *svc.KBDocument
}

// FileList
// @Summary list file documents
// @Tags document
// @Accept multipart/form-data
// @Param file formData file true "upload file"
// @Produce json
// @Success 200 {object} context.Response{data=svc.AnydocListRes}
// @Router /admin/kb/document/file/list [post]
func (d *kbDocument) FileList(ctx *context.Context) {
	var req svc.FileListReq

	err := ctx.ShouldBind(&req)
	if err != nil {
		ctx.BadRequest(err)
		return
	}

	res, err := d.svcDoc.FileList(ctx, req)
	if err != nil {
		ctx.InternalError(err, "file list failed")
		return
	}

	ctx.Success(res)
}

// FileExport
// @Summary export file document
// @Tags document
// @Accept json
// @Param req body svc.FileExportReq true "request params"
// @Produce json
// @Success 200 {object} context.Response{data=string}
// @Router /admin/kb/document/file/export [post]
func (d *kbDocument) FileExport(ctx *context.Context) {
	var req svc.FileExportReq

	err := ctx.ShouldBindJSON(&req)
	if err != nil {
		ctx.BadRequest(err)
		return
	}

	res, err := d.svcDoc.FileExport(ctx, req)
	if err != nil {
		ctx.InternalError(err, "file export failed")
		return
	}

	ctx.Success(res)
}

// URLList
// @Summary list url documents
// @Tags document
// @Accept json
// @Param req body svc.URLListReq true "request params"
// @Produce json
// @Success 200 {object} context.Response{data=svc.AnydocListRes}
// @Router /admin/kb/document/url/list [post]
func (d *kbDocument) URLList(ctx *context.Context) {
	var req svc.URLListReq

	err := ctx.ShouldBindJSON(&req)
	if err != nil {
		ctx.BadRequest(err)
		return
	}

	res, err := d.svcDoc.URLList(ctx, req)
	if err != nil {
		ctx.InternalError(err, "url list failed")
		return
	}

	ctx.Success(res)
}

// URLExport
// @Summary export url document
// @Tags document
// @Accept json
// @Param req body svc.URLExportReq true "request params"
// @Produce json
// @Success 200 {object} context.Response{data=string}
// @Router /admin/kb/document/url/export [post]
func (d *kbDocument) URLExport(ctx *context.Context) {
	var req svc.URLExportReq

	err := ctx.ShouldBindJSON(&req)
	if err != nil {
		ctx.BadRequest(err)
		return
	}

	res, err := d.svcDoc.URLExport(ctx, req)
	if err != nil {
		ctx.InternalError(err, "url export failed")
		return
	}

	ctx.Success(res)
}

// SitemapList
// @Summary list sitemap documents
// @Tags document
// @Accept json
// @Param req body svc.SitemapListReq true "request params"
// @Produce json
// @Success 200 {object} context.Response{data=svc.AnydocListRes}
// @Router /admin/kb/document/sitemap/list [post]
func (d *kbDocument) SitemapList(ctx *context.Context) {
	var req svc.SitemapListReq

	err := ctx.ShouldBindJSON(&req)
	if err != nil {
		ctx.BadRequest(err)
		return
	}

	res, err := d.svcDoc.SitemapList(ctx, req)
	if err != nil {
		ctx.InternalError(err, "sitemap list failed")
		return
	}

	ctx.Success(res)
}

// SitemapExport
// @Summary export sitemap document
// @Tags document
// @Accept json
// @Param req body svc.SitemapExportReq true "request params"
// @Produce json
// @Success 200 {object} context.Response{data=string}
// @Router /admin/kb/document/sitemap/export [post]
func (d *kbDocument) SitemapExport(ctx *context.Context) {
	var req svc.SitemapExportReq

	err := ctx.ShouldBindJSON(&req)
	if err != nil {
		ctx.BadRequest(err)
		return
	}

	res, err := d.svcDoc.SitemapExport(ctx, req)
	if err != nil {
		ctx.InternalError(err, "sitemap export failed")
		return
	}

	ctx.Success(res)
}

const (
	docStateKey = "doc_auth_state"
	docUserKey  = "doc_user"
)

type DocStateSession struct {
	ID           uint   `json:"id"`
	KBID         uint   `json:"-"`
	Name         string `json:"name"`
	ClientID     string `json:"client_id"`
	ClientSecret string `json:"client_secret"`
	RedirectURL  string `json:"-"`
	State        string `json:"-"`
}

type docUserRes struct {
	DocStateSession

	UserInfo *anydoc.UserInfoRes `json:"user_info"`
}

func init() {
	gob.Register(DocStateSession{})
	gob.Register(docUserRes{})
}

// FeishuAuthURL
// @Summary feishu auth url
// @Tags document
// @Accept json
// @Param req body svc.FeishuAuthURLReq true "request params"
// @Produce json
// @Success 200 {object} context.Response{data=string}
// @Router /admin/kb/document/feishu/auth_url [post]
func (d *kbDocument) FeishuAuthURL(ctx *context.Context) {
	var req svc.FeishuAuthURLReq
	err := ctx.ShouldBindJSON(&req)
	if err != nil {
		ctx.BadRequest(err)
		return
	}

	state := uuid.NewString()

	authURL, err := d.svcDoc.FeishuAuthURL(ctx, state, req)
	if err != nil {
		ctx.InternalError(err, "get feishu auth url failed")
		return
	}

	authU, err := util.ParseHTTP(authURL)
	if err != nil {
		ctx.InternalError(err, "parse auth url failed")
		return
	}

	session := sessions.Default(ctx.Context)
	session.Set(docStateKey, DocStateSession{
		ID:           req.ID,
		KBID:         req.KBID,
		Name:         req.Name,
		ClientID:     req.ClientID,
		ClientSecret: req.ClientSecret,
		RedirectURL:  authU.Query().Get("redirect_uri"),
		State:        state,
	})
	session.Save()

	ctx.Success(authURL)
}

type userInfoReq struct {
	State string `form:"state" binding:"required"`
	Code  string `form:"code" binding:"required"`
}

func (d *kbDocument) FeishuUserInfoCallback(ctx *context.Context) {
	var req userInfoReq
	err := ctx.ShouldBindQuery(&req)
	if err != nil {
		ctx.BadRequest(err)
		return
	}

	query := make(url.Values)

	session := sessions.Default(ctx.Context)
	stateI := session.Get(docStateKey)
	docState, ok := stateI.(DocStateSession)
	if !ok || docState.State != req.State {
		query.Set("error", "invalid state")
	} else {
		query.Set("id", strconv.FormatUint(uint64(docState.KBID), 10))

		session.Delete(docStateKey)

		res, err := d.svcDoc.FeishuUserInfo(ctx, anydoc.UserInfoReq{
			AppID:       docState.ClientID,
			AppSecret:   docState.ClientSecret,
			Code:        req.Code,
			RedirectURL: docState.RedirectURL,
		})
		if err != nil {
			query.Set("error", fmt.Sprintf("get user info failed: %s", err.Error()))
		} else {
			query.Set("error", "nil")
			session.Set(docUserKey, docUserRes{
				DocStateSession: docState,
				UserInfo:        res,
			})
			session.Save()
		}
	}

	ctx.Redirect(http.StatusFound, "/admin/ai/kb?"+query.Encode())
}

// FeishuUserInfo
// @Summary feishu user
// @Tags document
// @Produce json
// @Success 200 {object} context.Response{data=docUserRes}
// @Router /admin/kb/document/feishu/user [get]
func (d *kbDocument) FeishuUserInfo(ctx *context.Context) {
	session := sessions.Default(ctx.Context)
	userI := session.Get(docUserKey)
	user, ok := userI.(docUserRes)
	if !ok {
		ctx.BadRequest(errors.New("user info not found"))
		return
	}

	session.Delete(docUserKey)
	session.Save()

	ctx.Success(user)
}

// List
// @Summary list kb document
// @Tags document
// @Param kb_id path uint true "kb_id"
// @Param req query svc.DocListReq true "request params"
// @Produce json
// @Success 200 {object} context.Response{data=model.ListRes{items=[]svc.DocListItem}}
// @Router /admin/kb/{kb_id}/document [get]
func (d *kbDocument) List(ctx *context.Context) {
	kbID, err := ctx.ParamUint("kb_id")
	if err != nil {
		ctx.BadRequest(err)
		return
	}

	var req svc.DocListReq
	err = ctx.ShouldBindQuery(&req)
	if err != nil {
		ctx.BadRequest(err)
		return
	}
	res, err := d.svcDoc.List(ctx, kbID, model.DocTypeDocument, req)
	if err != nil {
		ctx.InternalError(err, "list kb doc failed")
		return
	}

	ctx.Success(res)
}

// Detail
// @Summary get kb document detail
// @Tags document
// @Param kb_id path uint true "kb_id"
// @Param doc_id path uint true "doc_id"
// @Produce json
// @Success 200 {object} context.Response{data=model.KBDocumentDetail}
// @Router /admin/kb/{kb_id}/document/{doc_id} [get]
func (d *kbDocument) Detail(ctx *context.Context) {
	kbID, err := ctx.ParamUint("kb_id")
	if err != nil {
		ctx.BadRequest(err)
		return
	}

	docID, err := ctx.ParamUint("doc_id")
	if err != nil {
		ctx.BadRequest(err)
		return
	}

	res, err := d.svcDoc.Detail(ctx, kbID, docID)
	if err != nil {
		ctx.InternalError(err, "get kb document detail failed")
		return
	}

	ctx.Success(res)
}

// Delete
// @Summary delete kb document
// @Tags document
// @Param kb_id path uint true "kb_id"
// @Param doc_id path uint true "doc_id"
// @Produce json
// @Success 200 {object} context.Response
// @Router /admin/kb/{kb_id}/document/{doc_id} [delete]
func (d *kbDocument) Delete(ctx *context.Context) {
	kbID, err := ctx.ParamUint("kb_id")
	if err != nil {
		ctx.BadRequest(err)
		return
	}

	docID, err := ctx.ParamUint("doc_id")
	if err != nil {
		ctx.BadRequest(err)
		return
	}

	err = d.svcDoc.Delete(ctx, kbID, docID)
	if err != nil {
		ctx.InternalError(err, "delete document failed")
		return
	}

	ctx.Success(nil)
}

// UpdateGroupIDs
// @Summary update doc group_ids
// @Tags document
// @Accept json
// @Param kb_id path uint true "kb_id"
// @Param req body svc.UpdateGroupIDsReq true "request params"
// @Produce json
// @Success 200 {object} context.Response
// @Router /admin/kb/{kb_id}/document/group_ids [put]
func (d *kbDocument) UpdateGroupIDs(ctx *context.Context) {
	var req svc.UpdateGroupIDsReq
	err := ctx.ShouldBindJSON(&req)
	if err != nil {
		ctx.BadRequest(err)
		return
	}

	err = d.svcDoc.UpdateGroupIDs(ctx, req)
	if err != nil {
		ctx.InternalError(err, "set doc group id failed")
		return
	}

	ctx.Success(nil)
}

func newDocument(d *svc.KBDocument) server.Router {
	return &kbDocument{
		svcDoc: d,
	}
}

func (d *kbDocument) Route(e server.Handler) {
	{
		pageG := e.Group("/kb/:kb_id/document")
		pageG.GET("", d.List)
		pageG.GET("/:doc_id", d.Detail)
		pageG.DELETE("/:doc_id", d.Delete)
		pageG.PUT("/group_ids", d.UpdateGroupIDs)
	}

	{
		g := e.Group("/kb/document")
		g.POST("/file/list", d.FileList)
		g.POST("/file/export", d.FileExport)

		g.POST("/url/list", d.URLList)
		g.POST("/url/export", d.URLExport)

		g.POST("/sitemap/list", d.SitemapList)
		g.POST("/sitemap/export", d.SitemapExport)

		g.POST("/feishu/auth_url", d.FeishuAuthURL)
		g.GET("/feishu/callback", d.FeishuUserInfoCallback)
		g.GET("/feishu/user", d.FeishuUserInfo)
	}

}

func init() {
	registerAdminAPIRouter(newDocument)
}

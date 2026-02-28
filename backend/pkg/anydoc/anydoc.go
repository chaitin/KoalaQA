package anydoc

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"mime/multipart"
	"net/http"
	"net/url"
	"path/filepath"
	"strconv"
	"strings"

	"github.com/chaitin/koalaqa/model"
	"github.com/chaitin/koalaqa/pkg/anydoc/platform"
	"github.com/chaitin/koalaqa/pkg/config"
	"github.com/chaitin/koalaqa/pkg/glog"
	"github.com/chaitin/koalaqa/pkg/oss"
	"github.com/chaitin/koalaqa/pkg/trace"
	"github.com/chaitin/koalaqa/pkg/tree"
	"github.com/chaitin/koalaqa/pkg/util"
	"github.com/google/uuid"
	"go.uber.org/fx"
)

type listOpt struct {
	uuid         string
	appID        string
	appSecret    string
	accessToken  string
	refreshToken string
	phone        string
	spaceID      string
	folderID     string
	shallow      bool

	url string

	reader *multipart.FileHeader

	errContinue bool
}

type ListOptFunc func(o *listOpt)

func ListWithSpaceID(spaceID string) ListOptFunc {
	return func(o *listOpt) {
		o.spaceID = spaceID
	}
}

func ListWithFolderID(folderID string) ListOptFunc {
	return func(opt *listOpt) {
		opt.folderID = folderID
	}
}

func ListWithShallow(shallow bool) ListOptFunc {
	return func(opt *listOpt) {
		opt.shallow = shallow
	}
}

func ListWithUUID(id string) ListOptFunc {
	return func(o *listOpt) {
		o.uuid = id
	}
}

func ListWithReader(r *multipart.FileHeader) ListOptFunc {
	return func(o *listOpt) {
		o.reader = r
	}
}

func ListWithURL(u string) ListOptFunc {
	return func(o *listOpt) {
		o.url = u
	}
}

func ListWithErrContinue() ListOptFunc {
	return func(o *listOpt) {
		o.errContinue = true
	}
}

func ListWithPlatformOpt(p model.PlatformOpt) ListOptFunc {
	return func(o *listOpt) {
		o.url = p.URL
		o.appID = p.AppID
		o.appSecret = p.Secret
		o.accessToken = p.AccessToken
		o.refreshToken = p.RefreshToken
		o.phone = p.Phone
	}
}

type ListRes struct {
	UUID string              `json:"uuid"`
	Docs *tree.Node[ListDoc] `json:"docs"`
}

type ListDoc struct {
	ID        string `json:"id"`
	File      bool   `json:"file"`
	FileType  string `json:"file_type"`
	Title     string `json:"title"`
	Summary   string `json:"summary"`
	UpdatedAt int64  `json:"updated_at"`
	Error     string `json:"error"`
}

type ExportFunc func(o *model.ExportOpt)

func GetExportOpt(funcs ...ExportFunc) (o model.ExportOpt) {
	for _, f := range funcs {
		f(&o)
	}
	return
}

func ExportWithSpaceID(spaceID string) ExportFunc {
	return func(o *model.ExportOpt) {
		o.SpaceID = spaceID
	}
}

func ExportWithFileType(fileType string) ExportFunc {
	return func(o *model.ExportOpt) {
		o.FileType = fileType
	}
}

func ExportWithOpt(o model.ExportOpt) ExportFunc {
	return func(eo *model.ExportOpt) {
		*eo = o
	}
}

type AuthURLReq struct {
	ClientID    string `json:"client_id" binding:"required"`
	Scope       string `json:"scope" binding:"required"`
	State       string `json:"state"`
	RedirectURL string `json:"redirect_url" binding:"required"`
}

type UserInfoReq struct {
	AppID       string `json:"app_id" binding:"required"`
	AppSecret   string `json:"app_secret" binding:"required"`
	Code        string `json:"code" binding:"required"`
	RedirectURL string `json:"redirect_url"`
}

type UserInfoRes struct {
	ID    string `json:"id"`
	Name  string `json:"name"`
	Email string `json:"email"`

	AccessToken  string `json:"access_token"`
	RefreshToken string `json:"refresh_token"`
}

type Anydoc interface {
	List(ctx context.Context, platform platform.PlatformType, optFuncs ...ListOptFunc) (*ListRes, error)
	Export(ctx context.Context, platform platform.PlatformType, id string, docID string, optFuncs ...ExportFunc) (string, error)
	AuthURL(ctx context.Context, platform platform.PlatformType, req AuthURLReq) (string, error)
	UserInfo(ctx context.Context, platform platform.PlatformType, req UserInfoReq) (*UserInfoRes, error)
	DeleteResources(ctx context.Context, path string) error
}

type anydoc struct {
	oc       oss.Client
	address  string
	platform map[platform.PlatformType]platform.Platform
	logger   *glog.Logger
}

type anydocRes[T any] struct {
	Success bool   `json:"success"`
	Data    T      `json:"data"`
	Msg     string `json:"msg"`
	Err     string `json:"err"`
}

func (a *anydocRes[T]) Error() error {
	if a.Success {
		return nil
	}

	return fmt.Errorf("anydoc failed, msg: %s, err: %s", a.Msg, a.Err)
}

func (a *anydoc) List(ctx context.Context, plat platform.PlatformType, optFuncs ...ListOptFunc) (*ListRes, error) {
	var o listOpt
	for _, f := range optFuncs {
		f(&o)
	}
	p, ok := a.platform[plat]
	if !ok {
		return nil, errors.New("platform not supported")
	}

	if o.uuid == "" {
		o.uuid = uuid.New().String()
	}

	u, err := url.Parse(a.address)
	if err != nil {
		return nil, err
	}
	u.Path = p.PathPrefix() + "/list"

	var body io.Reader
	switch p.ListMethod() {
	case http.MethodGet:
		query := make(url.Values)
		query.Set("uuid", o.uuid)
		query.Set("app_id", o.appID)
		query.Set("app_secret", o.appSecret)
		query.Set("access_token", o.accessToken)
		query.Set("refresh_token", o.refreshToken)
		query.Set("space_id", o.spaceID)
		query.Set("url", o.url)
		query.Set("phone", o.phone)
		query.Set("err_continue", strconv.FormatBool(o.errContinue))
		query.Set("folder_id", o.folderID)
		query.Set("shallow", strconv.FormatBool(o.shallow))

		u.RawQuery = query.Encode()
	case http.MethodPost:
		filename := ""
		if o.reader != nil {
			r, err := o.reader.Open()
			if err != nil {
				return nil, err
			}
			defer r.Close()

			signURL, err := a.oc.Upload(ctx, "imports", r,
				oss.WithExt(filepath.Ext(o.reader.Filename)),
				oss.WithFileSize(int(o.reader.Size)),
				oss.WithLimitSize(),
				oss.WithRetSignURL(),
			)
			if err != nil {
				return nil, err
			}
			o.url = signURL
			filename = o.reader.Filename
		}

		m := map[string]any{
			"uuid":          o.uuid,
			"app_id":        o.appID,
			"app_secret":    o.appSecret,
			"access_token":  o.accessToken,
			"refresh_token": o.refreshToken,
			"space_id":      o.spaceID,
			"filename":      filename,
			"url":           o.url,
			"phone":         o.phone,
			"err_continue":  o.errContinue,
			"folder_id":     o.folderID,
			"shallow":       o.shallow,
		}

		if plat == platform.PlatformDingtalk {
			m["unionid"] = o.accessToken
		}

		byteM, err := json.Marshal(m)
		if err != nil {
			return nil, err
		}

		body = bytes.NewReader(byteM)
	}

	req, err := http.NewRequestWithContext(ctx, p.ListMethod(), u.String(), body)
	if err != nil {
		return nil, err
	}

	req.Header["X-Trace-ID"] = trace.TraceID(ctx)

	resp, err := util.HTTPClient.Do(req)
	if err != nil {
		return nil, err
	}

	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("anydoc list failed, status code: %d", resp.StatusCode)
	}

	var (
		docRes anydocRes[struct {
			Docs *tree.Node[ListDoc] `json:"docs"`
		}]
		res = ListRes{
			UUID: o.uuid,
		}
	)
	err = json.NewDecoder(resp.Body).Decode(&docRes)
	if err != nil {
		return nil, err
	}

	err = docRes.Error()
	if err != nil {
		return nil, err
	}

	res.Docs = docRes.Data.Docs

	return &res, nil
}

func (a *anydoc) Export(ctx context.Context, platform platform.PlatformType, id string, docID string, optFuncs ...ExportFunc) (string, error) {
	var o model.ExportOpt

	for _, f := range optFuncs {
		f(&o)
	}

	p, ok := a.platform[platform]
	if !ok {
		return "", errors.New("platform not supported")
	}

	reqBody := map[string]string{
		"uuid":   id,
		"doc_id": docID,
	}
	if o.SpaceID != "" {
		reqBody["space_id"] = o.SpaceID
	}
	if o.FileType != "" {
		reqBody["file_type"] = o.FileType
	}

	reqBodyBytes, err := json.Marshal(reqBody)
	if err != nil {
		return "", err
	}

	req, err := http.NewRequestWithContext(ctx, http.MethodPost, fmt.Sprintf("%s%s", a.address, p.PathPrefix()+"/export"), bytes.NewReader(reqBodyBytes))
	if err != nil {
		return "", err
	}

	req.Header["X-Trace-ID"] = trace.TraceID(ctx)

	resp, err := util.HTTPClient.Do(req)
	if err != nil {
		return "", err
	}

	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return "", fmt.Errorf("anydoc export status code: %d", resp.StatusCode)
	}

	var res anydocRes[string]
	err = json.NewDecoder(resp.Body).Decode(&res)
	if err != nil {
		return "", err
	}

	err = res.Error()
	if err != nil {
		return "", err
	}

	return res.Data, nil
}

func (a *anydoc) AuthURL(ctx context.Context, plat platform.PlatformType, reqData AuthURLReq) (string, error) {
	p, ok := a.platform[plat]
	if !ok {
		return "", errors.New("platform not supported")
	}

	reqBytes, err := json.Marshal(reqData)
	if err != nil {
		return "", err
	}
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, fmt.Sprintf("%s%s", a.address, p.PathPrefix()+"/auth_url"), bytes.NewReader(reqBytes))
	if err != nil {
		return "", err
	}
	req.Header["X-Trace-ID"] = trace.TraceID(ctx)

	resp, err := util.HTTPClient.Do(req)
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()

	var res anydocRes[string]
	err = json.NewDecoder(resp.Body).Decode(&res)
	if err != nil {
		return "", err
	}

	err = res.Error()
	if err != nil {
		return "", err
	}

	if resp.StatusCode != http.StatusOK {
		return "", fmt.Errorf("anydoc get auth_url status code: %d", resp.StatusCode)
	}

	return res.Data, nil
}

func (a *anydoc) UserInfo(ctx context.Context, plat platform.PlatformType, reqData UserInfoReq) (*UserInfoRes, error) {
	p, ok := a.platform[plat]
	if !ok {
		return nil, errors.New("platform not supported")
	}

	reqBytes, err := json.Marshal(reqData)
	if err != nil {
		return nil, err
	}
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, fmt.Sprintf("%s%s", a.address, p.PathPrefix()+"/user"), bytes.NewReader(reqBytes))
	if err != nil {
		return nil, err
	}
	req.Header["X-Trace-ID"] = trace.TraceID(ctx)

	resp, err := util.HTTPClient.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	var res anydocRes[UserInfoRes]
	err = json.NewDecoder(resp.Body).Decode(&res)
	if err != nil {
		return nil, err
	}

	err = res.Error()
	if err != nil {
		return nil, err
	}

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("anydoc get user info status code: %d", resp.StatusCode)
	}

	return &res.Data, nil
}

func (a *anydoc) DeleteResources(ctx context.Context, path string) error {
	reqBody := map[string]string{
		"path": path,
	}

	reqBodyBytes, err := json.Marshal(reqBody)
	if err != nil {
		return err
	}

	req, err := http.NewRequestWithContext(ctx, http.MethodDelete, fmt.Sprintf("%s/api/tasks/resources", a.address), bytes.NewReader(reqBodyBytes))
	if err != nil {
		return err
	}

	req.Header["X-Trace-ID"] = trace.TraceID(ctx)
	req.Header.Set("Content-Type", "application/json")

	resp, err := util.HTTPClient.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()

	var res anydocRes[interface{}]
	err = json.NewDecoder(resp.Body).Decode(&res)
	if err != nil {
		return err
	}

	err = res.Error()
	if err != nil {
		return err
	}

	if resp.StatusCode != http.StatusOK {
		return fmt.Errorf("anydoc delete task resources status code: %d", resp.StatusCode)
	}

	return nil
}

type in struct {
	fx.In

	OC        oss.Client
	Cfg       config.Config
	Platforms []platform.Platform `group:"anydoc_platforms"`
}

func newAnydoc(i in) (Anydoc, error) {

	platformM := make(map[platform.PlatformType]platform.Platform)
	for _, p := range i.Platforms {
		platformM[p.Platform()] = p
	}

	u, err := url.Parse(i.Cfg.Anydoc.Address)
	if err != nil {
		return nil, err
	}
	if u.Scheme != "http" && u.Scheme != "https" {
		return nil, errors.New("invalid anydoc scheme")
	}
	if u.Host == "" {
		return nil, errors.New("empty anydoc host")
	}
	if u.Path != "" {
		return nil, errors.New("wront anydoc path")
	}

	return &anydoc{
		oc:       i.OC,
		address:  strings.TrimSuffix(i.Cfg.Anydoc.Address, "/"),
		platform: platformM,
		logger:   glog.Module("anydoc"),
	}, nil
}

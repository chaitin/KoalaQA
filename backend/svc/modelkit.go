package svc

import (
	"context"

	"github.com/chaitin/ModelKit/consts"
	"github.com/chaitin/ModelKit/domain"
	"github.com/chaitin/ModelKit/usecase"
	"github.com/chaitin/koalaqa/model"
	"github.com/chaitin/koalaqa/pkg/glog"
	"github.com/chaitin/koalaqa/pkg/rag"
	"github.com/chaitin/koalaqa/repo"
	einoModel "github.com/cloudwego/eino/components/model"
)

type MKModelBase struct {
	Provider   string        `json:"provider" binding:"required"`
	Model      string        `json:"model" binding:"required"`
	BaseURL    string        `json:"base_url" binding:"required"`
	APIKey     string        `json:"api_key"`
	APIHeader  string        `json:"api_header"`
	APIVersion string        `json:"api_version"` // for azure openai
	ShowName   string        `json:"show_name"`
	Type       model.LLMType `json:"type" binding:"required,oneof=chat embedding rerank analysis analysis-vl"`
}

type ModelKit struct {
	repo   *repo.LLM
	rag    rag.Service
	logger *glog.Logger
}

func NewModelKit(repo *repo.LLM, rag rag.Service) *ModelKit {
	return &ModelKit{
		repo:   repo,
		rag:    rag,
		logger: glog.Module("modelkit"),
	}
}

func init() {
	registerSvc(NewModelKit)
}

type MKSupportedReq struct {
	Provider  string        `json:"provider" binding:"required"`
	BaseURL   string        `json:"base_url" binding:"required"`
	APIKey    string        `json:"api_key"`
	APIHeader string        `json:"api_header"`
	Type      model.LLMType `json:"type" binding:"required,oneof=chat embedding rerank analysis analysis-vl"`
}

type MKSupportedRes struct {
	Models []MKModelItem `json:"models"`
	Error  string        `json:"error"`
}

type MKModelItem struct {
	Model string `json:"model"`
}

func (m *ModelKit) Supported(ctx context.Context, req MKSupportedReq) (*MKSupportedRes, error) {
	res, err := usecase.ModelList(ctx, &domain.ModelListReq{
		Provider:  req.Provider,
		BaseURL:   req.BaseURL,
		APIKey:    req.APIKey,
		APIHeader: req.APIHeader,
		Type:      string(req.Type),
	})
	if err != nil {
		return nil, err
	}
	models := make([]MKModelItem, len(res.Models))
	for i, model := range res.Models {
		models[i] = MKModelItem{
			Model: model.Model,
		}
	}
	return &MKSupportedRes{
		Models: models,
		Error:  res.Error,
	}, nil
}

type ModelKitCheckReq struct {
	MKModelBase
}

type CheckModelRes struct {
	Error   string `json:"error"`
	Content string `json:"content"`
}

func (m *ModelKit) CheckModel(ctx context.Context, req ModelKitCheckReq) (*CheckModelRes, error) {
	res, err := usecase.CheckModel(ctx, &domain.CheckModelReq{
		Provider:   string(req.Provider),
		Model:      req.Model,
		BaseURL:    req.BaseURL,
		APIKey:     req.APIKey,
		APIHeader:  req.APIHeader,
		APIVersion: req.APIVersion,
		Type:       string(req.Type),
	})
	if err != nil {
		return nil, err
	}
	return &CheckModelRes{
		Error:   res.Error,
		Content: res.Content,
	}, nil
}

type MKCreateReq struct {
	MKModelBase
	Param *model.LLMModelParam `json:"param"`
}

func (m *ModelKit) CreateModel(ctx context.Context, req MKCreateReq) (id uint, err error) {
	var rid string
	llm := &model.LLM{
		Provider:   string(req.Provider),
		Model:      req.Model,
		BaseURL:    req.BaseURL,
		APIKey:     req.APIKey,
		APIHeader:  req.APIHeader,
		APIVersion: req.APIVersion,
		Type:       req.Type,
		ShowName:   req.ShowName,
		IsActive:   true,
	}
	if req.Param != nil {
		llm.Parameters = *req.Param
	}
	if req.Type.RagSupported() {
		rid, err = m.rag.AddModel(ctx, llm)
		if err != nil {
			return 0, err
		}
		llm.RagID = rid
	}
	err = m.repo.Create(ctx, llm)
	if err != nil {
		return 0, err
	}
	return llm.ID, nil
}

type MKUpdateReq struct {
	MKModelBase
	Param *model.LLMModelParam `json:"param"`
}

func (m *ModelKit) UpdateByID(ctx context.Context, id uint, req MKUpdateReq) error {
	data := model.LLM{
		Model:      req.Model,
		APIKey:     req.APIKey,
		APIHeader:  req.APIHeader,
		APIVersion: req.APIVersion,
		Type:       req.Type,
		BaseURL:    req.BaseURL,
		Provider:   string(req.Provider),
	}
	if req.Param != nil {
		data.Parameters = *req.Param
	}
	if req.Type.RagSupported() {
		err := m.rag.UpdateModel(ctx, &data)
		if err != nil {
			return err
		}
	}
	return m.repo.UpdateByModel(ctx, &data, repo.QueryWithEqual("id", id))
}

func (m *ModelKit) List(ctx context.Context) ([]model.LLM, error) {
	var items []model.LLM
	err := m.repo.List(ctx, &items)
	if err != nil {
		return nil, err
	}
	return items, nil
}

func (m *ModelKit) GetChatModel(ctx context.Context) (einoModel.BaseChatModel, error) {
	chat, err := m.repo.GetChatModel(ctx)
	if err != nil {
		return nil, err
	}
	res, err := usecase.GetChatModel(ctx, &domain.ModelMetadata{
		Provider:   consts.ParseModelProvider(string(chat.Provider)),
		ModelName:  chat.Model,
		APIKey:     chat.APIKey,
		BaseURL:    chat.BaseURL,
		APIVersion: chat.APIVersion,
		APIHeader:  chat.APIHeader,
		ModelType:  consts.ParseModelType(string(chat.Type)),
	})
	if err != nil {
		return nil, err
	}
	m.logger.WithContext(ctx).
		With("provider", chat.Provider).
		With("base_url", chat.BaseURL).
		With("api_version", chat.APIVersion).
		With("model_type", chat.Type).
		With("model", chat.Model).
		Debug("get chat model success")
	return res, nil
}

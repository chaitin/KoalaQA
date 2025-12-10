package rag

import (
	"context"
	"fmt"
	"strings"

	"github.com/chaitin/koalaqa/model"
	"github.com/chaitin/koalaqa/pkg/config"
	"github.com/chaitin/koalaqa/pkg/glog"
	raglite "github.com/chaitin/raglite-go-sdk"
	"github.com/google/uuid"
)

type CTRag struct {
	logger *glog.Logger
	client *raglite.Client
}

func NewCTRag(cfg config.Config) (Service, error) {
	c := &CTRag{
		logger: glog.Module("rag"),
	}
	if err := c.Init(cfg.RAG); err != nil {
		return nil, err
	}
	return c, nil
}

func (c *CTRag) Init(cfg config.Rag) error {
	client, err := raglite.NewClient(cfg.BaseURL, raglite.WithAPIKey(cfg.APIKey))
	if err != nil {
		return err
	}
	c.client = client
	return nil
}

func (c *CTRag) CreateDataset(ctx context.Context) (string, error) {
	dataset, err := c.client.Datasets.Create(ctx, &raglite.CreateDatasetRequest{
		Name: uuid.NewString(),
	})
	if err != nil {
		return "", err
	}
	c.logger.WithContext(ctx).With("dataset_id", dataset.ID).Debug("create dataset success")
	return dataset.ID, nil
}

func (c *CTRag) UpdateDataset(ctx context.Context, datasetID string, req UpdateDatasetReq) error {
	_, err := c.client.Datasets.Update(ctx, datasetID, &raglite.UpdateDatasetRequest{})
	if err != nil {
		return err
	}
	c.logger.WithContext(ctx).With("dataset_id", datasetID).Debug("update dataset success")
	return nil
}

func (c *CTRag) UpsertRecords(ctx context.Context, req UpsertRecordsReq) (string, error) {
	logger := c.logger.WithContext(ctx).With("dataset_id", req.DatasetID).With("rag_id", req.DocumentID)
	logger.Debug("upsert records")
	data := &raglite.UploadDocumentRequest{
		DatasetID:  req.DatasetID,
		DocumentID: req.DocumentID,
		File:       strings.NewReader(req.Content),
		Filename:   fmt.Sprintf("%s.md", uuid.NewString()),
		Metadata:   req.Metadata.Map(),
		Tags:       req.Tags,
	}
	doc, err := c.client.Documents.Upload(ctx, data)
	if err != nil {
		return "", err
	}
	logger.With("doc_id", doc.DocumentID).Debug("upload document success")
	return doc.DocumentID, nil
}

func (c *CTRag) QueryRecords(ctx context.Context, req QueryRecordsReq) (string, []*model.NodeContentChunk, error) {
	if req.TopK == 0 {
		req.TopK = 10
	}
	res, err := c.client.Search.Retrieve(ctx, &raglite.RetrieveRequest{
		DatasetID:           req.DatasetID,
		Query:               req.Query,
		TopK:                req.TopK,
		Metadata:            req.Metadata.Map(),
		Tags:                req.Tags,
		SimilarityThreshold: req.SimilarityThreshold,
		MaxChunksPerDoc:     req.MaxChunksPerDoc,
	})
	if err != nil {
		return "", nil, err
	}
	nodes := make([]*model.NodeContentChunk, 0, len(res.Results))
	for _, chunk := range res.Results {
		nodes = append(nodes, &model.NodeContentChunk{
			ID:         chunk.ChunkID,
			Content:    chunk.Content,
			DocID:      chunk.DocumentID,
			Similarity: chunk.Score,
		})
	}
	c.logger.WithContext(ctx).
		With("dataset_id", req.DatasetID).
		With("query", req.Query).
		With("tags", req.Tags).
		With("nodes_len", len(nodes)).
		Debug("query records success")

	return res.Query, nodes, nil
}

func (c *CTRag) DeleteRecords(ctx context.Context, datasetID string, docIDs []string) error {
	if err := c.client.Documents.BatchDelete(ctx, &raglite.BatchDeleteDocumentsRequest{
		DatasetID:   datasetID,
		DocumentIDs: docIDs,
	}); err != nil {
		return err
	}
	c.logger.WithContext(ctx).With("dataset_id", datasetID).With("doc_ids", docIDs).Debug("delete documents success")
	return nil
}

func (c *CTRag) DeleteDataset(ctx context.Context, datasetID string) error {
	if err := c.client.Datasets.Delete(ctx, datasetID); err != nil {
		return err
	}
	c.logger.WithContext(ctx).With("dataset_id", datasetID).Debug("delete dataset success")
	return nil
}

func (c *CTRag) UpdateDocumentGroupIDs(ctx context.Context, datasetID string, docID string, groupIds []int) error {
	if _, err := c.client.Documents.Update(ctx, &raglite.UpdateDocumentRequest{
		DatasetID:  datasetID,
		DocumentID: docID,
		Metadata: map[string]any{
			"group_ids": groupIds,
		},
	}); err != nil {
		return err
	}
	c.logger.WithContext(ctx).With("dataset_id", datasetID).With("doc_id", docID).With("group_ids", groupIds).Debug("update document group ids success")
	return nil
}

func (c *CTRag) GetModelList(ctx context.Context) ([]*model.LLM, error) {
	list, err := c.client.Models.List(ctx, &raglite.ListModelsRequest{})
	if err != nil {
		return nil, err
	}
	models := make([]*model.LLM, 0, len(list.Models))
	for _, item := range list.Models {
		models = append(models, &model.LLM{
			RagID:    item.ID,
			Model:    item.Name,
			Provider: item.Provider,
			BaseURL:  item.Config.APIBase,
			APIKey:   item.Config.APIKey,
			Type:     model.LLMType(item.ModelType),
		})
	}
	return models, nil
}

func (c *CTRag) AddModel(ctx context.Context, model *model.LLM) (string, error) {
	modelConfig, err := c.client.Models.Create(ctx, &raglite.CreateModelRequest{
		Name:        model.Model,
		Description: model.ShowName,
		Provider:    model.Provider,
		ModelName:   model.Model,
		ModelType:   string(model.Type),
		Config: raglite.AIModelConfig{
			APIBase:         model.BaseURL,
			APIKey:          model.APIKey,
			MaxTokens:       raglite.Ptr(8192),
			ExtraParameters: model.Parameters.Map(),
		},
		IsDefault: true,
	})
	if err != nil {
		return "", err
	}
	c.logger.WithContext(ctx).With("model_id", modelConfig.ID).Debug("create model success")
	return modelConfig.ID, nil
}

func (c *CTRag) UpdateModel(ctx context.Context, model *model.LLM) error {
	_, err := c.client.Models.Update(ctx, model.RagID, &raglite.UpdateModelRequest{
		Name:     raglite.Ptr(model.Model),
		Provider: raglite.Ptr(model.Provider),
		Config: &raglite.AIModelConfig{
			APIBase:         model.BaseURL,
			APIKey:          model.APIKey,
			MaxTokens:       raglite.Ptr(8192),
			ExtraParameters: model.Parameters.Map(),
		},
	})
	if err != nil {
		return err
	}
	c.logger.WithContext(ctx).With("model_id", model.RagID).Debug("update model success")
	return err
}

func (c *CTRag) DeleteModel(ctx context.Context, model *model.LLM) error {
	if err := c.client.Models.Delete(ctx, model.RagID); err != nil {
		return err
	}
	c.logger.WithContext(ctx).With("model_id", model.RagID).Debug("delete model success")
	return nil
}

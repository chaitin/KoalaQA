package rag

import (
	"context"
	"fmt"
	"os"

	"github.com/chaitin/koalaqa/model"
	"github.com/chaitin/koalaqa/pkg/config"
	"github.com/chaitin/koalaqa/pkg/glog"
	"github.com/chaitin/pandawiki/sdk/rag"
	"github.com/google/uuid"
)

type CTRag struct {
	logger *glog.Logger
	client *rag.Client
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
	c.client = rag.New(cfg.BaseURL, cfg.APIKey)
	return nil
}

func (c *CTRag) CreateDataset(ctx context.Context) (string, error) {
	dataset, err := c.client.CreateDataset(ctx, rag.CreateDatasetRequest{
		Name: uuid.NewString(),
	})
	if err != nil {
		return "", err
	}
	c.logger.WithContext(ctx).With("dataset_id", dataset.ID).Debug("create dataset success")
	return dataset.ID, nil
}

func (c *CTRag) UpsertRecords(ctx context.Context, datasetID string, content string, groupIDs []int) (string, error) {
	tempFile, err := os.CreateTemp("", "*.md")
	if err != nil {
		return "", fmt.Errorf("create temp file failed: %w", err)
	}
	defer os.Remove(tempFile.Name())
	_, err = tempFile.WriteString(content)
	if err != nil {
		return "", fmt.Errorf("write temp file failed: %w", err)
	}
	defer tempFile.Close()
	c.logger.WithContext(ctx).With("dataset_id", datasetID).With("group_ids", groupIDs).Debug("upload document text")
	docs, err := c.client.UploadDocumentsAndParse(ctx, datasetID, []string{tempFile.Name()}, groupIDs)
	if err != nil {
		return "", fmt.Errorf("upload document text failed: %w", err)
	}
	if len(docs) == 0 {
		return "", fmt.Errorf("no docs found")
	}
	c.logger.WithContext(ctx).With("dataset_id", datasetID).With("group_ids", groupIDs).With("doc_id", docs[0].ID).Debug("upload document success")
	return docs[0].ID, nil
}

func (c *CTRag) QueryRecords(ctx context.Context, datasetIDs []string, query string, groupIDs []int) ([]*model.NodeContentChunk, error) {
	chunks, _, err := c.client.RetrieveChunks(ctx, rag.RetrievalRequest{
		DatasetIDs:             datasetIDs,
		Question:               query,
		TopK:                   10,
		UserGroupIDs:           groupIDs,
		SimilarityThreshold:    0.2,
		VectorSimilarityWeight: 0.2,
	})
	if err != nil {
		return nil, err
	}
	nodes := make([]*model.NodeContentChunk, 0, len(chunks))
	for _, chunk := range chunks {
		nodes = append(nodes, &model.NodeContentChunk{
			ID:      chunk.ID,
			Content: chunk.Content,
			DocID:   chunk.DocumentID,
		})
	}
	c.logger.WithContext(ctx).
		With("dataset_ids", datasetIDs).
		With("query", query).
		With("group_ids", groupIDs).
		With("nodes_len", len(nodes)).
		Debug("query records success")
	return nodes, nil
}

func (c *CTRag) DeleteRecords(ctx context.Context, datasetID string, docIDs []string) error {
	if err := c.client.DeleteDocuments(ctx, datasetID, docIDs); err != nil {
		return err
	}
	c.logger.WithContext(ctx).With("dataset_id", datasetID).With("doc_ids", docIDs).Debug("delete documents success")
	return nil
}

func (c *CTRag) DeleteDataset(ctx context.Context, datasetID string) error {
	if err := c.client.DeleteDatasets(ctx, []string{datasetID}); err != nil {
		return err
	}
	c.logger.WithContext(ctx).With("dataset_id", datasetID).Debug("delete dataset success")
	return nil
}

func (c *CTRag) UpdateDocumentGroupIDs(ctx context.Context, datasetID string, docID string, groupIds []int) error {
	if err := c.client.UpdateDocumentGroupIDs(ctx, datasetID, docID, groupIds); err != nil {
		return err
	}
	c.logger.WithContext(ctx).With("dataset_id", datasetID).With("doc_id", docID).With("group_ids", groupIds).Debug("update document group ids success")
	return nil
}

func (c *CTRag) GetModelList(ctx context.Context) ([]*model.LLM, error) {
	list, err := c.client.GetModelConfigList(ctx)
	if err != nil {
		return nil, err
	}
	models := make([]*model.LLM, 0, len(list))
	for _, item := range list {
		models = append(models, &model.LLM{
			RagID:    item.ID,
			Model:    item.Name,
			Provider: item.Provider,
			BaseURL:  item.ApiBase,
			APIKey:   item.ApiKey,
			Type:     model.LLMType(item.TaskType),
		})
	}
	return models, nil
}

func (c *CTRag) AddModel(ctx context.Context, model *model.LLM) (string, error) {
	cfg, err := model.Parameters.Bytes()
	if err != nil {
		return "", err
	}
	addReq := rag.AddModelConfigRequest{
		Name:      model.Model,
		Provider:  model.Provider,
		TaskType:  string(model.Type),
		ApiBase:   model.BaseURL,
		ApiKey:    model.APIKey,
		MaxTokens: 8192,
		IsDefault: true,
		Enabled:   true,
		Config:    cfg,
	}
	modelConfig, err := c.client.AddModelConfig(ctx, addReq)
	if err != nil {
		return "", err
	}
	c.logger.WithContext(ctx).With("model_id", modelConfig.ID).Debug("add model success")
	return modelConfig.ID, nil
}

func (c *CTRag) UpdateModel(ctx context.Context, model *model.LLM) error {
	cfg, err := model.Parameters.Bytes()
	if err != nil {
		return err
	}
	updateReq := rag.AddModelConfigRequest{
		Name:      model.Model,
		Provider:  model.Provider,
		TaskType:  string(model.Type),
		ApiBase:   model.BaseURL,
		ApiKey:    model.APIKey,
		MaxTokens: 8192,
		IsDefault: true,
		Enabled:   true,
		Config:    cfg,
	}
	_, err = c.client.AddModelConfig(ctx, updateReq)
	if err != nil {
		return err
	}
	c.logger.WithContext(ctx).With("model_id", model.RagID).Debug("update model success")
	return err
}

func (c *CTRag) DeleteModel(ctx context.Context, model *model.LLM) error {
	if err := c.client.DeleteModelConfig(ctx, []rag.ModelItem{
		{
			Name:    model.Model,
			ApiBase: model.BaseURL,
		},
	}); err != nil {
		return err
	}
	c.logger.WithContext(ctx).With("model_id", model.RagID).Debug("delete model success")
	return nil
}

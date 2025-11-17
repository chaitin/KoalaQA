package rag

import (
	"context"

	"github.com/chaitin/koalaqa/model"
)

type QueryRecordsReq struct {
	DatasetID           string  `json:"dataset_ids,omitempty"`
	Query               string  `json:"query,omitempty"`
	GroupIDs            []int   `json:"group_ids,omitempty"`
	TopK                int     `json:"top_k,omitempty"`
	SimilarityThreshold float64 `json:"similarity_threshold,omitempty"`
}

type UpdateDatasetReq struct {
	ParserConfig ParserConfig `json:"parser_config,omitempty"`
}

type ParserConfig struct {
}

type Service interface {
	CreateDataset(ctx context.Context) (string, error)
	UpdateDataset(ctx context.Context, datasetID string, req UpdateDatasetReq) error
	UpsertRecords(ctx context.Context, datasetID string, ragID string, content string, groupIDs []int) (string, error)
	QueryRecords(ctx context.Context, req QueryRecordsReq) ([]*model.NodeContentChunk, error)
	DeleteRecords(ctx context.Context, datasetID string, docIDs []string) error
	DeleteDataset(ctx context.Context, datasetID string) error
	UpdateDocumentGroupIDs(ctx context.Context, datasetID string, docID string, groupIds []int) error

	GetModelList(ctx context.Context) ([]*model.LLM, error)
	AddModel(ctx context.Context, model *model.LLM) (string, error)
	UpdateModel(ctx context.Context, model *model.LLM) error
	DeleteModel(ctx context.Context, model *model.LLM) error
}

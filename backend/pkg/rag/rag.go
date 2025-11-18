package rag

import (
	"context"

	"github.com/chaitin/koalaqa/model"
)

type QueryRecordsReq struct {
	DatasetID           string   `json:"dataset_ids,omitempty"`
	Query               string   `json:"query,omitempty"`
	TopK                int      `json:"top_k,omitempty"`
	Tags                []string `json:"tags,omitempty"`
	SimilarityThreshold float64  `json:"similarity_threshold,omitempty"`
}

type UpdateDatasetReq struct {
	ParserConfig ParserConfig `json:"parser_config,omitempty"`
}

type ParserConfig struct {
}

type UpsertRecordsReq struct {
	DatasetID  string   `json:"dataset_id,omitempty"`
	DocumentID string   `json:"document_id,omitempty"`
	Content    string   `json:"content,omitempty"`
	Tags       []string `json:"tags,omitempty"`
}

type Service interface {
	CreateDataset(ctx context.Context) (string, error)
	UpdateDataset(ctx context.Context, datasetID string, req UpdateDatasetReq) error
	UpsertRecords(ctx context.Context, req UpsertRecordsReq) (string, error)
	QueryRecords(ctx context.Context, req QueryRecordsReq) ([]*model.NodeContentChunk, error)
	DeleteRecords(ctx context.Context, datasetID string, docIDs []string) error
	DeleteDataset(ctx context.Context, datasetID string) error
	UpdateDocumentGroupIDs(ctx context.Context, datasetID string, docID string, groupIds []int) error

	GetModelList(ctx context.Context) ([]*model.LLM, error)
	AddModel(ctx context.Context, model *model.LLM) (string, error)
	UpdateModel(ctx context.Context, model *model.LLM) error
	DeleteModel(ctx context.Context, model *model.LLM) error
}

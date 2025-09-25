package rag

import (
	"context"

	"github.com/chaitin/koalaqa/model"
)

type QueryRecordsReq struct {
	DatasetIDs          []string
	Query               string
	GroupIDs            []int
	TopK                int
	SimilarityThreshold float64
}

type Service interface {
	CreateDataset(ctx context.Context) (string, error)
	UpsertRecords(ctx context.Context, datasetID string, content string, groupIDs []int) (string, error)
	QueryRecords(ctx context.Context, req QueryRecordsReq) ([]*model.NodeContentChunk, error)
	DeleteRecords(ctx context.Context, datasetID string, docIDs []string) error
	DeleteDataset(ctx context.Context, datasetID string) error
	UpdateDocumentGroupIDs(ctx context.Context, datasetID string, docID string, groupIds []int) error

	GetModelList(ctx context.Context) ([]*model.LLM, error)
	AddModel(ctx context.Context, model *model.LLM) (string, error)
	UpdateModel(ctx context.Context, model *model.LLM) error
	DeleteModel(ctx context.Context, model *model.LLM) error
}

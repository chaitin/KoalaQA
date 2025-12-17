package rag

import (
	"context"

	"github.com/chaitin/koalaqa/model"
)

type QueryRecordsReq struct {
	DatasetID           string   `json:"dataset_ids,omitempty"`
	Query               string   `json:"query,omitempty"`
	TopK                int      `json:"top_k,omitempty"`
	Metadata            Metadata `json:"metadata,omitempty"`
	Tags                []string `json:"tags,omitempty"`
	SimilarityThreshold float64  `json:"similarity_threshold,omitempty"`
	MaxChunksPerDoc     int      `json:"max_chunks_per_doc,omitempty"`
}

type UpdateDatasetReq struct {
	ParserConfig ParserConfig `json:"parser_config,omitempty"`
}

type ParserConfig struct {
}

type Metadata struct {
	model.DiscMetadata
}

func (m *Metadata) Map() map[string]interface{} {
	var result = make(map[string]interface{})
	// 避免写个 null 进去
	if m.GroupIDs != nil {
		result["group_ids"] = m.GroupIDs
	}
	if m.TagIDs != nil {
		result["tag_ids"] = m.TagIDs
	}
	if m.DiscussType != "" {
		result["discuss_type"] = m.DiscussType
	}
	if m.DiscussState != model.DiscussionStateUnknown {
		result["discuss_state"] = m.DiscussState
	}

	return result
}

type UpsertRecordsReq struct {
	DatasetID       string   `json:"dataset_id,omitempty"`
	DocumentID      string   `json:"document_id,omitempty"`
	Content         string   `json:"content,omitempty"`
	Metadata        Metadata `json:"metadata,omitempty"`
	Tags            []string `json:"tags,omitempty"`
	ExtractKeywords bool     `json:"extract_keywords,omitempty"`
}

type Service interface {
	CreateDataset(ctx context.Context) (string, error)
	UpdateDataset(ctx context.Context, datasetID string, req UpdateDatasetReq) error
	UpsertRecords(ctx context.Context, req UpsertRecordsReq) (string, error)
	QueryRecords(ctx context.Context, req QueryRecordsReq) (string, []*model.NodeContentChunk, error)
	DeleteRecords(ctx context.Context, datasetID string, docIDs []string) error
	DeleteDataset(ctx context.Context, datasetID string) error
	UpdateDocumentMetadata(ctx context.Context, datasetID string, docID string, metadata Metadata) error

	GetModelList(ctx context.Context) ([]*model.LLM, error)
	AddModel(ctx context.Context, model *model.LLM) (string, error)
	UpdateModel(ctx context.Context, model *model.LLM) error
	DeleteModel(ctx context.Context, model *model.LLM) error
}

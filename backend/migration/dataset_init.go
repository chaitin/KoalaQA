package migration

import (
	"context"
	"errors"
	"fmt"
	"time"

	"github.com/chaitin/koalaqa/migration/migrator"
	"github.com/chaitin/koalaqa/model"
	"github.com/chaitin/koalaqa/pkg/rag"
	"github.com/chaitin/koalaqa/pkg/retry"
	"github.com/chaitin/koalaqa/repo"
	"gorm.io/gorm"
)

type datasetInit struct {
	rag  rag.Service
	repo *repo.Dataset
	llm  *repo.LLM
}

func (m *datasetInit) Version() int64 {
	return 20250829172630
}

func (m *datasetInit) Migrate(tx *gorm.DB) error {
	if err := m.initRagDB(tx); err != nil {
		return fmt.Errorf("init rag db failed: %w", err)
	}
	if err := m.initEmbeddingLLM(); err != nil {
		return fmt.Errorf("init embedding llm failed: %w", err)
	}
	if err := m.initDataset(tx, model.DatasetBackend); err != nil {
		return fmt.Errorf("init backend dataset failed: %w", err)
	}
	if err := m.initDataset(tx, model.DatasetFrontend); err != nil {
		return fmt.Errorf("init frontend dataset failed: %w", err)
	}
	return nil
}

func (m *datasetInit) initDataset(tx *gorm.DB, name string) error {
	var dataset model.Dataset
	err := tx.Model(&model.Dataset{}).Where("name = ?", name).First(&dataset).Error
	if err == nil {
		m.repo.SetID(name, dataset.SetID)
		return nil
	}
	if errors.Is(err, gorm.ErrRecordNotFound) {
		id, err := m.rag.CreateDataset(context.Background())
		if err != nil {
			return err
		}
		m.repo.SetID(name, id)
		return tx.Model(&model.Dataset{}).Create(&model.Dataset{
			Name:  name,
			SetID: id,
		}).Error
	}
	return err
}

func (m *datasetInit) initRagDB(tx *gorm.DB) error {
	sqlDB, err := tx.DB()
	if err != nil {
		return err
	}
	var exists bool
	err = sqlDB.QueryRow("SELECT EXISTS(SELECT 1 FROM pg_database WHERE datname = 'raglite')").Scan(&exists)
	if err != nil {
		return err
	}
	if exists {
		return nil
	}
	_, err = sqlDB.Exec("CREATE DATABASE raglite")
	return err
}

func (m *datasetInit) initEmbeddingLLM() error {
	var count int64
	err := m.llm.Count(context.Background(), &count)
	if err != nil {
		return err
	}
	if count > 0 {
		return nil
	}
	sharedKey := "sk-r8tmBtcU1JotPDPnlgZLOY4Z6Dbb7FufcSeTkFpRWA5v4Llr"
	baseURL := "https://model-square.app.baizhi.cloud/v1"
	err = retry.WithExponentialBackoff(func() error {
		_, err := m.rag.GetModelList(context.Background())
		return err
	}, 10, 100*time.Millisecond, 10*time.Second)
	if err != nil {
		return err
	}
	embeddingModel := &model.LLM{
		Provider:   "BaiZhiCloud",
		Model:      "bge-m3",
		APIKey:     sharedKey,
		APIHeader:  "",
		BaseURL:    baseURL,
		APIVersion: "",
		Type:       model.LLMTypeDense,
	}
	eid, err := m.rag.AddModel(context.Background(), embeddingModel)
	if err != nil {
		return err
	}
	embeddingModel.RagID = eid
	err = m.llm.Create(context.Background(), embeddingModel)
	if err != nil {
		return err
	}
	rerankModel := &model.LLM{
		Provider:   "BaiZhiCloud",
		Model:      "bge-reranker-v2-m3",
		APIKey:     sharedKey,
		APIHeader:  "",
		BaseURL:    baseURL,
		APIVersion: "",
		Type:       model.LLMTypeReranker,
	}
	rid, err := m.rag.AddModel(context.Background(), rerankModel)
	if err != nil {
		return err
	}
	rerankModel.RagID = rid
	err = m.llm.Create(context.Background(), rerankModel)
	if err != nil {
		return err
	}
	return nil
}

func newDatasetInit(rag rag.Service, repo *repo.Dataset, llm *repo.LLM) migrator.Migrator {
	return &datasetInit{rag: rag, repo: repo, llm: llm}
}

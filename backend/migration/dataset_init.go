package migration

import (
	"context"
	"errors"
	"fmt"

	"github.com/chaitin/koalaqa/migration/migrator"
	"github.com/chaitin/koalaqa/model"
	"github.com/chaitin/koalaqa/pkg/rag"
	"github.com/chaitin/koalaqa/repo"
	"gorm.io/gorm"
)

type datasetInit struct {
	rag  rag.Service
	repo *repo.Dataset
}

func (m *datasetInit) Version() int64 {
	return 20250829172630
}

func (m *datasetInit) Migrate(tx *gorm.DB) error {
	if err := m.initRagDB(tx); err != nil {
		return fmt.Errorf("init rag db failed: %w", err)
	}
	if err := m.initDataset(tx, model.DatasetBackend); err != nil {
		return fmt.Errorf("init backend dataset failed: %w", err)
	}
	if err := m.initDataset(tx, model.DatasetFrontend); err != nil {
		return fmt.Errorf("init frontend dataset failed: %w", err)
	}
	if err := m.initDataset(tx, model.DatasetRank); err != nil {
		return fmt.Errorf("init rank dataset failed: %w", err)
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

func newDatasetInit(rag rag.Service, repo *repo.Dataset) migrator.Migrator {
	return &datasetInit{rag: rag, repo: repo}
}

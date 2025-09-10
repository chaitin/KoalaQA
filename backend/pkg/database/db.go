package database

import (
	"time"

	"github.com/chaitin/koalaqa/pkg/config"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
	gormLogger "gorm.io/gorm/logger"
)

type DB = gorm.DB

type Scope = func(*DB) *DB

var ErrRecordNotFound = gorm.ErrRecordNotFound

func newDB(cfg config.Config, logger gormLogger.Interface) (*DB, error) {
	gormConfig := &gorm.Config{
		AllowGlobalUpdate: false,
		Logger:            logger.LogMode(gormLogger.Silent),
	}

	if cfg.DB.Debug {
		gormConfig.Logger = logger.LogMode(gormLogger.Info)
	}

	db, err := gorm.Open(postgres.New(postgres.Config{
		DSN:                  cfg.DB.DSN,
		PreferSimpleProtocol: true,
	}), gormConfig)
	if err != nil {
		return nil, err
	}

	sqlDB, err := db.DB()
	if err != nil {
		return nil, err
	}

	sqlDB.SetMaxIdleConns(cfg.DB.MaxIdleConns)
	sqlDB.SetMaxOpenConns(cfg.DB.MaxOpenConns)
	sqlDB.SetConnMaxLifetime(time.Duration(cfg.DB.ConnMaxLifetime) * time.Second)
	sqlDB.SetConnMaxIdleTime(time.Duration(cfg.DB.ConnMaxIdleTime) * time.Second)

	return db, nil
}

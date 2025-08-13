package model

const MigrationKeyDB = "db"

type Migration struct {
	Base

	Key     string `gorm:"column:key;uniqueIndex"`
	Version int64  `gorm:"column:version"`
}

func init() {
	registerAutoMigrate(&Migration{})
}

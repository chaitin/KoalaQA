package model

var (
	DatasetBackend  = "backend"
	DatasetFrontend = "frontend"
	DatasetRank     = "rank"
)

type Dataset struct {
	Base

	Name  string `json:"name" gorm:"uniqueIndex"`
	SetID string `json:"set_id"`
}

func init() {
	registerAutoMigrate(&Dataset{})
}

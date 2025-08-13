package model

var DatasetBackend = "backend"
var DatasetFrontend = "frontend"

type Dataset struct {
	Base

	Name  string `json:"name" gorm:"uniqueIndex"`
	SetID string `json:"set_id"`
}

func init() {
	registerAutoMigrate(&Dataset{})
}

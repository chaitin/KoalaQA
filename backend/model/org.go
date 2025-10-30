package model

type Org struct {
	Base

	Name string `json:"name" gorm:"cloumn:name;type:text"`
}

func init() {
	registerAutoMigrate(&Org{})
}

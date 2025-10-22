package model

type Forum struct {
	Base

	Name string `gorm:"column:name;type:text"`
}

func init() {
	registerAutoMigrate(&Forum{})
}

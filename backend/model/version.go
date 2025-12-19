package model

type Version struct {
	Base

	Version string `gorm:"column:version;type:text;uniqueIndex"`
}

func init() {
	registerAutoMigrate(&Version{})
}

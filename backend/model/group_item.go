package model

type GroupItem struct {
	Base

	GroupID uint   `gorm:"column:group_id"`
	Index   uint   `gorm:"column:index"`
	Name    string `gorm:"column:name;type:text"`
}

func init() {
	registerAutoMigrate(&GroupItem{})
}

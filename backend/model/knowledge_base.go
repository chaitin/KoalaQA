package model

type KnowledgeBase struct {
	Base

	Name string `gorm:"column:name;type:text"`
	Desc string `gorm:"column:desc;type:text"`
}

func init() {
	registerAutoMigrate(&KnowledgeBase{})
}

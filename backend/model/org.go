package model

type Org struct {
	Base

	Builtin  bool       `json:"builtin" gorm:"column:builtin"`
	Name     string     `json:"name" gorm:"column:name;type:text"`
	ForumIDs Int64Array `json:"forum_ids" gorm:"column:forum_ids;type:bigint[]"`
}

func init() {
	registerAutoMigrate(&Org{})
}

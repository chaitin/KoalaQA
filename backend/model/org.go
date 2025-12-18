package model

type OrgType uint

const (
	OrgTypeNormal OrgType = iota
	OrgTypeDefault
	OrgTypeAdmin
)

type Org struct {
	Base

	Builtin  bool       `json:"builtin" gorm:"column:builtin"`
	Name     string     `json:"name" gorm:"column:name;type:text"`
	ForumIDs Int64Array `json:"forum_ids" gorm:"column:forum_ids;type:bigint[]"`
	Type     OrgType    `json:"type" gorm:"column:type;default:0"`
}

func init() {
	registerAutoMigrate(&Org{})
}

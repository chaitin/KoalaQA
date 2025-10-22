package model

type Forum struct {
	Base

	Index     uint       `json:"index" gorm:"column:index"`
	Name      string     `json:"name" gorm:"column:name;"`
	GroupIDs  Int64Array `json:"group_ids" gorm:"column:group_ids;type:bigint[]"`
	DatasetID string     `json:"-" gorm:"column:dataset_id;type:text;uniqueIndex"`
}

type ForumInfo struct {
	ID       uint       `json:"id"`
	Index    uint       `json:"index"`
	Name     string     `json:"name"`
	GroupIDs Int64Array `json:"group_ids" gorm:"type:bigint[]"`
}

func init() {
	registerAutoMigrate(&Forum{})
}

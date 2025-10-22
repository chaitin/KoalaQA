package model

type Group struct {
	Base

	Index   uint   `gorm:"column:index"`
	Name    string `gorm:"column:name;type:text"`
	ForumID uint   `gorm:"column:forum_id;not null;default:0;index"`
}

type GroupItemInfo struct {
	ID    uint   `json:"id"`
	Name  string `json:"name"`
	Index uint   `json:"index"`
}
type GroupWithItem struct {
	ID    uint                   `json:"id"`
	Name  string                 `json:"name"`
	Index uint                   `json:"index"`
	Items JSONB[[]GroupItemInfo] `json:"items" swaggerignore:"true"`
}

func init() {
	registerAutoMigrate(&Group{})
}

package model

type Forum struct {
	Base

	Index     uint   `json:"index" gorm:"column:index"`
	Name      string `json:"name" gorm:"column:name;"`
	RouteName string `json:"route_name" gorm:"column:route_name;default:null;uniqueIndex"`
	// Deprecated: only use in migration
	GroupIDs         Int64Array           `json:"group_ids" gorm:"column:group_ids;type:bigint[]"`
	Groups           JSONB[[]ForumGroups] `json:"groups" gorm:"column:groups;type:jsonb"`
	BlogIDs          Int64Array           `json:"blog_ids" gorm:"column:blog_ids;type:bigint[]"`
	DatasetID        string               `json:"-" gorm:"column:dataset_id;type:text;uniqueIndex"`
	InsightDatasetID string               `json:"-" gorm:"column:insight_dataset_id;type:text;uniqueIndex"`
}

type ForumGroups struct {
	Type     DiscussionType `json:"type"`
	GroupIDs Int64Array     `json:"group_ids"`
}

type ForumInfo struct {
	ID        uint                 `json:"id"`
	Index     uint                 `json:"index"`
	Name      string               `json:"name" binding:"required"`
	RouteName string               `json:"route_name"`
	BlogIDs   Int64Array           `json:"blog_ids" gorm:"type:bigint[]"`
	Groups    JSONB[[]ForumGroups] `json:"groups" gorm:"type:jsonb"`
}

func init() {
	registerAutoMigrate(&Forum{})
}

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
	TagEnabled       bool                 `json:"tag_enabled" gorm:"column:tag_enabled;default:false"`
	TagIDs           Int64Array           `json:"tag_ids" gorm:"column:tag_ids;type:bigint[]"`
	Links            JSONB[ForumLinks]    `json:"links" gorm:"column:links;type:jsonb"`
	DatasetID        string               `json:"-" gorm:"column:dataset_id;type:text;uniqueIndex"`
	InsightDatasetID string               `json:"-" gorm:"column:insight_dataset_id;type:text;uniqueIndex"`
}

type ForumGroups struct {
	Type     DiscussionType `json:"type"`
	GroupIDs Int64Array     `json:"group_ids"`
}

type ForumLinks struct {
	Enabled bool        `json:"enabled"`
	Links   []ForumLink `json:"links"`
}

type ForumLink struct {
	Name    string `json:"name"`
	Address string `json:"address"`
}

type ForumInfo struct {
	ID         uint                 `json:"id"`
	Index      uint                 `json:"index"`
	Name       string               `json:"name" binding:"required"`
	RouteName  string               `json:"route_name"`
	BlogIDs    Int64Array           `json:"blog_ids" gorm:"type:bigint[]"`
	TagEnabled bool                 `json:"tag_enabled"`
	TagIDs     Int64Array           `json:"tag_ids" gorm:"type:bigint[]"`
	Groups     JSONB[[]ForumGroups] `json:"groups" gorm:"type:jsonb"`
	Links      JSONB[ForumLinks]    `json:"links" gorm:"type:jsonb"`
}

func init() {
	registerAutoMigrate(&Forum{})
}

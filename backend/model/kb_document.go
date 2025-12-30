package model

import (
	"github.com/chaitin/koalaqa/pkg/anydoc/platform"
)

type DocStatus uint

const (
	DocStatusUnknown DocStatus = iota
	DocStatusApplySuccess
	DocStatusPendingReview
	DocStatusPendingApply
	DocStatusApplyFailed
	DocStatusAppling
	DocStatusPendingExport
	DocStatusExportSuccess
	DocStatusExportFailed
)

type DocType uint

const (
	DocTypeUnknown DocType = iota
	DocTypeQuestion
	DocTypeDocument
	DocTypeSpace
	DocTypeWeb
)

type FileType uint

const (
	FileTypeUnknown FileType = iota
	FileTypeMarkdown
	FileTypeHTML
	FileTypeJSON
	FileTypeURL
	FileTypeDOCX
	FileTypeDOC
	FileTypePPTX
	FileTypeXLSX
	FileTypeXLS
	FileTypePDF
	FileTypeImage
	FileTypeCSV
	FileTypeXML
	FileTypeZIP
	FileTypeEPub
	FileTypeFolder // 文件夹
	FileTypeFile   // 未知文件类型
	FileTypeMax
)

type PlatformOpt struct {
	URL          string `json:"url,omitempty"`
	AppID        string `json:"app_id,omitempty"`
	Secret       string `json:"secret,omitempty"`
	AccessToken  string `json:"access_token,omitempty"`
	RefreshToken string `json:"refresh_token,omitempty"`
	Username     string `json:"username,omitempty"`
	UserThirdID  string `json:"user_third_id,omitempty"`
	Phone        string `json:"phone,omitempty"`
}

type ExportOpt struct {
	SpaceID  string `json:"space_id,omitempty"`
	FileType string `json:"file_type,omitempty"`
}

type KBDocument struct {
	Base

	KBID         uint                  `json:"kb_id" gorm:"column:kb_id;index"`
	RagID        string                `json:"rag_id" gorm:"column:rag_id;index"`
	Platform     platform.PlatformType `json:"platform" gorm:"column:platform"`
	PlatformOpt  JSONB[PlatformOpt]    `json:"platform_opt" gorm:"column:platform_opt;type:jsonb"`
	ExportOpt    JSONB[ExportOpt]      `json:"export_opt" gorm:"column:export_opt;type:jsonb"`
	ExportTaskID string                `json:"export_task_id" gorm:"column:export_task_id;type:text;uniqueIndex;default:null"`
	DocID        string                `json:"doc_id" gorm:"column:doc_id;type:text"`
	Title        string                `json:"title" gorm:"column:title;type:text"`
	Desc         string                `json:"desc" gorm:"column:desc;type:text"`
	Markdown     []byte                `json:"markdown" gorm:"column:markdown;type:bytea"`
	JSON         []byte                `json:"json" gorm:"column:json;type:bytea"`
	FileType     FileType              `json:"file_type" gorm:"column:file_type"`
	DocType      DocType               `json:"doc_type" gorm:"column:doc_type"`
	Status       DocStatus             `json:"status" gorm:"column:status"`
	ParentID     uint                  `json:"parent_id" gorm:"column:parent_id;type:bigint;default:0"`
	SimilarID    uint                  `json:"similar_id" gorm:"column:similar_id;type:bigint;default:0"`
	Message      string                `json:"message" gorm:"column:message;type:text"`
	GroupIDs     Int64Array            `json:"group_ids" gorm:"column:group_ids;type:bigint[]"`
}

func (d *KBDocument) Metadata() KBDocMetadata {
	return KBDocMetadata{
		DocType:  d.DocType,
		Platform: d.Platform,
		FileType: d.FileType,
		GroupIDs: d.GroupIDs,
	}
}

type KBDocMetadata struct {
	DocType  DocType               `json:"doc_type,omitempty"`
	Platform platform.PlatformType `json:"platform,omitempty"`
	FileType FileType              `json:"file_type,omitempty"`
	GroupIDs Int64Array            `json:"group_ids,omitempty"`
}

func (d KBDocMetadata) Map() map[string]any {
	result := make(map[string]any)

	if d.DocType != DocTypeUnknown {
		result["doc_type"] = d.DocType
	}

	if d.FileType != FileTypeUnknown {
		result["file_type"] = d.FileType
	}

	if d.Platform != platform.PlatformUnknown {
		result["platform"] = d.Platform
	}

	if len(d.GroupIDs) > 0 {
		result["group_ids"] = d.GroupIDs
	}

	return result
}

type KBDocumentDetail struct {
	KBDocument
	Markdown string `json:"markdown"`
	JSON     string `json:"json"`
}

func init() {
	registerAutoMigrate(&KBDocument{})
}

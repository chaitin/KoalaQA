package model

type WebhookType uint

const (
	WebhookTypeDingtalk = iota + 1
	WebhookTypeHTTP
)

type Webhook struct {
	Base

	Name string `gorm:"column:name;type:text" json:"name"`
	WebhookConfig
}

type WebhookConfig struct {
	Type     WebhookType `gorm:"column:type" json:"type" binding:"required,min=1,max=1"`
	URL      string      `gorm:"column:url;type:text" json:"url" binding:"required,http_url"`
	Sign     string      `gorm:"column:sign;type:text" json:"sign"`
	MsgTypes Int64Array  `gorm:"column:msg_types;type:bigint[]" json:"msg_types"`
}

func init() {
	registerAutoMigrate(&Webhook{})
}

package model

type MessageNotifySubType uint

const (
	MessageNotifySubTypeUnknown MessageNotifySubType = iota
	MessageNotifySubTypeDingtalk
	MessageNotifySubTypeWechatOfficialAccount
)

type MessageNotifySubInfo struct {
	ClientID     string `json:"client_id"`
	ClientSecret string `json:"client_secret"`
	TemplateID   string `json:"template_id"`
	Token        string `json:"token"`
	AESKey       string `json:"aes_key"`
}

func (m MessageNotifySubInfo) Equal(d MessageNotifySubInfo) bool {
	return m == d
}

type MessageNotifySub struct {
	Base

	Type    MessageNotifySubType        `json:"type" gorm:"column:type;uniqueIndex"`
	Enabled bool                        `json:"enabled" gorm:"column:enabled;default:false"`
	Info    JSONB[MessageNotifySubInfo] `json:"info" gorm:"column:info;type:jsonb" swaggerignore:"true"`
}

func init() {
	registerAutoMigrate(&MessageNotifySub{})
}

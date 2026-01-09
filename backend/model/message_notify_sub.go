package model

type MessageNotifySubType uint

const (
	MessageNotifySubTypeUnknown MessageNotifySubType = iota
	MessageNotifySubTypeDingtalk
)

type MessageNotifySubInfo struct {
	ClientID     string `json:"client_id"`
	ClientSecret string `json:"client_secret"`
	RobotCode    string `json:"robot_code"`
}

func (m MessageNotifySubInfo) Equal(d MessageNotifySubInfo) bool {
	return m.ClientID == d.ClientID && m.ClientSecret == d.ClientSecret && m.RobotCode == d.RobotCode
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

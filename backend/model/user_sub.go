package model

type UserNotiySub struct {
	Base

	Type      MessageNotifySubType `json:"type" gorm:"column:type;uniqueIndex:udx_user_notify_sub_type_user"`
	UserID    uint                 `json:"user_id" gorm:"column:user_id;uniqueIndex:udx_user_notify_sub_type_user"`
	ThirdID   string               `json:"third_id" gorm:"column:third_id;type:text"`
	ThirdName string               `json:"third_name" gorm:"column:third_name;type:text"`
}

func init() {
	registerAutoMigrate(&UserNotiySub{})
}

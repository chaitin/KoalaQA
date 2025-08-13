package model

type UserThird struct {
	Base

	UserID  uint     `gorm:"column:user_id;uniqueIndex:udx_user_thirds_user_third_type"`
	ThirdID string   `gorm:"column:third_id;type:text;uniqueIndex:udx_user_thirds_user_third_type"`
	Type    AuthType `gorm:"column:type;uniqueIndex:udx_user_thirds_user_third_type"`
}

func init() {
	registerAutoMigrate(&UserThird{})
}

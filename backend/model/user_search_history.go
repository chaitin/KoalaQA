package model

type UserSearchHistory struct {
	Base

	UserID   uint     `gorm:"column:user_id;index" json:"user_id"`
	Username string   `gorm:"column:username" json:"username"`
	UserRole UserRole `gorm:"column:user_role" json:"user_role"`
	Keyword  string   `gorm:"column:keyword" json:"keyword"`
}

func init() {
	registerAutoMigrate(&UserSearchHistory{})
}

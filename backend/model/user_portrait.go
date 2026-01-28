package model

type UserPortrait struct {
	Base
	UserID    uint   `gorm:"column:user_id;index" json:"user_id"`
	Content   string `gorm:"content;type:text" json:"content"`
	CreatedBy uint   `gorm:"column:created_by;index" json:"created_by"`
}

func init() {
	registerAutoMigrate(&UserPortrait{})
}

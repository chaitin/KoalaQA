package model

type APIToken struct {
	Base

	Name  string `gorm:"column:name;type:text" json:"name"`
	Token string `gorm:"column:token;type:text;index" json:"token"`
}

func init() {
	registerAutoMigrate(&APIToken{})
}

package model

type UserRole uint

const (
	UserRoleUnknown UserRole = iota
	UserRoleAdmin
	UserRoleOperator
	UserRoleUser
	UserRoleMax
)

type User struct {
	Base

	Name      string    `gorm:"column:name;type:text" json:"name"`
	Email     string    `gorm:"column:email;type:text;default:null;uniqueIndex" json:"email"`
	Avatar    string    `gorm:"column:avatar;type:text" json:"avatar"`
	Builtin   bool      `gorm:"column:builtin" json:"builtin"`
	Password  string    `gorm:"column:password;type:text" json:"password"`
	Role      UserRole  `gorm:"column:role" json:"role"`
	LastLogin Timestamp `gorm:"column:last_login;type:timestamp with time zone" json:"last_login"`
	Invisible bool      `gorm:"column:invisible"`
	Key       string    `gorm:"column:key;type:text;uniqueIndex"`
}

type UserInfo struct {
	UID      uint     `json:"uid"`
	Role     UserRole `json:"role"`
	Email    string   `json:"email"`
	Username string   `json:"username"`
	Key      string   `json:"key"`
}

func (ui *UserInfo) IsAdmin() bool {
	return ui.Role == UserRoleAdmin
}

func init() {
	registerAutoMigrate(&User{})
}

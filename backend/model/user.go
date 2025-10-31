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

	OrgIDs    Int64Array `gorm:"column:org_ids;type:bigint[]" json:"org_ids"`
	Name      string     `gorm:"column:name;type:text" json:"name"`
	Email     string     `gorm:"column:email;type:text;default:null;uniqueIndex" json:"email"`
	Avatar    string     `gorm:"column:avatar;type:text" json:"avatar"`
	Builtin   bool       `gorm:"column:builtin" json:"builtin"`
	Password  string     `gorm:"column:password;type:text" json:"password"`
	Role      UserRole   `gorm:"column:role" json:"role"`
	LastLogin Timestamp  `gorm:"column:last_login;type:timestamp with time zone" json:"last_login"`
	Invisible bool       `gorm:"column:invisible"`
	Key       string     `gorm:"column:key;type:text;uniqueIndex"`
}

type UserCore struct {
	UID uint   `json:"uid"`
	Key string `json:"key"`
}

type UserInfo struct {
	UserCore
	OrgIDs   Int64Array `json:"org_ids"`
	Role     UserRole   `json:"role"`
	Email    string     `json:"email"`
	Username string     `json:"username"`
	Avatar   string     `json:"avatar"`
	Builtin  bool       `json:"builtin"`
}

func (ui *UserInfo) IsAdmin() bool {
	return ui.Role == UserRoleAdmin
}

func (ui *UserInfo) CanOperator(uid uint) bool {
	return ui.Role == UserRoleOperator || ui.Role == UserRoleAdmin || ui.UID == uid
}

func init() {
	registerAutoMigrate(&User{})
}

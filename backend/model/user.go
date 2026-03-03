package model

type UserRole uint

const (
	UserRoleUnknown UserRole = iota
	UserRoleAdmin
	UserRoleOperator
	UserRoleUser
	UserRoleGuest
	UserRoleMax
)

type User struct {
	Base
	UserBasic

	Password  string    `gorm:"column:password;type:text" json:"password"`
	LastLogin Timestamp `gorm:"column:last_login;type:timestamp with time zone" json:"last_login"`
	Invisible bool      `gorm:"column:invisible"`
	Key       string    `gorm:"column:key;type:text;uniqueIndex"`
}

type UserCore struct {
	UID      uint     `json:"uid"`
	AuthType AuthType `json:"auth_type"`
	Cors     bool     `json:"cors"`
	Key      string   `json:"key"`
	Salt     string   `json:"salt"`
}

type UserBasic struct {
	OrgIDs     Int64Array `gorm:"column:org_ids;type:bigint[]" json:"org_ids"`
	Role       UserRole   `gorm:"column:role" json:"role"`
	Email      string     `gorm:"column:email;type:text;default:null;uniqueIndex" json:"email"`
	Name       string     `gorm:"column:name;type:text" json:"username"` // username: 为了兼容之前的参数名
	Intro      string     `gorm:"column:intro;type:text" json:"intro"`
	Avatar     string     `gorm:"column:avatar;type:text" json:"avatar"`
	Builtin    bool       `gorm:"column:builtin" json:"builtin"`
	Point      uint       `gorm:"column:point;type:bigint;default:0" json:"point"`
	WebNotify  bool       `gorm:"column:web_notify" json:"web_notify"`
	BlockUntil int64      `gorm:"column:block_until;type:bigint" json:"block_until"`
}

type UserInfo struct {
	UserCore
	UserBasic

	NoPassword bool `json:"no_password"`
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

package model

import (
	"github.com/chaitin/koalaqa/pkg/util"
)

type System[T any] struct {
	Base

	Key   string   `gorm:"column:key;type:text;uniqueIndex"`
	Value JSONB[T] `gorm:"column:value;type:jsonb"`
}

func (System[T]) TableName() string {
	return "systems"
}

func init() {
	registerAutoMigrate(&System[any]{})
}

const (
	SystemKeyPublicAddress = "public_address"
	SystemKeyAuth          = "auth"
	SystemKeyMachineID     = "machine_id"
	SystemKeyBrand         = "brand"
	SystemKeyDiscussion    = "discussion"
	SystemKeySEO           = "seo"
)

type PublicAddress struct {
	Address string `json:"address" binding:"required,http_url"`
}

func (s PublicAddress) FullURL(p string) string {
	u, err := util.ParseHTTP(s.Address)
	if err != nil {
		return ""
	}

	u.Path = p
	return u.String()
}

type AuthType uint

const (
	AuthTypeFree = iota
	AuthTypePassword
	AuthTypeOIDC
	AuthTypeWeCom
	AuthTypeWechat
	AuthTypeDingtalk
)

type AuthInfo struct {
	Type       AuthType   `json:"type" binding:"min=1,max=4"`
	Config     AuthConfig `json:"config"`
	ButtonDesc string     `json:"button_desc"`
}

type Auth struct {
	EnableRegister bool   `json:"enable_register"`
	NeedReview     bool   `json:"need_review"`
	PublicAccess   bool   `json:"public_access"`
	Prompt         string `json:"prompt"`
	// Deprecated: only use in migration
	PublicForumIDs []uint     `json:"public_forum_ids"`
	AuthInfos      []AuthInfo `json:"auth_infos" binding:"omitempty,dive"`
}

func (a *Auth) CanAuth(t AuthType) bool {
	for _, info := range a.AuthInfos {
		if info.Type == t {
			return true
		}
	}

	return false
}

type AuthConfig struct {
	Oauth AuthConfigOauth `json:"oauth"`
}

type AuthConfigOauth struct {
	URL          string `json:"url,omitempty"`
	ClientID     string `json:"client_id,omitempty"`
	ClientSecret string `json:"client_secret,omitempty"`
	CorpID       string `json:"corp_id,omitempty"`
}

type SystemBrand struct {
	Logo  string `json:"logo"`
	Text  string `json:"text"`
	Theme string `json:"theme"`
}

type SystemDiscussion struct {
	AutoClose          uint   `json:"auto_close"`
	ContentPlaceholder string `json:"content_placeholder"`
}

type SystemSEO struct {
	Desc     string   `json:"desc"`
	Keywords []string `json:"keywords"`
}

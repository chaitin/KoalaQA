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
	SystemKeyWebPlugin     = "web_plugin"
	SystemKeyChatDingtalk  = "chat_dingtalk"
	SystemKeyChatWecom     = "chat_wecom"
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
	Type           AuthType   `json:"type" binding:"min=1,max=4"`
	Config         AuthConfig `json:"config"`
	ButtonDesc     string     `json:"button_desc"`
	EnableRegister bool       `json:"enable_register"`
}

type Auth struct {
	// Deprecated: move to AuthInfo, only use in migration
	EnableRegister bool   `json:"enable_register"`
	NeedReview     bool   `json:"need_review"`
	PublicAccess   bool   `json:"public_access"`
	Prompt         string `json:"prompt"`
	// Deprecated: only use in migration
	PublicForumIDs []uint     `json:"public_forum_ids"`
	AuthInfos      []AuthInfo `json:"auth_infos" binding:"omitempty,dive"`
}

func (a *Auth) CanRegister(typ AuthType) bool {
	for _, info := range a.AuthInfos {
		if info.Type != typ {
			continue
		}

		return info.EnableRegister
	}

	return false
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

type SystemWebPlugin struct {
	Enabled bool `json:"enabled"`
	Display bool `json:"display"`
	Plugin  bool `json:"plugin"`
}

type SystemChat struct {
	Enabled bool             `json:"enabled"`
	Config  SystemChatConfig `json:"config"`
}

type SystemChatConfig struct {
	ClientID     string `json:"client_id"`
	ClientSecret string `json:"client_secret"`
	TemplateID   string `json:"template_id"`
	CorpID       string `json:"corp_id"`
	Token        string `json:"client_token"`
	AESKey       string `json:"aes_key"`
}

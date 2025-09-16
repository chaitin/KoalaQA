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
)

type PublicAddress struct {
	Address string `json:"address" binding:"required,http_url"`
}

func (s PublicAddress) FullURL(p string) (string, error) {
	u, err := util.ParseHTTP(s.Address)
	if err != nil {
		return "", err
	}

	u.Path = p
	return u.String(), nil
}

type AuthType uint

const (
	AuthTypePassword = iota + 1
	AuthTypeOIDC
)

type AuthInfo struct {
	Type   AuthType   `json:"type" binding:"min=1,max=2"`
	Config AuthConfig `json:"config"`
}

type Auth struct {
	EnableRegister bool       `json:"enable_register"`
	PublicAccess   bool       `json:"public_access"`
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
}

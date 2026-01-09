package third_auth

import (
	"context"
	"encoding/binary"
	"fmt"

	"github.com/chaitin/koalaqa/model"
	"github.com/chaitin/koalaqa/pkg/util"
)

type CallbackURLFunc func(ctx context.Context, path string) (string, error)

type Config struct {
	Config      model.AuthConfig
	CallbackURL CallbackURLFunc
}

type User struct {
	ThirdID string
	Email   string
	Type    model.AuthType
	Name    string
	Avatar  string
	Mobile  string
	Role    model.UserRole
}

func (u *User) HashInt() int {
	return int(binary.BigEndian.Uint64(util.MD5(fmt.Sprintf("%s|%d", u.ThirdID, u.Type))))
}

type authURLOpt struct {
	APP          bool
	CallbackPath string
}

type authURLOptFunc func(o *authURLOpt)

func AuthURLInAPP(app bool) authURLOptFunc {
	return func(o *authURLOpt) {
		o.APP = app
	}
}

func AuthURLCallbackPath(p string) authURLOptFunc {
	return func(o *authURLOpt) {
		o.CallbackPath = p
	}
}

func getAuthURLOpt(funcs ...authURLOptFunc) authURLOpt {
	var o authURLOpt

	for _, f := range funcs {
		f(&o)
	}
	return o
}

type ThirdIDKey uint

const (
	ThirdIDKeyOpenID ThirdIDKey = iota
	ThirdIDKeyUnionID
	ThirdIDKeyUserID
)

type userOpt struct {
	ThirdIDKey ThirdIDKey
}

type userOptFunc func(o *userOpt)

func UserWithThirdIDKey(key ThirdIDKey) userOptFunc {
	return func(o *userOpt) {
		o.ThirdIDKey = key
	}
}

func getUserOpt(funcs ...userOptFunc) userOpt {
	var o userOpt

	for _, f := range funcs {
		f(&o)
	}
	return o
}

type Author interface {
	Check(ctx context.Context) error
	AuthURL(ctx context.Context, state string, optFuncs ...authURLOptFunc) (string, error)
	User(ctx context.Context, code string, optFuncs ...userOptFunc) (*User, error)
}

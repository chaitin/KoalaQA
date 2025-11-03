package third_auth

import (
	"context"
	"encoding/binary"
	"fmt"

	"github.com/chaitin/koalaqa/model"
	"github.com/chaitin/koalaqa/pkg/util"
)

type Config struct {
	Config      model.AuthConfig
	CallbackURL string
}

type User struct {
	ThirdID string
	Email   string
	Type    model.AuthType
	Name    string
	Role    model.UserRole
}

func (u *User) HashInt() int {
	return int(binary.BigEndian.Uint64(util.MD5(fmt.Sprintf("%s|%d", u.ThirdID, u.Type))))
}

type userOpt struct{}

type userOptFunc func(o *userOpt)

func getUserOpt(funcs ...userOptFunc) userOpt {
	var o userOpt

	for _, f := range funcs {
		f(&o)
	}
	return o
}

type Author interface {
	Check(ctx context.Context) error
	AuthURL(ctx context.Context, state string, redirect string) (string, error)
	User(ctx context.Context, code string, optFuncs ...userOptFunc) (*User, error)
}

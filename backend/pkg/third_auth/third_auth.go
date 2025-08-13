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

func (u *User) HashUint() uint64 {
	return binary.BigEndian.Uint64(util.MD5(fmt.Sprintf("%s|%d", u.ThirdID, u.Type)))
}

type userOpt struct {
	state string
}

type userOptFunc func(o *userOpt)

func UserWithState(state string) userOptFunc {
	return func(o *userOpt) {
		o.state = state
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
	AuthURL(ctx context.Context) (string, error)
	User(ctx context.Context, code string, optFuncs ...userOptFunc) (*User, error)
}

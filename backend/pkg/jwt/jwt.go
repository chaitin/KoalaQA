package jwt

import (
	"context"
	"fmt"
	"time"

	"github.com/chaitin/koalaqa/model"
	"github.com/chaitin/koalaqa/pkg/config"
	"github.com/chaitin/koalaqa/pkg/glog"
	"github.com/golang-jwt/jwt/v4"
)

type Claims struct {
	model.UserCore
	jwt.RegisteredClaims `json:"-"`
}

type Generator struct {
	cfg    config.JWT
	logger *glog.Logger
}

func newGenerator(cfg config.Config) *Generator {
	return &Generator{
		cfg:    cfg.JWT,
		logger: glog.Module("jwt"),
	}
}

// Gen 生成 jwt
// pwd 当前用户是否使用密码登录
// tfa 当前用户是否使用 tfa 登录
func (g *Generator) Gen(ctx context.Context, userCore model.UserCore) (string, error) {
	g.logger.WithContext(ctx).With("claims_info", userCore).Debug("begin generate jwt")
	t := jwt.NewWithClaims(jwt.SigningMethodHS256, Claims{
		userCore,
		jwt.RegisteredClaims{
			Issuer:    "chaitin-koala",
			ExpiresAt: jwt.NewNumericDate(time.Now().Add(time.Duration(g.cfg.Expire) * time.Second)),
			IssuedAt:  jwt.NewNumericDate(time.Now()),
		},
	})

	s, err := t.SignedString([]byte(g.cfg.Secret))
	if err != nil {
		return "", err
	}

	return s, nil

}

func (g *Generator) Verify(token string) (*model.UserCore, error) {
	var claims Claims
	_, err := jwt.ParseWithClaims(token, &claims, func(t *jwt.Token) (interface{}, error) {
		if t.Method.Alg() != jwt.SigningMethodHS256.Alg() {
			return nil, fmt.Errorf("unexpected signing method: %v", t.Header["alg"])
		}

		return []byte(g.cfg.Secret), nil
	})
	if err != nil {
		return nil, err
	}

	return &claims.UserCore, nil
}

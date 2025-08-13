package anydoc

import (
	"github.com/chaitin/koalaqa/pkg/anydoc/platform"
	"go.uber.org/fx"
)

func Module() fx.Option {
	return fx.Options(
		fx.Options(platform.Modules...),
		fx.Provide(newAnydoc),
	)
}

package platform

import "go.uber.org/fx"

var Modules []fx.Option

func register(i interface{}) {
	Modules = append(Modules, fx.Provide(fx.Annotated{
		Group:  "anydoc_platforms",
		Target: i,
	}))
}

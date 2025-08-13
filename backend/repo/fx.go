package repo

import (
	"reflect"

	"go.uber.org/fx"
)

func Module() fx.Option {
	return fx.Options(modules...)
}

var modules []fx.Option

func register(m any) {
	if reflect.TypeOf(m).Kind() != reflect.Func {
		panic("register data is not func")
	}
	modules = append(modules, fx.Provide(m))
}

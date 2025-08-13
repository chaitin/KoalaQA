package svc

import (
	"fmt"
	"reflect"

	"go.uber.org/fx"
)

var modules []fx.Option

func registerSvc(i interface{}) {
	if reflect.TypeOf(i).Kind() != reflect.Func {
		panic(fmt.Sprintf("%v is not func", i))
	}
	modules = append(modules, fx.Provide(i))
}

func svcModule() fx.Option {
	return fx.Options(
		modules...,
	)
}

func Module() fx.Option {
	return fx.Options(
		svcModule(),
	)
}

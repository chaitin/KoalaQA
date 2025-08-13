package util

import (
	"fmt"
	"reflect"

	"go.uber.org/fx"
)

func ProvideGroup(group string, r any) fx.Option {
	if reflect.TypeOf(r).Kind() != reflect.Func {
		panic(fmt.Sprintf("%v is not func", r))
	}

	return fx.Provide(fx.Annotated{
		Group:  group,
		Target: r,
	})
}

package util

import "reflect"

func IsNil(a any) bool {
	if a == nil {
		return true
	}
	v := reflect.ValueOf(a)
	switch v.Kind() {
	case reflect.Ptr, reflect.Map, reflect.Slice, reflect.Chan, reflect.Func, reflect.Interface:
		return v.IsNil()
	default:
		return false
	}
}

func ArrayToMap[T any](arr []T, key func(T) string) map[string]T {
	m := make(map[string]T)
	for _, v := range arr {
		m[key(v)] = v
	}
	return m
}

package util

import "strings"

func EscapeLike(data string) string {
	return strings.ReplaceAll(strings.ReplaceAll(data, "%", `\%`), "_", `\_`)
}

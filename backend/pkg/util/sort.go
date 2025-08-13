package util

import (
	"sort"
)

func SortByKeys[T any](items []T, keys []string, key func(T) string) []T {
	if len(items) == 0 {
		return items
	}

	keyIndex := make(map[string]int)
	for i, key := range keys {
		keyIndex[key] = i
	}

	result := make([]T, len(items))
	copy(result, items)

	sort.Slice(result, func(i, j int) bool {
		indexI, existsI := keyIndex[key(result[i])]
		indexJ, existsJ := keyIndex[key(result[j])]

		if !existsI && !existsJ {
			return false
		}
		if !existsI {
			return false
		}
		if !existsJ {
			return true
		}
		return indexI < indexJ
	})

	return result
}

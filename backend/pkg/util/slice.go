package util

func RemoveDuplicate[T comparable](s []T) []T {
	m := make(map[T]struct{})

	newS := make([]T, 0, len(s))
	for _, v := range s {
		if _, ok := m[v]; ok {
			continue
		}

		m[v] = struct{}{}
		newS = append(newS, v)
	}
	return newS
}

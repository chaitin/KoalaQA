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

func Intersect[T comparable](a, b []T) []T {
	m := make(map[T]bool)
	for _, v := range a {
		m[v] = true
	}

	res := make([]T, 0)
	for _, v := range b {
		if !m[v] {
			continue
		}

		res = append(res, v)
	}

	return res
}

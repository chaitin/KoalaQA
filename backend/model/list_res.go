package model

type ListRes[T any] struct {
	Total int64 `json:"total"`
	Items []T   `json:"items" swaggerignore:"true"`
}

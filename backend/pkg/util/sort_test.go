package util

import "testing"

func TestSortByKeys(t *testing.T) {
	type Item struct {
		ID   string
		Name string
	}
	items := []Item{{ID: "a", Name: "a"}, {ID: "b", Name: "b"}, {ID: "c", Name: "c"}}
	keys := []string{"b", "c", "a"}
	result := SortByKeys(items, keys, func(item Item) string {
		return item.ID
	})
	if result[0].ID != "b" || result[1].ID != "c" || result[2].ID != "a" {
		t.Fatal("sort by keys failed")
	}
}

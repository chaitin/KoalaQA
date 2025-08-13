package util

import "testing"

func TestRemoveDuplicate(t *testing.T) {
	n := RemoveDuplicate([]int{1, 1, 1, 1, 1, 1, 2})

	if len(n) != 2 {
		t.Fatal("remove array failed")
	}
}

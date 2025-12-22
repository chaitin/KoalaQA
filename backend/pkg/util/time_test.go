package util

import (
	"testing"
	"time"
)

func TestWeekTrunc(t *testing.T) {
	tests := [][2]string{
		{"2025-12-22", "2025-12-22"},
		{"2025-12-21", "2025-12-15"},
		{"2025-12-20", "2025-12-15"},
		{"2025-12-23", "2025-12-22"},
	}

	for _, s := range tests {
		src, _ := time.Parse(time.DateOnly, s[0])
		dst, _ := time.Parse(time.DateOnly, s[1])

		if !WeekTrunc(src).Equal(dst) {
			t.Errorf("%s is not equal %s", s[0], s[1])
		}
	}
}

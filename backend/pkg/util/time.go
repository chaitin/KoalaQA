package util

import (
	"time"
)

func TodayTrunc() time.Time {
	return DayTrunc(time.Now())
}

func DayTrunc(t time.Time) time.Time {
	return time.Date(t.Year(), t.Month(), t.Day(), 0, 0, 0, 0, t.Location())
}

// WeekTrunc 周一才是一周的开始
func WeekTrunc(t time.Time) time.Time {
	day := int(t.Weekday())

	if day == 0 {
		day = 7
	}

	monday := t.AddDate(0, 0, 1-day)
	return DayTrunc(monday)
}

func HourTrunc(t time.Time) time.Time {
	return time.Date(t.Year(), t.Month(), t.Day(), t.Hour(), 0, 0, 0, t.Location())
}

func MonthTrunc(t time.Time) time.Time {
	return time.Date(t.Year(), t.Month(), 0, 0, 0, 0, 0, t.Location())
}

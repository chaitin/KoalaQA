package util

import "time"

func TodayZero() time.Time {
	return DayZero(time.Now())
}

func DayZero(t time.Time) time.Time {
	return time.Date(t.Year(), t.Month(), t.Day(), 0, 0, 0, 0, t.Location())
}

func WeekZero(t time.Time) time.Time {
	monday := t.AddDate(0, 0, -int(t.Weekday()))
	return DayZero(monday)
}

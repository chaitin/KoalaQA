package util

import "time"

func TodayTrunc() time.Time {
	return DayTrunc(time.Now())
}

func DayTrunc(t time.Time) time.Time {
	return time.Date(t.Year(), t.Month(), t.Day(), 0, 0, 0, 0, t.Location())
}

func WeekTrunc(t time.Time) time.Time {
	monday := t.AddDate(0, 0, -int(t.Weekday()))
	return DayTrunc(monday)
}

func HourTrunc(t time.Time) time.Time {
	return time.Date(t.Year(), t.Month(), t.Day(), t.Hour(), 0, 0, 0, t.Location())
}

func MonthTrunc(t time.Time) time.Time {
	return time.Date(t.Year(), t.Month(), 0, 0, 0, 0, 0, t.Location())
}

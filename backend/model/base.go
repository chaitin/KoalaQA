package model

import (
	"database/sql/driver"
	"encoding/json"
	"fmt"
	"time"
)

type Base struct {
	ID        uint      `gorm:"primarykey" json:"id"`
	CreatedAt Timestamp `gorm:"type:timestamp with time zone" json:"created_at"`
	UpdatedAt Timestamp `gorm:"type:timestamp with time zone" json:"updated_at"`
}

func (b *Base) DBModel() {}

type DBModel interface {
	DBModel()
}

type JSONB[T any] struct {
	data T
}

func (j *JSONB[T]) MarshalJSON() ([]byte, error) {
	return json.Marshal(j.data)
}

func (j *JSONB[T]) UnmarshalJSON(data []byte) error {
	return json.Unmarshal(data, &j.data)
}

func (j *JSONB[T]) Inner() T {
	return j.data
}

func NewJSONB[T any](data T) JSONB[T] {
	return JSONB[T]{data: data}
}

func NewJSONBAny(data any) JSONB[any] {
	return JSONB[any]{data: data}
}

// Value implements the driver.Valuer interface for GORM
func (p JSONB[T]) Value() (driver.Value, error) {
	raw, err := json.Marshal(p.data)
	if err != nil {
		return nil, err
	}
	return string(raw), nil
}

// Scan implements the sql.Scanner interface for GORM
func (p *JSONB[T]) Scan(value interface{}) error {
	if value == nil {
		return nil
	}

	switch v := value.(type) {
	case []byte:
		return json.Unmarshal(v, &p.data)
	case string:
		return json.Unmarshal([]byte(v), &p.data)
	default:
		return fmt.Errorf("cannot scan %T into ModelParam", value)
	}
}

type Timestamp int64

// Value implements the driver.Valuer interface for GORM
func (p Timestamp) Value() (driver.Value, error) {
	return time.Unix(int64(p), 0), nil
}

// Scan implements the sql.Scanner interface for GORM
func (p *Timestamp) Scan(value interface{}) error {
	if value == nil {
		return nil
	}

	switch v := value.(type) {
	case time.Time:
		*p = Timestamp(v.Unix())
		return nil
	default:
		return fmt.Errorf("cannot scan %T into ModelParam", value)
	}
}

type Count[T any] struct {
	Key   T
	Count int64
}

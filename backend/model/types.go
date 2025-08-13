package model

import (
	"database/sql/driver"
	"encoding/json"
	"fmt"

	"github.com/lib/pq"
)

type Map[K comparable, V any] map[K]V

func (m *Map[K, V]) Scan(value interface{}) error {
	switch t := value.(type) {
	case []byte:
		return json.Unmarshal(t, m)
	case string:
		return json.Unmarshal([]byte(t), m)
	default:
		return fmt.Errorf("unsupported scan type: %T", value)
	}
}

func (m Map[K, V]) Value() (driver.Value, error) {
	v, err := json.Marshal(m)
	if err != nil {
		return nil, err
	}
	return string(v), nil
}

type MapArray[K comparable, V any] []Map[K, V]

func (m *MapArray[K, V]) Scan(value interface{}) error {
	switch t := value.(type) {
	case []byte:
		return json.Unmarshal(t, m)
	case string:
		return json.Unmarshal([]byte(t), m)
	default:
		return fmt.Errorf("unsupported scan type: %T", value)
	}
}

func (m MapArray[K, V]) Value() (driver.Value, error) {
	v, err := json.Marshal(m)
	if err != nil {
		return nil, err
	}
	return string(v), nil
}

type StringArray []string

func (s *StringArray) Scan(value interface{}) error {
	var sa pq.StringArray

	err := sa.Scan(value)
	if err != nil {
		return err
	}

	*s = []string(sa)

	if *s == nil {
		*s = make(StringArray, 0)
	}
	return nil
}

func (s StringArray) Value() (driver.Value, error) {
	return pq.StringArray(s).Value()
}

type Int64Array []int64

func (s *Int64Array) Scan(value interface{}) error {
	var ia pq.Int64Array
	err := ia.Scan(value)
	if err != nil {
		return err
	}
	*s = []int64(ia)

	if *s == nil {
		*s = make(Int64Array, 0)
	}
	return nil
}

func (s Int64Array) Value() (driver.Value, error) {
	return pq.Int64Array(s).Value()
}

type JSONStringArray []string

func (s *JSONStringArray) Scan(value interface{}) error {
	switch src := value.(type) {
	case []byte:
		err := json.Unmarshal(src, s)
		if err != nil {
			return err
		}
	case string:
		err := json.Unmarshal([]byte(src), s)
		if err != nil {
			return err
		}
	case nil:
	default:
		return fmt.Errorf("pq: cannot convert %T to JSONStringArray", value)
	}
	if *s == nil {
		*s = make(JSONStringArray, 0)
	}

	return nil
}

func (s JSONStringArray) Value() (driver.Value, error) {
	if s == nil {
		return nil, nil
	}
	marshalBytes, err := json.Marshal(s)
	if err != nil {
		return nil, err
	}
	return string(marshalBytes), nil
}

package model

import (
	"database/sql/driver"
	"encoding/json"
	"fmt"
)

type LLMModelParam struct {
	ContextWindow      int  `json:"context_window"`
	MaxTokens          int  `json:"max_tokens"`
	R1Enabled          bool `json:"r1_enabled"`
	SupportComputerUse bool `json:"support_computer_use"`
	SupportImages      bool `json:"support_images"`
	SupportPromptCache bool `json:"support_prompt_cache"`
}

func (p LLMModelParam) Bytes() ([]byte, error) {
	return json.Marshal(p)
}

// Value implements the driver.Valuer interface for GORM
func (p LLMModelParam) Value() (driver.Value, error) {
	raw, err := json.Marshal(p)
	if err != nil {
		return nil, err
	}
	return string(raw), nil
}

// Scan implements the sql.Scanner interface for GORM
func (p *LLMModelParam) Scan(value interface{}) error {
	if value == nil {
		return nil
	}

	switch v := value.(type) {
	case []byte:
		return json.Unmarshal(v, p)
	case string:
		return json.Unmarshal([]byte(v), p)
	default:
		return fmt.Errorf("cannot scan %T into ModelParam", value)
	}
}

type LLMType string

const (
	LLMTypeChat      LLMType = "chat"
	LLMTypeEmbedding LLMType = "embedding"
	LLMTypeRerank    LLMType = "rerank"
)

func (m LLMType) RagSupported() bool {
	return m == LLMTypeEmbedding || m == LLMTypeRerank
}

type LLM struct {
	Base

	RagID      string  `json:"rag_id"`
	Provider   string  `json:"provider"`
	Model      string  `json:"model"`
	APIKey     string  `json:"api_key"`
	APIHeader  string  `json:"api_header"`
	BaseURL    string  `json:"base_url"`
	APIVersion string  `json:"api_version"`
	ShowName   string  `json:"show_name"`
	Type       LLMType `json:"type" gorm:"default:chat;uniqueIndex"`

	IsActive bool `json:"is_active" gorm:"default:false"`

	PromptTokens     uint64 `json:"prompt_tokens" gorm:"default:0"`
	CompletionTokens uint64 `json:"completion_tokens" gorm:"default:0"`
	TotalTokens      uint64 `json:"total_tokens" gorm:"default:0"`

	Parameters LLMModelParam `json:"parameters" gorm:"column:parameters;type:jsonb"`
}

func init() {
	registerAutoMigrate(&LLM{})
}

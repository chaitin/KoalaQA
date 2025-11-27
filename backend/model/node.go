package model

type NodeType uint16

const (
	NodeTypeFolder   NodeType = 1
	NodeTypeDocument NodeType = 2
)

type NodeContentChunk struct {
	ID         string  `json:"id"`
	KBID       string  `json:"kb_id"`
	DocID      string  `json:"doc_id"`
	Content    string  `json:"content"`
	Similarity float64 `json:"similarity"`
}

type RankedNodeChunks struct {
	NodeID      uint
	NodeName    string
	NodeSummary string
	Chunks      []*NodeContentChunk
}

func (n RankedNodeChunks) GetURL() string {
	return ""
}

package topic

var (
	TopicKBDocumentRag = newTopic("koala.persistence.kb_document.rag.doc", true)
)

type MsgKBDocument struct {
	OP    OP     `json:"op"`
	KBID  uint   `json:"kb_id"`
	DocID uint   `json:"doc_id"`
	RagID string `json:"rag_id"`
}

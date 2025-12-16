package topic

var TopicKBSpace = newTopic("koala.persistence.kb_space.folder", true)

type MsgKBSpace struct {
	OP       OP   `json:"op"`
	KBID     uint `json:"kb_id"`
	FolderID uint `json:"doc_id"`
	DocID    uint `json:"folder_doc_id"`
}

package topic

var TopicKBSpace = newTopic("koala.persistence.kb_space.folder", true)

type KBSpaceUpdateType uint

const (
	KBSpaceUpdateTypeAll KBSpaceUpdateType = iota
	KBSpaceUpdateTypeIncr
	KBSpaceUpdateTypeFailed
)

type MsgKBSpace struct {
	OP         OP                `json:"op"`
	KBID       uint              `json:"kb_id"`
	FolderID   uint              `json:"doc_id"`
	UpdateType KBSpaceUpdateType `json:"update_type"`
}

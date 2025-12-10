package topic

import "github.com/chaitin/koalaqa/model"

var (
	TopicDiscChange  = newTopic("koala.persistence.discussion.change", true)
	TopicDiscReindex = newTopic("koala.persistence.disc.reindex", true)
)

type MsgDiscChange struct {
	OP       OP                   `json:"op"`
	ForumID  uint                 `json:"forum_id"`
	DiscID   uint                 `json:"disc_id"`
	DiscUUID string               `json:"disc_uuid"`
	UserID   uint                 `json:"user_id"`
	RagID    string               `json:"rag_id"`
	Type     model.DiscussionType `json:"type"`
}

type MsgDiscReindex struct {
	ForumID  uint                 `json:"forum_id"`
	DiscID   uint                 `json:"disc_id"`
	DiscUUID string               `json:"disc_uuid"`
	RagID    string               `json:"rag_id"`
	Type     model.DiscussionType `json:"type"`
}

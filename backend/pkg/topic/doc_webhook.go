package topic

import "github.com/chaitin/koalaqa/pkg/webhook/message"

var TopicDocWebhook = newTopic("koala.persistence.webhook.doc", true)

type MsgDocWebhook struct {
	MsgType message.Type `json:"action"`
	KBID    uint         `json:"kb_id"`
	DocID   uint         `json:"doc_id"`
}

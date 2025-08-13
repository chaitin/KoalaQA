package topic

import "github.com/chaitin/koalaqa/pkg/webhook/message"

var TopicDiscussWebhook = newTopic("koala.persistence.webhook.discuss", true)

type MsgDiscussWebhook struct {
	MsgType   message.Type `json:"action"`
	UserID    uint         `json:"user_id"`
	DiscussID uint         `json:"discuss_id"`
}

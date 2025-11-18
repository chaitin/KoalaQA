package topic

import "github.com/chaitin/koalaqa/model"

var TopicMessageNotify = newTopic("koala.persistence.message.notify", true)

type MsgMessageNotify struct {
	model.DiscussHeader
	model.UserReviewHeader

	ParentID  uint                `json:"parent_id"`
	CommentID uint                `json:"comment_id"`
	Type      model.MsgNotifyType `json:"type"`
	FromID    uint                `json:"from"`
	ToID      uint                `json:"to"`
}

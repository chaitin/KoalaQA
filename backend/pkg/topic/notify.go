package topic

import "github.com/chaitin/koalaqa/model"

var TopicMessageNotify = newTopic("koala.persistence.message.notify", true)

type MsgMessageNotify struct {
	DiscussID      uint                 `json:"discussid"`
	DiscussUUID    string               `json:"discuss_uuid"`
	DiscussTitle   string               `json:"doscuss_title"`
	DiscussionType model.DiscussionType `json:"discussion_type"`
	ForumID        uint                 `json:"forum_id"`
	ParentID       uint                 `json:"parent_id"`
	CommentID      uint                 `json:"comment_id"`
	Type           model.MsgNotifyType  `json:"type"`
	FromID         uint                 `json:"from"`
	ToID           uint                 `json:"to"`
}

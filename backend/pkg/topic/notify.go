package topic

import "github.com/chaitin/koalaqa/model"

var TopicMessageNotify = newTopic("koala.persistence.message.notify", true)

type MsgMessageNotify struct {
	DiscussID    uint                `json:"discussid"`
	DiscussUUID  string              `json:"discuss_uuid"`
	DiscussTitle string              `json:"doscuss_title"`
	Type         model.MsgNotifyType `json:"type"`
	FromID       uint                `json:"from"`
	ToID         uint                `json:"to"`
}

package topic

import "github.com/chaitin/koalaqa/model"

var TopicMessageNotify = newTopic("koala.persistence.message.notify", true)

type MsgNotifyUser struct {
	ID   uint   `json:"id"`
	Name string `json:"name"`
}

type MsgMessageNotify struct {
	DiscussID    uint                `json:"discussid"`
	DiscussUUID  string              `json:"discuss_uuid"`
	DiscussTitle string              `json:"doscuss_title"`
	Type         model.MsgNotifyType `json:"type"`
	From         MsgNotifyUser       `json:"from"`
	To           MsgNotifyUser       `json:"to"`
}

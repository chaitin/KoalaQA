package topic

import "github.com/chaitin/koalaqa/model"

var TopicUserPoint = newTopic("koala.persistence.user.point", true)

type MsgUserPoint struct {
	model.UserPointRecordInfo
	Revoke     bool `json:"revoke"`
	FromUserID uint `json:"from_user_id"`
}

package topic

import "github.com/chaitin/koalaqa/model"

var TopicAIInsight = newTopic("koala.persistence.ai.insight", true)

type MsgAIInsight struct {
	ForumID uint             `json:"forum_id"`
	Keyword string           `json:"keyword"`
	Exclude model.Int64Array `json:"exclude"`
}

package topic

var TopicAIInsight = newTopic("koala.persistence.ai.insight", true)

type MsgAIInsight struct {
	ForumID uint   `json:"forum_id"`
	Keyword string `json:"keyword"`
}

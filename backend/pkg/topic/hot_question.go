package topic

var TopicHotQuestion = newTopic("koala.persistence.ai_insight.hot_question", true)

type MsgHotQuestion struct {
	DiscUUID string `json:"disc_uuid"`
	Content  string `json:"content"`
}

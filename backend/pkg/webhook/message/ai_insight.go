package message

import (
	"bytes"
	"html/template"
	"time"

	"github.com/chaitin/koalaqa/model"
)

var aiInsightTpl = template.New("webhook_ai_insight")

func init() {
	var err error

	aiInsightTpl, err = aiInsightTpl.Parse(`{{ .TitlePrefix }} {{ .MsgTitle }} {{ .TitleSuffix }}

{{ .HeadingPrefix }}：{{ .Msg.Type }}

建议：AI 对这些问题理解不足，建议前往知识学习完善相关资料

[点击查看详情]({{ .Msg.URL }})`)
	if err != nil {
		panic(err)
	}
}

type commonAIInsight struct {
	Type string
	URL  string
}

type aiInsightMsg struct {
	Header

	Msg commonAIInsight
}

type sendAIInsightMsg struct {
	*aiInsightMsg

	platformMsg
}

func (i *aiInsightMsg) ID() string {
	return i.MsgTitle
}

func (i *aiInsightMsg) Message(webhookType model.WebhookType) (string, error) {
	var buff bytes.Buffer

	err := aiInsightTpl.Execute(&buff, sendAIInsightMsg{
		aiInsightMsg: i,
		platformMsg:  newPlatformMsg(webhookType),
	})
	if err != nil {
		return "", err
	}

	return buff.String(), nil
}

func (i *aiInsightMsg) Data() Data {
	return Data{
		Common: Common{
			Discussion: commonDiscussion{
				Title: i.Msg.Type,
				URL:   i.Msg.URL,
			},
		},
		Type:      i.MsgType,
		TypeDesc:  i.MsgTitle,
		Timestamp: time.Now().UnixMilli(),
	}
}

func NewAIInsightKnowledgeGap(path string) Message {
	return &aiInsightMsg{
		Header: Header{
			MsgType:       TypeAIInsightKnowledgeGap,
			MsgTitle:      "你有新的 AI 洞察",
			HeadingPrefix: "类型",
		},
		Msg: commonAIInsight{
			Type: "知识缺口",
			URL:  path,
		},
	}
}

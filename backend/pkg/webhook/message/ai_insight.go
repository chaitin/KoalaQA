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

建议：{{ .Msg.Suggest }}

[点击查看详情]({{ .Msg.URL }})`)
	if err != nil {
		panic(err)
	}
}

type commonAIInsight struct {
	Type    string
	URL     string
	Suggest string
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
	return i.Msg.Type
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

// 由于勾选项只有一个，所以使用同一类型
func NewAIInsightKnowledgeGap(path string) Message {
	return &aiInsightMsg{
		Header: Header{
			MsgType:       TypeAIInsight,
			MsgTitle:      "你有新的 AI 洞察",
			HeadingPrefix: "类型",
		},
		Msg: commonAIInsight{
			Type:    "知识缺口",
			URL:     path,
			Suggest: "AI 对这些问题理解不足，建议前往知识学习完善相关资料",
		},
	}
}

func NewAIInsightHotQuestion(path string) Message {
	return &aiInsightMsg{
		Header: Header{
			MsgType:       TypeAIInsight,
			MsgTitle:      "你有新的 AI 洞察",
			HeadingPrefix: "类型",
		},
		Msg: commonAIInsight{
			Type:    "热门问题",
			URL:     path,
			Suggest: "近期热门讨论问题，有助于快速聚焦当前核心用户痛点",
		},
	}
}

func NewAIInsightInvalidKnowledge(path string) Message {
	return &aiInsightMsg{
		Header: Header{
			MsgType:       TypeAIInsight,
			MsgTitle:      "你有新的 AI 洞察",
			HeadingPrefix: "类型",
		},
		Msg: commonAIInsight{
			Type:    "疑似失效知识",
			URL:     path,
			Suggest: "发现知识内容可能已不再准确或适用，建议尽快核实更新",
		},
	}
}

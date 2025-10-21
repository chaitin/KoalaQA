package message

import (
	"bytes"
	"strings"
	"text/template"
	"time"

	"github.com/chaitin/koalaqa/model"
)

var discussTpl = template.New("webhook_discuss")

func init() {
	var err error
	discussTpl, err = discussTpl.Funcs(template.FuncMap{
		"string_join": strings.Join,
	}).Parse(`{{ .TitlePrefix }} {{ .MsgTitle }} {{ .TitleSuffix }}
{{ .HeadingPrefix }}：{{ .Discussion.Title }}

分类：{{ string_join .Discussion.Groups "、" }}

用户：{{ .User.Name }}

[点击查看详情]({{ .Discussion.URL }})`)
	if err != nil {
		panic(err)
	}
}

type discussMsg struct {
	MsgType       Type
	MsgTitle      string
	HeadingPrefix string

	Common
}

type SendMsg struct {
	*discussMsg
	webhookMsg
}

func (d *discussMsg) Type() Type {
	return d.MsgType
}

func (d *discussMsg) Title() string {
	return d.MsgTitle
}

func (d *discussMsg) Message(webhookType model.WebhookType) (string, error) {
	var buff bytes.Buffer
	err := discussTpl.Execute(&buff, SendMsg{
		discussMsg: d,
		webhookMsg: newWebhookMsg(webhookType),
	})
	if err != nil {
		return "", err
	}

	return buff.String(), nil
}

func (d *discussMsg) Data() Data {
	return Data{
		Common:    d.Common,
		Type:      d.MsgType,
		TypeDesc:  d.MsgTitle,
		Timestamp: time.Now().UnixMilli(),
	}
}

func NewBotDislikeComment(body Common) Message {
	return &discussMsg{
		MsgType:       TypeDislikeBotComment,
		MsgTitle:      "不喜欢智能机器人的回答",
		HeadingPrefix: "问题",
		Common:        body,
	}
}

func NewBotUnknown(body Common) Message {
	return &discussMsg{
		MsgType:       TypeBotUnknown,
		MsgTitle:      "智能机器人无法解答问题",
		HeadingPrefix: "问题",
		Common:        body,
	}
}

func NewCreateQA(body Common) Message {
	return &discussMsg{
		MsgType:       TypeNewQA,
		MsgTitle:      "你有新的提问",
		HeadingPrefix: "提问",
		Common:        body,
	}
}

func NewCreateFeedback(body Common) Message {
	return &discussMsg{
		MsgType:       TypeNewFeedback,
		MsgTitle:      "你有新的反馈",
		HeadingPrefix: "反馈",
		Common:        body,
	}
}

func NewCreateBlog(body Common) Message {
	return &discussMsg{
		MsgType:       TypeNewBlog,
		MsgTitle:      "你有新的博客",
		HeadingPrefix: "博客",
		Common:        body,
	}
}

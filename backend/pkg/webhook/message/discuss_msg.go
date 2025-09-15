package message

import (
	"bytes"
	"text/template"

	"github.com/chaitin/koalaqa/model"
)

var discussDingtalkTpl = template.New("webhook_discuss_dingtalk")

func init() {
	var err error
	discussDingtalkTpl, err = discussDingtalkTpl.Parse(`{{ .TitlePrefix }} {{ .MsgTitle }} {{ .TitleSuffix }}
{{ .HeadingPrefix }}：{{ .Heading }}

分类：{{ .GroupItems }}

用户：{{ .Username }}

[点击查看详情]({{ .URL }})`)
	if err != nil {
		panic(err)
	}
}

type DiscussBody struct {
	Heading    string
	GroupItems string
	Username   string
	URL        string
}

type disscussMsg struct {
	MsgType       Type
	MsgTitle      string
	HeadingPrefix string

	DiscussBody
}

type SendMsg struct {
	*disscussMsg
	webhookMsg
}

func (d *disscussMsg) Type() Type {
	return d.MsgType
}

func (d *disscussMsg) Title() string {
	return d.MsgTitle
}

func (d *disscussMsg) Message(webhookType model.WebhookType) (string, error) {
	var buff bytes.Buffer
	err := discussDingtalkTpl.Execute(&buff, SendMsg{
		disscussMsg: d,
		webhookMsg:  newWebhookMsg(webhookType),
	})
	if err != nil {
		return "", err
	}

	return buff.String(), nil
}

func NewBotDislikeComment(body DiscussBody) Message {
	return &disscussMsg{
		MsgType:       TypeDislikeBotComment,
		MsgTitle:      "不喜欢智能机器人的回答",
		HeadingPrefix: "问题",
		DiscussBody:   body,
	}
}

func NewBotUnknown(body DiscussBody) Message {
	return &disscussMsg{
		MsgType:       TypeBotUnknown,
		MsgTitle:      "智能机器人无法解答问题",
		HeadingPrefix: "问题",
		DiscussBody:   body,
	}
}

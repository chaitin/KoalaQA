package message

import (
	"bytes"
	"strings"
	"text/template"
	"time"

	"github.com/chaitin/koalaqa/model"
)

var discussDingtalkTpl = template.New("webhook_discuss")

func init() {
	var err error
	discussDingtalkTpl, err = discussDingtalkTpl.Funcs(template.FuncMap{
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

type disscussMsg struct {
	MsgType       Type
	MsgTitle      string
	HeadingPrefix string

	Common
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

func (d *disscussMsg) Data() Data {
	return Data{
		Common:    d.Common,
		Type:      d.MsgType,
		TypeDesc:  d.MsgTitle,
		Timestamp: time.Now().UnixMilli(),
	}
}

func NewBotDislikeComment(body Common) Message {
	return &disscussMsg{
		MsgType:       TypeDislikeBotComment,
		MsgTitle:      "不喜欢智能机器人的回答",
		HeadingPrefix: "问题",
		Common:        body,
	}
}

func NewBotUnknown(body Common) Message {
	return &disscussMsg{
		MsgType:       TypeBotUnknown,
		MsgTitle:      "智能机器人无法解答问题",
		HeadingPrefix: "问题",
		Common:        body,
	}
}

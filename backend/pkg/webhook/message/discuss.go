package message

import (
	"bytes"
	"strconv"
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
	Header

	Common
}

type sendDiscussMsg struct {
	*discussMsg
	platformMsg
}

func (d *discussMsg) ID() string {
	return strconv.FormatUint(uint64(d.Common.Discussion.ID), 10)
}

func (d *discussMsg) Message(webhookType model.WebhookType) (string, error) {
	var buff bytes.Buffer
	err := discussTpl.Execute(&buff, sendDiscussMsg{
		discussMsg:  d,
		platformMsg: newPlatformMsg(webhookType),
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
		Header: Header{
			MsgType:       TypeDislikeBotComment,
			MsgTitle:      "不喜欢智能机器人的回答",
			HeadingPrefix: "问题",
		},
		Common: body,
	}
}

func NewBotUnknown(body Common) Message {
	return &discussMsg{
		Header: Header{
			MsgType:       TypeBotUnknown,
			MsgTitle:      "智能机器人无法解答问题",
			HeadingPrefix: "问题",
		},
		Common: body,
	}
}

func NewCreateQA(body Common) Message {
	return &discussMsg{
		Header: Header{
			MsgType:       TypeNewQA,
			MsgTitle:      "你有新的提问",
			HeadingPrefix: "提问",
		},
		Common: body,
	}
}

func NewCreateFeedback(body Common) Message {
	return &discussMsg{
		Header: Header{
			MsgType:       TypeNewFeedback,
			MsgTitle:      "你有新的反馈",
			HeadingPrefix: "反馈",
		},
		Common: body,
	}
}

func NewCreateBlog(body Common) Message {
	return &discussMsg{
		Header: Header{
			MsgType:       TypeNewBlog,
			MsgTitle:      "你有新的博客",
			HeadingPrefix: "博客",
		},
		Common: body,
	}
}

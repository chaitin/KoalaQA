package message

import (
	"bytes"
	"text/template"
)

var discussTpl = template.New(`** {{ .MsgTitle }} **
{{ .HeadingPrefix }}：{{ .Heading }}
分类：{{ .GroupItems }}
用户：{{ .Username }}
[点击查看详情]({{ .URL }})`)

type discussBody struct {
	Heading    string
	GroupItems string
	Username   string
	URL        string
}

type disscussMsg struct {
	MsgType       Type
	MsgTitle      string
	HeadingPrefix string

	discussBody
}

func (d *disscussMsg) Type() Type {
	return d.MsgType
}

func (d *disscussMsg) Title() string {
	return d.MsgTitle
}

func (d *disscussMsg) Message() (string, error) {
	var buff bytes.Buffer
	err := discussTpl.Execute(&buff, d)
	if err != nil {
		return "", err
	}

	return buff.String(), nil
}

func newBotDislikeComment(body discussBody) Message {
	return &disscussMsg{
		MsgType:       TypeDislikeBotComment,
		MsgTitle:      "不喜欢智能机器人的回答",
		HeadingPrefix: "问题",
		discussBody:   body,
	}
}

func newBotUnknown(body discussBody) Message {
	return &disscussMsg{
		MsgType:       TypeBotUnknown,
		MsgTitle:      "智能机器人无法解答问题",
		HeadingPrefix: "问题",
		discussBody:   body,
	}
}

func newFeedback(body discussBody) Message {
	return &disscussMsg{
		MsgType:       TypeNewFeedback,
		MsgTitle:      "有用户提交了新的反馈",
		HeadingPrefix: "反馈",
		discussBody:   body,
	}
}

func newBlog(body discussBody) Message {
	return &disscussMsg{
		MsgType:       TypeNewBlog,
		MsgTitle:      "有用户发表了新的博客",
		HeadingPrefix: "标题",
		discussBody:   body,
	}
}

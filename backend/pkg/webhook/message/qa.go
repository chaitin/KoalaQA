package message

import (
	"bytes"
	"text/template"
	"time"

	"github.com/chaitin/koalaqa/model"
)

var docTpl = template.New("webhook_document")

func init() {
	var err error
	docTpl, err = docTpl.Parse(`{{ .TitlePrefix }} {{ .MsgTitle }} {{ .TitleSuffix }}
{{ .HeadingPrefix }}：{{ .Doc.Title }}

[点击查看详情]({{ .Doc.URL }})`)
	if err != nil {
		panic(err)
	}
}

type commonDoc struct {
	ID    uint
	Title string
	URL   string
}

type docMsg struct {
	Header

	Doc commonDoc
}

type sendQAMsg struct {
	*docMsg
	platformMsg
}

func (q *docMsg) Message(webhookType model.WebhookType) (string, error) {
	var buff bytes.Buffer
	err := docTpl.Execute(&buff, sendQAMsg{
		docMsg:      q,
		platformMsg: newPlatformMsg(webhookType),
	})
	if err != nil {
		return "", err
	}

	return buff.String(), nil
}

func (q *docMsg) Data() Data {
	return Data{
		Common: Common{
			Discussion: commonDiscussion{
				ID:    q.Doc.ID,
				Title: q.Doc.Title,
				URL:   q.Doc.URL,
			},
		},
		Type:      q.MsgType,
		TypeDesc:  q.MsgTitle,
		Timestamp: time.Now().UnixMilli(),
	}
}

func NewQANeedReview(body commonDoc) Message {
	return &docMsg{
		Header: Header{
			MsgType:       TypeQANeedReview,
			MsgTitle:      "有新的问答等待审核",
			HeadingPrefix: "问题",
		},
		Doc: body,
	}
}

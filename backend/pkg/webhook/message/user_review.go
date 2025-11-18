package message

import (
	"bytes"
	"fmt"
	"text/template"
	"time"

	"github.com/chaitin/koalaqa/model"
)

var userReviewTpl = template.New("webhook_user_review")

func init() {
	var err error
	userReviewTpl, err = userReviewTpl.Parse(`{{ .TitlePrefix }} {{ .MsgTitle }} {{ .TitleSuffix }}

用户名：{{ .User.Name }}

申请理由：{{ .User.Reason }}

[点击查看详情]({{ .URL }})`)
	if err != nil {
		panic(err)
	}
}

type userReviewMsg struct {
	Header

	User commonUser `json:"user"`
	URL  string     `json:"url"`
}

type sendUserReviewMsg struct {
	*userReviewMsg
	platformMsg
}

func (u *userReviewMsg) ID() string {
	return fmt.Sprintf("%d_%d", u.MsgType, u.User.ID)
}

func (u *userReviewMsg) Message(webhookType model.WebhookType) (string, error) {
	var buff bytes.Buffer
	err := userReviewTpl.Execute(&buff, sendUserReviewMsg{
		userReviewMsg: u,
		platformMsg:   newPlatformMsg(webhookType),
	})
	if err != nil {
		return "", err
	}

	return buff.String(), nil
}

func (u *userReviewMsg) Data() Data {
	return Data{
		Common: Common{
			User: u.User,
			Discussion: commonDiscussion{
				URL: u.URL,
			},
		},
		Type:      u.MsgType,
		TypeDesc:  u.MsgTitle,
		Timestamp: time.Now().UnixMilli(),
	}
}

func NewUserReviewGuest(user commonUser, address string) Message {
	return &userReviewMsg{
		Header: Header{
			MsgType:  TypeUserReviewGuest,
			MsgTitle: "你有新的账号激活申请待审核",
		},
		User: user,
		URL:  address,
	}
}

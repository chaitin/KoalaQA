package message

import "github.com/chaitin/koalaqa/model"

type Type = int64

const (
	TypeDislikeBotComment Type = iota + 1
	TypeBotUnknown
)

type Message interface {
	Type() Type
	Title() string
	Message(webhookType model.WebhookType) (string, error)
}

type webhookMsg struct {
	TitlePrefix string
	TitleSuffix string
}

func newWebhookMsg(t model.WebhookType) webhookMsg {
	switch t {
	case model.WebhookTypeDingtalk:
		return webhookMsg{
			TitlePrefix: "##",
		}
	}

	return webhookMsg{}
}

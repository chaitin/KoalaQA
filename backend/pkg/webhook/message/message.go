package message

import "github.com/chaitin/koalaqa/model"

type Type = int64

const (
	TypeDislikeBotComment Type = iota + 1
	TypeBotUnknown
)

type commonUserThird struct {
	Type model.AuthType `json:"type"`
	ID   string         `json:"id"`
}

type commonUser struct {
	ID     uint              `json:"id"`
	Thirds []commonUserThird `json:"thirds"`
	Name   string            `json:"name"`
}

type commonDiscussion struct {
	ID        uint            `json:"id"`
	CreatedAt model.Timestamp `json:"created_at"`
	UUID      string          `json:"uuid"`
	Title     string          `json:"title"`
	Groups    []string        `json:"groups"`
	Tags      []string        `json:"tags"`
	URL       string          `json:"url"`
}

type Data struct {
	Common

	Type      Type   `json:"type"`
	TypeDesc  string `json:"type_desc"`
	Timestamp int64  `json:"timestamp"`
}

type Common struct {
	User       commonUser       `json:"user"`
	Discussion commonDiscussion `json:"discussion"`
}

type Message interface {
	Type() Type
	Title() string
	Message(webhookType model.WebhookType) (string, error)
	Data() Data
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

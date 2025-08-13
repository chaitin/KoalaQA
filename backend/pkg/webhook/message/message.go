package message

type Type = int64

const (
	TypeDislikeBotComment Type = iota + 1
	TypeBotUnknown
	TypeNewFeedback
	TypeNewBlog
)

type Message interface {
	Type() Type
	Title() string
	Message() (string, error)
}

package webhook

import (
	"testing"

	"github.com/chaitin/koalaqa/pkg/webhook/message"
)

func TestDingtalkSend(t *testing.T) {
	webhook, err := newDingtalk("", "", []message.Type{
		message.TypeBotUnknown,
	})
	if err != nil {
		t.Fatal("new dingtalk webhook failed:", err)
	}

	fs := []func(message.DiscussBody) message.Message{
		message.NewBotDislikeComment,
		message.NewBotUnknown,
	}

	for _, f := range fs {
		err = webhook.Send(t.Context(), f(message.DiscussBody{
			Heading:    "test",
			GroupItems: "haha",
			Username:   "gang.yang",
			URL:        "http://gang.yang.com",
		}))
		if err != nil {
			t.Fatal("send new_blog failed:", err)
		}
	}
}

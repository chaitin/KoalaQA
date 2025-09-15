package webhook

import (
	"testing"

	"github.com/chaitin/koalaqa/pkg/webhook/message"
)

func TestDingtalkSend(t *testing.T) {
	webhook, err := newDingtalk("https://oapi.dingtalk.com/robot/send?access_token=8908cd9b78743b70d7a92f96c6d0681e6ad0551d43ba9ee8486e0a8f0b8b28a4", "SECf02479af1379882afc100b8697f3a20cad6a8a1679f15c9c814688a600b1b87f", []message.Type{
		message.TypeDislikeBotComment,
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

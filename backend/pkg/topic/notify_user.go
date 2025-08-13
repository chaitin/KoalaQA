package topic

import "fmt"

func NewMessageNotifyUser(userID uint) topic {
	return newTopic(fmt.Sprintf("koala.message.notify.%d", userID), false)
}

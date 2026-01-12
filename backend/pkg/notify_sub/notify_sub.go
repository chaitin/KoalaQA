package notify_sub

import (
	"context"

	"github.com/chaitin/koalaqa/model"
)

type Sender interface {
	Send(ctx context.Context, userIDs model.Int64Array, notifyData model.MessageNotifyCommon) error
}

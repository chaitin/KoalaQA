package notify_sub

import (
	"context"

	"github.com/chaitin/koalaqa/model"
	"github.com/chaitin/koalaqa/repo"
	"go.uber.org/fx"
)

type NotifySubIn struct {
	fx.In

	Forum *repo.Forum
	User  *repo.User
}

type Sender interface {
	Send(ctx context.Context, userIDs model.Int64Array, notifyData model.MessageNotifyCommon) error
}

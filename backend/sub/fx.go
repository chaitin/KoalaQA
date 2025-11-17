package sub

import (
	"github.com/chaitin/koalaqa/pkg/mq"
	"go.uber.org/fx"
)

var Module = fx.Options(
	fx.Provide(mq.AsSubscriber(NewDisc)),
	fx.Provide(mq.AsSubscriber(NewDiscRag)),
	fx.Provide(mq.AsSubscriber(NewKBQA)),
	fx.Provide(mq.AsSubscriber(newMessageNotify)),
	fx.Provide(mq.AsSubscriber(newAnydocTask)),
	fx.Provide(mq.AsSubscriber(NewQA)),
	fx.Provide(mq.AsSubscriber(NewComment)),
	fx.Provide(mq.AsSubscriber(newDiscussWebhook)),
	fx.Provide(mq.AsSubscriber(newDocWebhook)),
	fx.Provide(mq.AsSubscriber(newKBSpace)),
	fx.Provide(mq.AsSubscriber(NewBlog)),
	fx.Provide(mq.AsSubscriber(newAIInsight)),
	fx.Provide(mq.AsSubscriber(newNeedHuman)),
	fx.Provide(newCache),
)

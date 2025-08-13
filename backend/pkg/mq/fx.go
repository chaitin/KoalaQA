package mq

import "go.uber.org/fx"

var Module = fx.Options(
	natsModule,
	fx.Provide(fx.Annotate(
		newMemory,
		fx.As(new(Publisher)), fx.As(new(SubscriberWithHandler)),
		fx.ResultTags(`name:"memory_mq"`),
	)),
)

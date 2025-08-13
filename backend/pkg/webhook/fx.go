package webhook

import (
	"github.com/chaitin/koalaqa/pkg/webhook/message"
	"go.uber.org/fx"
)

var Module = fx.Options(
	message.Module,
)

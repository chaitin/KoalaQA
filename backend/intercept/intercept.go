package intercept

import (
	"github.com/chaitin/koalaqa/pkg/context"
)

type Interceptor interface {
	Intercept(*context.Context)
	Priority() int
}

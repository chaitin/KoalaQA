package main

import (
	"context"

	"github.com/chaitin/koalaqa/intercept"
	"github.com/chaitin/koalaqa/migration"
	"github.com/chaitin/koalaqa/model"
	"github.com/chaitin/koalaqa/pkg/anydoc"
	"github.com/chaitin/koalaqa/pkg/batch"
	"github.com/chaitin/koalaqa/pkg/config"
	"github.com/chaitin/koalaqa/pkg/cron"
	"github.com/chaitin/koalaqa/pkg/database"
	"github.com/chaitin/koalaqa/pkg/glog"
	"github.com/chaitin/koalaqa/pkg/jwt"
	"github.com/chaitin/koalaqa/pkg/mq"
	"github.com/chaitin/koalaqa/pkg/oss"
	"github.com/chaitin/koalaqa/pkg/rag"
	"github.com/chaitin/koalaqa/pkg/ratelimit"
	"github.com/chaitin/koalaqa/pkg/third_auth"
	"github.com/chaitin/koalaqa/pkg/version"
	"github.com/chaitin/koalaqa/pkg/webhook"
	"github.com/chaitin/koalaqa/repo"
	"github.com/chaitin/koalaqa/router"
	"github.com/chaitin/koalaqa/server"
	"github.com/chaitin/koalaqa/sub"
	"github.com/chaitin/koalaqa/svc"

	"go.uber.org/fx"
)

func main() {
	app := fx.New(
		config.Module,
		database.Moudle,
		anydoc.Module(),
		mq.Module,
		migration.Module(),
		model.Module(),
		jwt.Module,
		intercept.Module(),
		server.Module,
		router.Module(),
		svc.Module(),
		repo.Module(),
		rag.Module,
		oss.Module,
		sub.Module,
		webhook.Module,
		third_auth.Module,
		cron.Module(),
		fx.Provide(version.NewInfo),
		ratelimit.Module,
		batch.Module,
	)
	ctx := context.Background()
	if err := app.Start(ctx); err != nil {
		panic(err)
	}
	<-app.Done()
	if err := app.Stop(ctx); err != nil {
		glog.WithErr(err).Error("shutdown")
	}
}

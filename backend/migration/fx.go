package migration

import (
	"context"
	"fmt"
	"reflect"

	"go.uber.org/fx"

	"github.com/chaitin/koalaqa/migration/migrator"
	"github.com/chaitin/koalaqa/model"
	"github.com/chaitin/koalaqa/pkg/version"
	"github.com/chaitin/koalaqa/repo"
)

type In struct {
	fx.In

	RepoMigrate     *repo.Migration
	RepoVersion     *repo.Version
	AlwaysMigrators []migrator.Migrator `group:"always_migrators"`
	Migrators       []migrator.Migrator `group:"db_migrators"`
}

type Runner struct {
	in In
}

func newRunner(in In) *Runner {
	return &Runner{
		in: in,
	}
}

var (
	migratorModules []fx.Option
)

func Module() fx.Option {
	return fx.Options(
		fx.Provide(newRunner),
		fx.Provide(fx.Annotated{
			Group:  "always_migrators",
			Target: newAlwaysMigrator,
		}),
		fx.Provide(fx.Annotated{
			Group:  "always_migrators",
			Target: newDatasetInit,
		}),
		fx.Provide(fx.Annotated{
			Group:  "always_migrators",
			Target: newInitAdmin,
		}),
		fx.Options(migratorModules...),
		fx.Invoke(func(runner *Runner) error {
			err := runner.in.RepoMigrate.DBAlwaysMigrate(runner.in.AlwaysMigrators...)
			if err != nil {
				return err
			}

			err = runner.in.RepoMigrate.DBMigrate(runner.in.Migrators...)
			if err != nil {
				return err
			}

			return runner.in.RepoVersion.Create(context.Background(), &model.Version{
				Version: version.Version,
			})
		}),
	)
}

func registerDBMigrator(m any) {
	if reflect.TypeOf(m).Kind() != reflect.Func {
		panic(fmt.Sprintf("%v is not func", m))
	}
	migratorModules = append(migratorModules,
		fx.Provide(
			fx.Annotated{
				Group:  "db_migrators",
				Target: m,
			}),
	)
}

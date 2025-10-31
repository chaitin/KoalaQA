package repo

import (
	"context"

	"github.com/chaitin/koalaqa/model"
	"github.com/chaitin/koalaqa/pkg/database"
	"gorm.io/gorm"
)

type base[T model.DBModel] struct {
	db *database.DB
	m  T
}

func (b *base[T]) model(ctx context.Context) *gorm.DB {
	return b.db.WithContext(ctx).Model(b.m)
}

func (b *base[T]) List(ctx context.Context, res any, queryFuncs ...QueryOptFunc) error {
	o := getQueryOpt(queryFuncs...)
	return b.model(ctx).Scopes(o.Scopes()...).Find(res).Error
}

func (b *base[T]) Count(ctx context.Context, res *int64, queryFuncs ...QueryOptFunc) error {
	o := getQueryOpt(queryFuncs...)
	return b.model(ctx).Scopes(o.Scopes()...).Count(res).Error
}

func (b *base[T]) Create(ctx context.Context, m T) error {
	return b.db.WithContext(ctx).Create(m).Error
}

func (b *base[T]) GetByID(ctx context.Context, res any, id uint, queryFuncs ...QueryOptFunc) error {
	o := getQueryOpt(queryFuncs...)
	return b.model(ctx).Where("id = ?", id).Scopes(o.Scopes()...).First(res).Error
}

func (b *base[T]) GetAdmin(ctx context.Context, res any) error {
	return b.model(ctx).Where("builtin = ? And role = ?", true, model.UserRoleAdmin).First(&res).Error
}

func (b *base[T]) ExistByID(ctx context.Context, id uint) (bool, error) {
	return b.Exist(ctx, QueryWithEqual("id", id))
}

func (b *base[T]) Exist(ctx context.Context, queryFuncs ...QueryOptFunc) (bool, error) {
	o := getQueryOpt(queryFuncs...)
	var exist bool
	err := b.db.WithContext(ctx).Raw("SELECT EXISTS (?)", b.model(ctx).Scopes(o.Scopes()...)).Scan(&exist).Error
	if err != nil {
		return false, err
	}

	return exist, nil
}

func (b *base[T]) Update(ctx context.Context, updateM map[string]any, queryFuncs ...QueryOptFunc) error {
	o := getQueryOpt(queryFuncs...)
	return b.model(ctx).Scopes(o.Scopes()...).Updates(updateM).Error
}

func (b *base[T]) UpdateByModel(ctx context.Context, m T, queryFuncs ...QueryOptFunc) error {
	o := getQueryOpt(queryFuncs...)
	return b.model(ctx).Scopes(o.Scopes()...).Updates(m).Error
}

func (b *base[T]) Delete(ctx context.Context, queryFuncs ...QueryOptFunc) error {
	o := getQueryOpt(queryFuncs...)
	return b.model(ctx).Scopes(o.Scopes()...).Delete(nil).Error
}

func (b *base[T]) DeleteByID(ctx context.Context, id uint) error {
	return b.model(ctx).Where("id = ?", id).Delete(nil).Error
}

func (b *base[T]) FilterIDs(ctx context.Context, ids *model.Int64Array) error {
	var filterIDs []int64
	err := b.model(ctx).Select("id").Where("id =ANY(?)", ids).Scan(&filterIDs).Error
	if err != nil {
		return err
	}

	*ids = filterIDs

	return nil
}

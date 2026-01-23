package repo

import (
	"context"
	"errors"
	"time"

	"github.com/chaitin/koalaqa/model"
	"github.com/chaitin/koalaqa/pkg/database"
	"github.com/chaitin/koalaqa/pkg/rag"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

type Discussion struct {
	base[*model.Discussion]

	rag rag.Service
}

func newDiscussion(db *database.DB, rag rag.Service) *Discussion {
	return &Discussion{base: base[*model.Discussion]{db: db, m: &model.Discussion{}}, rag: rag}
}

func init() {
	register(newDiscussion)
}

func (d *Discussion) GetByUUID(ctx context.Context, uuid string) (*model.Discussion, error) {
	var res model.Discussion
	if err := d.model(ctx).Where("uuid = ?", uuid).First(&res).Error; err != nil {
		return nil, err
	}
	return &res, nil
}

func (d *Discussion) DetailByUUID(ctx context.Context, uid uint, uuid string) (*model.DiscussionDetail, error) {
	var id uint
	if err := d.model(ctx).Where("uuid = ?", uuid).Select("id").First(&id).Error; err != nil {
		return nil, err
	}
	detail, err := d.Detail(ctx, uid, id)
	if err != nil {
		return nil, err
	}
	var userLike int64
	err = d.db.WithContext(ctx).
		Model(&model.DiscLike{}).
		Where("uuid = ? AND user_id = ?", uuid, uid).
		Count(&userLike).Error
	if err != nil {
		return nil, err
	}
	detail.UserLike = userLike > 0
	return detail, nil
}

func (d *Discussion) ListType(ctx context.Context, queryFuncs ...QueryOptFunc) (res []model.Count[model.DiscussionType], err error) {
	opt := getQueryOpt(queryFuncs...)
	err = d.model(ctx).Select("type AS key, COUNT(*) AS count").Scopes(opt.Scopes()...).Group("type").Find(&res).Error
	return
}

func (d *Discussion) Detail(ctx context.Context, uid uint, id uint) (*model.DiscussionDetail, error) {
	var res model.DiscussionDetail
	res.CurrentUserID = uid
	err := d.model(ctx).Where("discussions.id = ?", id).
		Joins("left join users on users.id = discussions.user_id").
		Select("discussions.*, users.name as user_name, users.avatar as user_avatar, users.role as user_role").
		First(&res).Error
	if err != nil {
		return nil, err
	}

	if res.AssociateID > 0 {
		err = d.Get(ctx, &res.Associate, QueryWithEqual("discussions.id", res.AssociateID))
		if err != nil && !errors.Is(err, database.ErrRecordNotFound) {
			return nil, err
		}
	}

	if len(res.GroupIDs) > 0 {
		err = d.db.WithContext(ctx).
			Model(&model.GroupItem{}).
			Where("id = ANY(?)", res.GroupIDs).
			Find(&res.Groups).Error
		if err != nil {
			return nil, err
		}
	}

	commentLikeScope := func(tx *gorm.DB) *gorm.DB {
		return tx.Joins(`LEFT JOIN (SELECT comment_id,
			COUNT(*) FILTER (WHERE state = ?) AS like,
			COUNT(*) FILTER (WHERE state = ?) AS dislike,
			SUM(state) FILTER (WHERE user_id = ?) AS user_like_state
			FROM comment_likes GROUP BY comment_id) AS tmp_like ON tmp_like.comment_id = comments.id`,
			model.CommentLikeStateLike, model.CommentLikeStateDislike, uid)
	}

	err = d.db.WithContext(ctx).
		Model(&model.Comment{}).
		Where("comments.parent_id = ?", 0).
		Where("comments.discussion_id = ?", id).
		Joins("left join users on users.id = comments.user_id").
		Order("comments.created_at asc").
		Select("comments.*, users.name as user_name, users.avatar as user_avatar, users.role as user_role, tmp_like.like, tmp_like.dislike, tmp_like.user_like_state").
		Scopes(commentLikeScope).
		Find(&res.Comments).Error
	if err != nil {
		return nil, err
	}

	for i, c := range res.Comments {
		var replies []model.DiscussionReply
		err = d.db.WithContext(ctx).
			Model(&model.Comment{}).
			Joins("left join users on users.id = comments.user_id").
			Order("comments.created_at asc").
			Select("comments.*, users.name as user_name, users.avatar as user_avatar, users.role as user_role, tmp_like.like, tmp_like.dislike, tmp_like.user_like_state").
			Scopes(commentLikeScope).
			Where("parent_id = ?", c.ID).
			Find(&replies).Error
		if err != nil {
			return nil, err
		}
		res.Comments[i].Replies = replies
	}

	return &res, nil
}

func (d *Discussion) GetByRagIDs(ctx context.Context, res any, ids []string) error {
	return d.base.model(ctx).Where("rag_id in (?)", ids).Find(res).Error
}

func (d *Discussion) List(ctx context.Context, res any, queryFuncs ...QueryOptFunc) error {
	o := getQueryOpt(queryFuncs...)
	return d.base.model(ctx).
		Joins("left join users on users.id = discussions.user_id").
		Select([]string{
			"discussions.id",
			"discussions.created_at",
			"discussions.updated_at",
			"discussions.rag_id",
			"discussions.uuid",
			"discussions.user_id",
			"discussions.title",
			"discussions.summary",
			"discussions.tag_ids",
			"discussions.group_ids",
			"discussions.resolved",
			"discussions.resolved_at",
			"discussions.hot",
			"discussions.like",
			"discussions.dislike",
			"discussions.view",
			"discussions.comment",
			"discussions.type",
			"discussions.forum_id",
			"discussions.associate_id",
			"LEFT(discussions.content, 200) AS content",
			"users.name as user_name",
			"users.avatar as user_avatar",
		}).
		Scopes(o.Scopes()...).
		Find(res).Error
}

func (d *Discussion) Get(ctx context.Context, res any, queryFuncs ...QueryOptFunc) error {
	o := getQueryOpt(queryFuncs...)
	return d.base.model(ctx).
		Joins("left join users on users.id = discussions.user_id").
		Select("discussions.*, users.name as user_name, users.avatar as user_avatar").
		Scopes(o.Scopes()...).
		First(res).Error
}

func (d *Discussion) LikeDiscussion(ctx context.Context, discUUID string, uid uint) error {
	return d.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		err := tx.Exec(`SELECT pg_advisory_xact_lock(?)`, uid).Error
		if err != nil {
			return err
		}
		err = tx.Model(&model.Discussion{}).
			Where("uuid = ?", discUUID).
			Updates(map[string]any{
				"like":       gorm.Expr(`"like" + 1`),
				"updated_at": gorm.Expr("updated_at"),
			}).Error
		if err != nil {
			return err
		}
		err = tx.Clauses(clause.OnConflict{
			Columns:   []clause.Column{{Name: "uuid"}, {Name: "user_id"}},
			DoNothing: true,
		}).Create(&model.DiscLike{
			UUID:   discUUID,
			UserID: uid,
		}).Error
		if err != nil {
			return err
		}
		return nil
	})
}

func (d *Discussion) ListDiscLike(ctx context.Context, discUUID string) ([]model.DiscLike, error) {
	var res []model.DiscLike
	err := d.db.WithContext(ctx).Model(&model.DiscLike{}).Where("uuid = ?", discUUID).Find(&res).Error
	if err != nil {
		return nil, err
	}

	return res, nil
}

func (d *Discussion) DeleteDiscLike(ctx context.Context, discUUID string) error {
	return d.db.WithContext(ctx).Model(&model.DiscLike{}).Where("uuid = ?", discUUID).Delete(nil).Error
}

func (d *Discussion) RevokeLikeDiscussion(ctx context.Context, discUUID string, uid uint) error {
	return d.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		err := tx.Exec(`SELECT pg_advisory_xact_lock(?)`, uid).Error
		if err != nil {
			return err
		}
		err = tx.Model(&model.DiscLike{}).Where("uuid = ? AND user_id = ?", discUUID, uid).Delete(nil).Error
		if err != nil {
			return err
		}
		err = tx.Model(&model.Discussion{}).Where("uuid = ?", discUUID).Updates(map[string]any{
			"like":       gorm.Expr(`GREATEST("like" - 1,0)`),
			"updated_at": gorm.Expr("updated_at"),
		}).Error
		if err != nil {
			return err
		}
		return nil
	})
}

func (d *Discussion) ResolveIssue(ctx context.Context, discUUID string, state model.DiscussionState) error {
	return d.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		var disc model.Discussion
		err := tx.Model(d.m).Where("uuid = ?", discUUID).Clauses(clause.Locking{Strength: clause.LockingStrengthUpdate}).First(&disc).Error
		if err != nil {
			return err
		}

		if disc.Type != model.DiscussionTypeIssue {
			return errors.New("invalid discussion")
		}

		if state == model.DiscussionStateInProgress && disc.Resolved != model.DiscussionStateNone ||
			state == model.DiscussionStateResolved && disc.Resolved != model.DiscussionStateInProgress {
			return errors.New("invalid request state")
		}

		now := time.Now()
		return tx.Model(d.m).Where("uuid = ?", disc.UUID).Updates(map[string]any{
			"resolved":    state,
			"resolved_at": now,
			"updated_at":  now,
		}).Error
	})
}

func (d *Discussion) UpdateTagsByRagID(ctx context.Context, ragID string, tags []string) error {
	return d.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		addTags := make(map[string]struct{})
		deleteTags := make(map[string]struct{})
		for _, tag := range tags {
			addTags[tag] = struct{}{}
		}

		var disc model.Discussion
		err := tx.Model(&model.Discussion{}).Select("id, forum_id, tag_ids, group_ids, resolved, type").Where("rag_id = ?", ragID).First(&disc).Error
		if err != nil {
			if errors.Is(err, database.ErrRecordNotFound) {
				return nil
			}

			return err
		}

		var forum model.Forum
		err = tx.Model(&model.Forum{}).Where("id = ?", disc.ForumID).First(&forum).Error
		if err != nil {
			return err
		}

		var dbTags []model.DiscussionTag
		err = tx.Model(&model.DiscussionTag{}).Where("id =ANY(?)", disc.TagIDs).Find(&dbTags).Error
		if err != nil {
			return err
		}

		newTagIDs := make(model.Int64Array, 0)

		for _, tag := range dbTags {
			if _, ok := addTags[tag.Name]; ok {
				delete(addTags, tag.Name)
				newTagIDs = append(newTagIDs, int64(tag.ID))
				continue
			}

			deleteTags[tag.Name] = struct{}{}
		}

		if len(addTags) == 0 && len(deleteTags) == 0 {
			return nil
		}

		updateTags := make([]model.DiscussionTag, 0, len(addTags)+len(deleteTags))

		for tag := range addTags {
			updateTags = append(updateTags, model.DiscussionTag{
				ForumID: disc.ForumID,
				Name:    tag,
				Count:   1,
			})
		}
		for tag := range deleteTags {
			updateTags = append(updateTags, model.DiscussionTag{
				ForumID: disc.ForumID,
				Name:    tag,
				Count:   -1,
			})
		}

		err = tx.Model(&model.DiscussionTag{}).Clauses(clause.OnConflict{
			Columns: []clause.Column{{Name: "forum_id"}, {Name: "name"}},
			DoUpdates: clause.Assignments(map[string]interface{}{
				"count": gorm.Expr("GREATEST(discussion_tags.count+EXCLUDED.count,0)"),
			}),
		}).CreateInBatches(&updateTags, 1000).Error
		if err != nil {
			return err
		}

		for i := range len(addTags) {
			newTagIDs = append(newTagIDs, int64(updateTags[i].ID))
		}
		err = tx.Model(&model.Discussion{}).Where("id = ?", disc.ID).Updates(map[string]any{
			"tag_ids":    newTagIDs,
			"updated_at": time.Now(),
		}).Error
		if err != nil {
			return err
		}

		disc.TagIDs = newTagIDs

		err = d.rag.UpdateDocumentMetadata(ctx, forum.DatasetID, ragID, disc.Metadata())
		if err != nil {
			return err
		}

		return nil
	})
}

func (d *Discussion) FilterTagIDs(ctx context.Context, tagIDs *model.Int64Array, querFuncs ...QueryOptFunc) error {
	o := getQueryOpt(querFuncs...)
	var filterIDs []int64
	err := d.db.WithContext(ctx).Raw(`SELECT tag_id FROM (?) WHERE tag_id =ANY(?)`, d.db.Model(d.m).Select("DISTINCT unnest(tag_ids) AS tag_id").Scopes(o.Scopes()...), tagIDs).Scan(&filterIDs).Error
	if err != nil {
		return err
	}

	*tagIDs = filterIDs
	return nil
}

func (d *Discussion) DeleteByID(ctx context.Context, id uint) error {
	return d.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		err := tx.Model(d.m).Where("id = ?", id).Delete(nil).Error
		if err != nil {
			return err
		}

		return tx.Model(&model.DiscussionFollow{}).Where("discussion_id = ?", id).Delete(nil).Error
	})
}

package repo

import (
	"context"
	"errors"
	"time"

	"github.com/chaitin/koalaqa/model"
	"github.com/chaitin/koalaqa/pkg/database"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

type CommentLike struct {
	base[*model.CommentLike]
}

func (c *CommentLike) Like(ctx context.Context, discUUID string, uid, discID, commentID uint, state model.CommentLikeState) (bool, bool, error) {
	updated := false
	stateChanged := false
	e := c.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		updateM := map[string]any{
			"updated_at": time.Now(),
		}

		createDiscLike := false
		switch state {
		case model.CommentLikeStateLike:
			updateM["like"] = gorm.Expr(`"like" + 1`)
			createDiscLike = true
		case model.CommentLikeStateDislike:
			updateM["dislike"] = gorm.Expr("dislike + 1")
		default:
			return nil
		}

		err := tx.Exec(`SELECT pg_advisory_xact_lock(?)`, uid).Error
		if err != nil {
			return err
		}

		var commentLike model.CommentLike
		err = tx.Model(c.m).Where("user_id = ? AND comment_id = ?", uid, commentID).First(&commentLike).Error
		if err != nil {
			if errors.Is(err, gorm.ErrRecordNotFound) {
				commentLike = model.CommentLike{
					UserID:       uid,
					DiscussionID: discID,
					CommentID:    commentID,
					State:        state,
				}
				err = tx.Create(&commentLike).Error
				if err != nil {
					return err
				}

			} else {
				return err
			}
		} else {
			if commentLike.State == state {
				return nil
			}

			err = tx.Model(c.m).Where("id = ?", commentLike.ID).Updates(map[string]any{
				"state":      state,
				"updated_at": time.Now(),
			}).Error
			if err != nil {
				return err
			}

			stateChanged = true

			switch state {
			case model.CommentLikeStateLike:
				updateM["dislike"] = gorm.Expr("dislike - 1")
			case model.CommentLikeStateDislike:
				updateM["like"] = gorm.Expr(`"like" - 1`)
			default:
				return nil
			}
		}

		err = tx.Model(&model.Comment{}).Where("id = ?", commentLike.CommentID).Updates(updateM).Error
		if err != nil {
			return err
		}

		err = tx.Model(&model.Discussion{}).Where("id = ?", commentLike.DiscussionID).Updates(updateM).Error
		if err != nil {
			return err
		}

		if createDiscLike {
			err = tx.Clauses(clause.OnConflict{
				Columns:   []clause.Column{{Name: "uuid"}, {Name: "user_id"}},
				DoNothing: true,
			}).Create(&model.DiscLike{
				UUID:   discUUID,
				UserID: uid,
			}).Error
		} else {
			err = tx.Model(&model.DiscLike{}).Where("uuid = ? AND user_id = ?", discUUID, uid).Delete(nil).Error
		}
		if err != nil {
			return err
		}

		updated = true
		return nil
	})

	return updated, stateChanged, e
}

func (c *CommentLike) RevokeLike(ctx context.Context, uid, commentID uint) (model.CommentLike, error) {
	var commentLike model.CommentLike
	txErr := c.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		err := tx.Exec(`SELECT pg_advisory_xact_lock(?)`, uid).Error
		if err != nil {
			return err
		}

		err = tx.Model(c.m).Where("user_id = ? AND comment_id = ?", uid, commentID).First(&commentLike).Error
		if err != nil {
			return err
		}

		updateM := map[string]any{
			"updated_at": time.Now(),
		}

		switch commentLike.State {
		case model.CommentLikeStateLike:
			updateM["like"] = gorm.Expr(`"like" - 1`)
		case model.CommentLikeStateDislike:
			updateM["dislike"] = gorm.Expr("dislike - 1")
		default:
			return nil
		}

		err = tx.Model(c.m).Where("id = ?", commentLike.ID).Delete(nil).Error
		if err != nil {
			return err
		}

		err = tx.Model(&model.Comment{}).Where("id = ?", commentLike.CommentID).Updates(updateM).Error
		if err != nil {
			return err
		}

		err = tx.Model(&model.Discussion{}).Where("id = ?", commentLike.DiscussionID).Updates(updateM).Error
		if err != nil {
			return err
		}

		return nil
	})

	return commentLike, txErr
}

func newCommentLike(db *database.DB) *CommentLike {
	return &CommentLike{base: base[*model.CommentLike]{db: db, m: &model.CommentLike{}}}
}

func init() {
	register(newCommentLike)
}

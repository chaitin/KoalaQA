package model

type CommentLikeState uint

const (
	CommentLikeStateLike CommentLikeState = iota + 1
	CommentLikeStateDislike
)

type CommentLike struct {
	Base

	DiscussionID uint             `gorm:"column:discussion_id;type:bigint;index"`
	CommentID    uint             `gorm:"column:comment_id;type:bigint;uniqueIndex:udx_comment_like_user_comment"`
	UserID       uint             `gorm:"column:user_id;type:bigint;uniqueIndex:udx_comment_like_user_comment"`
	State        CommentLikeState `gorm:"column:state"`
}

func init() {
	registerAutoMigrate(&CommentLike{})
}

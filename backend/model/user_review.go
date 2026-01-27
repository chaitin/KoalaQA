package model

type UserReviewState uint

const (
	UserReviewStateReview = iota
	UserReviewStatePass
	UserReviewStateDeny
)

type UserReviewType uint

const (
	UserReviewTypeGuest = iota + 1
)

type UserReview struct {
	Base

	Type     UserReviewType  `gorm:"column:type;uniqueIndex:udx_user_review_type_user_id" json:"type"`
	UserID   uint            `gorm:"column:user_id;type:bigint;uniqueIndex:udx_user_review_type_user_id" json:"user_id"`
	AuthType AuthType        `gorm:"column:auth_type" json:"auth_type"`
	Reason   string          `gorm:"column:reason;type:text" json:"reason"`
	State    UserReviewState `gorm:"column:state;default:0" json:"state"`
}

type UserReviewWithUser struct {
	UserReview

	UserEmail  string     `json:"user_email"`
	UserName   string     `json:"user_name"`
	UserAvatar string     `json:"user_avatar"`
	UserOrgIDs Int64Array `json:"-" gorm:"column:user_org_ids;type:bigint[]"`
}

type UserReviewHeader struct {
	ReviewID    uint            `gorm:"column:review_id" json:"review_id"`
	ReviewType  UserReviewType  `gorm:"column:review_type" json:"review_type"`
	ReviewState UserReviewState `gorm:"column:review_state" json:"review_status"`
}

func init() {
	registerAutoMigrate(&UserReview{})
}

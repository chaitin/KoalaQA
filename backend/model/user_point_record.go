package model

type UserPointType uint

const (
	UserPointTypeCreateBlog     UserPointType = iota + 1
	UserPointTypeAnswerAccepted               // 回答被采纳
	UserPointTypeLikeBlog
	UserPointTypeAnswerLiked
	UserPointTypeAssociateIssue
	UserPointTypeAcceptAnswer // 采纳别人回答
	UserPointTypeAnswerQA
	UserPointTypeAnswerDisliked // 回答被点踩
	UserPointTypeDislikeAnswer  // 点踩别人回答
	UserPointTypeUserRole
	UserPointTypeUserAvatar
	UserPointTypeUserIntro
)

var UserPointTypePointM = map[UserPointType]int{
	UserPointTypeCreateBlog:     10,
	UserPointTypeAnswerAccepted: 10,
	UserPointTypeLikeBlog:       5,
	UserPointTypeAnswerLiked:    5,
	UserPointTypeAssociateIssue: 5,
	UserPointTypeAcceptAnswer:   2,
	UserPointTypeAnswerQA:       1,
	UserPointTypeAnswerDisliked: -5,
	UserPointTypeDislikeAnswer:  -2,
	UserPointTypeUserRole:       1,
	UserPointTypeUserAvatar:     5,
	UserPointTypeUserIntro:      5,
}

type UserPointRecord struct {
	Base

	UserPointRecordInfo
	Point    int  `gorm:"column:point;type:bigint;default:0" json:"point"`
	RevokeID uint `gorm:"column:revoke_id;type:bigint;default:0" json:"revoke_id"`
}

type UserPointRecordInfo struct {
	UserID    uint          `gorm:"column:user_id;index:idx_user_point_record_user_type" json:"user_id"`
	Type      UserPointType `gorm:"column:type;index:idx_user_point_record_user_type" json:"type"`
	ForeignID uint          `gorm:"column:foreign_id;type:bigint;default:0;index" json:"foreign"`
}

type UserPointItem struct {
	UserID uint `gorm:"column:user_id;index:idx_user_point_record_user_type" json:"user_id"`
	Point  int  `gorm:"column:point;type:bigint;default:0" json:"point"`
}

func init() {
	registerAutoMigrate(&UserPointRecord{})
}

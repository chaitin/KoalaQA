package model

import (
	"fmt"
)

type MsgNotifyType uint

const (
	MsgNotifyTypeUnknown MsgNotifyType = iota
	MsgNotifyTypeReplyDiscuss
	MsgNotifyTypeReplyComment
	MsgNotifyTypeApplyComment
	MsgNotifyTypeLikeComment
	MsgNotifyTypeDislikeComment
	MsgNotifyTypeBotUnknown
	MsgNotifyTypeLikeDiscussion
	MsgNotifyTypeUserReview
	MsgNotifyTypeResolveByAdmin
	MsgNotifyTypeCloseDiscussion
	MsgNotifyTypeAssociateIssue
	MsgNotifyTypeIssueInProgress
	MsgNotifyTypeIssueResolved
	MsgNotifyTypeUserPoint
)

type MessageNotify struct {
	Base

	UserID uint `gorm:"column:user_id" json:"user_id"` // 通知到谁，除了发给机器人的信息，user_id 与 to_id 相同

	MessageNotifyCommon
	Read bool `gorm:"column:read;default:false" json:"read"`
}

func init() {
	registerAutoMigrate(&MessageNotify{})
}

type CommentHeader struct {
	ParentComment string `json:"parent_comment"`
}

type UserPointHeader struct {
	UserPoint int `gorm:"column:user_point;default:0" json:"user_point"`
}

type MessageNotifyCommon struct {
	DiscussHeader
	CommentHeader
	UserReviewHeader
	UserPointHeader

	Type     MsgNotifyType `gorm:"column:type" json:"type"`
	FromID   uint          `gorm:"column:from_id" json:"from_id"`
	FromName string        `gorm:"column:from_name;type:text" json:"from_name"`
	FromBot  bool          `gorm:"column:from_bot" json:"from_bot"`
	ToID     uint          `gorm:"column:to_id" json:"to_id"`
	ToName   string        `gorm:"column:to_name;type:text" json:"to_name"`
	ToBot    bool          `gorm:"to_bot" json:"to_bot"`
}

type MessageNotifyDingtalk struct {
	Title       string `json:"title"`
	Text        string `json:"text"`
	SingleTitle string `json:"singleTitle"`
	SingleURL   string `json:"singleURL"`
}

var operateM = map[DiscussionType]map[MsgNotifyType]string{
	DiscussionTypeQA: {
		MsgNotifyTypeReplyDiscuss:    "回答了你的问题",
		MsgNotifyTypeReplyComment:    "回复了你的回答",
		MsgNotifyTypeResolveByAdmin:  "将你的问题标记为已解决",
		MsgNotifyTypeCloseDiscussion: "关闭了你的帖子",
		MsgNotifyTypeAssociateIssue:  "把你的问题关联到 Issue",
	},
	DiscussionTypeBlog: {
		MsgNotifyTypeReplyDiscuss: "评论了你的文章",
		MsgNotifyTypeReplyComment: "回复了你的评论",
	},
	DiscussionTypeIssue: {
		MsgNotifyTypeReplyDiscuss:    "评论了你的问题",
		MsgNotifyTypeReplyComment:    "回复了你的评论",
		MsgNotifyTypeIssueInProgress: "将 Issue 状态变更为进行中",
		MsgNotifyTypeIssueResolved:   "将 Issue 状态变更为已完成",
	},
}

func (c *MessageNotifyCommon) operateText() string {
	if c.Type == MsgNotifyTypeUserReview {
		if c.ReviewState == UserReviewStatePass {
			return "恭喜！管理员通过了您的账号激活申请"
		}

		return "管理员拒绝了您的账号激活申请"
	}

	tOp, ok := operateM[c.DiscussionType]
	if !ok {
		return ""
	}

	text, ok := tOp[c.Type]
	if !ok {
		return ""
	}

	return "**" + c.FromName + "** " + text + " **" + c.DiscussTitle + "**"
}

func (c *MessageNotifyCommon) Dingtalk(publicAddr *PublicAddress, forum Forum) *MessageNotifyDingtalk {
	title := ""
	path := fmt.Sprintf("/%s/%s", forum.RouteName, c.DiscussUUID)
	switch c.Type {
	case MsgNotifyTypeReplyDiscuss:
		title = "你有新的回答"
	case MsgNotifyTypeReplyComment:
		title = "你有新的回复"
	case MsgNotifyTypeUserReview:
		title = "账号激活反馈"
		path = ""
	case MsgNotifyTypeResolveByAdmin:
		title = "你有新的帖子进展 - 管理员完成帖子"
	case MsgNotifyTypeCloseDiscussion:
		title = "你有新的帖子进展 - 关闭帖子"
	case MsgNotifyTypeAssociateIssue:
		title = "你有新的帖子进展 - 关联 issue"
	case MsgNotifyTypeIssueInProgress:
		title = "你有新的帖子进展 - issue状态变动"
	case MsgNotifyTypeIssueResolved:
		title = "你有新的帖子进展 - issue状态变动"
	default:
		return nil
	}

	operate := c.operateText()
	if operate == "" {
		return nil
	}

	return &MessageNotifyDingtalk{
		Title:       title,
		Text:        operate,
		SingleTitle: "查看详情",
		SingleURL:   publicAddr.FullURL(path),
	}
}

type MessageNotifyInfo struct {
	ID uint `gorm:"column:id" json:"id"`

	MessageNotifyCommon
}

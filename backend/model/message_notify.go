package model

import (
	"context"
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

var (
	titleOperateM = map[DiscussionType]map[MsgNotifyType][2]string{
		DiscussionTypeQA: {
			MsgNotifyTypeReplyDiscuss: {
				"你有新的回答", "回答了你的问题",
			},
			MsgNotifyTypeReplyComment: {
				"你有新的回复", "回复了你的回答",
			},
			MsgNotifyTypeResolveByAdmin: {
				"你有新的帖子进展", "将你的问题标记为已解决",
			},
			MsgNotifyTypeCloseDiscussion: {
				"你有新的帖子进展", "关闭了你的帖子",
			},
		},
		DiscussionTypeBlog: {
			MsgNotifyTypeReplyDiscuss: {
				"你有新的评论", "评论了你的文章",
			},
			MsgNotifyTypeReplyComment: {
				"你有新的回复", "回复了你的评论",
			},
		},
		DiscussionTypeIssue: {
			MsgNotifyTypeReplyDiscuss: {
				"你有新的评论", "评论了你的问题",
			},
			MsgNotifyTypeReplyComment: {
				"你有新的回复", "回复了你的评论",
			},
			MsgNotifyTypeAssociateIssue: {
				"你有新的帖子进展", "把你的问题关联到 Issue",
			},
			MsgNotifyTypeIssueInProgress: {
				"你有新的帖子进展", "将 Issue 状态变更为进行中",
			},
			MsgNotifyTypeIssueResolved: {
				"你有新的帖子进展", "将 Issue 状态变更为已完成",
			},
		},
	}
)

func (c *MessageNotifyCommon) titleOperateText() (string, string) {
	if c.Type == MsgNotifyTypeUserReview {
		title := "账号激活反馈"
		if c.ReviewState == UserReviewStatePass {
			return title, "恭喜！管理员通过了您的账号激活申请"
		}

		return title, "管理员拒绝了您的账号激活申请"
	}

	tOp, ok := titleOperateM[c.DiscussionType]
	if !ok {
		return "", ""
	}

	text, ok := tOp[c.Type]
	if !ok {
		return "", ""
	}

	return text[0], "**" + c.FromName + "** " + text[1] + " **" + c.DiscussTitle + "**"
}

type AccessAddrCallback func(ctx context.Context, path string) (string, error)

func (c *MessageNotifyCommon) Dingtalk(ctx context.Context, ac AccessAddrCallback, forum Forum) *MessageNotifyDingtalk {
	title, operate := c.titleOperateText()
	if title == "" {
		return nil
	}
	path := fmt.Sprintf("/%s/%s", forum.RouteName, c.DiscussUUID)
	publicAddr, _ := ac(ctx, path)

	return &MessageNotifyDingtalk{
		Title: title,
		Text: fmt.Sprintf(`## %s
%s


[查看详情](%s)`, title, operate, publicAddr),
		// SingleTitle: "查看详情",
		// SingleURL:   publicAddr,
	}
}

type MessageNotifyInfo struct {
	ID uint `gorm:"column:id" json:"id"`

	MessageNotifyCommon
}

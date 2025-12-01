package model

import (
	"fmt"
)

type DiscussionType string

const (
	DiscussionTypeQA       DiscussionType = "qa"
	DiscussionTypeFeedback DiscussionType = "feedback"
	DiscussionTypeBlog     DiscussionType = "blog"
	DiscussionTypeIssue    DiscussionType = "issue"
)

type DiscussionState uint

const (
	DiscussionStateNone DiscussionState = iota
	DiscussionStateResolved
	DiscussionStateClosed
	DiscussionStateInProgress
)

type Discussion struct {
	Base

	UUID   string `json:"uuid" gorm:"column:uuid;type:text;uniqueIndex"`
	UserID uint   `json:"user_id" gorm:"column:user_id;type:bigint;index"`
	RagID  string `json:"rag_id" gorm:"column:rag_id;type:text;index"`

	Title       string          `json:"title" gorm:"column:title;type:text"`
	Summary     string          `json:"summary" gorm:"column:summary;type:text"`
	Content     string          `json:"content" gorm:"column:content;type:text"`
	Tags        StringArray     `json:"tags" gorm:"column:tags;type:text[]"`
	GroupIDs    Int64Array      `json:"group_ids" gorm:"column:group_ids;type:bigint[]"`
	Resolved    DiscussionState `json:"resolved" gorm:"column:resolved;type:integer;default:0"`
	ResolvedAt  Timestamp       `json:"resolved_at" gorm:"column:resolved_at;type:timestamp with time zone"`
	Hot         uint            `json:"hot" gorm:"column:hot;type:bigint;default:0"`
	Like        uint            `json:"like" gorm:"column:like;type:bigint;default:0"`
	Dislike     uint            `json:"dislike" gorm:"column:dislike;type:bigint;default:0"`
	View        uint            `json:"view" gorm:"column:view;type:bigint;default:0"`
	Comment     uint            `json:"comment" gorm:"column:comment;type:bigint;default:0"`
	Type        DiscussionType  `json:"type" gorm:"column:type;type:text;default:qa"`
	ForumID     uint            `json:"forum_id" gorm:"column:forum_id;type:bigint;index"`
	Members     Int64Array      `json:"members" gorm:"column:members;type:bigint[]"`
	AssociateID uint            `json:"associate_id" gorm:"column:associate_id;type:bigint;default:0;index"`
}

func (d *Discussion) TitleContent() string {
	return fmt.Sprintf("### 帖子标题：%s\n### 帖子内容：%s", d.Title, d.Content)
}

func (d *Discussion) Header() DiscussHeader {
	return DiscussHeader{
		ForumID:        d.ForumID,
		DiscussID:      d.ID,
		DiscussUUID:    d.UUID,
		DiscussTitle:   d.Title,
		DiscussionType: d.Type,
	}
}

func (d *Discussion) Closed() bool {
	return d.Resolved == DiscussionStateClosed
}

type DiscussionUser struct {
	ID     uint   `json:"id"`
	Name   string `json:"name"`
	Avatar string `json:"avatar"`
}

type DiscussionListItem struct {
	Discussion
	UserName   string `json:"user_name"`
	UserAvatar string `json:"user_avatar"`
}

type DiscussionReply struct {
	Base
	UserID        uint             `json:"user_id"`
	UserName      string           `json:"user_name"`
	UserAvatar    string           `json:"user_avatar"`
	UserRole      UserRole         `json:"user_role"`
	UserLikeState CommentLikeState `json:"user_like_state"`
	Like          int64            `json:"like"`
	Dislike       int64            `json:"dislike"`
	Content       string           `json:"content"`
	Accepted      bool             `json:"accepted"`
	Bot           bool             `json:"bot"`
}

type DiscussionComment struct {
	DiscussionReply
	Replies []DiscussionReply `json:"replies" gorm:"-"`
}

type DiscussionGroup struct {
	ID   uint   `json:"id"`
	Name string `json:"name"`
}
type DiscussionDetail struct {
	Discussion
	CurrentUserID uint                `json:"current_user_id"`
	UserID        uint                `json:"user_id"`
	UserName      string              `json:"user_name"`
	UserAvatar    string              `json:"user_avatar"`
	UserRole      UserRole            `json:"user_role"`
	Groups        []DiscussionGroup   `json:"groups" gorm:"-"`
	Comments      []DiscussionComment `json:"comments" gorm:"-"`
	Associate     DiscussionListItem  `json:"associate"`
	UserLike      bool                `json:"user_like"`
}

type DiscussHeader struct {
	ForumID        uint           `gorm:"column:forum_id" json:"forum_id"`
	DiscussID      uint           `gorm:"column:discussion_id" json:"discuss_id"`
	DiscussUUID    string         `gorm:"column:discuss_uuid;type:text" json:"discuss_uuid"`
	DiscussTitle   string         `gorm:"disucss_title" json:"discuss_title"`
	DiscussionType DiscussionType `gorm:"column:discussion_type" json:"discussion_type"`
}

func init() {
	registerAutoMigrate(&Discussion{})
}

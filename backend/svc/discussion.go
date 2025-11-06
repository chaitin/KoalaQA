package svc

import (
	"bytes"
	"context"
	"errors"
	"fmt"
	"mime/multipart"
	"path/filepath"
	"time"

	"github.com/chaitin/koalaqa/model"
	"github.com/chaitin/koalaqa/pkg/glog"
	"github.com/chaitin/koalaqa/pkg/llm"
	"github.com/chaitin/koalaqa/pkg/mq"
	"github.com/chaitin/koalaqa/pkg/oss"
	"github.com/chaitin/koalaqa/pkg/rag"
	"github.com/chaitin/koalaqa/pkg/ratelimit"
	"github.com/chaitin/koalaqa/pkg/topic"
	"github.com/chaitin/koalaqa/pkg/util"
	"github.com/chaitin/koalaqa/pkg/webhook/message"
	"github.com/chaitin/koalaqa/repo"
	"go.uber.org/fx"
	"gorm.io/gorm"
)

type discussionIn struct {
	fx.In

	DiscRepo      *repo.Discussion
	CommRepo      *repo.Comment
	CommLikeRepo  *repo.CommentLike
	UserRepo      *repo.User
	GroupItemRepo *repo.GroupItem
	OrgRepo       *repo.Org
	BotSvc        *Bot
	TrendSvc      *Trend
	Pub           mq.Publisher
	Rag           rag.Service
	Dataset       *repo.Dataset
	OC            oss.Client
	ForumRepo     *repo.Forum
	Limiter       ratelimit.Limiter
	LLM           *LLM
}

type Discussion struct {
	in discussionIn

	logger      *glog.Logger
	webhookType map[model.DiscussionType]message.Type
}

func newDiscussion(in discussionIn) *Discussion {
	return &Discussion{
		in:     in,
		logger: glog.Module("svc", "discussion"),
		webhookType: map[model.DiscussionType]message.Type{
			model.DiscussionTypeQA:       message.TypeNewQA,
			model.DiscussionTypeFeedback: message.TypeNewFeedback,
			model.DiscussionTypeBlog:     message.TypeNewBlog,
		},
	}
}

func init() {
	registerSvc(newDiscussion)
}

type DiscussionCreateReq struct {
	UserID   uint                 `json:"user_id"`
	Title    string               `json:"title" binding:"required"`
	Content  string               `json:"content"`
	Type     model.DiscussionType `json:"type"`
	Tags     []string             `json:"tags"`
	GroupIDs model.Int64Array     `json:"group_ids"`
	ForumID  uint                 `json:"forum_id"`
}

func (d *Discussion) generateUUID() string {
	return util.RandomString(16)
}

func (d *Discussion) limitKey(args ...any) string {
	if len(args) == 0 {
		return ""
	}

	buff := bytes.NewBufferString("%v")
	for i := 1; i < len(args); i++ {
		buff.WriteString("-%v")
	}

	return fmt.Sprintf(buff.String(), args...)
}

func (d *Discussion) allow(args ...any) bool {
	return d.in.Limiter.Allow(d.limitKey(args...), time.Second*20, 3)
}

var (
	errRatelimit  = errors.New("ratelimit")
	errPermission = errors.New("permission denied")
)

func (d *Discussion) Create(ctx context.Context, req DiscussionCreateReq) (string, error) {
	if !d.allow("discussion", req.UserID) {
		return "", errRatelimit
	}

	ok, err := d.in.UserRepo.HasForumPermission(ctx, req.UserID, req.ForumID)
	if err != nil {
		return "", err
	}

	if !ok {
		return "", errPermission
	}

	if req.ForumID == 0 {
		forumID, err := d.in.ForumRepo.GetFirstID(ctx)
		if err != nil {
			return "", err
		}
		req.ForumID = forumID
	}

	var forum model.Forum
	err = d.in.ForumRepo.GetByID(ctx, &forum, req.ForumID)
	if err != nil {
		return "", err
	}

	for _, group := range forum.Groups.Inner() {
		if group.Type != req.Type {
			continue
		}

		err = d.in.GroupItemRepo.FilterIDs(ctx, &req.GroupIDs, repo.QueryWithEqual("group_id", group.GroupIDs, repo.EqualOPEqAny))
		if err != nil {
			return "", err
		}
		break
	}

	disc := model.Discussion{
		Title:    req.Title,
		Content:  req.Content,
		Tags:     req.Tags,
		GroupIDs: req.GroupIDs,
		UUID:     d.generateUUID(),
		UserID:   req.UserID,
		Type:     req.Type,
		ForumID:  req.ForumID,
		Members:  model.Int64Array{int64(req.UserID)},
		Hot:      2000,
	}
	err = d.in.DiscRepo.Create(ctx, &disc)
	if err != nil {
		return "", err
	}
	d.in.Pub.Publish(ctx, topic.TopicDiscChange, topic.MsgDiscChange{
		OP:       topic.OPInsert,
		DiscID:   disc.ID,
		DiscUUID: disc.UUID,
		Type:     string(disc.Type),
	})

	if webhookType, ok := d.webhookType[disc.Type]; ok {
		d.in.Pub.Publish(ctx, topic.TopicDiscussWebhook, topic.MsgDiscussWebhook{
			MsgType:   webhookType,
			UserID:    req.UserID,
			DiscussID: disc.ID,
		})
	}

	return disc.UUID, nil
}

type DiscussionUpdateReq struct {
	Title    string            `json:"title" binding:"required"`
	Content  string            `json:"content"`
	Tags     model.StringArray `json:"tags"`
	GroupIDs model.Int64Array  `json:"group_ids"`
}

func (d *Discussion) Update(ctx context.Context, user model.UserInfo, uuid string, req DiscussionUpdateReq) error {
	disc, err := d.in.DiscRepo.GetByUUID(ctx, uuid)
	if err != nil {
		return err
	}
	if !user.CanOperator(disc.UserID) {
		return errors.New("not allowed to update discussion")
	}

	ok, err := d.in.UserRepo.HasForumPermission(ctx, user.UID, disc.ForumID)
	if err != nil {
		return err
	}

	if !ok {
		return errPermission
	}

	if err := d.in.DiscRepo.Update(ctx, map[string]any{
		"title":     req.Title,
		"content":   req.Content,
		"tags":      req.Tags,
		"group_ids": req.GroupIDs,
	}, repo.QueryWithEqual("id", disc.ID)); err != nil {
		return err
	}
	d.in.Pub.Publish(ctx, topic.TopicDiscChange, topic.MsgDiscChange{
		OP:       topic.OPUpdate,
		DiscID:   disc.ID,
		DiscUUID: uuid,
		Type:     string(disc.Type),
	})
	return nil
}

func (d *Discussion) ossDir(uuid string) string {
	return fmt.Sprintf("assets/discussion/%s", uuid)
}

func (d *Discussion) Delete(ctx context.Context, user model.UserInfo, uuid string) error {
	disc, err := d.in.DiscRepo.GetByUUID(ctx, uuid)
	if err != nil {
		return err
	}
	if !user.CanOperator(disc.UserID) {
		return errors.New("not allowed to delete discussion")
	}

	ok, err := d.in.UserRepo.HasForumPermission(ctx, user.UID, disc.ForumID)
	if err != nil {
		return err
	}

	if !ok {
		return errPermission
	}

	if err := d.in.DiscRepo.Delete(ctx, repo.QueryWithEqual("uuid", uuid)); err != nil {
		return err
	}
	d.in.Pub.Publish(ctx, topic.TopicDiscChange, topic.MsgDiscChange{
		OP:       topic.OPDelete,
		DiscID:   disc.ID,
		DiscUUID: uuid,
		RagID:    disc.RagID,
		Type:     string(disc.Type),
	})

	_ = d.in.OC.Delete(ctx, d.ossDir(disc.UUID))
	return nil
}

type DiscussionListFilter string

const (
	DiscussionListFilterHot  DiscussionListFilter = "hot"
	DiscussionListFilterNew  DiscussionListFilter = "new"
	DiscussionListFilterMine DiscussionListFilter = "mine"
)

type DiscussionListReq struct {
	*model.Pagination

	Keyword  string               `json:"keyword" form:"keyword"`
	Filter   DiscussionListFilter `json:"filter" form:"filter,default=hot"`
	Type     model.DiscussionType `json:"type" form:"type,default=qa"`
	GroupIDs model.Int64Array     `json:"group_ids" form:"group_ids"`
	ForumID  uint                 `json:"forum_id" form:"forum_id"`
}

func (d *Discussion) ListSimilarity(ctx context.Context, discUUID string) (*model.ListRes[*model.DiscussionListItem], error) {
	disc, err := d.in.DiscRepo.GetByUUID(ctx, discUUID)
	if err != nil {
		return nil, err
	}

	var res model.ListRes[*model.DiscussionListItem]
	discs, err := d.Search(ctx, DiscussionSearchReq{Keyword: disc.Title, ForumID: disc.ForumID})
	if err != nil {
		return nil, err
	}

	for _, searchDisc := range discs {
		if searchDisc.ID == disc.ID {
			continue
		}

		res.Items = append(res.Items, searchDisc)
		if len(res.Items) == 5 {
			break
		}
	}
	res.Total = int64(len(res.Items))
	return &res, nil
}

func (d *Discussion) List(ctx context.Context, userID uint, req DiscussionListReq) (*model.ListRes[*model.DiscussionListItem], error) {
	ok, err := d.in.UserRepo.HasForumPermission(ctx, userID, req.ForumID)
	if err != nil {
		return nil, err
	}

	if !ok {
		return nil, errPermission
	}

	var res model.ListRes[*model.DiscussionListItem]
	if req.Keyword != "" {
		discs, err := d.Search(ctx, DiscussionSearchReq{Keyword: req.Keyword, ForumID: req.ForumID})
		if err != nil {
			return nil, err
		}
		res.Items = discs
		res.Total = int64(len(discs))
		return &res, nil
	}

	groupM := make(map[uint]model.Int64Array)
	if len(req.GroupIDs) > 0 {
		var groupItems []model.GroupItem
		err := d.in.GroupItemRepo.List(ctx, &groupItems, repo.QueryWithEqual("id", req.GroupIDs, repo.EqualOPEqAny))
		if err != nil {
			return nil, err
		}

		for _, item := range groupItems {
			groupM[item.GroupID] = append(groupM[item.GroupID], int64(item.ID))
		}
	}

	var query []repo.QueryOptFunc
	query = append(query, repo.QueryWithEqual("type", req.Type))
	query = append(query, repo.QueryWithEqual("forum_id", req.ForumID))
	if req.Filter == DiscussionListFilterMine {
		query = append(query, repo.QueryWithEqual("members", userID, repo.EqualOPValIn))
	}

	if len(groupM) > 0 {
		for _, groupIDs := range groupM {
			query = append(query, repo.QueryWithEqual("group_ids", groupIDs, repo.EqualOPContainAny))
		}
	}

	pageFuncs := []repo.QueryOptFunc{repo.QueryWithPagination(req.Pagination)}
	switch req.Filter {
	case DiscussionListFilterHot:
		pageFuncs = append(pageFuncs, repo.QueryWithOrderBy(`hot DESC, created_at DESC`))
	case DiscussionListFilterNew:
		pageFuncs = append(pageFuncs, repo.QueryWithOrderBy("updated_at DESC"))
	case DiscussionListFilterMine:
		pageFuncs = append(pageFuncs, repo.QueryWithOrderBy("created_at DESC"))
	}
	err = d.in.DiscRepo.List(ctx, &res.Items, append(query, pageFuncs...)...)
	if err != nil {
		return nil, err
	}
	if err := d.in.DiscRepo.Count(ctx, &res.Total, query...); err != nil {
		return nil, err
	}
	return &res, nil
}

func (d *Discussion) DetailByUUID(ctx context.Context, uid uint, uuid string) (*model.DiscussionDetail, error) {
	discussion, err := d.in.DiscRepo.DetailByUUID(ctx, uid, uuid)
	if err != nil {
		return nil, err
	}

	ok, err := d.in.UserRepo.HasForumPermission(ctx, uid, discussion.ForumID)
	if err != nil {
		return nil, err
	}

	if !ok {
		return nil, errPermission
	}

	go d.IncrementView(uuid)
	return discussion, nil
}

func (d *Discussion) IncrementView(uuid string) {
	ctx := context.Background()
	d.in.DiscRepo.Update(ctx, map[string]any{
		"view":       gorm.Expr("view+1"),
		"updated_at": gorm.Expr("updated_at"),
	}, repo.QueryWithEqual("uuid", uuid))

	go d.RecalculateHot(uuid)
}

func (d *Discussion) IncrementComment(uuid string, updateTime bool) {
	ctx := context.Background()
	m := map[string]any{
		"comment": gorm.Expr("comment+1"),
	}

	if !updateTime {
		m["updated_at"] = gorm.Expr("updated_at")
	}

	d.in.DiscRepo.Update(ctx, m, repo.QueryWithEqual("uuid", uuid))

	go d.RecalculateHot(uuid)
}

func (d *Discussion) DecrementComment(uuid string) {
	ctx := context.Background()
	d.in.DiscRepo.Update(ctx, map[string]any{
		"comment": gorm.Expr("CASE WHEN comment>0 THEN comment-1 END"),
	}, repo.QueryWithEqual("uuid", uuid))

	go d.RecalculateHot(uuid)
}

func (d *Discussion) RecalculateHot(uuid string) {
	ctx := context.Background()
	// 算法特点：
	// 1. 对数缩放防止大数值垄断热榜
	// 2. 点赞权重最高(0.4)，浏览和评论各占0.3
	// 3. 时间衰减机制，每小时衰减约1%
	// 4. 乘以10000，避免小数精度问题
	// 5. 已解决问题获得1.3倍加权，体现其参考价值
	hotFormula := `(
		0.3 * LN(GREATEST(view, 0) + 1) + 
		0.4 * LN(GREATEST("like", 0) + 1) + 
		0.3 * LN(GREATEST(comment, 0) + 1)
	) * EXP(-0.01 * EXTRACT(EPOCH FROM (NOW() - updated_at))/3600)
	  * 10000
	  * CASE WHEN resolved = true THEN 1.3 ELSE 1.0 END`

	d.in.DiscRepo.Update(ctx, map[string]any{
		"hot":        gorm.Expr(hotFormula),
		"updated_at": gorm.Expr("updated_at"),
	}, repo.QueryWithEqual("uuid", uuid))
}

func (d *Discussion) LikeDiscussion(ctx context.Context, discUUID string, user model.UserInfo) error {
	if !d.allow("like", discUUID, user.UID) {
		return errRatelimit
	}

	disc, err := d.in.DiscRepo.GetByUUID(ctx, discUUID)
	if err != nil {
		return err
	}

	ok, err := d.in.UserRepo.HasForumPermission(ctx, user.UID, disc.ForumID)
	if err != nil {
		return err
	}

	if !ok {
		return errPermission
	}

	if err := d.in.DiscRepo.LikeDiscussion(ctx, discUUID, user.UID); err != nil {
		return err
	}

	notifyMsg := topic.MsgMessageNotify{
		DiscussID:      disc.ID,
		ForumID:        disc.ForumID,
		DiscussionType: disc.Type,
		DiscussUUID:    disc.UUID,
		DiscussTitle:   disc.Title,
		Type:           model.MsgNotifyTypeLikeDiscussion,
		FromID:         user.UID,
		ToID:           disc.UserID,
	}
	_ = d.in.Pub.Publish(ctx, topic.TopicMessageNotify, notifyMsg)
	go d.RecalculateHot(discUUID)
	return nil
}

func (d *Discussion) RevokeLikeDiscussion(ctx context.Context, discUUID string, uid uint) error {
	if !d.allow("like", discUUID, uid) {
		return errRatelimit
	}

	disc, err := d.in.DiscRepo.GetByUUID(ctx, discUUID)
	if err != nil {
		return err
	}

	ok, err := d.in.UserRepo.HasForumPermission(ctx, uid, disc.ForumID)
	if err != nil {
		return err
	}

	if !ok {
		return errPermission
	}

	if err := d.in.DiscRepo.RevokeLikeDiscussion(ctx, discUUID, uid); err != nil {
		return err
	}
	go d.RecalculateHot(discUUID)
	return nil
}

type DiscussionSearchReq struct {
	Keyword string
	ForumID uint
}

func (d *Discussion) Search(ctx context.Context, req DiscussionSearchReq) ([]*model.DiscussionListItem, error) {
	var forum model.Forum
	err := d.in.ForumRepo.GetByID(ctx, &forum, req.ForumID)
	if err != nil {
		return nil, err
	}
	records, err := d.in.Rag.QueryRecords(ctx, rag.QueryRecordsReq{
		DatasetIDs:          []string{forum.DatasetID},
		Query:               req.Keyword,
		GroupIDs:            nil,
		TopK:                10,
		SimilarityThreshold: 0.2,
	})
	if err != nil {
		return nil, err
	}
	if len(records) == 0 {
		return []*model.DiscussionListItem{}, nil
	}
	var ragIDs []string
	for _, record := range records {
		ragIDs = append(ragIDs, record.DocID)
	}
	var discussions []*model.DiscussionListItem
	err = d.in.DiscRepo.List(ctx, &discussions, repo.QueryWithEqual("rag_id", ragIDs, repo.EqualOPIn))
	if err != nil {
		return nil, err
	}
	sortedDiscussions := util.SortByKeys(discussions, ragIDs, func(d *model.DiscussionListItem) string {
		return d.RagID
	})
	return sortedDiscussions, nil
}

func (d *Discussion) GetByID(ctx context.Context, id uint) (*model.Discussion, error) {
	var discussion model.Discussion
	err := d.in.DiscRepo.GetByID(ctx, &discussion, id)
	if err != nil {
		return nil, err
	}
	return &discussion, nil
}

type CommentCreateReq struct {
	CommentID uint   `json:"comment_id"`
	Content   string `json:"content" binding:"required"`
	Bot       bool   `json:"-" swaggerignore:"true"`
}

func (d *Discussion) CreateComment(ctx context.Context, uid uint, discUUID string, req CommentCreateReq) (uint, error) {
	disc, err := d.in.DiscRepo.GetByUUID(ctx, discUUID)
	if err != nil {
		return 0, err
	}

	if !req.Bot {
		if !d.allow("comment", discUUID, uid) {
			return 0, errRatelimit
		}

		ok, err := d.in.UserRepo.HasForumPermission(ctx, uid, disc.ForumID)
		if err != nil {
			return 0, err
		}

		if !ok {
			return 0, errPermission
		}
	}

	parentID := d.getParentID(ctx, req.CommentID)
	comment := model.Comment{
		DiscussionID: disc.ID,
		ParentID:     parentID,
		UserID:       uid,
		Content:      req.Content,
		Bot:          req.Bot,
	}
	err = d.in.CommRepo.Create(ctx, &comment)
	if err != nil {
		return 0, err
	}

	if err = d.in.DiscRepo.Update(ctx, map[string]any{
		"members":    gorm.Expr("array_append(members, ?)", uid),
		"updated_at": gorm.Expr("updated_at"),
	}, repo.QueryWithEqual("id", disc.ID)); err != nil {
		return 0, err
	}

	d.in.Pub.Publish(ctx, topic.TopicCommentChange, topic.MsgCommentChange{
		OP:       topic.OPInsert,
		CommID:   comment.ID,
		DiscID:   disc.ID,
		DiscUUID: discUUID,
	})
	toID := disc.UserID
	typ := model.MsgNotifyTypeReplyDiscuss
	if parentID > 0 {
		typ = model.MsgNotifyTypeReplyComment
		var parentComment model.Comment
		err := d.in.CommRepo.GetByID(ctx, &parentComment, parentID)
		if err != nil {
			return 0, err
		}
		toID = parentComment.UserID
	}
	notifyMsg := topic.MsgMessageNotify{
		DiscussID:      disc.ID,
		ForumID:        disc.ForumID,
		DiscussionType: disc.Type,
		DiscussTitle:   disc.Title,
		DiscussUUID:    disc.UUID,
		Type:           typ,
		FromID:         uid,
		ToID:           toID,
	}
	d.in.Pub.Publish(ctx, topic.TopicMessageNotify, notifyMsg)
	return comment.ID, nil
}

type CommentUpdateReq struct {
	Content string `json:"content" binding:"required"`
	Bot     bool   `json:"-" swaggerignore:"true"`
}

func (d *Discussion) UpdateComment(ctx context.Context, user model.UserInfo, discUUID string, commentID uint, req CommentUpdateReq) error {
	if !d.allow("comment", discUUID, user.UID) {
		return errRatelimit
	}

	disc, err := d.in.DiscRepo.GetByUUID(ctx, discUUID)
	if err != nil {
		return err
	}

	ok, err := d.in.UserRepo.HasForumPermission(ctx, user.UID, disc.ForumID)
	if err != nil {
		return err
	}

	if !ok {
		return errPermission
	}

	comment, err := d.GetCommentByID(ctx, commentID)
	if err != nil {
		return err
	}
	if !user.CanOperator(comment.UserID) {
		return errors.New("not allowed to update comment")
	}
	if err := d.in.CommRepo.Update(ctx, map[string]any{
		"content": req.Content,
		"bot":     req.Bot,
	}, repo.QueryWithEqual("id", commentID)); err != nil {
		return err
	}
	d.in.Pub.Publish(ctx, topic.TopicCommentChange, topic.MsgCommentChange{
		OP:       topic.OPUpdate,
		CommID:   commentID,
		DiscID:   disc.ID,
		DiscUUID: discUUID,
	})
	return nil
}

func (d *Discussion) DeleteComment(ctx context.Context, user model.UserInfo, discUUID string, commentID uint) error {
	disc, err := d.in.DiscRepo.GetByUUID(ctx, discUUID)
	if err != nil {
		return err
	}

	ok, err := d.in.UserRepo.HasForumPermission(ctx, user.UID, disc.ForumID)
	if err != nil {
		return err
	}

	if !ok {
		return errPermission
	}

	var comment model.Comment
	if err := d.in.CommRepo.GetByID(ctx, &comment, commentID); err != nil {
		return err
	}
	if !user.CanOperator(comment.UserID) {
		return errors.New("not allowed to delete comment")
	}
	if err := d.in.CommRepo.Delete(ctx, repo.QueryWithEqual("id", commentID)); err != nil {
		return err
	}
	if err := d.in.CommLikeRepo.Delete(ctx, repo.QueryWithEqual("comment_id", commentID)); err != nil {
		return err
	}
	d.in.Pub.Publish(ctx, topic.TopicCommentChange, topic.MsgCommentChange{
		OP:       topic.OPDelete,
		CommID:   commentID,
		DiscID:   disc.ID,
		DiscUUID: discUUID,
	})
	return nil
}

func (d *Discussion) getParentID(ctx context.Context, id uint) uint {
	if id == 0 {
		return 0
	}
	var comment model.Comment
	if err := d.in.CommRepo.GetByID(ctx, &comment, id); err != nil {
		return 0
	}
	if comment.ParentID > 0 {
		return comment.ParentID
	}
	return comment.ID
}

func (d *Discussion) UpdateRagID(ctx context.Context, id uint, ragID string) error {
	if err := d.in.DiscRepo.Update(ctx, map[string]any{
		"rag_id":     ragID,
		"updated_at": gorm.Expr("updated_at"),
	}, repo.QueryWithEqual("id", id)); err != nil {
		return err
	}
	return nil
}

type DiscussUploadFileReq struct {
	UUID string                `form:"uuid"`
	File *multipart.FileHeader `form:"file" swaggerignore:"true"`
}

func (d *Discussion) UploadFile(ctx context.Context, req DiscussUploadFileReq) (string, error) {
	f, err := req.File.Open()
	if err != nil {
		return "", err
	}
	defer f.Close()

	return d.in.OC.Upload(ctx, d.ossDir(req.UUID), f,
		oss.WithExt(filepath.Ext(req.File.Filename)),
		oss.WithFileSize(int(req.File.Size)),
		oss.WithLimitSize(),
		oss.WithPublic(),
	)
}

func (d *Discussion) AcceptComment(ctx context.Context, user model.UserInfo, discUUID string, commentID uint) error {
	if !d.allow("accept", discUUID, user.UID) {
		return errRatelimit
	}

	disc, err := d.in.DiscRepo.GetByUUID(ctx, discUUID)
	if err != nil {
		return err
	}
	if disc.UserID != user.UID {
		return errors.New("not allowed to accept comment")
	}

	ok, err := d.in.UserRepo.HasForumPermission(ctx, user.UID, disc.ForumID)
	if err != nil {
		return err
	}

	if !ok {
		return errPermission
	}

	comment, err := d.in.CommRepo.Detail(ctx, commentID)
	if err != nil {
		return err
	}

	if comment.Accepted {
		err = d.in.CommRepo.Update(ctx, map[string]any{
			"accepted":    false,
			"accepted_at": gorm.Expr("null"),
		}, repo.QueryWithEqual("id", commentID))
		if err != nil {
			return err
		}

		err = d.in.DiscRepo.Update(ctx, map[string]any{
			"resolved":    false,
			"resolved_at": gorm.Expr("null"),
		}, repo.QueryWithEqual("id", disc.ID))
		if err != nil {
			return err
		}

		return nil
	}

	err = d.in.CommRepo.Update(ctx, map[string]any{
		"accepted":    false,
		"accepted_at": gorm.Expr("null"),
	}, repo.QueryWithEqual("discussion_id", disc.ID),
		repo.QueryWithEqual("accepted", true))
	if err != nil {
		return err
	}

	if err := d.in.CommRepo.UpdateByModel(ctx, &model.Comment{
		Accepted:   true,
		AcceptedAt: model.Timestamp(time.Now().Unix()),
	}, repo.QueryWithEqual("id", commentID)); err != nil {
		return err
	}

	if !disc.Resolved {
		if err := d.in.DiscRepo.Update(ctx, map[string]any{
			"resolved":    true,
			"resolved_at": model.Timestamp(time.Now().Unix()),
		}, repo.QueryWithEqual("id", disc.ID)); err != nil {
			return err
		}
	}

	err = d.in.TrendSvc.Create(ctx, &model.Trend{
		UserID:        comment.UserID,
		Type:          model.TrendTypeAnswerAccepted,
		DiscussHeader: disc.Header(),
	})
	if err != nil {
		d.logger.WithContext(ctx).WithErr(err).With("comment_id", commentID).Warn("create accept comment trend failed")
	}

	notifyMsg := topic.MsgMessageNotify{
		DiscussID:      disc.ID,
		ForumID:        disc.ForumID,
		DiscussionType: disc.Type,
		DiscussTitle:   disc.Title,
		DiscussUUID:    disc.UUID,
		Type:           model.MsgNotifyTypeApplyComment,
		CommentID:      commentID,
		FromID:         user.UID,
		ToID:           comment.UserID,
	}
	d.in.Pub.Publish(ctx, topic.TopicMessageNotify, notifyMsg)

	go d.RecalculateHot(discUUID)

	return nil
}

func (d *Discussion) LikeComment(ctx context.Context, userInfo model.UserInfo, discUUID string, commentID uint) error {
	if !d.allow("like", discUUID, userInfo.UID) {
		return errRatelimit
	}

	disc, err := d.in.DiscRepo.GetByUUID(ctx, discUUID)
	if err != nil {
		return err
	}

	ok, err := d.in.UserRepo.HasForumPermission(ctx, userInfo.UID, disc.ForumID)
	if err != nil {
		return err
	}

	if !ok {
		return errPermission
	}

	var comment model.Comment
	err = d.in.CommRepo.GetByID(ctx, &comment, commentID)
	if err != nil {
		return err
	}

	changed, err := d.in.CommLikeRepo.Like(ctx, userInfo.UID, disc.ID, commentID, model.CommentLikeStateLike)
	if err != nil {
		return err
	}
	if !changed {
		return nil
	}

	notifyMsg := topic.MsgMessageNotify{
		DiscussID:      disc.ID,
		ForumID:        disc.ForumID,
		DiscussionType: disc.Type,
		DiscussUUID:    disc.UUID,
		DiscussTitle:   disc.Title,
		Type:           model.MsgNotifyTypeLikeComment,
		FromID:         userInfo.UID,
		ToID:           comment.UserID,
	}
	err = d.in.Pub.Publish(ctx, topic.TopicMessageNotify, notifyMsg)
	if err != nil {
		d.logger.WithContext(ctx).WithErr(err).With("notify_msg", notifyMsg).Warn("notify commentlike failed")
	}

	return nil
}

func (d *Discussion) DislikeComment(ctx context.Context, userInfo model.UserInfo, discUUID string, commentID uint) error {
	if !d.allow("like", discUUID, userInfo.UID) {
		return errRatelimit
	}

	disc, err := d.in.DiscRepo.GetByUUID(ctx, discUUID)
	if err != nil {
		return err
	}

	ok, err := d.in.UserRepo.HasForumPermission(ctx, userInfo.UID, disc.ForumID)
	if err != nil {
		return err
	}

	if !ok {
		return errPermission
	}

	var comment model.Comment
	err = d.in.CommRepo.GetByID(ctx, &comment, commentID)
	if err != nil {
		return err
	}

	changed, err := d.in.CommLikeRepo.Like(ctx, userInfo.UID, disc.ID, commentID, model.CommentLikeStateDislike)
	if err != nil {
		return err
	}
	if !changed {
		return nil
	}

	notifyMsg := topic.MsgMessageNotify{
		DiscussID:      disc.ID,
		ForumID:        disc.ForumID,
		DiscussionType: disc.Type,
		DiscussUUID:    disc.UUID,
		DiscussTitle:   disc.Title,
		Type:           model.MsgNotifyTypeDislikeComment,
		FromID:         userInfo.UID,
		ToID:           comment.UserID,
	}
	err = d.in.Pub.Publish(ctx, topic.TopicMessageNotify, notifyMsg)
	if err != nil {
		d.logger.WithContext(ctx).WithErr(err).With("notify_msg", notifyMsg).Warn("notify commentlike failed")
	}

	return nil
}

func (d *Discussion) RevokeLike(ctx context.Context, uid uint, discUUID string, commentID uint) error {
	if !d.allow("like", discUUID, uid) {
		return errRatelimit
	}

	disc, err := d.in.DiscRepo.GetByUUID(ctx, discUUID)
	if err != nil {
		return err
	}

	ok, err := d.in.UserRepo.HasForumPermission(ctx, uid, disc.ForumID)
	if err != nil {
		return err
	}

	if !ok {
		return errPermission
	}

	ok, err = d.in.CommRepo.ExistByID(ctx, commentID)
	if err != nil {
		return err
	}

	if !ok {
		return errors.New("comment not exist")
	}

	return d.in.CommLikeRepo.RevokeLike(ctx, uid, commentID)
}

func (d *Discussion) GetCommentByID(ctx context.Context, id uint) (*model.Comment, error) {
	var comment model.Comment
	err := d.in.CommRepo.GetByID(ctx, &comment, id)
	if err != nil {
		return nil, err
	}
	return &comment, nil
}

type DiscussionCompeletReq struct {
	Prefix string `json:"prefix"`
	Suffix string `json:"suffix"`
}

func (d *Discussion) Complete(ctx context.Context, req DiscussionCompeletReq) (string, error) {
	if req.Prefix == "" && req.Suffix == "" {
		return "", nil
	}

	return d.in.LLM.Chat(ctx, llm.SystemCompletePrompt, llm.UserCompleteTemplate, map[string]any{
		"Prefix": req.Prefix,
		"Suffix": req.Suffix,
	})
}

type ResolveFeedbackReq struct {
	Resolve bool `json:"resolve"`
}

func (d *Discussion) ResolveFeedback(ctx context.Context, user model.UserInfo, discUUID string, req ResolveFeedbackReq) error {
	disc, err := d.in.DiscRepo.GetByUUID(ctx, discUUID)
	if err != nil {
		return err
	}

	if !user.CanOperator(disc.UserID) || disc.Type != model.DiscussionTypeFeedback {
		return errors.New("not allowed to close feedback")
	}

	err = d.in.DiscRepo.Update(ctx, map[string]any{
		"resolved":    req.Resolve,
		"resolved_at": model.Timestamp(time.Now().Unix()),
	}, repo.QueryWithEqual("id", disc.ID))
	if err != nil {
		return err
	}

	return nil
}

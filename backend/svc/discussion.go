package svc

import (
	"context"
	"errors"
	"fmt"
	"mime/multipart"
	"path/filepath"
	"time"

	"github.com/chaitin/koalaqa/model"
	"github.com/chaitin/koalaqa/pkg/glog"
	"github.com/chaitin/koalaqa/pkg/mq"
	"github.com/chaitin/koalaqa/pkg/oss"
	"github.com/chaitin/koalaqa/pkg/rag"
	"github.com/chaitin/koalaqa/pkg/topic"
	"github.com/chaitin/koalaqa/pkg/util"
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
	Pub           mq.Publisher
	Rag           rag.Service
	Dataset       *repo.Dataset
	OC            oss.Client
}

type Discussion struct {
	in discussionIn

	logger *glog.Logger
}

func newDiscussion(in discussionIn) *Discussion {
	return &Discussion{in: in, logger: glog.Module("svc", "discussion")}
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
}

func (d *Discussion) generateUUID() string {
	return util.RandomString(16)
}

func (d *Discussion) Create(ctx context.Context, req DiscussionCreateReq) (uint, error) {
	if len(req.GroupIDs) > 0 {
		err := d.in.GroupItemRepo.FilterIDs(ctx, &req.GroupIDs)
		if err != nil {
			return 0, err
		}
	}

	disc := model.Discussion{
		Title:    req.Title,
		Content:  req.Content,
		Tags:     req.Tags,
		GroupIDs: req.GroupIDs,
		UUID:     d.generateUUID(),
		UserID:   req.UserID,
		Type:     req.Type,
	}
	err := d.in.DiscRepo.Create(ctx, &disc)
	if err != nil {
		return 0, err
	}
	d.in.Pub.Publish(ctx, topic.TopicDiscChange, topic.MsgDiscChange{
		OP:       topic.OPInsert,
		DiscID:   disc.ID,
		DiscUUID: disc.UUID,
		Type:     string(disc.Type),
	})
	return disc.ID, nil
}

type DiscussionUpdateReq struct {
	Title    string   `json:"title" binding:"required"`
	Content  string   `json:"content" binding:"required"`
	Tags     []string `json:"tags" binding:"required"`
	GroupIDs []int64  `json:"group_ids" binding:"required"`
}

func (d *Discussion) Update(ctx context.Context, uuid string, req DiscussionUpdateReq) error {
	disc, err := d.in.DiscRepo.GetByUUID(ctx, uuid)
	if err != nil {
		return err
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

func (d *Discussion) Delete(ctx context.Context, uuid string) error {
	disc, err := d.in.DiscRepo.GetByUUID(ctx, uuid)
	if err != nil {
		return err
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
}

func (d *Discussion) List(ctx context.Context, userID uint, req DiscussionListReq) (*model.ListRes[*model.DiscussionListItem], error) {
	var res model.ListRes[*model.DiscussionListItem]
	if req.Keyword != "" {
		discs, err := d.Search(ctx, DiscussionSearchReq{Keyword: req.Keyword})
		if err != nil {
			return nil, err
		}
		res.Items = discs
		res.Total = int64(len(discs))
		return &res, nil
	}
	var query []repo.QueryOptFunc
	query = append(query, repo.QueryWithEqual("type", req.Type))
	if req.Filter == DiscussionListFilterMine {
		query = append(query, repo.QueryWithEqual("user_id", userID))
	}

	if len(req.GroupIDs) > 0 {
		query = append(query, repo.QueryWithEqual("group_ids", req.GroupIDs, repo.EqualOPInclude))
	}

	pageFuncs := []repo.QueryOptFunc{repo.QueryWithPagination(req.Pagination)}
	switch req.Filter {
	case DiscussionListFilterHot:
		pageFuncs = append(pageFuncs, repo.QueryWithOrderBy(`"like" DESC, created_at DESC`))
	case DiscussionListFilterNew:
		pageFuncs = append(pageFuncs, repo.QueryWithOrderBy("updated_at DESC"))
	case DiscussionListFilterMine:
		pageFuncs = append(pageFuncs, repo.QueryWithOrderBy("created_at DESC"))
	}
	err := d.in.DiscRepo.List(ctx, &res.Items, append(query, pageFuncs...)...)
	if err != nil {
		return nil, err
	}
	if err := d.in.DiscRepo.Count(ctx, &res.Total, query...); err != nil {
		return nil, err
	}
	return &res, nil
}

func (d *Discussion) Detail(ctx context.Context, uid uint, uuid string) (*model.DiscussionDetail, error) {
	discussion, err := d.in.DiscRepo.DetailByUUID(ctx, uid, uuid)
	if err != nil {
		return nil, err
	}
	return discussion, nil
}

type DiscussionSearchReq struct {
	Keyword string `json:"keyword" form:"keyword"`
}

func (d *Discussion) Search(ctx context.Context, req DiscussionSearchReq) ([]*model.DiscussionListItem, error) {
	records, err := d.in.Rag.QueryRecords(ctx, []string{d.in.Dataset.GetFrontendID(ctx)}, req.Keyword, nil)
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
	comment := model.Comment{
		DiscussionID: disc.ID,
		ParentID:     d.getParentID(ctx, req.CommentID),
		UserID:       uid,
		Content:      req.Content,
		Bot:          req.Bot,
	}
	err = d.in.CommRepo.Create(ctx, &comment)
	if err != nil {
		return 0, err
	}

	err = d.in.DiscRepo.Update(ctx, map[string]any{
		"updated_at": time.Now(),
		"comment":    gorm.Expr("comment+1"),
	}, repo.QueryWithEqual("id", disc.ID))
	if err != nil {
		d.logger.WithContext(ctx).WithErr(err).With("disc_id", disc.ID).Warn("incr comment number failed")
	}

	if !req.Bot {
		d.in.Pub.Publish(ctx, topic.TopicCommentChange, topic.MsgCommentChange{
			OP:       topic.OPInsert,
			CommID:   comment.ID,
			DiscID:   disc.ID,
			DiscUUID: discUUID,
		})
	}
	return comment.ID, nil
}

type CommentUpdateReq struct {
	Content string `json:"content" binding:"required"`
	Bot     bool   `json:"-" swaggerignore:"true"`
}

func (d *Discussion) UpdateComment(ctx context.Context, uid uint, discUUID string, commentID uint, req CommentUpdateReq) error {
	disc, err := d.in.DiscRepo.GetByUUID(ctx, discUUID)
	if err != nil {
		return err
	}
	if err := d.in.CommRepo.Update(ctx, map[string]any{
		"content": req.Content,
		"bot":     req.Bot,
	}, repo.QueryWithEqual("id", commentID)); err != nil {
		return err
	}
	if !req.Bot {
		d.in.Pub.Publish(ctx, topic.TopicCommentChange, topic.MsgCommentChange{
			OP:       topic.OPUpdate,
			CommID:   commentID,
			DiscID:   disc.ID,
			DiscUUID: discUUID,
		})
	}
	return nil
}

type CommentDeleteReq struct {
}

func (d *Discussion) DeleteComment(ctx context.Context, uid uint, discUUID string, commentID uint) error {
	disc, err := d.in.DiscRepo.GetByUUID(ctx, discUUID)
	if err != nil {
		return err
	}
	var comment model.Comment
	if err := d.in.CommRepo.GetByID(ctx, &comment, commentID); err != nil {
		return err
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
	if err := d.in.DiscRepo.UpdateByModel(ctx, &model.Discussion{
		RagID: ragID,
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
	disc, err := d.in.DiscRepo.GetByUUID(ctx, discUUID)
	if err != nil {
		return err
	}
	if disc.UserID != user.UID {
		return errors.New("not allowed to accept comment")
	}
	if disc.Resolved {
		return errors.New("discussion already resolved")
	}
	alreadyAccepted, err := d.in.CommRepo.Exist(ctx,
		repo.QueryWithEqual("discussion_id", disc.ID),
		repo.QueryWithEqual("accepted", true),
	)
	if err != nil {
		return err
	}
	if alreadyAccepted {
		return errors.New("comment already accepted")
	}
	comment, err := d.in.CommRepo.Detail(ctx, commentID)
	if err != nil {
		return err
	}
	if err := d.in.CommRepo.UpdateByModel(ctx, &model.Comment{
		Accepted:   true,
		AcceptedAt: model.Timestamp(time.Now().Unix()),
	}, repo.QueryWithEqual("id", commentID)); err != nil {
		return err
	}
	notifyMsg := topic.MsgMessageNotify{
		DiscussID:    disc.ID,
		DiscussTitle: disc.Title,
		DiscussUUID:  disc.UUID,
		Type:         model.MsgNotifyTypeApplyComment,
		FromID:       user.UID,
		ToID:         comment.UserID,
	}
	d.in.Pub.Publish(ctx, topic.TopicMessageNotify, notifyMsg)
	return nil
}

func (d *Discussion) LikeComment(ctx context.Context, userInfo model.UserInfo, discUUID string, commentID uint) error {
	disc, err := d.in.DiscRepo.GetByUUID(ctx, discUUID)
	if err != nil {
		return err
	}
	var comment model.Comment
	err = d.in.CommRepo.GetByID(ctx, &comment, commentID)
	if err != nil {
		return err
	}

	err = d.in.CommLikeRepo.Like(ctx, userInfo.UID, disc.ID, commentID, model.CommentLikeStateLike)
	if err != nil {
		return err
	}

	notifyMsg := topic.MsgMessageNotify{
		DiscussID:    disc.ID,
		DiscussUUID:  disc.UUID,
		DiscussTitle: disc.Title,
		Type:         model.MsgNotifyTypeLikeComment,
		FromID:       userInfo.UID,
		ToID:         comment.UserID,
	}
	err = d.in.Pub.Publish(ctx, topic.TopicMessageNotify, notifyMsg)
	if err != nil {
		d.logger.WithContext(ctx).WithErr(err).With("notify_msg", notifyMsg).Warn("notify commentlike failed")
	}

	return nil
}

func (d *Discussion) DislikeComment(ctx context.Context, userInfo model.UserInfo, discUUID string, commentID uint) error {
	disc, err := d.in.DiscRepo.GetByUUID(ctx, discUUID)
	if err != nil {
		return err
	}
	var comment model.Comment
	err = d.in.CommRepo.GetByID(ctx, &comment, commentID)
	if err != nil {
		return err
	}

	err = d.in.CommLikeRepo.Like(ctx, userInfo.UID, disc.ID, commentID, model.CommentLikeStateDislike)
	if err != nil {
		return err
	}

	notifyMsg := topic.MsgMessageNotify{
		DiscussID:    disc.ID,
		DiscussUUID:  disc.UUID,
		DiscussTitle: disc.Title,
		Type:         model.MsgNotifyTypeDislikeComment,
		FromID:       userInfo.UID,
		ToID:         comment.UserID,
	}
	err = d.in.Pub.Publish(ctx, topic.TopicMessageNotify, notifyMsg)
	if err != nil {
		d.logger.WithContext(ctx).WithErr(err).With("notify_msg", notifyMsg).Warn("notify commentlike failed")
	}

	return nil
}

func (d *Discussion) RevokeLike(ctx context.Context, uid uint, commentID uint) error {
	ok, err := d.in.CommRepo.ExistByID(ctx, commentID)
	if err != nil {
		return err
	}

	if !ok {
		return errors.New("comment not exist")
	}

	return d.in.CommLikeRepo.RevokeLike(ctx, uid, commentID)
}

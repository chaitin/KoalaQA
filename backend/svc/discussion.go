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
	"github.com/chaitin/koalaqa/pkg/batch"
	"github.com/chaitin/koalaqa/pkg/database"
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

	DiscRepo       *repo.Discussion
	DiscFollowRepo *repo.DiscussionFollow
	CommRepo       *repo.Comment
	CommLikeRepo   *repo.CommentLike
	UserRepo       *repo.User
	GroupItemRepo  *repo.GroupItem
	OrgRepo        *repo.Org
	BotSvc         *Bot
	TrendSvc       *Trend
	Pub            mq.Publisher
	Rag            rag.Service
	Dataset        *repo.Dataset
	OC             oss.Client
	ForumRepo      *repo.Forum
	Limiter        ratelimit.Limiter
	LLM            *LLM
	Batcher        batch.Batcher[model.StatInfo]
	UserPoint      *UserPoint
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
			model.DiscussionTypeIssue:    message.TypeNewIssue,
		},
	}
}

func init() {
	registerSvc(newDiscussion)
}

type DiscussionCreateReq struct {
	Title     string               `json:"title" binding:"required"`
	Summary   string               `json:"summary"`
	Content   string               `json:"content"`
	Type      model.DiscussionType `json:"type"`
	Tags      []string             `json:"tags"`
	GroupIDs  model.Int64Array     `json:"group_ids"`
	ForumID   uint                 `json:"forum_id"`
	skipLimit bool                 `json:"-"`
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

func (d *Discussion) Create(ctx context.Context, user model.UserInfo, req DiscussionCreateReq) (string, error) {
	if !req.skipLimit && !d.allow("discussion", user.UID) {
		return "", errRatelimit
	}

	ok, err := d.in.UserRepo.HasForumPermission(ctx, user.UID, req.ForumID)
	if err != nil {
		return "", err
	}

	if !ok {
		return "", errPermission
	}

	if req.Type == model.DiscussionTypeIssue && !user.CanOperator(0) {
		return "", errPermission
	}

	if req.Type != model.DiscussionTypeBlog {
		req.Summary = ""
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
		Summary:  req.Summary,
		Content:  req.Content,
		Tags:     req.Tags,
		GroupIDs: req.GroupIDs,
		UUID:     d.generateUUID(),
		UserID:   user.UID,
		Type:     req.Type,
		ForumID:  req.ForumID,
		Members:  model.Int64Array{int64(user.UID)},
		Hot:      2000,
	}
	err = d.in.DiscRepo.Create(ctx, &disc)
	if err != nil {
		return "", err
	}

	switch disc.Type {
	case model.DiscussionTypeQA:
		d.in.Pub.Publish(ctx, topic.TopicAIInsight, topic.MsgAIInsight{
			ForumID: disc.ForumID,
			Keyword: disc.Title,
		})
		fallthrough
	case model.DiscussionTypeBlog, model.DiscussionTypeIssue:
		err = d.in.TrendSvc.Create(ctx, &model.Trend{
			UserID:        disc.UserID,
			Type:          model.TrendTypeCreateDiscuss,
			DiscussHeader: disc.Header(),
		})
		if err != nil {
			d.logger.WithContext(ctx).WithErr(err).With("disc_id", disc).Warn("create user trend failed")
		}
	}

	statType, ok := model.DiscussionType2StatType[disc.Type]
	if ok {
		d.in.Batcher.Send(model.StatInfo{
			Type: statType,
			Ts:   util.HourTrunc(time.Now()).Unix(),
			Key:  disc.UUID,
		})
	}

	d.in.Pub.Publish(ctx, topic.TopicDiscChange, topic.MsgDiscChange{
		OP:       topic.OPInsert,
		ForumID:  disc.ForumID,
		DiscID:   disc.ID,
		DiscUUID: disc.UUID,
		UserID:   disc.UserID,
		Type:     disc.Type,
		RagID:    disc.RagID,
	})

	if webhookType, ok := d.webhookType[disc.Type]; ok {
		d.in.Pub.Publish(ctx, topic.TopicDiscussWebhook, topic.MsgDiscussWebhook{
			MsgType:   webhookType,
			UserID:    user.UID,
			DiscussID: disc.ID,
		})
	}

	return disc.UUID, nil
}

var errDiscussionClosed = errors.New("discussion has been closed")

type DiscussionUpdateReq struct {
	Title    string           `json:"title"`
	Summary  string           `json:"summary"`
	Content  string           `json:"content"`
	GroupIDs model.Int64Array `json:"group_ids"`
}

func (d *Discussion) Update(ctx context.Context, user model.UserInfo, uuid string, req DiscussionUpdateReq) error {
	disc, err := d.in.DiscRepo.GetByUUID(ctx, uuid)
	if err != nil {
		return err
	}
	if !user.CanOperator(disc.UserID) {
		return errors.New("not allowed to update discussion")
	}

	err = d.CheckPerm(ctx, user.UID, disc)
	if err != nil {
		return err
	}

	updateM := make(map[string]any)

	if req.Title != "" {
		updateM["title"] = req.Title
	}
	if req.Content != "" {
		updateM["content"] = req.Content
	}

	if len(req.GroupIDs) > 0 {
		updateM["group_ids"] = req.GroupIDs
	}

	if disc.Type == model.DiscussionTypeBlog && req.Summary != "" {
		updateM["summary"] = req.Summary
	}

	if err := d.in.DiscRepo.Update(ctx, updateM, repo.QueryWithEqual("id", disc.ID)); err != nil {
		return err
	}
	d.in.Pub.Publish(ctx, topic.TopicDiscChange, topic.MsgDiscChange{
		OP:       topic.OPUpdate,
		ForumID:  disc.ForumID,
		DiscID:   disc.ID,
		DiscUUID: uuid,
		UserID:   disc.UserID,
		Type:     disc.Type,
		RagID:    disc.RagID,
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

	if disc.Type == model.DiscussionTypeQA && disc.Resolved == model.DiscussionStateResolved && user.Role != model.UserRoleAdmin && user.UID == disc.UserID {
		return errors.New("resolved qa can not delete")
	}

	if err := d.in.DiscRepo.Delete(ctx, repo.QueryWithEqual("uuid", uuid)); err != nil {
		return err
	}
	d.in.Pub.Publish(ctx, topic.TopicDiscChange, topic.MsgDiscChange{
		OP:       topic.OPDelete,
		ForumID:  disc.ForumID,
		DiscID:   disc.ID,
		DiscUUID: uuid,
		UserID:   disc.UserID,
		RagID:    disc.RagID,
		Type:     disc.Type,
	})

	_ = d.in.OC.Delete(ctx, d.ossDir(disc.UUID))
	return nil
}

func (d *Discussion) ListSimilarity(ctx context.Context, discUUID string) (*model.ListRes[*model.DiscussionListItem], error) {
	disc, err := d.in.DiscRepo.GetByUUID(ctx, discUUID)
	if err != nil {
		return nil, err
	}

	var res model.ListRes[*model.DiscussionListItem]
	discs, err := d.Search(ctx, DiscussionSearchReq{Keyword: disc.Title, ForumID: disc.ForumID, SimilarityThreshold: 0.01, MaxChunksPerDoc: 1})
	if err != nil {
		return nil, err
	}

	for _, searchDisc := range discs {
		// 过滤关联 issue 或者帖子本身
		if searchDisc.ID == disc.ID || searchDisc.ID == disc.AssociateID {
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

type DiscussionListBackendReq struct {
	*model.Pagination

	Keyword *string `json:"keyword" form:"keyword"`
	ForumID uint    `json:"forum_id" form:"forum_id" binding:"required"`
	AI      bool    `json:"ai" form:"ai"`
}

func (d *Discussion) ListBackend(ctx context.Context, req DiscussionListBackendReq) (*model.ListRes[*model.DiscussionListItem], error) {
	var res model.ListRes[*model.DiscussionListItem]

	if req.AI && req.Keyword != nil && *req.Keyword != "" {
		var err error
		res.Items, err = d.Search(ctx, DiscussionSearchReq{
			Keyword:             *req.Keyword,
			ForumID:             req.ForumID,
			SimilarityThreshold: 0.8,
			MaxChunksPerDoc:     1,
		})
		if err != nil {
			return nil, err
		}

		res.Total = int64(len(res.Items))
		return &res, nil
	}

	query := []repo.QueryOptFunc{
		repo.QueryWithEqual("forum_id", req.ForumID),
		repo.QueryWithILike("title", req.Keyword),
		repo.QueryWithEqual("type", model.DiscussionTypeBlog),
	}

	err := d.in.DiscRepo.List(ctx, &res.Items,
		append([]repo.QueryOptFunc{
			repo.QueryWithPagination(req.Pagination),
			repo.QueryWithOrderBy("created_at DESC"),
		}, query...)...,
	)
	if err != nil {
		return nil, err
	}

	err = d.in.DiscRepo.Count(ctx, &res.Total, query...)
	if err != nil {
		return nil, err
	}

	return &res, nil
}

type DiscussionListFilter string

const (
	DiscussionListFilterHot     DiscussionListFilter = "hot"
	DiscussionListFilterNew     DiscussionListFilter = "new"
	DiscussionListFilterPublish DiscussionListFilter = "publish"
)

type DiscussionListReq struct {
	*model.Pagination

	Type          *model.DiscussionType  `json:"type" form:"type"`
	Keyword       string                 `json:"keyword" form:"keyword"`
	Filter        DiscussionListFilter   `json:"filter" form:"filter,default=hot"`
	GroupIDs      model.Int64Array       `json:"group_ids" form:"group_ids"`
	ForumID       uint                   `json:"forum_id" form:"forum_id"`
	OnlyMine      bool                   `json:"only_mine" form:"only_mine"`
	Resolved      *model.DiscussionState `json:"resolved" form:"resolved"`
	DiscussionIDs *model.Int64Array      `json:"discussion_ids" form:"discussion_ids"`
	Stat          bool                   `json:"stat" form:"stat"`
	FuzzySearch   bool                   `json:"fuzzy_search" form:"fuzzy_search"`
	TagIDs        model.Int64Array       `json:"tag_ids" form:"tag_ids"`
}

func (d *Discussion) List(ctx context.Context, sessionUUID string, userID uint, req DiscussionListReq) (*model.ListRes[*model.DiscussionListItem], error) {
	ok, err := d.in.UserRepo.HasForumPermission(ctx, userID, req.ForumID)
	if err != nil {
		return nil, err
	}

	if !ok {
		return nil, errPermission
	}

	var res model.ListRes[*model.DiscussionListItem]
	if req.Keyword != "" && !req.FuzzySearch {
		if req.Stat {
			d.in.Batcher.Send(model.StatInfo{
				Type: model.StatTypeSearch,
				Ts:   util.TodayTrunc().Unix(),
				Key:  sessionUUID,
			})
		}

		discs, err := d.Search(ctx, DiscussionSearchReq{Keyword: req.Keyword, ForumID: req.ForumID, SimilarityThreshold: 0.01, MaxChunksPerDoc: 1})
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
	query = append(query, repo.QueryWithEqual("type", req.Type),
		repo.QueryWithEqual("forum_id", req.ForumID),
		repo.QueryWithEqual("resolved", req.Resolved),
		repo.QueryWithEqual("discussions.id", req.DiscussionIDs, repo.EqualOPEqAny),
		repo.QueryWithEqual("discussions.tag_ids", req.TagIDs, repo.EqualOPContainAny),
	)
	if req.OnlyMine {
		query = append(query, repo.QueryWithEqual("members", userID, repo.EqualOPValIn))
	}
	if req.Keyword != "" && req.FuzzySearch {
		query = append(query, repo.QueryWithILike("title", &req.Keyword))
	}
	if req.Resolved != nil {
		query = append(query, repo.QueryWithEqual("type", model.DiscussionTypeBlog, repo.EqualOPNE))
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
	case DiscussionListFilterPublish:
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

type DiscussionSummaryReq struct {
	Keyword string            `json:"keyword" binding:"required"`
	UUIDs   model.StringArray `json:"uuids" binding:"required"`
}

func (d *Discussion) Summary(ctx context.Context, uid uint, req DiscussionSummaryReq) (*LLMStream, error) {
	var discs []model.DiscussionListItem
	err := d.in.DiscRepo.List(ctx, &discs, repo.QueryWithEqual("uuid", req.UUIDs, repo.EqualOPEqAny))
	if err != nil {
		return nil, err
	}

	if len(discs) == 0 {
		return nil, errors.New("invalid request")
	}

	var forumID uint
	for _, disc := range discs {
		if forumID == 0 {
			forumID = disc.ForumID
		} else if disc.ForumID != forumID {
			return nil, errors.New("invalid request")
		} else {
			continue
		}

		ok, err := d.in.UserRepo.HasForumPermission(ctx, uid, disc.ForumID)
		if err != nil {
			return nil, err
		}

		if !ok {
			return nil, errPermission
		}
	}

	userPrompt, err := llm.DiscussionSummaryUserPrompt(discs)
	if err != nil {
		return nil, err
	}

	return d.in.LLM.StreamChat(ctx, llm.DiscussionSummarySystemPrompt, userPrompt, map[string]any{
		"CurrentDate": time.Now().Format("2006-01-02"),
		"Question":    req.Keyword,
		"Discussions": discs,
	})
}

func (d *Discussion) DiscussionRequirement(ctx context.Context, user model.UserInfo, discUUID string) (string, error) {
	if !user.CanOperator(0) {
		return "", errPermission
	}

	disc, err := d.in.DiscRepo.GetByUUID(ctx, discUUID)
	if err != nil {
		return "", err
	}

	if disc.Type != model.DiscussionTypeQA {
		return "", errors.New("invalid discussion")
	}

	_, prompt, err := d.in.LLM.GeneratePostPrompt(ctx, disc.ID)
	if err != nil {
		return "", err
	}
	requirement, err := d.in.LLM.Chat(ctx, llm.DiscussionRequirementSystemPrompt, prompt, map[string]any{
		"CurrentDate": time.Now().Format("2006-01-02"),
	})
	if err != nil {
		return "", err
	}

	return requirement, nil
}

type DiscussionKeywordAnswerReq struct {
	ForumID uint
	Keyword string
}

func (d *Discussion) KeywordAnswer(ctx context.Context, req DiscussionKeywordAnswerReq) (string, error) {
	logger := d.logger.WithContext(ctx).With("forum_id", req.ForumID).With("keyword", req.Keyword)
	discs, err := d.Search(ctx, DiscussionSearchReq{
		ForumID:             req.ForumID,
		Keyword:             req.Keyword,
		SimilarityThreshold: 0.8,
	})
	if err != nil {
		return "", err
	}

	discIDs := make([]uint, 0, len(discs))
	for _, disc := range discs {
		discIDs = append(discIDs, disc.ID)
	}

	logger.With("disc_ids", discIDs).Info("ai keyword answer get discs")

	prompt, err := d.in.LLM.GenerateDiscussionPrompt(ctx, discIDs...)
	if err != nil {
		return "", err
	}

	content, answer, err := d.in.LLM.AnswerWithThink(ctx, GenerateReq{
		Question:      req.Keyword,
		Prompt:        prompt,
		DefaultAnswer: "无法回答问题",
	})
	if err != nil {
		return "", err
	}

	if !answer {
		logger.Info("ai can not answer with think")
		return "", nil
	}

	return content, nil
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
	  * CASE WHEN resolved = ? THEN 1.3 ELSE 1.0 END`

	d.in.DiscRepo.Update(ctx, map[string]any{
		"hot":        gorm.Expr(hotFormula, model.DiscussionStateResolved),
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

	err = d.CheckPerm(ctx, user.UID, disc)
	if err != nil {
		return err
	}

	if err := d.in.DiscRepo.LikeDiscussion(ctx, discUUID, user.UID); err != nil {
		return err
	}

	notifyMsg := topic.MsgMessageNotify{
		DiscussHeader: disc.Header(),
		Type:          model.MsgNotifyTypeLikeDiscussion,
		FromID:        user.UID,
		ToID:          disc.UserID,
	}
	_ = d.in.Pub.Publish(ctx, topic.TopicMessageNotify, notifyMsg)
	go d.RecalculateHot(discUUID)

	if disc.Type == model.DiscussionTypeBlog {
		err = d.in.Pub.Publish(ctx, topic.TopicUserPoint, topic.MsgUserPoint{
			UserPointRecordInfo: model.UserPointRecordInfo{
				UserID:    disc.UserID,
				Type:      model.UserPointTypeLikeBlog,
				ForeignID: disc.ID,
				FromID:    user.UID,
			},
		})
		if err != nil {
			return err
		}
	}

	return nil
}

func (d *Discussion) CheckPerm(ctx context.Context, uid uint, disc *model.Discussion) error {
	ok, err := d.in.UserRepo.HasForumPermission(ctx, uid, disc.ForumID)
	if err != nil {
		return err
	}

	if !ok {
		return errPermission
	}

	if disc.Closed() {
		return errDiscussionClosed
	}

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

	err = d.CheckPerm(ctx, uid, disc)
	if err != nil {
		return err
	}

	if err := d.in.DiscRepo.RevokeLikeDiscussion(ctx, discUUID, uid); err != nil {
		return err
	}
	go d.RecalculateHot(discUUID)

	if disc.Type == model.DiscussionTypeBlog {
		err = d.in.Pub.Publish(ctx, topic.TopicUserPoint, topic.MsgUserPoint{
			UserPointRecordInfo: model.UserPointRecordInfo{
				UserID:    disc.UserID,
				Type:      model.UserPointTypeLikeBlog,
				ForeignID: disc.ID,
				FromID:    uid,
			},
			Revoke: true,
		})
		if err != nil {
			return err
		}
	}
	return nil
}

type DiscussionSearchReq struct {
	Keyword             string
	ForumID             uint
	SimilarityThreshold float64
	MaxChunksPerDoc     int
}

func (d *Discussion) Search(ctx context.Context, req DiscussionSearchReq) ([]*model.DiscussionListItem, error) {
	var forum model.Forum
	err := d.in.ForumRepo.GetByID(ctx, &forum, req.ForumID)
	if err != nil {
		return nil, err
	}
	_, records, err := d.in.Rag.QueryRecords(ctx, rag.QueryRecordsReq{
		DatasetID:           forum.DatasetID,
		Query:               req.Keyword,
		TopK:                10,
		SimilarityThreshold: req.SimilarityThreshold,
		MaxChunksPerDoc:     req.MaxChunksPerDoc,
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

func (d *Discussion) Close(ctx context.Context, user model.UserInfo, discUUID string) error {
	disc, err := d.in.DiscRepo.GetByUUID(ctx, discUUID)
	if err != nil {
		return err
	}

	ok, err := d.in.UserRepo.HasForumPermission(ctx, user.UID, disc.ForumID)
	if err != nil {
		return err
	}

	if !ok || (user.Role != model.UserRoleAdmin && user.Role != model.UserRoleOperator && user.UID != disc.UserID) {
		return errPermission
	}

	if disc.Resolved != model.DiscussionStateNone || disc.Type != model.DiscussionTypeQA {
		return errors.New("discussion can not close")
	}

	err = d.in.DiscRepo.Update(ctx, map[string]any{
		"resolved":    model.DiscussionStateClosed,
		"resolved_at": time.Now(),
	}, repo.QueryWithEqual("id", disc.ID),
		repo.QueryWithEqual("resolved", model.DiscussionStateNone),
	)
	if err != nil {
		return err
	}

	return nil
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

		err = d.CheckPerm(ctx, uid, disc)
		if err != nil {
			return 0, err
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
	err = d.in.CommRepo.Create(ctx, disc.Type, &comment)
	if err != nil {
		return 0, err
	}

	if parentID == 0 {
		if !req.Bot {
			err = d.in.TrendSvc.Create(ctx, &model.Trend{
				UserID:        uid,
				Type:          model.TrendTypeAnswer,
				DiscussHeader: disc.Header(),
			})
			if err != nil {
				d.logger.WithContext(ctx).WithErr(err).With("comment_id", comment.ID).Warn("create user trend failed")
			}
		}

		if disc.Type == model.DiscussionTypeQA {
			err = d.in.Pub.Publish(ctx, topic.TopicUserPoint, topic.MsgUserPoint{
				UserPointRecordInfo: model.UserPointRecordInfo{
					UserID:    comment.UserID,
					Type:      model.UserPointTypeAnswerQA,
					ForeignID: comment.ID,
					FromID:    disc.UserID,
				},
			})
			if err != nil {
				return 0, err
			}
		}

	}

	if err = d.in.DiscRepo.Update(ctx, map[string]any{
		"members":    gorm.Expr("array_distinct(array_append(members, ?))", uid),
		"updated_at": gorm.Expr("updated_at"),
	}, repo.QueryWithEqual("id", disc.ID)); err != nil {
		return 0, err
	}

	d.in.Pub.Publish(ctx, topic.TopicCommentChange, topic.MsgCommentChange{
		OP:       topic.OPInsert,
		CommID:   comment.ID,
		ForumID:  disc.ForumID,
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
		DiscussHeader: disc.Header(),
		CommentID:     comment.ID,
		ParentID:      parentID,
		Type:          typ,
		FromID:        uid,
		ToID:          toID,
	}
	d.in.Pub.Publish(ctx, topic.TopicMessageNotify, notifyMsg)
	return comment.ID, nil
}

type CommentUpdateReq struct {
	Content string `json:"content" binding:"required"`
	Bot     bool   `json:"-" swaggerignore:"true"`
}

func (d *Discussion) UpdateComment(ctx context.Context, user model.UserInfo, discUUID string, commentID uint, req CommentUpdateReq) error {
	disc, err := d.in.DiscRepo.GetByUUID(ctx, discUUID)
	if err != nil {
		return err
	}

	if !req.Bot {
		if !d.allow("comment", discUUID, user.UID) {
			return errRatelimit
		}

		err = d.CheckPerm(ctx, user.UID, disc)
		if err != nil {
			return err
		}
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
		ForumID:  disc.ForumID,
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

	err = d.CheckPerm(ctx, user.UID, disc)
	if err != nil {
		return err
	}

	var comment model.Comment
	if err := d.in.CommRepo.GetByID(ctx, &comment, commentID); err != nil {
		return err
	}
	if !user.CanOperator(comment.UserID) {
		return errors.New("not allowed to delete comment")
	}

	if disc.Type == model.DiscussionTypeQA && comment.Accepted && user.Role != model.UserRoleAdmin && (comment.UserID == user.UID || disc.UserID == user.UID) {
		return errors.New("accept comment can not delete")
	}

	if err := d.in.CommRepo.Delete(ctx, repo.QueryWithEqual("id", commentID)); err != nil {
		return err
	}
	if comment.Accepted {
		err = d.in.DiscRepo.Update(ctx, map[string]any{
			"resolved":    model.DiscussionStateNone,
			"resolved_at": gorm.Expr("null"),
		}, repo.QueryWithEqual("id", disc.ID))
		if err != nil {
			return err
		}
	}
	d.in.Pub.Publish(ctx, topic.TopicCommentChange, topic.MsgCommentChange{
		OP:       topic.OPDelete,
		CommID:   commentID,
		ForumID:  disc.ForumID,
		DiscID:   disc.ID,
		DiscUUID: discUUID,
	})
	if disc.Type == model.DiscussionTypeQA && comment.ParentID == 0 {
		err = d.in.UserPoint.RevokeCommentPoint(ctx, disc.ID, disc.UserID, comment)
		if err != nil {
			return err
		}
	}
	if err := d.in.CommLikeRepo.Delete(ctx, repo.QueryWithEqual("comment_id", commentID)); err != nil {
		return err
	}
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
	if disc.UserID != user.UID && user.Role != model.UserRoleAdmin {
		return errors.New("not allowed to accept comment")
	}

	err = d.CheckPerm(ctx, user.UID, disc)
	if err != nil {
		return err
	}

	comment, err := d.in.CommRepo.Detail(ctx, commentID)
	if err != nil {
		return err
	}

	if comment.Accepted {
		err = d.in.CommRepo.Update(ctx, map[string]any{
			"accepted":    false,
			"accepted_by": 0,
			"accepted_at": gorm.Expr("null"),
		}, repo.QueryWithEqual("id", commentID))
		if err != nil {
			return err
		}

		err = d.in.Pub.Publish(ctx, topic.TopicUserPoint, topic.MsgUserPoint{
			UserPointRecordInfo: model.UserPointRecordInfo{
				UserID:    comment.UserID,
				Type:      model.UserPointTypeAnswerAccepted,
				ForeignID: commentID,
				FromID:    comment.AcceptedBy,
			},
			Revoke: true,
		})
		if err != nil {
			return err
		}

		err = d.in.DiscRepo.Update(ctx, map[string]any{
			"resolved":    model.DiscussionStateNone,
			"resolved_at": gorm.Expr("null"),
		}, repo.QueryWithEqual("id", disc.ID))
		if err != nil {
			return err
		}

		err = d.in.Pub.Publish(ctx, topic.TopicUserPoint, topic.MsgUserPoint{
			UserPointRecordInfo: model.UserPointRecordInfo{
				UserID:    disc.UserID,
				Type:      model.UserPointTypeAcceptAnswer,
				ForeignID: disc.ID,
				FromID:    comment.AcceptedBy,
			},
			Revoke: true,
		})
		if err != nil {
			return err
		}

		return nil
	}

	var comments []model.Comment
	err = d.in.CommRepo.List(ctx, &comments,
		repo.QueryWithEqual("discussion_id", disc.ID),
		repo.QueryWithEqual("accepted", true))
	if err != nil {
		return err
	}

	err = d.in.CommRepo.Update(ctx, map[string]any{
		"accepted":    false,
		"accepted_by": 0,
		"accepted_at": gorm.Expr("null"),
	}, repo.QueryWithEqual("discussion_id", disc.ID),
		repo.QueryWithEqual("accepted", true))
	if err != nil {
		return err
	}

	for _, comm := range comments {
		err = d.in.Pub.Publish(ctx, topic.TopicUserPoint, topic.MsgUserPoint{
			UserPointRecordInfo: model.UserPointRecordInfo{
				UserID:    comm.UserID,
				Type:      model.UserPointTypeAnswerAccepted,
				ForeignID: comm.ID,
				FromID:    comm.AcceptedBy,
			},
			Revoke: true,
		})
		if err != nil {
			return err
		}
	}

	now := time.Now()

	if err := d.in.CommRepo.UpdateByModel(ctx, &model.Comment{
		Accepted:   true,
		AcceptedBy: user.UID,
		AcceptedAt: model.Timestamp(now.Unix()),
	}, repo.QueryWithEqual("id", commentID)); err != nil {
		return err
	}

	err = d.in.Pub.Publish(ctx, topic.TopicUserPoint, topic.MsgUserPoint{
		UserPointRecordInfo: model.UserPointRecordInfo{
			UserID:    comment.UserID,
			Type:      model.UserPointTypeAnswerAccepted,
			ForeignID: commentID,
			FromID:    user.UID,
		},
	})
	if err != nil {
		return err
	}

	if comment.Bot {
		d.in.Batcher.Send(model.StatInfo{
			Type: model.StatTypeBotAccept,
			Ts:   util.HourTrunc(now).Unix(),
			Key:  discUUID,
		})
	}

	if disc.Resolved == model.DiscussionStateNone {
		if err := d.in.DiscRepo.Update(ctx, map[string]any{
			"resolved":    model.DiscussionStateResolved,
			"resolved_at": model.Timestamp(time.Now().Unix()),
		}, repo.QueryWithEqual("id", disc.ID)); err != nil {
			return err
		}

		// 自己的问题自己采纳回答
		if user.UID == disc.UserID && disc.Type == model.DiscussionTypeQA {
			err = d.in.Pub.Publish(ctx, topic.TopicUserPoint, topic.MsgUserPoint{
				UserPointRecordInfo: model.UserPointRecordInfo{
					UserID:    disc.UserID,
					Type:      model.UserPointTypeAcceptAnswer,
					ForeignID: disc.ID,
					FromID:    user.UID,
				},
			})
			if err != nil {
				return err
			}
		}
	} else if user.UID != disc.UserID {
		err = d.in.Pub.Publish(ctx, topic.TopicUserPoint, topic.MsgUserPoint{
			UserPointRecordInfo: model.UserPointRecordInfo{
				UserID:    disc.UserID,
				Type:      model.UserPointTypeAcceptAnswer,
				ForeignID: disc.ID,
				FromID:    disc.UserID,
			},
			Revoke: true,
		})
		if err != nil {
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
		DiscussHeader: disc.Header(),
		Type:          model.MsgNotifyTypeApplyComment,
		CommentID:     commentID,
		FromID:        user.UID,
		ToID:          comment.UserID,
	}
	d.in.Pub.Publish(ctx, topic.TopicMessageNotify, notifyMsg)
	d.in.Pub.Publish(ctx, topic.TopicCommentChange, topic.MsgCommentChange{
		OP:       topic.OPAccept,
		DiscID:   disc.ID,
		DiscUUID: discUUID,
		CommID:   commentID,
		RagID:    comment.RagID,
	})

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

	err = d.CheckPerm(ctx, userInfo.UID, disc)
	if err != nil {
		return err
	}

	var comment model.Comment
	err = d.in.CommRepo.GetByID(ctx, &comment, commentID)
	if err != nil {
		return err
	}

	updated, stateChanged, err := d.in.CommLikeRepo.Like(ctx, userInfo.UID, disc.ID, commentID, model.CommentLikeStateLike)
	if err != nil {
		return err
	}
	if !updated {
		return nil
	}

	notifyMsg := topic.MsgMessageNotify{
		DiscussHeader: disc.Header(),
		Type:          model.MsgNotifyTypeLikeComment,
		FromID:        userInfo.UID,
		ToID:          comment.UserID,
	}
	err = d.in.Pub.Publish(ctx, topic.TopicMessageNotify, notifyMsg)
	if err != nil {
		d.logger.WithContext(ctx).WithErr(err).With("notify_msg", notifyMsg).Warn("notify commentlike failed")
	}

	if comment.ParentID == 0 && disc.Type == model.DiscussionTypeQA {
		if stateChanged {
			err = d.in.Pub.Publish(ctx, topic.TopicUserPoint, topic.MsgUserPoint{
				UserPointRecordInfo: model.UserPointRecordInfo{
					UserID:    comment.UserID,
					Type:      model.UserPointTypeAnswerDisliked,
					ForeignID: commentID,
					FromID:    userInfo.UID,
				},
				Revoke: true,
			})
			if err != nil {
				return err
			}

			if !comment.Bot {
				err = d.in.Pub.Publish(ctx, topic.TopicUserPoint, topic.MsgUserPoint{
					UserPointRecordInfo: model.UserPointRecordInfo{
						UserID:    userInfo.UID,
						Type:      model.UserPointTypeDislikeAnswer,
						ForeignID: commentID,
						FromID:    comment.UserID,
					},
					Revoke: true,
				})
				if err != nil {
					return err
				}
			}
		}

		err = d.in.Pub.Publish(ctx, topic.TopicUserPoint, topic.MsgUserPoint{
			UserPointRecordInfo: model.UserPointRecordInfo{
				UserID:    comment.UserID,
				Type:      model.UserPointTypeAnswerLiked,
				ForeignID: commentID,
				FromID:    userInfo.UID,
			},
		})
		if err != nil {
			return err
		}
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

	err = d.CheckPerm(ctx, userInfo.UID, disc)
	if err != nil {
		return err
	}

	var comment model.Comment
	err = d.in.CommRepo.GetByID(ctx, &comment, commentID)
	if err != nil {
		return err
	}

	updated, stateChanged, err := d.in.CommLikeRepo.Like(ctx, userInfo.UID, disc.ID, commentID, model.CommentLikeStateDislike)
	if err != nil {
		return err
	}
	if !updated {
		return nil
	}

	notifyMsg := topic.MsgMessageNotify{
		DiscussHeader: disc.Header(),
		Type:          model.MsgNotifyTypeDislikeComment,
		FromID:        userInfo.UID,
		ToID:          comment.UserID,
	}
	err = d.in.Pub.Publish(ctx, topic.TopicMessageNotify, notifyMsg)
	if err != nil {
		d.logger.WithContext(ctx).WithErr(err).With("notify_msg", notifyMsg).Warn("notify commentlike failed")
	}

	if comment.ParentID == 0 && disc.Type == model.DiscussionTypeQA {
		if stateChanged {
			err = d.in.Pub.Publish(ctx, topic.TopicUserPoint, topic.MsgUserPoint{
				UserPointRecordInfo: model.UserPointRecordInfo{
					UserID:    comment.UserID,
					Type:      model.UserPointTypeAnswerLiked,
					ForeignID: commentID,
					FromID:    userInfo.UID,
				},
				Revoke: true,
			})
			if err != nil {
				return err
			}
		}

		err = d.in.Pub.Publish(ctx, topic.TopicUserPoint, topic.MsgUserPoint{
			UserPointRecordInfo: model.UserPointRecordInfo{
				UserID:    comment.UserID,
				Type:      model.UserPointTypeAnswerDisliked,
				ForeignID: commentID,
				FromID:    userInfo.UID,
			},
		})
		if err != nil {
			return err
		}

		if !comment.Bot {
			err = d.in.Pub.Publish(ctx, topic.TopicUserPoint, topic.MsgUserPoint{
				UserPointRecordInfo: model.UserPointRecordInfo{
					UserID:    userInfo.UID,
					Type:      model.UserPointTypeDislikeAnswer,
					ForeignID: commentID,
					FromID:    comment.UserID,
				},
			})
			if err != nil {
				return err
			}
		}
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

	err = d.CheckPerm(ctx, uid, disc)
	if err != nil {
		return err
	}

	var comment model.Comment
	err = d.in.CommRepo.GetByID(ctx, &comment, commentID)
	if err != nil {
		if errors.Is(err, database.ErrRecordNotFound) {
			return errors.New("comment not exist")
		}

		return err
	}

	commentLike, err := d.in.CommLikeRepo.RevokeLike(ctx, uid, commentID)
	if err != nil {
		return err
	}

	if comment.ParentID == 0 && disc.Type == model.DiscussionTypeQA {
		switch commentLike.State {
		case model.CommentLikeStateDislike:
			err := d.in.Pub.Publish(ctx, topic.TopicUserPoint, topic.MsgUserPoint{
				UserPointRecordInfo: model.UserPointRecordInfo{
					UserID:    comment.UserID,
					Type:      model.UserPointTypeAnswerDisliked,
					ForeignID: commentID,
					FromID:    commentLike.UserID,
				},
				Revoke: true,
			})
			if err != nil {
				return err
			}

			if !comment.Bot {
				err = d.in.Pub.Publish(ctx, topic.TopicUserPoint, topic.MsgUserPoint{
					UserPointRecordInfo: model.UserPointRecordInfo{
						UserID:    commentLike.UserID,
						Type:      model.UserPointTypeDislikeAnswer,
						ForeignID: commentID,
						FromID:    comment.UserID,
					},
					Revoke: true,
				})
				if err != nil {
					return err
				}
			}

		case model.CommentLikeStateLike:
			err := d.in.Pub.Publish(ctx, topic.TopicUserPoint, topic.MsgUserPoint{
				UserPointRecordInfo: model.UserPointRecordInfo{
					UserID:    comment.UserID,
					Type:      model.UserPointTypeAnswerLiked,
					ForeignID: commentID,
					FromID:    commentLike.UserID,
				},
				Revoke: true,
			})
			if err != nil {
				return err
			}
		}
	}

	return nil
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
	Resolve model.DiscussionState `json:"resolve" binding:"max=3"`
}

func (d *Discussion) ResolveFeedback(ctx context.Context, user model.UserInfo, discUUID string, req ResolveFeedbackReq) error {
	disc, err := d.in.DiscRepo.GetByUUID(ctx, discUUID)
	if err != nil {
		return err
	}

	if !user.CanOperator(disc.UserID) || disc.Type != model.DiscussionTypeFeedback {
		return errors.New("not allowed to close feedback")
	}

	if disc.Closed() {
		return errDiscussionClosed
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

type ResolveIssueReq struct {
	Resolve model.DiscussionState `json:"resolve" binding:"oneof=1 3"`
}

func (d *Discussion) ResolveIssue(ctx context.Context, user model.UserInfo, discUUID string, req ResolveIssueReq) error {
	if !user.CanOperator(0) {
		return errPermission
	}

	err := d.in.DiscRepo.ResolveIssue(ctx, discUUID, req.Resolve)
	if err != nil {
		return err
	}

	disc, err := d.in.DiscRepo.GetByUUID(ctx, discUUID)
	if err != nil {
		return err
	}

	state := model.MsgNotifyTypeIssueInProgress
	if req.Resolve == model.DiscussionStateResolved {
		state = model.MsgNotifyTypeIssueResolved
	}

	d.in.Pub.Publish(ctx, topic.TopicMessageNotify, topic.MsgMessageNotify{
		DiscussHeader: disc.Header(),
		Type:          state,
		FromID:        user.UID,
	})

	return nil
}

func (d *Discussion) ListAssociateDiscussion(ctx context.Context, userID uint, discUUID string) (*model.ListRes[*model.DiscussionListItem], error) {
	disc, err := d.in.DiscRepo.GetByUUID(ctx, discUUID)
	if err != nil {
		return nil, err
	}

	if disc.Type != model.DiscussionTypeIssue {
		return &model.ListRes[*model.DiscussionListItem]{}, nil
	}

	ok, err := d.in.UserRepo.HasForumPermission(ctx, userID, disc.ForumID)
	if err != nil {
		return nil, err
	}

	if !ok {
		return nil, errPermission
	}

	var res model.ListRes[*model.DiscussionListItem]
	err = d.in.DiscRepo.List(ctx, &res.Items, repo.QueryWithEqual("associate_id", disc.ID))
	if err != nil {
		return nil, err
	}

	res.Total = int64(len(res.Items))
	return &res, nil
}

type AssociateDiscussionReq struct {
	IssueUUID string           `json:"issue_uuid"`
	Title     string           `json:"title"`
	GroupIDs  model.Int64Array `json:"group_ids"`
	Content   string           `json:"content"`
}

func (d *Discussion) AssociateDiscussion(ctx context.Context, user model.UserInfo, discUUID string, req AssociateDiscussionReq) error {
	disc, err := d.in.DiscRepo.GetByUUID(ctx, discUUID)
	if err != nil {
		return err
	}

	if disc.Type != model.DiscussionTypeQA || disc.Resolved != model.DiscussionStateNone {
		return errors.New("invalid discussion")
	}

	if req.IssueUUID == "" {
		if req.Title == "" {
			return errors.New("issue title required")
		}

		issueUUID, err := d.Create(ctx, user, DiscussionCreateReq{
			Title:     req.Title,
			Content:   req.Content,
			Type:      model.DiscussionTypeIssue,
			GroupIDs:  req.GroupIDs,
			ForumID:   disc.ForumID,
			skipLimit: true,
		})
		if err != nil {
			return err
		}
		req.IssueUUID = issueUUID
	}

	issue, err := d.in.DiscRepo.GetByUUID(ctx, req.IssueUUID)
	if err != nil {
		return err
	}

	if issue.Type != model.DiscussionTypeIssue {
		return errors.New("invalid issue")
	}

	disc.AssociateID = issue.ID

	now := time.Now()
	err = d.in.DiscRepo.Update(ctx, map[string]any{
		"resolved":     model.DiscussionStateClosed,
		"resolved_at":  now,
		"associate_id": issue.ID,
		"updated_at":   now,
	}, repo.QueryWithEqual("uuid", discUUID))
	if err != nil {
		return err
	}

	err = d.in.DiscFollowRepo.Create(ctx, &model.DiscussionFollow{
		DiscussionID: issue.ID,
		UserID:       disc.UserID,
	})
	if err != nil {
		return err
	}

	d.in.Pub.Publish(ctx, topic.TopicMessageNotify, topic.MsgMessageNotify{
		DiscussHeader: disc.Header(),
		Type:          model.MsgNotifyTypeCloseDiscussion,
		FromID:        user.UID,
		ToID:          disc.UserID,
	})
	d.in.Pub.Publish(ctx, topic.TopicMessageNotify, topic.MsgMessageNotify{
		DiscussHeader: issue.Header(),
		Type:          model.MsgNotifyTypeAssociateIssue,
		FromID:        user.UID,
		ToID:          disc.UserID,
	})

	err = d.in.Pub.Publish(ctx, topic.TopicUserPoint, topic.MsgUserPoint{
		UserPointRecordInfo: model.UserPointRecordInfo{
			UserID:    disc.UserID,
			Type:      model.UserPointTypeAssociateIssue,
			ForeignID: disc.ID,
			FromID:    user.UID,
		},
	})
	if err != nil {
		return err
	}

	return nil
}

func (d *Discussion) GetBotComment(ctx context.Context, discID uint) (*model.Comment, error) {
	var res model.Comment
	err := d.in.CommRepo.GetBotComment(ctx, &res, discID)
	if err != nil {
		return nil, err
	}

	return &res, nil
}

type ReindexReq struct {
	Limit int `json:"limit"`
}

func (d *Discussion) Reindex(ctx context.Context, req ReindexReq) error {
	if req.Limit > 0 {
		var discussions []*model.Discussion
		err := d.in.DiscRepo.List(ctx, &discussions, repo.QueryWithPagination(&model.Pagination{Size: req.Limit}))
		if err != nil {
			return err
		}

		for _, discussion := range discussions {
			err := d.in.Pub.Publish(ctx, topic.TopicDiscReindex, topic.MsgDiscReindex{
				ForumID: discussion.ForumID,
				DiscID:  discussion.ID,
				RagID:   discussion.RagID,
			})
			if err != nil {
				return err
			}
		}
		return nil
	}

	return d.in.DiscRepo.BatchProcess(ctx, 100, func(discussions []*model.Discussion) error {
		for _, discussion := range discussions {
			err := d.in.Pub.Publish(ctx, topic.TopicDiscReindex, topic.MsgDiscReindex{
				ForumID: discussion.ForumID,
				DiscID:  discussion.ID,
				RagID:   discussion.RagID,
			})
			if err != nil {
				return err
			}
		}
		return nil
	})
}

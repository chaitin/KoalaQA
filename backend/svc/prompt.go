package svc

import (
	"context"
	"fmt"

	"github.com/chaitin/koalaqa/model"
	"github.com/chaitin/koalaqa/pkg/glog"
	"github.com/chaitin/koalaqa/pkg/llm"
	"github.com/chaitin/koalaqa/repo"
)

type Prompt struct {
	disc   *repo.Discussion
	comm   *repo.Comment
	logger *glog.Logger
}

func newPrompt(disc *repo.Discussion, comm *repo.Comment) *Prompt {
	return &Prompt{
		disc:   disc,
		comm:   comm,
		logger: glog.Module("prompt"),
	}
}

func init() {
	registerSvc(newPrompt)
}

// GenerateAnswerPrompt 生成回复帖子的提示词
func (p *Prompt) GenerateAnswerPrompt(ctx context.Context, discID uint, commID uint) (string, []string, string, error) {
	logger := p.logger.WithContext(ctx).With("discussion_id", discID, "comment_id", commID)
	logger.Debug("start generate prompt")

	// 1. 获取讨论详情
	discussion, err := p.disc.Detail(ctx, 0, discID)
	if err != nil {
		return "", nil, "", fmt.Errorf("get discussion detail failed: %w", err)
	}

	// 2. 获取该讨论的所有评论
	var allComments []model.CommentDetail
	err = p.comm.List(ctx, &allComments,
		repo.QueryWithEqual("discussion_id", discID),
		repo.QueryWithOrderBy("created_at ASC"),
	)
	if err != nil {
		return "", nil, "", fmt.Errorf("get discussion comments failed: %w", err)
	}

	// 3. 获取新评论详情
	var newComment *model.CommentDetail
	if commID > 0 {
		newComment, err = p.comm.Detail(ctx, commID)
		if err != nil {
			return "", nil, "", fmt.Errorf("get new comment detail failed: %w", err)
		}
	}

	// 4. 创建提示词模版并生成提示词
	template := llm.NewDiscussionPromptTemplate(discussion, allComments, newComment)

	prompt, err := template.BuildFullPrompt()
	if err != nil {
		return "", nil, "", fmt.Errorf("generate prompt failed: %w", err)
	}

	logger.With("prompt", prompt).Debug("generate prompt success")
	return template.Question(), discussion.GroupStrs(), prompt, nil
}

// GenerateContentForRetrieval 生成用于检索的纯内容文本
func (p *Prompt) GenerateContentForRetrieval(ctx context.Context, discID uint) (string, error) {
	logger := p.logger.WithContext(ctx).With("discussion_id", discID)
	logger.Debug("start generate content for retrieval")

	// 1. 获取讨论详情
	discussion, err := p.disc.Detail(ctx, 0, discID)
	if err != nil {
		return "", fmt.Errorf("get discussion detail failed: %w", err)
	}

	// 2. 获取所有评论
	var allComments []model.CommentDetail
	err = p.comm.List(ctx, &allComments,
		repo.QueryWithEqual("discussion_id", discID),
		repo.QueryWithOrderBy("created_at ASC"),
	)
	if err != nil {
		return "", fmt.Errorf("get discussion comments failed: %w", err)
	}

	// 3. 创建模版并生成纯内容
	template := llm.NewDiscussionPromptTemplate(discussion, allComments, nil)
	content := template.BuildContentForRetrieval()

	logger.Debug("generate content for retrieval success")
	return content, nil
}

// GeneratePostPrompt 生成帖子提示词
func (p *Prompt) GeneratePostPrompt(ctx context.Context, discID uint) (string, string, []string, error) {
	logger := p.logger.WithContext(ctx).With("discussion_id", discID)
	logger.Debug("start generate prompt")

	// 1. 获取讨论详情
	discussion, err := p.disc.Detail(ctx, 0, discID)
	if err != nil {
		return "", "", nil, fmt.Errorf("get discussion detail failed: %w", err)
	}

	// 2. 创建提示词模版并生成
	template := llm.NewDiscussionPromptTemplate(discussion, nil, nil)

	prompt, err := template.BuildPostPrompt()
	if err != nil {
		return "", "", nil, fmt.Errorf("generate prompt failed: %w", err)
	}

	logger.With("prompt", prompt).Debug("generate prompt success")
	return template.Question(), prompt, discussion.GroupStrs(), nil
}

package svc

import (
	"context"
	"fmt"
	"time"

	"github.com/chaitin/koalaqa/model"
	"github.com/chaitin/koalaqa/pkg/oss"
	"github.com/chaitin/koalaqa/repo"
)

type KnowledgeBase struct {
	repoKB *repo.KnowledgeBase
	oc     oss.Client
}

type KBListItem struct {
	model.Base
	Name     string `json:"name"`
	Desc     string `json:"desc"`
	QACount  int64  `json:"qa_count"`
	DocCount int64  `json:"doc_count"`
}

func (kb *KnowledgeBase) List(ctx context.Context) (*model.ListRes[KBListItem], error) {
	var res model.ListRes[KBListItem]
	err := kb.repoKB.ListWithDocCount(ctx, &res.Items)
	if err != nil {
		return nil, err
	}

	return &res, nil
}

type KBCreateReq struct {
	Name string `json:"name" binding:"required"`
	Desc string `json:"desc"`
}

func (kb *KnowledgeBase) Create(ctx context.Context, req KBCreateReq) (uint, error) {
	data := model.KnowledgeBase{
		Name: req.Name,
		Desc: req.Desc,
	}
	err := kb.repoKB.Create(ctx, &data)
	if err != nil {
		return 0, err
	}

	return data.ID, nil
}

type KBUpdateReq struct {
	Name string `json:"name" binding:"required"`
	Desc string `json:"desc"`
}

func (kb *KnowledgeBase) Update(ctx context.Context, id uint, req KBUpdateReq) error {
	err := kb.repoKB.Update(ctx, map[string]any{
		"name":       req.Name,
		"desc":       req.Desc,
		"updated_at": time.Now(),
	},
		repo.QueryWithEqual("id", id),
	)
	if err != nil {
		return err
	}

	return nil
}

type KBDeleteReq struct {
	ID uint `json:"id"`
}

func (kb *KnowledgeBase) ossDir(kbID uint) string {
	return fmt.Sprintf("assets/kb/%d", kbID)
}

func (kb *KnowledgeBase) Delete(ctx context.Context, req KBDeleteReq) error {
	err := kb.repoKB.DeleteByID(ctx, req.ID)
	if err != nil {
		return err
	}

	_ = kb.oc.Delete(ctx, kb.ossDir(req.ID))
	return nil
}

func newKnowledgeBase(repoDB *repo.KnowledgeBase, oc oss.Client) *KnowledgeBase {
	return &KnowledgeBase{
		repoKB: repoDB,
		oc:     oc,
	}
}

func init() {
	registerSvc(newKnowledgeBase)
}

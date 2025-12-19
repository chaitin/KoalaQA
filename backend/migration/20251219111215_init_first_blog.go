package migration

import (
	"bytes"
	"context"
	"path"

	"gorm.io/gorm"

	"github.com/chaitin/koalaqa/assets"
	"github.com/chaitin/koalaqa/migration/migrator"
	"github.com/chaitin/koalaqa/model"
	"github.com/chaitin/koalaqa/pkg/oss"
	"github.com/chaitin/koalaqa/pkg/rag"
	"github.com/chaitin/koalaqa/pkg/util"
	"github.com/chaitin/koalaqa/repo"
)

type initFirstBlog struct {
	repoVer *repo.Version
	oc      oss.Client
	rag     rag.Service
}

func (m *initFirstBlog) Version() int64 {
	return 20251219111215
}

func (m *initFirstBlog) Migrate(tx *gorm.DB) error {
	firstInstall, err := m.repoVer.FirstInstall(context.Background())
	if err != nil {
		return err
	}

	if !firstInstall {
		return nil
	}

	groups := []model.Group{
		{
			Index: 0,
			Name:  "问题类型",
		},
		{
			Index: 1,
			Name:  "Issue 类型",
		},
		{
			Index: 2,
			Name:  "文章类型",
		},
	}

	err = tx.Model(&model.Group{}).Where("true").Delete(nil).Error
	if err != nil {
		return err
	}

	err = tx.Model(&model.Group{}).CreateInBatches(&groups, 100).Error
	if err != nil {
		return err
	}

	groupItems := []model.GroupItem{
		{
			GroupID: groups[0].ID,
			Index:   0,
			Name:    "需求建议",
		},
		{
			GroupID: groups[0].ID,
			Index:   1,
			Name:    "故障反馈",
		},
		{
			GroupID: groups[0].ID,
			Index:   2,
			Name:    "问题咨询",
		},
		{
			GroupID: groups[1].ID,
			Index:   0,
			Name:    "需求",
		},
		{
			GroupID: groups[1].ID,
			Index:   1,
			Name:    "Bug",
		},
		{
			GroupID: groups[2].ID,
			Index:   0,
			Name:    "经验分享",
		},
		{
			GroupID: groups[2].ID,
			Index:   1,
			Name:    "操作教程",
		},
	}

	err = tx.Model(&model.GroupItem{}).Where("true").Delete(nil).Error
	if err != nil {
		return err
	}

	err = tx.Model(&model.GroupItem{}).CreateInBatches(&groupItems, 100).Error
	if err != nil {
		return err
	}

	var forum model.Forum
	err = tx.Model(&model.Forum{}).Order("created_at ASC").First(&forum).Error
	if err != nil {
		return err
	}

	err = tx.Model(&model.Forum{}).Where("id = ?", forum.ID).
		UpdateColumn("groups", model.NewJSONB([]model.ForumGroups{
			{
				Type:     model.DiscussionTypeQA,
				GroupIDs: model.Int64Array{int64(groupItems[0].ID), int64(groupItems[1].ID), int64(groupItems[2].ID)},
			},
			{
				Type:     model.DiscussionTypeIssue,
				GroupIDs: model.Int64Array{int64(groupItems[3].ID), int64(groupItems[4].ID)},
			},
			{
				Type:     model.DiscussionTypeBlog,
				GroupIDs: model.Int64Array{int64(groupItems[5].ID), int64(groupItems[6].ID)},
			},
		})).Error
	if err != nil {
		return err
	}

	entries, err := assets.Blog.ReadDir("blog")
	if err != nil {
		return err
	}

	for _, entry := range entries {
		if !entry.Type().IsRegular() {
			continue
		}

		data, err := assets.Blog.ReadFile(entry.Name())
		if err != nil {
			return err
		}

		_, err = m.oc.Upload(context.Background(), "assets/discussion", bytes.NewReader(data),
			oss.WithExt(path.Ext(entry.Name())),
			oss.WithFileSize(len(data)),
			oss.WithPublic(),
			oss.WithFilename(path.Base(entry.Name())),
		)
		if err != nil {
			return err
		}
	}

	blogContent := `### 恭喜你！成功搭建 KoalaQA ！

接下来你可以右上角点击前往后台进行社区基础配置

### 配置访问地址

![image.png](/public/assets/discussion/public_address.png)

### 配置 AI 大模型

![image.png](/public/assets/discussion/ai_module.png)

### 导入知识学习，让机器人「了解你的产品」

![image.png](/public/assets/discussion/ai_learn.png)

### 社区结构搭建（板块 + 分类）

![image.png](/public/assets/discussion/forum.png)

### 自定义机器人形象

![image.png](/public/assets/discussion/bot.png)

### 自定义社区品牌

![image.png](/public/assets/discussion/logo.png)

完成如上配置后，你的 KoalaQA 已经具备提供服务的基础能力，可以开始：

*   邀请内部同事试用，模拟真实用户提问
    
*   根据反馈继续完善 AI 知识库
    
*   配置登录注册方式（如单点登录、企业内部账号）
    
*   配置站内外通知（网页通知 / 钉钉等）
    

使用过程中遇到任何问题欢迎扫码加入微信群寻求支持帮助

![image.png](/public/assets/discussion/qr_code.png)`

	var admin model.User
	err = tx.Model(&model.User{}).Where("builtin = ? AND role = ?", true, model.UserRoleAdmin).First(&admin).Error
	if err != nil {
		return err
	}

	blog := model.Discussion{
		Title:      `# 👏 欢迎使用 KoalaQA`,
		Summary:    "",
		Content:    blogContent,
		GroupIDs:   model.Int64Array{int64(groupItems[6].ID)},
		UUID:       util.RandomString(16),
		UserID:     admin.ID,
		Type:       model.DiscussionTypeBlog,
		ForumID:    forum.ID,
		Members:    model.Int64Array{int64(admin.ID)},
		Hot:        2000,
		BotUnknown: true,
		Resolved:   model.DiscussionStateNone,
	}

	err = tx.Create(&blog).Error
	if err != nil {
		return err
	}

	ragID, err := m.rag.UpsertRecords(context.Background(), rag.UpsertRecordsReq{
		DatasetID:       forum.DatasetID,
		Content:         blogContent,
		ExtractKeywords: false,
		Metadata: rag.Metadata{
			DiscMetadata: blog.Metadata(),
		},
	})
	if err != nil {
		return err
	}

	err = tx.Model(&model.Discussion{}).Where("id = ?", blog.ID).UpdateColumn("rag_id", ragID).Error
	if err != nil {
		return err
	}

	return nil
}

func newInitFirstBlog(ver *repo.Version, oc oss.Client, rag rag.Service) migrator.Migrator {
	return &initFirstBlog{repoVer: ver, oc: oc, rag: rag}
}

func init() {
	registerDBMigrator(newInitFirstBlog)
}

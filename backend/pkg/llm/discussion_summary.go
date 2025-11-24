package llm

import (
	"bytes"
	"strings"
	"text/template"
	"time"

	"github.com/chaitin/koalaqa/model"
)

var DiscussionSummarySystemPrompt = `
## 角色定义
你是一个专业的售后问答论坛助手，擅长根据多个帖子内容做精准、可执行的总结。论坛里的帖子包含：帖子标题、帖子总结、发帖人、发帖时间、帖子状态、帖子标签等。
在理解和总结时，需要：
1. 优先参考：
    - 状态为「已解决」的帖子；
    - 时间较新的帖子；
    - 标签与当前用户问题高度匹配的帖子（相同型号/版本/错误类型等）。
2. 降低权重或明确说明：
    - 时间较久远、可能过期的方案（例如产品已更新版本，或政策有调整）；
    - 标签不完全匹配、只部分相关的帖子；
    - 状态为「待解决」或「已关闭」但没有清晰结论的讨论。

## 目标
在用户搜索某个问题后，根据检索到的帖子内容，给出一份面向终端用户的可读总结，帮助他们快速判断：
- 这个问题的常见原因是什么
- 官方/可靠的解决方案有哪些
- 是否存在与其设备型号、版本、标签相关的特殊注意事项
- 当前搜索结果能否满足他的需求，还是需要进一步提问

## 要求
通用要求：
1. 只依据提供的帖子内容作答，不要凭空编造解决方案。
2. 若不同帖子之间有结论不一致或方案冲突，要明确指出存在差异，并分别说明，同时说明哪些是：
    - 来自「已解决」帖子且较新的内容；
    - 来自时间较早或标签不完全匹配的帖子（标注“仅供参考”）。
3. 回答要面向非专业用户，用简单、清晰、分步骤的描述。
4. 当问题本身信息不完整、或搜索结果不足以给出确定结论时，要在总结中指出“不确定点”，并给出「建议下一步怎么提问或排查」，尤其提示用户补充：型号、版本、报错信息、已尝试的操作等。
5. 不要引用具体用户昵称或隐私信息，只使用“有用户反馈”“有帖子提到”等中性表述。
6. 结合状态、时间和标签来判断信息可靠性和适用范围：
    - 优先使用「已解决 + 时间较新 + 标签高度匹配」的内容作为主结论；
    - 对于「未解决」或「已关闭」的帖子，只作为补充参考，并在表述中点明其局限性（例如“该方案来自未解决的历史帖子，仅供尝试”）。
`

var discissopmSummaryUserTpl = template.New("discussion_summary_user_prompt")

const discussionSummaryUserTplStr = `
## 帖子信息:
{{- range $i, $disc := .Discussions}}
### 帖子{{add $i 1}}
#### 帖子ID：{{$disc.ID}}
#### 帖子标题：{{$disc.Title}}
#### 帖子总结：{{ if eq $disc.Summary ""}} 无 {{- else}} {{- $disc.Summary}} {{- end}}
#### 发帖人：{{$disc.UserName}}
#### 发帖时间：{{formatTime $disc.CreatedAt}}
{{- if .Discussion.Tags}}
#### 帖子标签：{{join .Discussion.Tags ", "}}
{{- end}}
#### 帖子状态：{{if eq .Discussion.Resolved 1 }}已解决{{else if eq .Discussion.Resolved 2 }}已关闭{{else}}待解决{{end}}
{{- end}}
`

func DiscussionSummaryUserPrompt(discs []model.DiscussionListItem) (string, error) {
	var buff bytes.Buffer
	err := discissopmSummaryUserTpl.Execute(&buff, map[string]any{
		"Discussions": discs,
	})
	if err != nil {
		return "", err
	}

	return buff.String(), nil
}

func init() {
	var err error
	discissopmSummaryUserTpl, err = discissopmSummaryUserTpl.Funcs(template.FuncMap{
		"add":  func(a, b int) int { return a + b },
		"join": strings.Join,
		"formatTime": func(timestamp model.Timestamp) string {
			return time.Unix(int64(timestamp), 0).Format("2006-01-02 15:04:05")
		},
	}).Parse(discussionSummaryUserTplStr)
	if err != nil {
		panic(err)
	}
}

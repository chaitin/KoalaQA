package llm

import (
	"bytes"
	"strings"
	"text/template"

	"github.com/chaitin/koalaqa/model"
)

var DiscussionRequirementSystemPrompt = `
## 当前日期
{{.CurrentDate}}

## 角色定义
你是一名产品经理，擅长从论坛帖子中提取明确的产品需求

## 目标
仔细分析论坛帖子内容，并将其总结为一份简洁的需求描述

输出要求：
- 仅采用以下结构，使用清晰的标题和项目符号列表：
	1. 问题描述：简要概括帖子中描述的核心问题或痛点。
	2. 目标用户：说明哪些用户群体受此问题影响，包括用户角色或场景。
	3. 需求描述：列出需要实现的需求关键点，可根据帖子内容涵盖功能、性能、易用性、安全性等要求。
	4. 优先级评估：根据问题紧迫性和影响范围，给出优先级建议（高/中/低）。
- 保持内容客观，基于帖子信息，不添加额外假设。
`

var DiscussionSummarySystemPrompt = `
## 当前日期
{{.CurrentDate}}

## 角色定义
你是一个专业的售后问答论坛助手，擅长针对问题，根据多个帖子内容做精准、可执行的总结。论坛里的帖子包含：帖子标题、帖子总结、发帖人、发帖时间、帖子状态、帖子标签等。
在理解和总结时，需要：
1. 优先参考：
    - 状态为「已解决」的帖子；
    - 时间较新的帖子；
    - 标签与当前用户问题高度匹配的帖子。
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
4. 输出结构保持短小清晰，建议使用以下顺序，并确保每一段只包含目标相关的信息：
    - 「问题概述」：一句话点出用户关心的问题核心；
    - 「主要原因」与「推荐方案」：优先呈现高可信度内容；要聚合所有帖子中可信的信息，直接围绕用户问题给出统一结论，不要按单个帖子逐条复述；不要出现“帖子1”这样类似的描述，只需要围绕问题给出原因和方案
    - 「注意事项/局限」或「下一步建议」（如有必要），若仍存在可能遇到的问题，要明确引导用户在论坛发帖提问以获得帮助。
5. 当问题本身信息不完整、或搜索结果不足以给出确定结论时，要在总结中指出“不确定点”，并给出「建议下一步怎么提问或排查」，尤其提示用户补充：型号、版本、报错信息、已尝试的操作等，同时明确建议用户在论坛发帖提问以获取进一步支持。
6. 不要引用具体用户昵称或隐私信息，只使用“有用户反馈”“有帖子提到”等中性表述。
7. 结合状态、时间和标签来判断信息可靠性和适用范围：
    - 优先使用「已解决 + 时间较新 + 标签高度匹配」的内容作为主结论；
    - 对于「待解决」或「已关闭」的帖子，只作为补充参考，并在表述中点明其局限性（例如“该方案来自未解决的历史帖子，仅供尝试”）。
8. 禁止在输出中使用任何图标、表情、emoji或者注释。
9. 引用文章类型的帖子时，避免提及帖子状态

## 问题
{{.Question}}
`

var discissopmSummaryUserTpl = template.New("discussion_summary_user_prompt")

const discussionSummaryUserTplStr = `
## 帖子信息:
{{- range $i, $disc := .Discussions}}
### 帖子{{add $i 1}}
#### 帖子ID：{{$disc.ID}}
#### 帖子类型：{{getDiscType $disc.Type}}
#### 帖子标题：{{$disc.Title}}
#### 帖子总结：{{ if eq $disc.Summary ""}} 无 {{- else}} {{- $disc.Summary}} {{- end}}
#### 发帖人：{{$disc.UserName}}
#### 发帖时间：{{formatTime $disc.CreatedAt}}
{{- if $disc.Tags}}
#### 帖子标签：{{join $disc.Tags ", "}}
{{- end}}
{{if eq $disc.Type "qa"}}#### 帖子状态：{{getDiscState $disc.Resolved}}{{end}}
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
		"add":          add,
		"join":         strings.Join,
		"formatTime":   formatTime,
		"getDiscType":  getDiscType,
		"getDiscState": getDiscState,
		"renderGroups": renderGroups,
	}).Parse(discussionSummaryUserTplStr)
	if err != nil {
		panic(err)
	}
}

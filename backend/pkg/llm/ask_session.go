package llm

import (
	"bytes"
	"text/template"

	"github.com/chaitin/koalaqa/model"
)

const askSessionTemplateStr = `
{{- if gt (len .) 0}}
{{ range $i, $ask := .}}
{{if $ask.Bot}} [BOT] {{end}} {{$ask.Content}}
{{- end}}
{{- else}}
暂无信息
{{- end}}
`

var askSessionTemplate = template.New("discussions_ask_template")

func init() {
	var err error

	askSessionTemplate, err = askSessionTemplate.Parse(askSessionTemplateStr)
	if err != nil {
		panic(err)
	}
}

type AskSessionsTemplate []model.AskSession

func (d AskSessionsTemplate) BuildAskPrompt() (string, error) {
	var buf bytes.Buffer
	err := askSessionTemplate.Execute(&buf, d)
	if err != nil {
		return "", err
	}

	return buf.String(), nil
}

package llm

import "testing"

func TestIsRequestHuman(t *testing.T) {
	tests := []struct {
		name     string
		question string
		want     bool
	}{
		{
			name:     "明确要求转人工",
			question: "转人工",
			want:     true,
		},
		{
			name:     "要求人工客服",
			question: "我想找人工客服",
			want:     true,
		},
		{
			name:     "联系客服",
			question: "如何联系客服？",
			want:     true,
		},
		{
			name:     "需要人工帮助",
			question: "我需要人工帮助解决这个问题",
			want:     true,
		},
		{
			name:     "转接人工",
			question: "请转接人工客服",
			want:     true,
		},
		{
			name:     "找客服",
			question: "找客服处理一下",
			want:     true,
		},
		{
			name:     "大写转人工",
			question: "转人工服务",
			want:     true,
		},
		{
			name:     "普通技术问题",
			question: "如何配置数据库连接？",
			want:     false,
		},
		{
			name:     "产品使用问题",
			question: "这个功能怎么使用",
			want:     false,
		},
		{
			name:     "普通咨询",
			question: "你们的产品支持哪些功能？",
			want:     false,
		},
		{
			name:     "空字符串",
			question: "",
			want:     false,
		},
		{
			name:     "只有空格",
			question: "   ",
			want:     false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := IsRequestHuman(tt.question)
			if got != tt.want {
				t.Errorf("IsRequestHuman(%q) = %v, want %v", tt.question, got, tt.want)
			}
		})
	}
}

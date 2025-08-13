package context

type Response struct {
	Success bool   `json:"success"`
	Data    any    `json:"data"`
	Msg     string `json:"msg"`
	Err     string `json:"err"`
	TraceID string `json:"trace_id"`
}

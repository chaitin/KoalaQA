package topic

type OP string

const (
	OPInsert OP = "insert"
	OPUpdate OP = "update"
	OPDelete OP = "delete"
	OPAccept OP = "accept"
)

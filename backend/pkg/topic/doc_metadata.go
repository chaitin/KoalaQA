package topic

import "github.com/chaitin/koalaqa/model"

var TopicDocMetadata = newTopic("koala.persistence.doc.metadata", true)

type MsgDocMetadata struct {
	Type model.DocType    `json:"type"`
	IDs  model.Int64Array `json:"ids"`
}

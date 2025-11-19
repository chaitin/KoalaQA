package topic

import "github.com/chaitin/koalaqa/model"

var TopicUserReview = newTopic("koala.persistence.review.user", true)

type MsgUserReview struct {
	ID   uint                 `json:"id"`
	Type model.UserReviewType `json:"type"`
}

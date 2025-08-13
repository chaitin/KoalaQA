package model

type Pagination struct {
	Page int `json:"page" form:"page,default=1" binding:"min=1"`
	Size int `json:"size" form:"size,default=20" binding:"min=1"`
}

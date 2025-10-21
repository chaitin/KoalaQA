package model

type DiscLike struct {
	Base

	UUID   string `gorm:"column:uuid;type:text;uniqueIndex:udx_disc_like_uuid_user"`
	UserID uint   `gorm:"column:user_id;type:bigint;uniqueIndex:udx_disc_like_uuid_user"`
}

func init() {
	registerAutoMigrate(&DiscLike{})
}

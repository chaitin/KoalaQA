package assets

import (
	"embed"
)

var (
	//go:embed image.png
	BotAvatar []byte

	//go:embed blog
	Blog embed.FS
)

package util

import (
	"crypto/hmac"
	"crypto/md5"
	"crypto/sha1"
	"crypto/sha256"
	"encoding/base64"
)

func MD5(data string) []byte {
	hash := md5.New()
	hash.Write([]byte(data))
	return hash.Sum(nil)
}

func HMACSha256(secret string, data string) []byte {
	hash := hmac.New(sha256.New, []byte(secret))
	hash.Write([]byte(data))
	return hash.Sum(nil)
}

func Sha1(data string) string {
	hash := sha1.New()
	hash.Write([]byte(data))
	return base64.URLEncoding.EncodeToString(hash.Sum(nil))
}

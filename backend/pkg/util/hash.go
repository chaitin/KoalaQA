package util

import "crypto/md5"

func MD5(data string) []byte {
	hash := md5.New()
	hash.Write([]byte(data))
	return hash.Sum(nil)
}

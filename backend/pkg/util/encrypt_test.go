package util

import (
	"encoding/base64"
	"fmt"
	"testing"
)

func TestAESEncrypt(t *testing.T) {
	plainText := "hello"
	key := []byte("vzWE2R9GckGefVFd")
	ciphertext, err := AESEncrypt([]byte(plainText), key)
	if err != nil {
		t.Fatal(err)
	}
	fmt.Println(base64.StdEncoding.EncodeToString(ciphertext))
}

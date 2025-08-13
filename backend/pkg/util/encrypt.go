package util

import (
	"bytes"
	"crypto/aes"
	"crypto/cipher"
	"crypto/rand"
	"errors"
	"io"
)

func AESEncrypt(plainText []byte, key []byte) ([]byte, error) {
	block, err := aes.NewCipher(key)
	if err != nil {
		return nil, err
	}

	// 创建填充器
	blockSize := block.BlockSize()
	padding := blockSize - (len(plainText) % blockSize)
	padText := append(plainText, bytes.Repeat([]byte{byte(padding)}, padding)...)

	// 生成随机的初始化向量（IV）
	iv := make([]byte, blockSize)
	if _, err := io.ReadFull(rand.Reader, iv); err != nil {
		return nil, err
	}

	// 使用CBC模式加密
	ciphertext := make([]byte, len(padText))
	mode := cipher.NewCBCEncrypter(block, iv)
	mode.CryptBlocks(ciphertext, padText)

	return append(iv, ciphertext...), nil
}

func AESDecrypt(ciphertext []byte, key []byte) (plainTxt []byte, err error) {
	defer func() {
		if e := recover(); e != nil {
			switch t := e.(type) {
			case error:
				err = t
			case string:
				err = errors.New(t)
			default:
				err = errors.New("unknown panic")
			}
		}
	}()

	block, err := aes.NewCipher(key)
	if err != nil {
		return nil, err
	}

	// 检查密文长度
	blockSize := block.BlockSize()
	if len(ciphertext) < blockSize {
		return nil, errors.New("invalid ciphertext")
	}

	// 提取初始化向量（IV）
	iv := ciphertext[:blockSize]
	ciphertext = ciphertext[blockSize:]

	paddingText := make([]byte, len(ciphertext))
	// 使用CBC模式解密
	mode := cipher.NewCBCDecrypter(block, iv)
	mode.CryptBlocks(paddingText, ciphertext)

	// 去除填充
	padding := paddingText[len(paddingText)-1]

	if padding < 1 || int(padding) > blockSize {
		return nil, errors.New("invalid padding")
	}

	return paddingText[:len(paddingText)-int(padding)], nil
}

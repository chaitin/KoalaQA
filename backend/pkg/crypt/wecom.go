// Package wecom provides cryptographic utilities for WeChat Work (WeCom) message encryption and decryption.
// It implements the WXBizMsgCrypt algorithm for secure message handling with WeChat Work APIs.
package crypt

import (
	"bytes"
	"crypto/aes"
	"crypto/cipher"
	"crypto/rand"
	"crypto/sha1"
	"encoding/base64"
	"encoding/binary"
	"encoding/json"
	"fmt"
	"math/big"
	"sort"
	"strings"
	"time"
)

const (
	WXBizMsgCrypt_OK                        = 0
	WXBizMsgCrypt_ValidateSignature_Error   = 40001
	WXBizMsgCrypt_ParseJson_Error           = 40002
	WXBizMsgCrypt_ComputeSignature_Error    = 40003
	WXBizMsgCrypt_IllegalAesKey             = 40004
	WXBizMsgCrypt_EncryptAES_Error          = 40005
	WXBizMsgCrypt_DecryptAES_Error          = 40006
	WXBizMsgCrypt_IllegalBuffer             = 40007
	WXBizMsgCrypt_ValidateCorpid_Error      = 40008
	WXBizMsgCrypt_ValidateCorpid_Receive_Id = 40009
	WXBizMsgCrypt_ValidateCorpid_Mismatch   = 40010
)

var wecomErrorMessages = map[int]string{
	WXBizMsgCrypt_OK:                        "success",
	WXBizMsgCrypt_ValidateSignature_Error:   "signature validation failed",
	WXBizMsgCrypt_ParseJson_Error:           "invalid JSON format",
	WXBizMsgCrypt_ComputeSignature_Error:    "signature computation failed",
	WXBizMsgCrypt_IllegalAesKey:             "illegal AES key",
	WXBizMsgCrypt_EncryptAES_Error:          "AES encryption failed",
	WXBizMsgCrypt_DecryptAES_Error:          "AES decryption failed",
	WXBizMsgCrypt_IllegalBuffer:             "illegal buffer format",
	WXBizMsgCrypt_ValidateCorpid_Error:      "corp ID validation failed",
	WXBizMsgCrypt_ValidateCorpid_Receive_Id: "receive ID validation failed",
	WXBizMsgCrypt_ValidateCorpid_Mismatch:   "corp ID mismatch",
}

func WecomErrorByCode(code int) error {
	if code == 0 {
		return nil
	}

	if msg, ok := wecomErrorMessages[code]; ok {
		return fmt.Errorf("wecom error (code %d): %s", code, msg)
	}
	return fmt.Errorf("unknown wecom error: %d", code)
}

// SHA1 负责生成安全签名（sha1）
type SHA1 struct{}

// GetSHA1 : 对 token, timestamp, nonce, encrypt 排序后 sha1
// 返回 (code, signature)
func (s *SHA1) GetSHA1(token, timestamp, nonce string, encrypt interface{}) (int, string) {
	defer func() {
		// no panic propagation in this helper; but keep signature simple
	}()
	encStr := ""
	switch v := encrypt.(type) {
	case string:
		encStr = v
	case []byte:
		encStr = string(v)
	case nil:
		encStr = ""
	default:
		encStr = fmt.Sprint(v)
	}
	list := []string{token, timestamp, nonce, encStr}
	sort.Strings(list)
	joined := strings.Join(list, "")
	h := sha1.New()
	_, err := h.Write([]byte(joined))
	if err != nil {
		return WXBizMsgCrypt_ComputeSignature_Error, ""
	}
	return WXBizMsgCrypt_OK, fmt.Sprintf("%x", h.Sum(nil))
}

// JsonParse 提取/生成 json 消息
type JsonParse struct{}

type aesTextResponse struct {
	Encrypt      string `json:"encrypt"`
	MsgSignature string `json:"msgsignature"`
	Timestamp    string `json:"timestamp"`
	Nonce        string `json:"nonce"`
}

// Extract 从 json 字符串中提取 encrypt 字段
// 返回 (code, encrypt)
func (jp *JsonParse) Extract(jsonText string) (int, string) {
	var m map[string]interface{}
	if err := json.Unmarshal([]byte(jsonText), &m); err != nil {
		return WXBizMsgCrypt_ParseJson_Error, ""
	}
	if v, ok := m["encrypt"].(string); ok {
		return WXBizMsgCrypt_OK, v
	}
	return WXBizMsgCrypt_ParseJson_Error, ""
}

// Generate 根据参数生成 json 字符串
func (jp *JsonParse) Generate(encrypt, signature, timestamp, nonce string) string {
	resp := aesTextResponse{
		Encrypt:      encrypt,
		MsgSignature: signature,
		Timestamp:    timestamp,
		Nonce:        nonce,
	}
	bs, _ := json.Marshal(resp)
	return string(bs)
}

// PKCS7Encoder 提供基于 PKCS7 的填充/去填充
type PKCS7Encoder struct {
	BlockSize int // 使用 32 与 Python 示例一致
}

func NewPKCS7Encoder() *PKCS7Encoder {
	return &PKCS7Encoder{BlockSize: 32}
}

func (p *PKCS7Encoder) Encode(src []byte) []byte {
	if src == nil {
		src = []byte{}
	}
	n := len(src)
	amountToPad := p.BlockSize - (n % p.BlockSize)
	if amountToPad == 0 {
		amountToPad = p.BlockSize
	}
	pad := byte(amountToPad)
	padtext := bytes.Repeat([]byte{pad}, amountToPad)
	return append(src, padtext...)
}

func (p *PKCS7Encoder) Decode(decrypted []byte) ([]byte, error) {
	if len(decrypted) == 0 {
		return nil, nil
	}
	pad := int(decrypted[len(decrypted)-1])
	if pad < 1 || pad > p.BlockSize {
		// 同 Python 逻辑：当 pad 值不合理时，视为 0（或 error）
		return decrypted, fmt.Errorf("invalid padding")
	}
	return decrypted[:len(decrypted)-pad], nil
}

// Prpcrypt 提供 AES 加解密功能
type Prpcrypt struct {
	Key  []byte
	Mode string // not used but kept for parity
}

func NewPrpcrypt(key []byte) *Prpcrypt {
	return &Prpcrypt{Key: key, Mode: "CBC"}
}

// Encrypt 对明文加密，返回 (code, base64Ciphertext)
func (pc *Prpcrypt) Encrypt(plainText string, receiveID string) (int, string) {
	// 将明文转换为 bytes
	txt := []byte(plainText)

	// 随机 16 字节数字字符串
	rand16, err := getRandom16BytesAsDigits()
	if err != nil {
		return WXBizMsgCrypt_EncryptAES_Error, ""
	}

	// 包装: 16 bytes random + 4 bytes network-order(len) + txt + receiveid
	buf := bytes.NewBuffer(nil)
	buf.Write(rand16)

	// len(txt) 网络字节序
	lenBuf := make([]byte, 4)
	// Python 示例使用 socket.htonl(len(text))，即 network order (big endian)
	binary.BigEndian.PutUint32(lenBuf, uint32(len(txt)))
	buf.Write(lenBuf)
	buf.Write(txt)
	buf.Write([]byte(receiveID))
	raw := buf.Bytes()

	// PKCS7 pad 到 blocksize=32
	encoder := NewPKCS7Encoder()
	padded := encoder.Encode(raw)

	// AES-CBC
	block, err := aes.NewCipher(pc.Key)
	if err != nil {
		return WXBizMsgCrypt_EncryptAES_Error, ""
	}
	iv := pc.Key[:16]
	if len(iv) < 16 {
		return WXBizMsgCrypt_IllegalAesKey, ""
	}
	mode := cipher.NewCBCEncrypter(block, iv)
	if len(padded)%block.BlockSize() != 0 {
		// 应该已经经过 pad
		return WXBizMsgCrypt_EncryptAES_Error, ""
	}
	ciphertext := make([]byte, len(padded))
	mode.CryptBlocks(ciphertext, padded)

	enc := base64.StdEncoding.EncodeToString(ciphertext)
	return WXBizMsgCrypt_OK, enc
}

// Decrypt 解密 base64 文本，返回 (code, jsonContent)
func (pc *Prpcrypt) Decrypt(base64Cipher string, receiveID string) (int, string) {
	cipherData, err := base64.StdEncoding.DecodeString(base64Cipher)
	if err != nil {
		return WXBizMsgCrypt_DecryptAES_Error, ""
	}
	block, err := aes.NewCipher(pc.Key)
	if err != nil {
		return WXBizMsgCrypt_DecryptAES_Error, ""
	}
	if len(cipherData)%block.BlockSize() != 0 {
		return WXBizMsgCrypt_DecryptAES_Error, ""
	}
	iv := pc.Key[:16]
	mode := cipher.NewCBCDecrypter(block, iv)
	plain := make([]byte, len(cipherData))
	mode.CryptBlocks(plain, cipherData)

	// 去 PKCS7 填充 (blocksize=32)
	encoder := NewPKCS7Encoder()
	unpadded, err := encoder.Decode(plain)
	if err != nil {
		// Python 里如果 pad 错误会继续尝试并最后返回 IllegalBuffer
		// 这里直接返回 IllegalBuffer
		return WXBizMsgCrypt_IllegalBuffer, ""
	}

	// 去掉前 16 字节随机字符串
	if len(unpadded) < 16 {
		return WXBizMsgCrypt_IllegalBuffer, ""
	}
	content := unpadded[16:]

	if len(content) < 4 {
		return WXBizMsgCrypt_IllegalBuffer, ""
	}
	// 前 4 字节为 network order 的 json length
	jsonLen := binary.BigEndian.Uint32(content[:4])
	if int(jsonLen) > len(content)-4 {
		return WXBizMsgCrypt_IllegalBuffer, ""
	}
	jsonContent := string(content[4 : 4+jsonLen])
	fromReceiveID := string(content[4+jsonLen:])
	if fromReceiveID != receiveID {
		// receiveid 不匹配
		return WXBizMsgCrypt_ValidateCorpid_Error, ""
	}
	return WXBizMsgCrypt_OK, jsonContent
}

// getRandom16BytesAsDigits 产生一个 16 字节的 ASCII 数字字符串（与 Python 版本行为一致）
func getRandom16BytesAsDigits() ([]byte, error) {
	const digits = "0123456789"
	out := make([]byte, 16)
	for i := 0; i < 16; i++ {
		nBig, err := rand.Int(rand.Reader, big.NewInt(int64(len(digits))))
		if err != nil {
			return nil, err
		}
		out[i] = digits[nBig.Int64()]
	}
	return out, nil
}

// WXBizJsonMsgCrypt 将整个流程封装：初始化时传入 token, encodingAESKey, receiveID
type WXBizJsonMsgCrypt struct {
	Token       string
	EncodingKey []byte
	ReceiveID   string
	encodingAES string // 原始 sEncodingAESKey
}

// NewWXBizJsonMsgCrypt 构造：sToken, sEncodingAESKey, sReceiveID
func NewWXBizJsonMsgCrypt(sToken, sEncodingAESKey, sReceiveID string) (*WXBizJsonMsgCrypt, int, error) {
	// Python 里是 base64.b64decode(sEncodingAESKey + "=")
	dec, err := base64.StdEncoding.DecodeString(sEncodingAESKey + "=")
	if err != nil {
		return nil, WXBizMsgCrypt_IllegalAesKey, fmt.Errorf("EncodingAESKey base64 decode fail: %w", err)
	}
	if len(dec) != 32 {
		return nil, WXBizMsgCrypt_IllegalAesKey, fmt.Errorf("EncodingAESKey decoded length must be 32 (got %d)", len(dec))
	}
	return &WXBizJsonMsgCrypt{
		Token:       sToken,
		EncodingKey: dec,
		ReceiveID:   sReceiveID,
		encodingAES: sEncodingAESKey,
	}, WXBizMsgCrypt_OK, nil
}

// VerifyURL 校验并解密 sEchoStr（用于首次验证 URL）
// 返回 (code, sReplyEchoStr)
func (w *WXBizJsonMsgCrypt) VerifyURL(sMsgSignature, sTimeStamp, sNonce, sEchoStr string) (int, string) {
	sha1 := &SHA1{}
	ret, signature := sha1.GetSHA1(w.Token, sTimeStamp, sNonce, sEchoStr)
	if ret != WXBizMsgCrypt_OK {
		return ret, ""
	}
	if signature != sMsgSignature {
		return WXBizMsgCrypt_ValidateSignature_Error, ""
	}
	pc := NewPrpcrypt(w.EncodingKey)
	ret, reply := pc.Decrypt(sEchoStr, w.ReceiveID)
	return ret, reply
}

// EncryptMsg 对要回复的消息 sReplyMsg（json 字符串）进行加密并生成外层 JSON 包装
// 返回 (code, generatedJson)
func (w *WXBizJsonMsgCrypt) EncryptMsg(sReplyMsg, sNonce string, timestamp ...string) (int, string) {
	pc := NewPrpcrypt(w.EncodingKey)
	ret, encrypt := pc.Encrypt(sReplyMsg, w.ReceiveID)
	if ret != WXBizMsgCrypt_OK {
		return ret, ""
	}
	// encrypt 是 base64 字符串（已经），确保是字符串
	encryptStr := encrypt

	ts := ""
	if len(timestamp) > 0 && timestamp[0] != "" {
		ts = timestamp[0]
	} else {
		ts = fmt.Sprintf("%d", time.Now().Unix())
	}
	sha1 := &SHA1{}
	ret, signature := sha1.GetSHA1(w.Token, ts, sNonce, encryptStr)
	if ret != WXBizMsgCrypt_OK {
		return ret, ""
	}
	jp := &JsonParse{}
	jsonStr := jp.Generate(encryptStr, signature, ts, sNonce)
	return WXBizMsgCrypt_OK, jsonStr
}

// DecryptMsg 验证签名并解密 POST 的 json 数据包
// sPostData: POST 的 json 数据字符串（包含 encrypt 字段）
// sMsgSignature: URL param msg_signature
// sTimeStamp: timestamp
// sNonce: nonce
// 返回 (code, jsonContent)
func (w *WXBizJsonMsgCrypt) DecryptMsg(sPostData, sMsgSignature, sTimeStamp, sNonce string) (int, string) {
	jp := &JsonParse{}
	ret, encrypt := jp.Extract(sPostData)
	if ret != WXBizMsgCrypt_OK {
		return ret, ""
	}
	sha1 := &SHA1{}
	ret, signature := sha1.GetSHA1(w.Token, sTimeStamp, sNonce, encrypt)
	if ret != WXBizMsgCrypt_OK {
		return ret, ""
	}
	if signature != sMsgSignature {
		return WXBizMsgCrypt_ValidateSignature_Error, ""
	}
	pc := NewPrpcrypt(w.EncodingKey)
	return pc.Decrypt(encrypt, w.ReceiveID)
}

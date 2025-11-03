import CryptoJS from "crypto-js";// 生成密钥

export function aesCbcEncrypt(plaintext: string): string {
  const iv = CryptoJS.lib.WordArray.random(8); // 16字节 IV
  const ivString = CryptoJS.enc.Hex.stringify(iv);
  const key = 'vzWE2R9GckGefVFd'
  const cryptoJsKey = CryptoJS.enc.Utf8.parse(key);
  const cryptoJsIv = CryptoJS.enc.Utf8.parse(ivString);

  // 加密并获取密文二进制数据
  const encrypted = CryptoJS.AES.encrypt(plaintext, cryptoJsKey, {
    iv: cryptoJsIv,
    mode: CryptoJS.mode.CBC,
    padding: CryptoJS.pad.Pkcs7,
  });

  // 将二进制数据转为 Latin1 字符串（兼容所有字节）
  const ciphertext = CryptoJS.enc.Latin1.stringify(encrypted.ciphertext);
  return btoa(ivString + ciphertext)
}

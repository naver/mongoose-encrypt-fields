/**
 * mongoose-field-encryption
 * Copyright (c) 2024-present NAVER Corp.
 * MIT license
 */

import * as crypto from 'crypto'

const secretKey = crypto.randomBytes(32)
const iv = Buffer.from('1234567890123456')

export function encrypt(text: string): string {
  const cipher = crypto.createCipheriv('aes-256-cbc', secretKey, iv)
  let encrypted = cipher.update(text, 'utf-8', 'hex')
  encrypted += cipher.final('hex')
  return encrypted
}

export function decrypt(encryptedText: string): string {
  const decipher = crypto.createDecipheriv('aes-256-cbc', secretKey, iv)
  let decrypted = decipher.update(encryptedText, 'hex', 'utf-8')
  decrypted += decipher.final('utf-8')
  return decrypted
}

export function isEncrypted(text: string): boolean {
  try {
    const decipher = crypto.createDecipheriv('aes-256-cbc', secretKey, iv)
    decipher.update(text, 'hex', 'utf-8')
    decipher.final('utf-8')
    return true
  } catch (error) {
    return false
  }
}

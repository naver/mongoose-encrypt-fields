/**
 * mongoose-encrypt-fields
 * Copyright (c) 2024-present NAVER Corp.
 * MIT license
 */

import { Schema } from 'mongoose'

export interface MongooseFieldEncryptionOptions {
  /** String encryption function. If `originalType` is not `String`, this function is called as `encrypt(EJSON.stringify(value))` with `{ relaxed: true }` */
  encrypt: (value: string) => string
  /** String decryption function. If `originalType` is not `String`, this function is called as `EJSON.parse(decrypt(value))` with `{ relaxed: true }` */
  decrypt: (value: string) => string
  /** Check if given string is encrypted. */
  isEncrypted: (value: string) => boolean
}

export type MongooseFieldEncryption = (schema: Schema, options: MongooseFieldEncryptionOptions) => void

/** Encryption mode. Defaults to `'both'`. */
export type EncryptionMode = 'both' | 'encryptOnly' | 'decryptOnly'

/** Per-field encryption functions. All three must be provided together or omitted entirely. */
export interface PerFieldEncryptionOptions {
  /** Per-field string encryption function. Overrides the global encrypt for this field only. */
  encrypt?: (value: string) => string
  /** Per-field string decryption function. Overrides the global decrypt for this field only. */
  decrypt?: (value: string) => string
  /** Per-field check if string is encrypted. Overrides the global isEncrypted for this field only. */
  isEncrypted?: (value: string) => boolean
}

declare module 'mongoose' {
  namespace Schema {
    namespace Types {
      class EncryptedString extends SchemaType {
        /** This schema type's name, to defend against minifiers that mangle function names. */
        static schemaName: 'EncryptedString'

        /** Set encryption functions for this SchemaType  */
        static setEncryptionFunctions(functions: MongooseFieldEncryptionOptions): void

        /** Encrypt given value to string. Null and undefined are returned as is. */
        encrypt(value: any): string | null | undefined

        /** Decrypt given value. Unencrypted values are returned as is. */
        decrypt(value: any, isLean: boolean): any

        /** Default options for this SchemaType */
        defaultOptions: Record<string, any>
      }
    }
  }
}

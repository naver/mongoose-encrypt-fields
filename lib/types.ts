/**
 * mongoose-field-encryption
 * Copyright (c) 2024-present NAVER Corp.
 * MIT license
 */

import { Schema } from 'mongoose'

export interface MongooseFieldEncryptionOptions {
  /** String encryption function. If `originalType` is not `String`, this function is called as `encrypt(JSON.stringify(value))` */
  encrypt: (value: string) => string
  /** String decryption function. If `originalType` is not `String`, this function is called as `JSON.parse(decrypt(value))` */
  decrypt: (value: string) => string
  /** Check if given string is encrypted. */
  isEncrypted: (value: string) => boolean
}

export type MongooseFieldEncryption = (schema: Schema, options: MongooseFieldEncryptionOptions) => void

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

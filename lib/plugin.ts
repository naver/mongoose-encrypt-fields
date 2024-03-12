/**
 * mongoose-field-encryption
 * Copyright (c) 2024-present NAVER Corp.
 * MIT license
 */

import { Document, Query } from 'mongoose'
import { MongooseFieldEncryption, MongooseFieldEncryptionOptions } from './types'
import { applyPluginMiddleware } from './utils'
import { EncryptedString } from './schemaType'

const validateOptions = (options: MongooseFieldEncryptionOptions) => {
  if (
    typeof options?.decrypt !== 'function' ||
    typeof options?.encrypt !== 'function' ||
    typeof options?.isEncrypted !== 'function'
  ) {
    throw new Error('options must have decrypt, encrypt, isEncrypted functions')
  }
}

export const mongooseFieldEncryption: MongooseFieldEncryption = function (schema, options) {
  validateOptions(options)
  EncryptedString.setEncryptionFunctions({
    encrypt: options.encrypt,
    decrypt: options.decrypt,
    isEncrypted: options.isEncrypted,
  })

  function decryptLeanDocuments(this: Query<any, Document>, obj: any) {
    if (!this._mongooseOptions.lean) {
      return
    }

    // Handle when includeResultMetadata: true. ref: https://mongoosejs.com/docs/tutorials/findoneandupdate.html#includeresultmetadata
    const isRawResult = obj && typeof obj === 'object' && 'ok' in obj
    const doc = isRawResult ? obj.value : obj

    applyPluginMiddleware(schema, doc)
  }

  schema.post('find', decryptLeanDocuments)
  schema.post('findOne', decryptLeanDocuments)
  schema.post('findOneAndUpdate', decryptLeanDocuments)
  schema.post('findOneAndReplace', decryptLeanDocuments)
  schema.post('findOneAndDelete', decryptLeanDocuments)
}

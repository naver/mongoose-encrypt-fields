/**
 * mongoose-encrypt-fields
 * Copyright (c) 2024-present NAVER Corp.
 * MIT license
 */

import { EJSON } from 'bson'
import { randomUUID } from 'crypto'
import mongoose, { Mongoose, SchemaOptions, SchemaType, model, Model, Document, Schema } from 'mongoose'
import { Schema as NestJsSchema, Prop, SchemaFactory } from '@nestjs/mongoose'
import { EncryptionMode, MongooseFieldEncryptionOptions } from './types'

export class EncryptedString extends SchemaType {
  /** This schema type's name, to defend against minifiers that mangle function names. */
  static schemaName: 'EncryptedString'
  /** String representation of what type this is, like 'ObjectID' or 'Number' */
  static instance: 'EncryptedString'
  /** String encryption function */
  static encrypt: (value: string) => string
  /** String decryption function */
  static decrypt: (value: string) => string
  /** Check if given string is encrypted */
  static isEncrypted: (value: string) => boolean

  /** Default options for this SchemaType */
  defaultOptions: Record<string, any> = {}

  private $conditionalHandlers: Record<
    string,
    (value: any) => (string | null | undefined) | (string | null | undefined)[]
  >
  private encryptionMode: EncryptionMode
  private originalType: any
  private originalModel: Model<any>

  constructor(path: string, options?: SchemaOptions & { originalType: any; encryptionMode?: EncryptionMode }) {
    super(path, { ...options, originalType: undefined }, 'EncryptedString')

    this.validateEncryptionMode(options?.encryptionMode)
    this.encryptionMode = options?.encryptionMode ?? 'both'
    this.originalType = options?.originalType ?? String
    this.originalModel = model(`${path}_${randomUUID()}`, this.createOriginalSchema())

    this.$conditionalHandlers = {
      $eq: this.handleSingleQuery,
      $ne: this.handleSingleQuery,
      $in: this.handleArrayQuery,
      $nin: this.handleArrayQuery,
      $all: this.handleArrayQuery,
    }

    // save, update
    this.set((value: any) => {
      return this.encrypt(value)
    })
    // access to property, e.g. user.uniqueId.
    this.get((value: string) => {
      return this.decrypt(value, false)
    })
    // access to object, e.g. doc, doc.toObject(), doc.toJSON().
    this.transform((value: string) => {
      return this.decrypt(value, false)
    })
    // Skip when there is a default option
    if (!Object.keys(this.options).includes('default')) {
      // array's default is []. ref: https://mongoosejs.com/docs/schematypes.html#arrays
      this.default(() => {
        if (Array.isArray(this.originalType)) {
          return []
        } else {
          return undefined
        }
      })
    }
  }

  private validateEncryptionMode(encryptionMode?: EncryptionMode) {
    if (encryptionMode && !['both', 'encryptOnly', 'decryptOnly'].includes(encryptionMode)) {
      throw new Error(`Invalid encryptionMode: '${encryptionMode}'. Allowed: 'both', 'encryptOnly', 'decryptOnly'.`)
    }
  }

  /** Set encryption functions for this SchemaType  */
  static setEncryptionFunctions({ encrypt, decrypt, isEncrypted }: MongooseFieldEncryptionOptions) {
    if (
      typeof EncryptedString.encrypt !== 'function' ||
      typeof EncryptedString.decrypt !== 'function' ||
      typeof EncryptedString.isEncrypted !== 'function'
    ) {
      EncryptedString.encrypt = encrypt
      EncryptedString.decrypt = decrypt
      EncryptedString.isEncrypted = isEncrypted
    }
  }

  // Create schema including nested schemas using @nestjs/mongoose method
  private createOriginalSchema(): Schema {
    @NestJsSchema({ _id: false, autoCreate: false, autoIndex: false })
    class Model {
      @Prop({ type: this.originalType, default: this.options.default })
      // @ts-expect-error This is a dynamic property
      [this.path]: any
    }
    return SchemaFactory.createForClass(Model)
  }

  cast(value: any): any {
    return value
  }

  /** Encrypt given value. Null and undefined are returned as is. */
  encrypt(value: any): string | null | undefined {
    if (this.encryptionMode === 'decryptOnly' || value === null || value === undefined) {
      return value
    }

    if (this.isEncrypted(value)) {
      return value
    }

    const tempDoc = this.originalModel.hydrate({ [this.path]: value }) as Document
    const validationError = tempDoc.validateSync()
    if (validationError) {
      throw validationError
    }

    const castedValue = tempDoc.toObject()[this.path]
    return this.originalType === String
      ? EncryptedString.encrypt(castedValue)
      : EncryptedString.encrypt(EJSON.stringify(castedValue, { relaxed: true }))
  }

  /** Decrypt given value. Unencrypted values are returned as is. */
  decrypt(value: any, isLean: boolean): any {
    if (this.encryptionMode === 'encryptOnly' || !this.isEncrypted(value)) {
      return value
    }

    const decryptedValue = EncryptedString.decrypt(value)
    const decryptedObj = this.originalType === String ? decryptedValue : EJSON.parse(decryptedValue, { relaxed: true })

    if (isLean) {
      return decryptedObj
    }

    const tempDoc = this.originalModel.hydrate({ [this.path]: decryptedObj }) as Document
    const castedValue = tempDoc.toObject()[this.path]
    return castedValue
  }

  private isEncrypted(value: any): boolean {
    if (typeof value !== 'string') {
      return false
    }

    return EncryptedString.isEncrypted(value)
  }

  // ref: https://github.com/mongoosejs/mongoose-long/blob/662a6081dd60a6966529d47b48f93b5137ba0bc8/lib/index.js#L107
  castForQuery($conditional: any, value: any, _context: any) {
    if (!$conditional) {
      return this.encrypt(value)
    }

    if (!($conditional in this.$conditionalHandlers)) {
      throw new Error(
        `Can't use ${$conditional} with EncryptedString. Allowed: ${Object.keys(this.$conditionalHandlers)}`,
      )
    }

    return this.$conditionalHandlers[$conditional].call(this, value)
  }

  private handleSingleQuery(value: any) {
    return this.encrypt(value)
  }

  private handleArrayQuery(value: any[]) {
    const valueToHandle = Array.isArray(value) ? value : [value]
    return valueToHandle.map((eachValue) => this.encrypt(eachValue))
  }
}

// ref: https://github.com/vkarpov15/mongoose-int32/blob/26a6c76cc56c24173de13e8a0f3c6401ce867c9b/int32.js#L52
function loadType(mongoose: Mongoose): void {
  if (mongoose?.Schema?.Types?.EncryptedString?.schemaName === 'EncryptedString') {
    return
  }

  if (mongoose === null) {
    mongoose = require('mongoose')
  }

  if (mongoose.Schema && typeof mongoose.Schema.Types === 'object') {
    mongoose.Schema.Types.EncryptedString = EncryptedString
  }

  if (typeof mongoose.SchemaTypes === 'object') {
    mongoose.SchemaTypes.EncryptedString = EncryptedString
  }
}
loadType(mongoose)

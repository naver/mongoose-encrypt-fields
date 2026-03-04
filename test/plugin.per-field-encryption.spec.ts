/**
 * mongoose-encrypt-fields
 * Copyright (c) 2024-present NAVER Corp.
 * MIT license
 */

import { Model } from 'mongoose'
import { rootModule } from './setup/setupApplication'
import { PerFieldEncryption } from './app/database/schemas/per-field-encryption.schema'
import { getPUPDBModelToken } from './app/database/schemas'
import { encrypt } from './app/crypto'
import { encrypt2 } from './app/crypto2'

describe('[plugin] per-field encryption', () => {
  let model: Model<PerFieldEncryption>

  beforeAll(() => {
    model = rootModule.get(getPUPDBModelToken(PerFieldEncryption.name))
  })

  it('should be defined', () => {
    expect(model).toBeDefined()
  })

  it('should encrypt globalField with global functions and customField with per-field functions', async () => {
    // Given
    const doc = await model.create({ globalField: 'hello', customField: 'world' })
    const rawDoc = await model.collection.findOne({ _id: doc._id })

    // Then — stored values use different encryption
    expect(rawDoc?.globalField).toEqual(encrypt('hello'))
    expect(rawDoc?.customField).toEqual(encrypt2('world'))

    // And — both decrypt correctly on access
    expect(doc.globalField).toEqual('hello')
    expect(doc.customField).toEqual('world')
  })

  it('should decrypt per-field encrypted values on find', async () => {
    // Given
    await model.create({ globalField: 'findGlobal', customField: 'findCustom' })

    // When
    const foundDoc = await model.findOne({ globalField: 'findGlobal' })

    // Then
    expect(foundDoc?.globalField).toEqual('findGlobal')
    expect(foundDoc?.customField).toEqual('findCustom')
  })

  it('should decrypt per-field encrypted values on lean queries', async () => {
    // Given
    await model.create({ globalField: 'leanGlobal', customField: 'leanCustom' })

    // When
    const leanDoc = await model.findOne({ globalField: 'leanGlobal' }).lean()

    // Then
    expect(leanDoc?.globalField).toEqual('leanGlobal')
    expect(leanDoc?.customField).toEqual('leanCustom')
  })

  it('should encrypt per-field values in implicit $eq query', async () => {
    // Given
    const doc = await model.create({ globalField: 'queryGlobal', customField: 'queryCustom' })

    // When — querying customField with plaintext should find the document
    const foundDoc = await model.findOne({ customField: 'queryCustom' })

    // Then
    expect(foundDoc?._id.toString()).toEqual(doc._id.toString())
  })

  it('should encrypt per-field values in $in query', async () => {
    // Given
    const doc = await model.create({ globalField: 'inGlobal', customField: 'inCustom' })

    // When
    const foundDoc = await model.findOne({ customField: { $in: ['inCustom', 'other'] } })

    // Then
    expect(foundDoc?._id.toString()).toEqual(doc._id.toString())
  })

  describe('validation', () => {
    it('should throw if only some per-field encryption functions are provided', () => {
      const mongoose = require('mongoose')
      const { EncryptedString } = require('@lib')

      // Only encrypt provided
      expect(() => {
        new mongoose.Schema({ field: { type: EncryptedString, encrypt: () => 'x' } })
      }).toThrow()

      // encrypt and decrypt, but no isEncrypted
      expect(() => {
        new mongoose.Schema({ field: { type: EncryptedString, encrypt: () => 'x', decrypt: () => 'x' } })
      }).toThrow()
    })
  })
})

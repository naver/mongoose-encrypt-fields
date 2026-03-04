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

  describe('non-string originalType', () => {
    it('should encrypt Number with per-field functions and decrypt correctly', async () => {
      // Given
      const doc = await model.create({ customNumber: 12345 })
      const rawDoc = await model.collection.findOne({ _id: doc._id })

      // Then — stored as encrypt2(JSON.stringify(12345)), not global encrypt
      expect(rawDoc?.customNumber).toEqual(encrypt2(JSON.stringify(12345)))
      expect(rawDoc?.customNumber).not.toEqual(encrypt(JSON.stringify(12345)))
      expect(doc.customNumber).toEqual(12345)

      // And — find and lean both decrypt correctly
      const foundDoc = await model.findById(doc._id)
      const leanDoc = await model.findById(doc._id).lean()
      expect(foundDoc?.customNumber).toEqual(12345)
      expect(leanDoc?.customNumber).toEqual(12345)
    })

    it('should encrypt Object with per-field functions and decrypt correctly', async () => {
      // Given
      const gps = { lat: 37.5, long: 127.0 }
      const doc = await model.create({ customObject: gps })
      const rawDoc = await model.collection.findOne({ _id: doc._id })

      // Then — stored as encrypt2(JSON.stringify(gps)), not global encrypt
      expect(rawDoc?.customObject).toEqual(encrypt2(JSON.stringify(gps)))
      expect(rawDoc?.customObject).not.toEqual(encrypt(JSON.stringify(gps)))
      expect(doc.customObject).toMatchObject(gps)

      // And — find and lean both decrypt correctly
      const foundDoc = await model.findById(doc._id)
      const leanDoc = await model.findById(doc._id).lean()
      expect(foundDoc?.customObject).toMatchObject(gps)
      expect(leanDoc?.customObject).toMatchObject(gps)
    })

    it('should encrypt Array with per-field functions and decrypt correctly', async () => {
      // Given
      const arr = [1, 2, 3]
      const doc = await model.create({ customArray: arr })
      const rawDoc = await model.collection.findOne({ _id: doc._id })

      // Then — stored as encrypt2(JSON.stringify(arr)), not global encrypt
      expect(rawDoc?.customArray).toEqual(encrypt2(JSON.stringify(arr)))
      expect(rawDoc?.customArray).not.toEqual(encrypt(JSON.stringify(arr)))
      expect(doc.customArray).toEqual(arr)

      // And — find and lean both decrypt correctly
      const foundDoc = await model.findById(doc._id)
      const leanDoc = await model.findById(doc._id).lean()
      expect(foundDoc?.customArray).toEqual(arr)
      expect(leanDoc?.customArray).toEqual(arr)
    })
  })

  describe('subdocument', () => {
    it('should apply per-field encryption inside a subdocument', async () => {
      // Given
      const doc = await model.create({
        subDoc: { globalField: 'subGlobal', customField: 'subCustom' },
      })
      const rawDoc = await model.collection.findOne({ _id: doc._id })

      // Then — raw values use different encryption per field
      expect(rawDoc?.subDoc.globalField).toEqual(encrypt('subGlobal'))
      expect(rawDoc?.subDoc.customField).toEqual(encrypt2('subCustom'))

      // And — both decrypt correctly on access
      expect(doc.subDoc?.globalField).toEqual('subGlobal')
      expect(doc.subDoc?.customField).toEqual('subCustom')
    })

    it('should apply per-field encryption inside a subdocument array', async () => {
      // Given
      const doc = await model.create({
        subDocs: [
          { globalField: 'subGlobal1', customField: 'subCustom1' },
          { globalField: 'subGlobal2', customField: 'subCustom2' },
        ],
      })
      const rawDoc = await model.collection.findOne({ _id: doc._id })

      // Then — raw values use different encryption per field
      expect(rawDoc?.subDocs[0].globalField).toEqual(encrypt('subGlobal1'))
      expect(rawDoc?.subDocs[0].customField).toEqual(encrypt2('subCustom1'))
      expect(rawDoc?.subDocs[1].globalField).toEqual(encrypt('subGlobal2'))
      expect(rawDoc?.subDocs[1].customField).toEqual(encrypt2('subCustom2'))

      // And — both decrypt correctly on access
      expect(doc.subDocs?.[0].globalField).toEqual('subGlobal1')
      expect(doc.subDocs?.[0].customField).toEqual('subCustom1')
      expect(doc.subDocs?.[1].globalField).toEqual('subGlobal2')
      expect(doc.subDocs?.[1].customField).toEqual('subCustom2')
    })

    it('should encrypt per-field subdocument field when used as a query filter', async () => {
      // Given
      const doc = await model.create({
        subDoc: { globalField: 'subQueryGlobal', customField: 'subQueryCustom' },
      })

      // When — querying subDoc.customField with plaintext should find the document
      const foundDoc = await model.findOne({ 'subDoc.customField': 'subQueryCustom' })

      // Then
      expect(foundDoc?._id.toString()).toEqual(doc._id.toString())
    })

    it('should decrypt per-field encrypted subdocument fields on lean queries', async () => {
      // Given
      await model.create({
        globalField: 'leanParent',
        subDoc: { globalField: 'leanSubGlobal', customField: 'leanSubCustom' },
      })

      // When
      const leanDoc = await model.findOne({ globalField: 'leanParent' }).lean()

      // Then
      expect(leanDoc?.subDoc?.globalField).toEqual('leanSubGlobal')
      expect(leanDoc?.subDoc?.customField).toEqual('leanSubCustom')
    })
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

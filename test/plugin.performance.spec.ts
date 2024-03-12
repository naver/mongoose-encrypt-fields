/**
 * mongoose-field-encryption
 * Copyright (c) 2024-present NAVER Corp.
 * MIT license
 */

import * as crypto from 'crypto'
import { Model, Mongoose } from 'mongoose'
import { DefinitionsFactory } from '@nestjs/mongoose'
import { ReceiptOCRData, ReceiptOCRDataWithoutEncryption } from './app/database/schemas/receipt-ocr-data.schema'
import { rootModule } from './setup/setupApplication'
import { getReceiptDBModelToken } from './app/database/schemas'
import { receiptOCRData } from './fixtures'

/**
 * Check performance for large documents
 */
describe('[plugin] performance tests', () => {
  let mongooseInstance: Mongoose
  let receiptOCRDataModel: Model<ReceiptOCRData>
  let receiptOCRDataModelWithoutEncryption: Model<ReceiptOCRDataWithoutEncryption>

  const getSeparateMongooseInstance = async () => {
    const newMongooseInstance = new Mongoose()
    await newMongooseInstance.connect(
      (process.env.MONGODB_URL as string).replace(
        /(mongodb:\/\/.+?)\/(.*?)(\?.+)/g,
        `$1/${crypto.randomBytes(16).toString('hex')}$3`,
      ),
      {
        connectTimeoutMS: 10000,
        socketTimeoutMS: 30000,
        readPreference: 'primaryPreferred',
        readConcern: { level: 'local' },
        writeConcern: { w: 1 },
        autoIndex: false,
      },
    )
    return newMongooseInstance
  }

  const getReceiptOCRDataModelWithoutEncryption = (mongoose: Mongoose) => {
    const definition = DefinitionsFactory.createForClass(ReceiptOCRDataWithoutEncryption)
    const schema = new mongoose.Schema<ReceiptOCRDataWithoutEncryption>(definition, {
      collection: 'receiptocrdata',
      shardKey: { _id: 'hashed' },
    })
    return mongoose.model('ReceiptOCRDataWithoutEncryption', schema, 'receiptocrdatawithoutencryption')
  }

  beforeAll(async () => {
    mongooseInstance = await getSeparateMongooseInstance()
    receiptOCRDataModel = rootModule.get(getReceiptDBModelToken(ReceiptOCRData.name))
    receiptOCRDataModelWithoutEncryption = getReceiptOCRDataModelWithoutEncryption(mongooseInstance)
  })

  beforeEach(async () => {
    // For collection warm-up
    const doc = await receiptOCRDataModelWithoutEncryption.create(receiptOCRData)
    await receiptOCRDataModelWithoutEncryption.deleteOne({ _id: doc._id })
    jest.restoreAllMocks()
  })

  afterEach(async () => {
    await receiptOCRDataModelWithoutEncryption.deleteMany({})
  })

  afterAll(async () => {
    await mongooseInstance.disconnect()
  })

  it('should insert a large document without significant performance loss', async () => {
    // Given
    let start = Date.now()
    const baseDoc = await receiptOCRDataModelWithoutEncryption.create(receiptOCRData)
    let end = Date.now()
    const baseElapsedTime = end - start

    // When
    start = Date.now()
    const doc = await receiptOCRDataModel.create(receiptOCRData)
    end = Date.now()
    const elapsedTime = end - start

    // Then
    expect(elapsedTime).toBeLessThanOrEqual(baseElapsedTime * 1.3)
    // Check encryption
    const plainDoc = await receiptOCRDataModelWithoutEncryption.collection.findOne({ _id: baseDoc._id })
    const encryptedDoc = await receiptOCRDataModel.collection.findOne({ _id: doc._id })
    expect(typeof plainDoc?.parsed?.storeInfo.address).toEqual('object')
    expect(typeof encryptedDoc?.parsed?.storeInfo.address).toEqual('string')
  })

  it('should find a large document without significant performance loss', async () => {
    // Given
    const [baseDoc, doc] = await Promise.all([
      receiptOCRDataModelWithoutEncryption.create(receiptOCRData),
      receiptOCRDataModel.create(receiptOCRData),
    ])

    let start = Date.now()
    await receiptOCRDataModelWithoutEncryption.findOne({ _id: baseDoc._id })
    let end = Date.now()
    const baseElapsedTime = end - start

    // When
    start = Date.now()
    await receiptOCRDataModel.findOne({ _id: doc._id })
    end = Date.now()
    const elapsedTime = end - start

    // Then
    expect(elapsedTime).toBeLessThanOrEqual(baseElapsedTime * 1.3)
  })
})

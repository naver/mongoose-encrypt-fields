/**
 * mongoose-field-encryption
 * Copyright (c) 2024-present NAVER Corp.
 * MIT license
 */

import { MongooseModule, Prop, Schema, SchemaFactory } from '@nestjs/mongoose'
import { HydratedDocument, Schema as MongooseSchema, Types } from 'mongoose'
import { KoreaOCRResult, KoreaOCRResultWithoutEncryption } from './ocr-parsed-result.schema'
import { OCRRawResult } from './ocr-raw-result.schema'

export type ReceiptOCRDataDocument = HydratedDocument<ReceiptOCRData>

@Schema({ _id: false })
export class OCRMeta {
  @Prop()
  estimatedLanguage?: string
}

@Schema({ collection: 'receiptocrdata', shardKey: { _id: 'hashed' } })
export class ReceiptOCRData {
  constructor(init: Partial<ReceiptOCRData>) {
    Object.assign(this, init)
  }

  @Prop({ type: MongooseSchema.Types.ObjectId, required: true })
  _id!: Types.ObjectId

  @Prop({ type: MongooseSchema.Types.ObjectId, required: true })
  receiptId!: Types.ObjectId

  @Prop({ type: MongooseSchema.Types.ObjectId, required: true })
  detailId!: Types.ObjectId

  @Prop()
  meta?: OCRMeta

  @Prop()
  raw?: OCRRawResult

  @Prop()
  parsed?: KoreaOCRResult

  @Prop()
  expireDateTime?: Date
}

@Schema({ collection: 'receiptocrdata', shardKey: { _id: 'hashed' } })
export class ReceiptOCRDataWithoutEncryption extends ReceiptOCRData {
  constructor(init: Partial<ReceiptOCRDataWithoutEncryption>) {
    super(init)
    Object.assign(this, init)
  }

  @Prop()
  parsed?: KoreaOCRResultWithoutEncryption
}

export const ReceiptOCRDataSchema = SchemaFactory.createForClass<ReceiptOCRData>(ReceiptOCRData)

export const ReceiptOCRDataModelModule = MongooseModule.forFeatureAsync(
  [
    {
      name: ReceiptOCRData.name,
      useFactory: async () => {
        return ReceiptOCRDataSchema
      },
    },
  ],
  'receipt',
)

/**
 * mongoose-encrypt-fields
 * Copyright (c) 2024-present NAVER Corp.
 * MIT license
 */

import { HydratedDocument, Schema as MongooseSchema, Types } from 'mongoose'
import { Prop, Schema, SchemaFactory, MongooseModule } from '@nestjs/mongoose'
import { EncryptedString } from '@lib'

export type NonJsonTypeDocument = HydratedDocument<NonJsonType>

@Schema({ _id: false })
class NonJsonSub {
  constructor(obj: Partial<NonJsonSub>) {
    Object.assign(this, obj)
  }

  @Prop({ type: EncryptedString, originalType: Date })
  date!: Date

  @Prop({ type: EncryptedString, originalType: MongooseSchema.Types.ObjectId })
  oid!: Types.ObjectId
}

@Schema()
export class NonJsonType {
  constructor(obj: Partial<NonJsonType>) {
    Object.assign(this, obj)
  }

  @Prop({ type: EncryptedString, originalType: Date })
  date!: Date

  @Prop({ type: EncryptedString, originalType: MongooseSchema.Types.ObjectId })
  oid!: Types.ObjectId

  @Prop({ type: EncryptedString, originalType: NonJsonSub })
  sub!: NonJsonSub
}
export const NonJsonTypeSchema = SchemaFactory.createForClass(NonJsonType)

export const NonJsonTypeModelModule = MongooseModule.forFeatureAsync(
  [
    {
      name: NonJsonType.name,
      useFactory: async () => {
        return NonJsonTypeSchema
      },
    },
  ],
  'pup',
)

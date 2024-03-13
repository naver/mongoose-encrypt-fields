/**
 * mongoose-encrypt-fields
 * Copyright (c) 2024-present NAVER Corp.
 * MIT license
 */

import { HydratedDocument, Schema as MongooseSchema, Types } from 'mongoose'
import { Prop, Schema, SchemaFactory, MongooseModule } from '@nestjs/mongoose'
import { EncryptedString } from '@lib'

export type MultipleTypeDocument = HydratedDocument<MultipleType>

class GPS {
  @Prop()
  lat!: number

  @Prop()
  long!: number
}

@Schema({ _id: false })
class SubDoc {
  // NOTE: You can Schema from mongoose
  @Prop({ type: MongooseSchema.Types.EncryptedString, originalType: Number })
  numberField!: number

  @Prop({ type: EncryptedString, originalType: Number })
  numberField2!: number

  @Prop({ type: EncryptedString, originalType: GPS })
  gps!: GPS
}

@Schema()
export class MultipleType {
  constructor(obj: Partial<MultipleType>) {
    Object.assign(this, obj)
  }

  @Prop({ type: MongooseSchema.Types.ObjectId })
  _id!: Types.ObjectId

  @Prop(EncryptedString)
  stringField!: string

  @Prop(EncryptedString)
  stringField2!: string

  @Prop({ type: SubDoc })
  subDoc!: SubDoc

  @Prop({ type: [SubDoc] })
  subDocs!: SubDoc[]
}
export const MultipleTypeSchema = SchemaFactory.createForClass(MultipleType)

export const MultipleTypeModelModule = MongooseModule.forFeatureAsync(
  [
    {
      name: MultipleType.name,
      useFactory: async () => {
        return MultipleTypeSchema
      },
    },
  ],
  'pup',
)

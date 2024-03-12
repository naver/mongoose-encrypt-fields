/**
 * mongoose-field-encryption
 * Copyright (c) 2024-present NAVER Corp.
 * MIT license
 */

import { MongooseModule, Prop, Schema, SchemaFactory } from '@nestjs/mongoose'
import { HydratedDocument } from 'mongoose'
import { UserSubDocument } from './user.schema'

export type VisitDocument = HydratedDocument<Visit>

@Schema()
export class Visit {
  constructor(obj: Partial<Visit>) {
    Object.assign(this, obj)
  }

  @Prop({ required: true })
  placeId!: string

  // subDocument
  @Prop({ required: true, type: UserSubDocument })
  subUser!: UserSubDocument
}
export const VisitSchema = SchemaFactory.createForClass(Visit)

export const VisitModelModule = MongooseModule.forFeatureAsync(
  [
    {
      name: Visit.name,
      useFactory: () => {
        return VisitSchema
      },
    },
  ],
  'receipt',
)

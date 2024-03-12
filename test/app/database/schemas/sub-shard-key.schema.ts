/**
 * mongoose-field-encryption
 * Copyright (c) 2024-present NAVER Corp.
 * MIT license
 */

import { MongooseModule, Prop, Schema, SchemaFactory } from '@nestjs/mongoose'
import { HydratedDocument } from 'mongoose'
import { UserSubDocument } from './user.schema'

export type SubShardKeyDocument = HydratedDocument<SubShardKey>

@Schema({ shardKey: { 'subUser.uniqueId': 1 } })
export class SubShardKey {
  constructor(obj: Partial<SubShardKey>) {
    Object.assign(this, obj)
  }

  // subDocument
  @Prop({ required: true, type: UserSubDocument })
  subUser!: UserSubDocument
}
export const SubShardKeySchema = SchemaFactory.createForClass(SubShardKey)

export const SubShardKeyModelModule = MongooseModule.forFeatureAsync(
  [
    {
      name: SubShardKey.name,
      useFactory: () => {
        return SubShardKeySchema
      },
    },
  ],
  'receipt',
)

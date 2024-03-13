/**
 * mongoose-encrypt-fields
 * Copyright (c) 2024-present NAVER Corp.
 * MIT license
 */

import { Types, HydratedDocument, Schema as MongooseSchema } from 'mongoose'
import { Prop, Schema, SchemaFactory, MongooseModule } from '@nestjs/mongoose'
import { EncryptedString } from '@lib'

export type UserDocument = HydratedDocument<User>

@Schema({ shardKey: { uniqueId: 1 } })
export class User {
  constructor(obj: Partial<User>) {
    Object.assign(this, obj)
  }

  @Prop({ required: true, type: EncryptedString })
  uniqueId!: string

  @Prop({ default: Date.now })
  createdDateTime!: Date

  @Prop({ type: EncryptedString, originalType: [Number] })
  coordinates?: number[]
}
export const UserSchema = SchemaFactory.createForClass(User)

@Schema({ _id: true })
export class UserSubDocument {
  @Prop({ required: true, type: MongooseSchema.Types.ObjectId })
  _id!: Types.ObjectId

  @Prop({ required: true, type: EncryptedString })
  uniqueId!: string
}

export const UserModelModule = MongooseModule.forFeatureAsync(
  [
    {
      name: User.name,
      useFactory: async () => {
        return UserSchema
      },
    },
  ],
  'pup',
)

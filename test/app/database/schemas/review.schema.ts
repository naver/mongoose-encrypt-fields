/**
 * mongoose-field-encryption
 * Copyright (c) 2024-present NAVER Corp.
 * MIT license
 */

import { MongooseModule, Prop, Schema, SchemaFactory } from '@nestjs/mongoose'
import { HydratedDocument, Schema as MongooseSchema, Types } from 'mongoose'
import { EncryptedString } from '@lib'
import { User, UserSubDocument } from './user.schema'
import { CheckIn, CheckInSchema } from './check-in.schema'

export type ReviewDocument = HydratedDocument<Review>

@Schema({ toJSON: { virtuals: true }, toObject: { virtuals: true } })
export class Review {
  constructor(obj: Partial<Review>) {
    Object.assign(this, obj)
  }

  @Prop({ required: true })
  text!: string

  @Prop({ required: true, type: EncryptedString })
  sensitiveText!: string

  // NOTE: type must be Schema to support discriminator in subDocument
  @Prop({ type: CheckInSchema })
  checkIn?: CheckIn

  // subDocument
  @Prop({ required: true, type: UserSubDocument })
  subUser!: UserSubDocument

  // populate
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: User.name })
  populatedUser?: Types.ObjectId

  // virtual
  virtualUser?: User
}
export const ReviewSchema = SchemaFactory.createForClass(Review)

export const ReviewModelModule = MongooseModule.forFeatureAsync(
  [
    {
      name: Review.name,
      useFactory: async () => {
        ReviewSchema.virtual('virtualUser', {
          ref: User.name,
          localField: 'subUser._id',
          foreignField: '_id',
          justOne: true,
        })

        return ReviewSchema
      },
    },
  ],
  'pup',
)

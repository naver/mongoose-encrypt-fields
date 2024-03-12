/**
 * mongoose-field-encryption
 * Copyright (c) 2024-present NAVER Corp.
 * MIT license
 */

import { MongooseModule, Prop, Schema, SchemaFactory } from '@nestjs/mongoose'
import { HydratedDocument } from 'mongoose'
import { UserSubDocument } from './user.schema'
import { Review } from './review.schema'

export type ThemelistDocument = HydratedDocument<Themelist>

@Schema()
export class Themelist {
  constructor(obj: Partial<Themelist>) {
    Object.assign(this, obj)
  }

  @Prop({ required: true })
  title!: string

  @Prop({ required: true, type: UserSubDocument })
  user!: UserSubDocument

  @Prop({ required: true, type: [Review] })
  reviews!: Review[]
}
export const ThemelistSchema = SchemaFactory.createForClass(Themelist)

export const ThemelistModelModule = MongooseModule.forFeatureAsync(
  [
    {
      name: Themelist.name,
      useFactory: () => {
        return ThemelistSchema
      },
    },
  ],
  'pup',
)

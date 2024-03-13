/**
 * mongoose-encrypt-fields
 * Copyright (c) 2024-present NAVER Corp.
 * MIT license
 */

import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose'
import { HydratedDocument } from 'mongoose'
import { CheckIn } from './check-in.schema'
import { Location } from './location.schema'

export type GPSCheckInDocument = HydratedDocument<GPSCheckIn>

@Schema()
export class GPSCheckIn implements CheckIn {
  constructor(obj: Partial<GPSCheckIn>) {
    Object.assign(this, obj)
  }

  type!: string

  @Prop({ required: true, type: Location })
  location!: Location
}

export const GPSCheckInSchema = SchemaFactory.createForClass(GPSCheckIn)

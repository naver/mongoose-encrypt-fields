/**
 * mongoose-encrypt-fields
 * Copyright (c) 2024-present NAVER Corp.
 * MIT license
 */

import { Schema, SchemaFactory, Prop } from '@nestjs/mongoose'
import { HydratedDocument } from 'mongoose'
import { CheckIn } from './check-in.schema'
import { Location, LocationWithoutEncryption } from './location.schema'

export type PlaceCheckInDocument = HydratedDocument<PlaceCheckIn>

@Schema()
export class PlaceCheckIn implements CheckIn {
  constructor(obj: Partial<PlaceCheckIn>) {
    Object.assign(this, obj)
  }

  type!: string

  @Prop({ required: true, type: LocationWithoutEncryption })
  location!: Location
}

export const PlaceCheckInSchema = SchemaFactory.createForClass<PlaceCheckIn>(PlaceCheckIn)

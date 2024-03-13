/**
 * mongoose-encrypt-fields
 * Copyright (c) 2024-present NAVER Corp.
 * MIT license
 */

import { MongooseModule, Prop, Schema, SchemaFactory } from '@nestjs/mongoose'
import { HydratedDocument } from 'mongoose'
import { GPSCheckIn, GPSCheckInSchema } from './check-in.gps.schema'
import { PlaceCheckIn, PlaceCheckInSchema } from './check-in.place.schema'

export type CheckInDocument = HydratedDocument<CheckIn>

export enum CheckInType {
  SEARCH = 'search',
  MEDIA = 'media',
  GPS = 'gps',
  PLACE = 'place',
}

@Schema({ shardKey: { 'user._id': 1, _id: 1 }, discriminatorKey: 'type' })
export class CheckIn {
  constructor(obj: Partial<CheckIn>) {
    Object.assign(this, obj)
  }

  @Prop({ required: true })
  type!: string
}
export const CheckInSchema = SchemaFactory.createForClass(CheckIn)

export const CheckInModelModule = MongooseModule.forFeatureAsync(
  [
    {
      name: CheckIn.name,
      useFactory: async () => {
        return CheckInSchema
      },
      discriminators: [
        { value: CheckInType.GPS, name: GPSCheckIn.name, schema: GPSCheckInSchema },
        { value: CheckInType.PLACE, name: PlaceCheckIn.name, schema: PlaceCheckInSchema },
      ],
    },
  ],
  'receipt',
)

/**
 * mongoose-encrypt-fields
 * Copyright (c) 2024-present NAVER Corp.
 * MIT license
 */

import { Prop, Schema, SchemaFactory, MongooseModule } from '@nestjs/mongoose'
import { EncryptedString } from '@lib'

@Schema({ _id: false })
class Phone {
  @Prop({ required: true })
  phoneNumber!: string
}

@Schema({ _id: false })
export class AddressElement {
  @Prop({ required: true })
  longName!: string
}

@Schema({ _id: false })
export class Address {
  @Prop([AddressElement])
  addressElements!: AddressElement[]
}

@Schema({ shardKey: { placeId: 1 } })
export class Place {
  constructor(obj: Partial<Place>) {
    Object.assign(this, obj)
  }

  @Prop()
  placeId!: string

  @Prop({ type: EncryptedString, originalType: [Phone] })
  phone!: Phone[]

  @Prop({ type: EncryptedString, originalType: [Phone], default: undefined })
  phoneWithDefault?: Phone[]

  @Prop({ type: EncryptedString, originalType: Address })
  address?: Address
}
export const PlaceSchema = SchemaFactory.createForClass(Place)

export const PlaceModelModule = MongooseModule.forFeatureAsync(
  [
    {
      name: Place.name,
      useFactory: async () => {
        return PlaceSchema
      },
    },
  ],
  'pup',
)

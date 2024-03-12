/**
 * mongoose-field-encryption
 * Copyright (c) 2024-present NAVER Corp.
 * MIT license
 */

import { Prop, Schema } from '@nestjs/mongoose'
import { EncryptedString } from '@lib'

@Schema({ _id: false })
export class Location {
  @Prop({ required: true })
  type!: string

  @Prop({ required: true, type: EncryptedString, originalType: [Number] })
  coordinates!: number[]
}

@Schema({ _id: false })
export class LocationWithoutEncryption extends Location {
  @Prop([Number])
  coordinates!: number[]
}

/**
 * mongoose-encrypt-fields
 * Copyright (c) 2024-present NAVER Corp.
 * MIT license
 */

import { EncryptedString } from '@lib'
import { MongooseModule, Prop, Schema, SchemaFactory } from '@nestjs/mongoose'
import { encrypt2, decrypt2, isEncrypted2 } from '../../crypto2'

@Schema({ _id: false })
export class GPS {
  @Prop()
  lat!: number

  @Prop()
  long!: number
}

@Schema({ _id: false })
export class PerFieldEncryptionSubDoc {
  /** Uses global encryption (default) */
  @Prop({ type: EncryptedString })
  globalField?: string

  /** Uses per-field encryption functions */
  @Prop({
    type: EncryptedString,
    encryptFn: encrypt2,
    decryptFn: decrypt2,
    isEncryptedFn: isEncrypted2,
  })
  customField?: string
}

@Schema()
export class PerFieldEncryption {
  constructor(obj: Partial<PerFieldEncryption>) {
    Object.assign(this, obj)
  }

  /** Uses global encryption (default) */
  @Prop({ type: EncryptedString })
  globalField?: string

  /** Uses per-field encryption functions */
  @Prop({
    type: EncryptedString,
    encryptFn: encrypt2,
    decryptFn: decrypt2,
    isEncryptedFn: isEncrypted2,
  })
  customField?: string

  /** Per-field encrypted Number */
  @Prop({
    type: EncryptedString,
    originalType: Number,
    encryptFn: encrypt2,
    decryptFn: decrypt2,
    isEncryptedFn: isEncrypted2,
  })
  customNumber?: number

  /** Per-field encrypted Object */
  @Prop({
    type: EncryptedString,
    originalType: GPS,
    encryptFn: encrypt2,
    decryptFn: decrypt2,
    isEncryptedFn: isEncrypted2,
  })
  customObject?: GPS

  /** Per-field encrypted Array */
  @Prop({
    type: EncryptedString,
    originalType: [Number],
    encryptFn: encrypt2,
    decryptFn: decrypt2,
    isEncryptedFn: isEncrypted2,
  })
  customArray?: number[]

  /** Subdocument containing per-field encrypted fields */
  @Prop(PerFieldEncryptionSubDoc)
  subDoc?: PerFieldEncryptionSubDoc

  /** Array of subdocuments containing per-field encrypted fields */
  @Prop([PerFieldEncryptionSubDoc])
  subDocs?: PerFieldEncryptionSubDoc[]
}
export const PerFieldEncryptionSchema = SchemaFactory.createForClass(PerFieldEncryption)

export const PerFieldEncryptionModelModule = MongooseModule.forFeatureAsync(
  [
    {
      name: PerFieldEncryption.name,
      useFactory: async () => {
        return PerFieldEncryptionSchema
      },
    },
  ],
  'pup',
)

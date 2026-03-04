/**
 * mongoose-encrypt-fields
 * Copyright (c) 2024-present NAVER Corp.
 * MIT license
 */

import { EncryptedString } from '@lib'
import { MongooseModule, Prop, Schema, SchemaFactory } from '@nestjs/mongoose'
import { encrypt2, decrypt2, isEncrypted2 } from '../../crypto2'

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
    encrypt: encrypt2,
    decrypt: decrypt2,
    isEncrypted: isEncrypted2,
  })
  customField?: string
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

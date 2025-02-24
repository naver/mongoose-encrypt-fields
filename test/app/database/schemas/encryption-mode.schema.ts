import { EncryptedString } from '@lib'
import { MongooseModule, Prop, Schema, SchemaFactory } from '@nestjs/mongoose'

@Schema()
export class EncryptionModeTest {
  constructor(obj: Partial<EncryptionModeTest>) {
    Object.assign(this, obj)
  }

  @Prop({ type: EncryptedString, encryptionMode: 'encryptOnly' })
  encryptOnly?: string

  @Prop({ type: EncryptedString, encryptionMode: 'decryptOnly' })
  decryptOnly?: string

  @Prop({ type: EncryptedString, encryptionMode: 'both' })
  both?: string

  @Prop({ type: EncryptedString })
  default?: string
}
export const EncryptionModeTestSchema = SchemaFactory.createForClass(EncryptionModeTest)

export const EncryptionModeTestModelModule = MongooseModule.forFeatureAsync(
  [
    {
      name: EncryptionModeTest.name,
      useFactory: async () => {
        return EncryptionModeTestSchema
      },
    },
  ],
  'pup',
)

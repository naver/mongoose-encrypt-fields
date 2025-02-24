import { EncryptedString } from '@lib'
import { MongooseModule, Prop, Schema, SchemaFactory } from '@nestjs/mongoose'

@Schema({ _id: false })
class GPS {
  @Prop()
  lat!: number

  @Prop()
  long!: number
}

@Schema()
export class EncryptionModeTest {
  constructor(obj: Partial<EncryptionModeTest>) {
    Object.assign(this, obj)
  }

  @Prop({ type: EncryptedString, encryptionMode: 'encryptOnly' })
  encryptOnly?: string

  @Prop({ type: EncryptedString, originalType: GPS, encryptionMode: 'encryptOnly' })
  encryptOnlyJSON?: GPS

  @Prop({ type: EncryptedString, encryptionMode: 'decryptOnly' })
  decryptOnly?: string

  @Prop({ type: EncryptedString, originalType: GPS, encryptionMode: 'decryptOnly' })
  decryptOnlyJSON?: GPS
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

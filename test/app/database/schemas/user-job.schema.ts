/**
 * mongoose-encrypt-fields
 * Copyright (c) 2024-present NAVER Corp.
 * MIT license
 */

import { Prop, Schema, SchemaFactory, MongooseModule } from '@nestjs/mongoose'
import { Require_id } from 'mongoose'
import { UserSubDocument } from './user.schema'

@Schema()
export class KRUpdatePaymentUserJob implements UserJob {
  constructor(user: Require_id<UserSubDocument>, fromYearMonth: string) {
    this.type = JobType.KR_UPDATE_PAYMENTS
    this.user = user
    this.fromYearMonth = fromYearMonth
  }

  type!: JobType
  user!: UserSubDocument

  @Prop({ required: true })
  fromYearMonth!: string
}
const KRUpdatePaymentUserJobSchema = SchemaFactory.createForClass(KRUpdatePaymentUserJob)

export enum JobType {
  KR_UPDATE_PAYMENTS = 'kr-update-payments',
}

@Schema({ shardKey: { 'user._id': 1 }, discriminatorKey: 'type' })
export class UserJob {
  constructor(init: Partial<UserJob>) {
    Object.assign(this, init)
  }

  @Prop({ required: true })
  type!: JobType

  @Prop({ required: true })
  user!: UserSubDocument
}

export const UserJobSchema = SchemaFactory.createForClass<UserJob>(UserJob)

export const UserJobModelModule = MongooseModule.forFeatureAsync(
  [
    {
      name: UserJob.name,
      useFactory: () => {
        return UserJobSchema
      },
      discriminators: [
        { value: JobType.KR_UPDATE_PAYMENTS, name: KRUpdatePaymentUserJob.name, schema: KRUpdatePaymentUserJobSchema },
      ],
    },
  ],
  'receipt',
)

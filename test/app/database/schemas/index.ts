/**
 * mongoose-encrypt-fields
 * Copyright (c) 2024-present NAVER Corp.
 * MIT license
 */

import { DynamicModule } from '@nestjs/common'
import { getModelToken } from '@nestjs/mongoose'
import { UserModelModule } from './user.schema'
import { ReviewModelModule } from './review.schema'
import { ThemelistModelModule } from './themelist.schema'
import { CheckInModelModule } from './check-in.schema'
import { VisitModelModule } from './visit.schema'
import { ReceiptOCRDataModelModule } from './receipt-ocr-data.schema'
import { SubShardKeyModelModule } from './sub-shard-key.schema'
import { MultipleTypeModelModule } from './multiple-type.schema'
import { UserJobModelModule } from './user-job.schema'
import { PlaceModelModule } from './place.schema'
import { NonJsonTypeModelModule } from './non-json-type.schema'

export const createSchemaModules: () => DynamicModule[] = () => [
  UserModelModule,
  ReviewModelModule,
  ThemelistModelModule,
  CheckInModelModule,
  VisitModelModule,
  ReceiptOCRDataModelModule,
  SubShardKeyModelModule,
  MultipleTypeModelModule,
  UserJobModelModule,
  PlaceModelModule,
  NonJsonTypeModelModule,
]

export function getPUPDBModelToken(model: string) {
  return getModelToken(model, 'pup')
}

export function getReceiptDBModelToken(model: string) {
  return getModelToken(model, 'receipt')
}

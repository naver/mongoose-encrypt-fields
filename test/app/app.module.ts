/**
 * mongoose-encrypt-fields
 * Copyright (c) 2024-present NAVER Corp.
 * MIT license
 */

import { Module } from '@nestjs/common'
import { InMemoryDatabaseModule } from './database/database.module'

@Module({
  imports: [InMemoryDatabaseModule],
})
export class AppModule {}

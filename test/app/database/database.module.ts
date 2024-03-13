/**
 * mongoose-encrypt-fields
 * Copyright (c) 2024-present NAVER Corp.
 * MIT license
 */

import * as crypto from 'crypto'
import * as mongoose from 'mongoose'

import { Module } from '@nestjs/common'
import { MongooseModule } from '@nestjs/mongoose'

import { mongooseFieldEncryption } from '@lib'
import { ConnectionService } from './connection.service'
import { decrypt, encrypt, isEncrypted } from '../crypto'
import { createSchemaModules } from './schemas'

const createMongooseModule = (connectionName: string) =>
  MongooseModule.forRootAsync({
    connectionName,
    useFactory: async () => {
      // NOTE: register as a global plugin for lean(). Prevent duplicate using deduplicate.
      mongoose.plugin(mongooseFieldEncryption, {
        encrypt: (value: string) => encrypt(value),
        decrypt: (value: string) => decrypt(value),
        isEncrypted,
        deduplicate: true,
      })
      // mongoose.set('debug', true)

      return {
        uri: (process.env.MONGODB_URL as string).replace(
          /(mongodb:\/\/.+?)\/(.*?)(\?.+)/g,
          `$1/${crypto.randomBytes(16).toString('hex')}$3`,
        ),
        connectTimeoutMS: 10000,
        socketTimeoutMS: 30000,
        readPreference: 'primaryPreferred',
        readConcern: { level: 'local' },
        writeConcern: { w: 1 },
        autoIndex: false,
      }
    },
  })

@Module({
  providers: [ConnectionService],
  exports: [ConnectionService, MongooseModule],
  imports: [createMongooseModule('receipt'), createMongooseModule('pup'), ...createSchemaModules()],
})
export class InMemoryDatabaseModule {}

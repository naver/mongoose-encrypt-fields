/**
 * mongoose-encrypt-fields
 * Copyright (c) 2024-present NAVER Corp.
 * MIT license
 */

import { Test, TestingModule } from '@nestjs/testing'
import { INestApplication } from '@nestjs/common'
import { AppModule } from '../app/app.module'
import { ConnectionService } from '../app/database/connection.service'

export let app: INestApplication
export let rootModule: TestingModule

beforeAll(async () => {
  rootModule = await Test.createTestingModule({
    imports: [AppModule],
  }).compile()

  app = rootModule.createNestApplication()
  await app.init()
})

afterAll(async () => {
  const mongodb = rootModule.get(ConnectionService)
  await Promise.all([app.close(), mongodb.teardown()])
})

afterEach(async () => {
  const mongodb = rootModule.get(ConnectionService)
  const collections = mongodb.collections

  const promises: Promise<unknown>[] = []
  for (const name in collections) {
    promises.push(collections[name].deleteMany({}))
  }
  await Promise.all(promises)
})

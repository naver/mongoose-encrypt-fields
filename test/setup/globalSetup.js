/**
 * mongoose-encrypt-fields
 * Copyright (c) 2024-present NAVER Corp.
 * MIT license
 */

/* eslint-disable @typescript-eslint/no-var-requires */
const { MongoMemoryReplSet } = require('mongodb-memory-server')
const crypto = require('crypto')

const packageJson = require('../../package.json')

const createMongod = async () => {
  const version = packageJson.config.mongodbMemoryServer.version
  const db = await MongoMemoryReplSet.create({
    binary: { version },
    replSet: {
      count: 1,
      oplogSize: 50,
      storageEngine: 'wiredTiger',
      name: `${process.env.npm_lifecycle_event}_${crypto.randomBytes(4).toString('hex')}`,
      configSettings: {
        // https://docs.mongodb.com/manual/reference/replica-configuration/#rsconf.settings.electionTimeoutMillis
        electionTimeoutMillis: 10000,
      },
    },
  })

  await db.waitUntilRunning()
  return db
}

let database = {}

module.exports = async () => {
  const mongoServer = await createMongod()

  database.mongod = mongoServer
  process.env.MONGODB_URL = database.mongod.getUri()
}

module.exports.database = database

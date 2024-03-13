/**
 * mongoose-encrypt-fields
 * Copyright (c) 2024-present NAVER Corp.
 * MIT license
 */

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { database } = require('./globalSetup')

module.exports = async () => {
  await database.mongod.stop()
}

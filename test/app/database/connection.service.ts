/**
 * mongoose-encrypt-fields
 * Copyright (c) 2024-present NAVER Corp.
 * MIT license
 */

import { InjectConnection } from '@nestjs/mongoose'
import { Connection, Collection, disconnect } from 'mongoose'
import { Injectable } from '@nestjs/common'

@Injectable()
export class ConnectionService {
  constructor(
    @InjectConnection('pup') private _conn1: Connection,
    @InjectConnection('receipt') private _conn2: Connection,
  ) {}

  get collections(): { [key: string]: Collection } {
    return { ...this._conn1.collections, ...this._conn2.collections }
  }

  async teardown() {
    await disconnect()
  }
}

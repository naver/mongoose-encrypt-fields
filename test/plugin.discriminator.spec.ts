/**
 * mongoose-field-encryption
 * Copyright (c) 2024-present NAVER Corp.
 * MIT license
 */

import { Model, Types } from 'mongoose'

import { rootModule } from './setup/setupApplication'
import { User } from './app/database/schemas/user.schema'
import { GPSCheckIn, GPSCheckInDocument } from './app/database/schemas/check-in.gps.schema'
import { PlaceCheckIn, PlaceCheckInDocument } from './app/database/schemas/check-in.place.schema'
import { CheckIn, CheckInType } from './app/database/schemas/check-in.schema'
import { getPUPDBModelToken, getReceiptDBModelToken } from './app/database/schemas'

/**
 * test discriminator
 */
describe('[plugin] discriminator', () => {
  let userModel: Model<User>
  let checkInModel: Model<CheckIn>
  let gpsCheckInModel: Model<GPSCheckIn>
  let placeCheckInModel: Model<PlaceCheckIn>

  beforeAll(() => {
    userModel = rootModule.get(getPUPDBModelToken(User.name))
    checkInModel = rootModule.get(getReceiptDBModelToken(CheckIn.name))
    gpsCheckInModel = rootModule.get(getReceiptDBModelToken(GPSCheckIn.name))
    placeCheckInModel = rootModule.get(getReceiptDBModelToken(PlaceCheckIn.name))
  })

  beforeEach(() => {
    jest.restoreAllMocks()
  })

  it('should be defined', () => {
    expect(userModel).toBeDefined()
    expect(checkInModel).toBeDefined()
    expect(gpsCheckInModel).toBeDefined()
    expect(placeCheckInModel).toBeDefined()
  })

  it('should create gps check-in document with fields encrypted', async () => {
    // given
    const location = { type: 'Point', coordinates: [128, 37] }
    const gpsCheckIn = new GPSCheckIn({ location, type: 'gps' })

    // when
    const doc = (await checkInModel.create(gpsCheckIn)) as GPSCheckInDocument
    const rawDoc = (await checkInModel.collection.findOne({ _id: new Types.ObjectId(doc._id) })) as GPSCheckInDocument

    // then
    expect(doc.type).toEqual(CheckInType.GPS)
    expect(typeof rawDoc.location.coordinates).toEqual('string') // Encrypted
    expect(doc.location.coordinates).toEqual([128, 37]) // Decrypted
  })

  it('should create place check-in document without field encrypted', async () => {
    // when
    const location = { type: 'Point', coordinates: [128, 37] }
    const placeCheckIn = new PlaceCheckIn({ location, type: 'place' })

    const doc = (await checkInModel.create(placeCheckIn)) as PlaceCheckInDocument
    const rawDoc = (await checkInModel.collection.findOne({
      _id: new Types.ObjectId(doc._id),
    })) as PlaceCheckInDocument

    // then
    expect(doc.type).toEqual(CheckInType.PLACE)
    expect(rawDoc.location.coordinates).toEqual([128, 37]) // Not encrypted because of discriminator
    expect(doc.location.coordinates).toEqual([128, 37])
  })
})

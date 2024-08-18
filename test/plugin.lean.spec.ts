/**
 * mongoose-encrypt-fields
 * Copyright (c) 2024-present NAVER Corp.
 * MIT license
 */

import { Model, Types } from 'mongoose'

import { rootModule } from './setup/setupApplication'
import { Review } from './app/database/schemas/review.schema'
import { User } from './app/database/schemas/user.schema'
import { Themelist, ThemelistDocument } from './app/database/schemas/themelist.schema'
import { GPSCheckIn } from './app/database/schemas/check-in.gps.schema'
import { PlaceCheckIn } from './app/database/schemas/check-in.place.schema'
import { CheckIn, CheckInType } from './app/database/schemas/check-in.schema'
import { getPUPDBModelToken, getReceiptDBModelToken } from './app/database/schemas'
import { JobType, KRUpdatePaymentUserJob, UserJob } from './app/database/schemas/user-job.schema'
import { NonJsonType } from './app/database/schemas/non-json-type.schema'
import { encrypt } from './app/crypto'

/**
 * Check lean()
 */
describe('[plugin] lean', () => {
  let userModel: Model<User>
  let reviewModel: Model<Review>
  let themelistModel: Model<Themelist>
  let checkInModel: Model<CheckIn>
  let gpsCheckInModel: Model<GPSCheckIn>
  let placeCheckInModel: Model<PlaceCheckIn>
  let userJobModel: Model<UserJob>
  let nonJsonTypeModel: Model<NonJsonType>

  beforeAll(() => {
    userModel = rootModule.get(getPUPDBModelToken(User.name))
    reviewModel = rootModule.get(getPUPDBModelToken(Review.name))
    themelistModel = rootModule.get(getPUPDBModelToken(Themelist.name))
    checkInModel = rootModule.get(getReceiptDBModelToken(CheckIn.name))
    gpsCheckInModel = rootModule.get(getReceiptDBModelToken(GPSCheckIn.name))
    placeCheckInModel = rootModule.get(getReceiptDBModelToken(PlaceCheckIn.name))
    userJobModel = rootModule.get(getReceiptDBModelToken(UserJob.name))
    nonJsonTypeModel = rootModule.get(getPUPDBModelToken(NonJsonType.name))
  })

  let themelistDoc: ThemelistDocument
  beforeEach(async () => {
    jest.restoreAllMocks()

    const user = new User({ uniqueId: 'uniqueId' })
    const userDoc = await userModel.create(user)

    const gpsCheckIn = new GPSCheckIn({ location: { type: 'Point', coordinates: [128, 37] }, type: 'gps' })
    const checkInDoc = await checkInModel.create(gpsCheckIn)

    const review = new Review({
      text: 'good',
      sensitiveText: 'veryBad',
      subUser: userDoc,
      checkIn: checkInDoc,
    })
    const reviewDoc = await reviewModel.create(review)
    const review2 = new Review({
      text: 'good2',
      sensitiveText: 'veryBad2',
      subUser: userDoc,
    })
    const reviewDoc2 = await reviewModel.create(review2)

    const themelist = new Themelist({
      title: 'themelist',
      reviews: [reviewDoc, reviewDoc2],
      user: userDoc,
    })
    themelistDoc = await themelistModel.create(themelist)
    await themelistModel.create(themelist)
    await themelistModel.create(themelist)
  })

  it('should be defined', () => {
    expect(userModel).toBeDefined()
    expect(reviewModel).toBeDefined()
    expect(themelistModel).toBeDefined()
    expect(checkInModel).toBeDefined()
    expect(gpsCheckInModel).toBeDefined()
    expect(placeCheckInModel).toBeDefined()
    expect(userJobModel).toBeDefined()
    expect(nonJsonTypeModel).toBeDefined()
  })

  it('should work with findOne()', async () => {
    // When
    const leanDoc = await themelistModel.findOne({ _id: themelistDoc._id }).lean()

    // Then
    expect(leanDoc?.user.uniqueId).toEqual('uniqueId')
    expect(leanDoc?.reviews.map((review) => review.sensitiveText)).toEqual(['veryBad', 'veryBad2'])
    expect(leanDoc?.reviews.map((review) => review.subUser.uniqueId)).toEqual(['uniqueId', 'uniqueId'])
  })

  it('should work with find()', async () => {
    // When
    const leanDocs = await themelistModel.find({ 'user._id': themelistDoc.user._id }).lean()

    // Then
    expect(leanDocs.map((doc) => doc.user.uniqueId)).toEqual(['uniqueId', 'uniqueId', 'uniqueId'])
    expect(leanDocs.map((doc) => doc.reviews.map((review) => review.sensitiveText))).toEqual([
      ['veryBad', 'veryBad2'],
      ['veryBad', 'veryBad2'],
      ['veryBad', 'veryBad2'],
    ])
    expect(leanDocs.map((doc) => doc.reviews.map((review) => review.subUser.uniqueId))).toEqual([
      ['uniqueId', 'uniqueId'],
      ['uniqueId', 'uniqueId'],
      ['uniqueId', 'uniqueId'],
    ])
  })

  it('should work with inclusive projection', async () => {
    // When
    const leanDoc = await themelistModel
      .findOne({ _id: themelistDoc._id }, { 'user.uniqueId': 1, 'reviews.subUser.uniqueId': 1 })
      .lean()

    // Then
    expect(leanDoc).toStrictEqual({
      _id: themelistDoc._id,
      user: { uniqueId: 'uniqueId' },
      reviews: [{ subUser: { uniqueId: 'uniqueId' } }, { subUser: { uniqueId: 'uniqueId' } }],
    })
  })

  it('should work with exclusive projection', async () => {
    // When
    const leanDoc = await themelistModel.findOne({ _id: themelistDoc._id }, { reviews: 0 }).lean()

    // Then
    expect(leanDoc).toStrictEqual({
      _id: themelistDoc._id,
      title: 'themelist',
      user: { _id: themelistDoc.user._id, uniqueId: 'uniqueId' },
      __v: 0,
    })
  })

  it('should skip casting', async () => {
    // Given
    await userModel.collection.insertOne({
      uniqueId: encrypt('hello'),
      createdDateTime: '2024-03-01T00:00:00+09:00',
    })

    // When
    const userDoc = await userModel.findOne({ uniqueId: 'hello' })
    const userLeanDoc = await userModel.findOne({ uniqueId: 'hello' }).lean()

    // Then
    expect(userDoc?.createdDateTime).toEqual(new Date('2024-03-01T00:00:00+09:00'))
    expect(userLeanDoc?.createdDateTime).toEqual('2024-03-01T00:00:00+09:00')
  })

  it('should decrypt non-JSON types', async () => {
    // Given
    const obj: NonJsonType = {
      oid: new Types.ObjectId(),
      date: new Date(),
      sub: {
        oid: new Types.ObjectId(),
        date: new Date(),
      },
    }
    const nonJsonType = new NonJsonType(obj)
    const doc = await nonJsonTypeModel.create(nonJsonType)

    // When
    const leanDoc = await nonJsonTypeModel.findOne({ _id: doc._id }).lean()

    // Then
    expect(leanDoc).toEqual({ ...obj, _id: expect.any(Types.ObjectId), __v: 0 })
  })

  describe('discriminator', () => {
    it('should work with top-level discriminator', async () => {
      // Given
      const gpsCheckIn = new GPSCheckIn({ location: { type: 'Point', coordinates: [128, 37] }, type: 'gps' })
      const doc = await checkInModel.create(gpsCheckIn)

      // When
      const leanDoc = (await checkInModel.findOne({ _id: doc._id }).lean()) as GPSCheckIn

      // Then
      expect(leanDoc.type).toEqual(CheckInType.GPS)
      expect(leanDoc.location.coordinates).toEqual([128, 37])
    })

    it('should work with subDocument discriminator', async () => {
      // When
      const leanDoc = await themelistModel.findOne({ _id: themelistDoc._id }).lean()

      // Then
      const gpsCheckIn = leanDoc?.reviews[0].checkIn as GPSCheckIn
      expect(gpsCheckIn.type).toEqual(CheckInType.GPS)
      expect(gpsCheckIn.location.coordinates).toEqual([128, 37])
    })

    it('should work with base fields of discriminator', async () => {
      // Given
      const userJob = new KRUpdatePaymentUserJob({ _id: new Types.ObjectId(), uniqueId: 'hello' }, '2024-02')
      const userJobDoc = await userJobModel.create(userJob)

      // When
      const leanDoc = await userJobModel.findOne({ _id: userJobDoc._id }).lean()

      // Then
      const rawDoc = await userJobModel.collection.findOne({ _id: userJobDoc._id })
      expect(leanDoc?.user.uniqueId).toEqual('hello')
      expect(rawDoc?.user?.uniqueId).toEqual(encrypt('hello'))
    })
  })

  describe('findOneAnd...', () => {
    it('should work with findOneAndUpdate()', async () => {
      // When
      const newDoc = await themelistModel
        .findOneAndUpdate(
          { _id: themelistDoc._id },
          { $set: { 'user.uniqueId': encrypt('updatedUniqueId') } },
          { new: true },
        )
        .lean()

      // Then
      expect(newDoc?.user.uniqueId).toEqual('updatedUniqueId')
    })

    it('should work with findOneAndUpdate() with rawResult: true option', async () => {
      // When
      const result = (await themelistModel.findOneAndUpdate(
        { _id: themelistDoc._id },
        { $set: { 'user.uniqueId': encrypt('updatedUniqueId') } },
        { lean: true, includeResultMetadata: true, returnDocument: 'after' },
      )) as any

      // Then
      expect(result.value.user.uniqueId).toEqual('updatedUniqueId')
    })

    it('should work with findOneAndReplace()', async () => {
      // Given
      const newThemelist = {
        ...themelistDoc.toObject(),
        user: { _id: new Types.ObjectId(), uniqueId: encrypt('replacedUniqueId') },
      }

      // When
      const replacedDoc = await themelistModel
        .findOneAndReplace({ _id: themelistDoc._id }, newThemelist, { new: true })
        .lean()

      // Then
      expect(replacedDoc?.user.uniqueId).toEqual('replacedUniqueId')
    })

    it('should work with findOneAndDelete()', async () => {
      // When
      const deletedDoc = await themelistModel.findOneAndDelete({ _id: themelistDoc._id }).lean()

      // Then
      expect(deletedDoc?.user.uniqueId).toEqual('uniqueId')
    })

    it('should work with findOneAndUpdate() and base fields of discriminator', async () => {
      // Given
      const userJob = new KRUpdatePaymentUserJob({ _id: new Types.ObjectId(), uniqueId: 'hello' }, '2024-02')
      const userJobDoc = await userJobModel.create(userJob)

      // When
      const result = (await userJobModel.findOneAndUpdate(
        { 'user.uniqueId': 'hello' },
        { $set: { 'user.uniqueId': 'updatedUniqueId' } },
        { lean: true, upsert: true, returnDocument: 'after', includeResultMetadata: true },
      )) as any

      // Then
      const rawDoc = await userJobModel.collection.findOne({ _id: userJobDoc._id })
      expect(result.value.user.uniqueId).toEqual('updatedUniqueId')
      expect(rawDoc?.user?.uniqueId).toEqual(encrypt('updatedUniqueId'))
    })

    it('should work with findOneAndReplace() and base fields of discriminator', async () => {
      // Given
      const userJob = new KRUpdatePaymentUserJob({ _id: new Types.ObjectId(), uniqueId: 'hello' }, '2024-02')
      const userJobDoc = await userJobModel.create(userJob)

      // When
      const result = (await userJobModel.findOneAndReplace(
        { 'user.uniqueId': 'hello' },
        { type: JobType.KR_UPDATE_PAYMENTS, user: { _id: new Types.ObjectId(), uniqueId: 'updatedUniqueId' } },
        { lean: true, upsert: true, returnDocument: 'after', includeResultMetadata: true },
      )) as any

      // Then
      const rawDoc = await userJobModel.collection.findOne({ _id: userJobDoc._id })
      expect(result.value.user.uniqueId).toEqual('updatedUniqueId')
      expect(rawDoc?.user?.uniqueId).toEqual(encrypt('updatedUniqueId'))
    })
  })
})

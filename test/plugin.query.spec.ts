/**
 * mongoose-encrypt-fields
 * Copyright (c) 2024-present NAVER Corp.
 * MIT license
 */

import { Model, Types } from 'mongoose'

import { rootModule } from './setup/setupApplication'
import { Review } from './app/database/schemas/review.schema'
import { User } from './app/database/schemas/user.schema'
import { Themelist } from './app/database/schemas/themelist.schema'
import { GPSCheckIn } from './app/database/schemas/check-in.gps.schema'
import { PlaceCheckIn } from './app/database/schemas/check-in.place.schema'
import { CheckIn } from './app/database/schemas/check-in.schema'
import { getPUPDBModelToken, getReceiptDBModelToken } from './app/database/schemas'
import { Place } from './app/database/schemas/place.schema'
import { encrypt } from './app/crypto'

/**
 * Check encryption for find, update queries
 */
describe('[plugin] find, update queries', () => {
  let userModel: Model<User>
  let reviewModel: Model<Review>
  let themelistModel: Model<Themelist>
  let checkInModel: Model<CheckIn>
  let gpsCheckInModel: Model<GPSCheckIn>
  let placeCheckInModel: Model<PlaceCheckIn>
  let placeModel: Model<Place>

  beforeAll(() => {
    userModel = rootModule.get(getPUPDBModelToken(User.name))
    reviewModel = rootModule.get(getPUPDBModelToken(Review.name))
    themelistModel = rootModule.get(getPUPDBModelToken(Themelist.name))
    placeModel = rootModule.get(getPUPDBModelToken(Place.name))
    checkInModel = rootModule.get(getReceiptDBModelToken(CheckIn.name))
    gpsCheckInModel = rootModule.get(getReceiptDBModelToken(GPSCheckIn.name))
    placeCheckInModel = rootModule.get(getReceiptDBModelToken(PlaceCheckIn.name))
  })

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
    await themelistModel.create(themelist)
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
    expect(placeModel).toBeDefined()
  })

  describe('filter', () => {
    it('should encrypt top-level fields', async () => {
      // Given & When
      const foundUser = await userModel.findOne({ uniqueId: 'uniqueId' })

      // Then
      expect(foundUser).not.toBeNull()
    })

    it('should encrypt nested sub-document fields', async () => {
      // Given & When
      const foundReview = await reviewModel.findOne({ 'subUser.uniqueId': 'uniqueId' })
      const foundThemelist = await themelistModel.findOne({ 'reviews.subUser.uniqueId': 'uniqueId' })

      // Then
      expect(foundReview).not.toBeNull()
      expect(foundThemelist).not.toBeNull()
    })

    it.each(['$or', '$and', '$nor'])('should encrypt queries inside operators: %s', async (operator) => {
      // Given & When
      const foundThemelist = await themelistModel.findOne({
        [operator]: [{ 'user.uniqueId': 'uniqueId' }, { 'reviews.sensitiveText': 'veryBad' }],
      })

      // Then
      if (operator === '$nor') {
        expect(foundThemelist).toBeNull()
      } else {
        expect(foundThemelist).not.toBeNull()
      }
    })

    it.each(['$eq', '$ne', '$in', '$nin', '$all'])(
      'should encrypt queries with conditionals: %s',
      async (conditional) => {
        // Given & When
        const foundUser = await userModel.findOne({ uniqueId: { [conditional]: 'uniqueId' } })

        // Then
        if (['$ne', '$nin'].includes(conditional)) {
          expect(foundUser).toBeNull()
        } else {
          expect(foundUser).not.toBeNull()
        }
      },
    )

    it('should raise an error with unsupported conditionals', async () => {
      // Given & When
      const query = userModel.findOne({ uniqueId: { $gt: 'uniqueId' } })

      // Then
      await expect(query).rejects.toThrow()
    })

    it('should encrypt complex queries', async () => {
      // When
      const foundThemelist = await themelistModel.findOne({
        $and: [
          {
            reviews: {
              $elemMatch: { 'subUser.uniqueId': { $eq: 'uniqueId' } },
            },
          },
          {
            'reviews.sensitiveText': 'veryBad2',
          },
        ],
      })

      // Then
      expect(foundThemelist).not.toBeNull()
    })

    it('should cast with OriginalType', async () => {
      // Given & When
      await userModel.create({ uniqueId: 1234 }) // OriginalType: String
      const foundUser = await userModel.findOne({ uniqueId: 1234 })

      // Then
      expect(foundUser?.uniqueId).toEqual('1234')
    })

    it('should validate with OriginalType', async () => {
      // Given
      await userModel.create({ uniqueId: 'hello', coordinates: [123, 456] })

      // When
      const updateOp = userModel.findOne({ coordinates: { $eq: [123, 'notNumber'] } })

      // Then
      await expect(updateOp).rejects.toThrow()
    })
  })

  describe('update', () => {
    it('should encrypt top-level fields', async () => {
      // Given
      await userModel.updateOne({ uniqueId: 'uniqueId' }, { $set: { uniqueId: 'uniqueId2' } })

      // When
      const rawUser = await userModel.collection.findOne({ uniqueId: encrypt('uniqueId2') })

      // Then
      expect(rawUser).not.toBeNull()
    })

    it('should encrypt nested sub-document fields', async () => {
      // Given
      await reviewModel.updateOne({ 'subUser.uniqueId': 'uniqueId' }, { $set: { 'subUser.uniqueId': 'uniqueId2' } })

      // When
      const rawReview = await reviewModel.collection.findOne({ 'subUser.uniqueId': encrypt('uniqueId2') })

      // Then
      expect(rawReview).not.toBeNull()
    })

    it('should encrypt update without $set', async () => {
      // Given
      await userModel.updateOne({ uniqueId: 'uniqueId' }, { uniqueId: 'uniqueId3' })

      // When
      const rawUser = await userModel.collection.findOne({ uniqueId: encrypt('uniqueId3') })

      // Then
      expect(rawUser).not.toBeNull()
    })

    it('should encrypt $setOnInsert', async () => {
      // Given
      await userModel.updateOne(
        { _id: new Types.ObjectId() },
        { $setOnInsert: { uniqueId: 'newUniqueId' } },
        { upsert: true },
      )

      // When
      const rawUser = await userModel.collection.findOne({ uniqueId: encrypt('newUniqueId') })

      // Then
      expect(rawUser).not.toBeNull()
    })

    it('should encrypt non-String field', async () => {
      // Given & When
      await userModel.updateOne({ uniqueId: 'uniqueId' }, { coordinates: [123, 456] })
      const rawUser = await userModel.collection.findOne({
        coordinates: encrypt(JSON.stringify([123, 456])),
      })

      // Then
      expect(rawUser).not.toBeNull()
    })

    it('should encrypt with array operators', async () => {
      // Given
      await themelistModel.updateOne(
        { 'reviews.sensitiveText': 'veryBad' },
        { $set: { 'reviews.$.sensitiveText': 'veryVeryBad' } },
      )

      // When
      const rawThemelist = await themelistModel.collection.findOne({
        'reviews.sensitiveText': encrypt('veryVeryBad'),
      })

      // Then
      expect(rawThemelist).not.toBeNull()
    })

    it('should cast with OriginalType', async () => {
      // Given
      await userModel.updateOne({ uniqueId: 'uniqueId' }, { $set: { uniqueId: 5678 } })

      // Given & When
      const foundUser = await userModel.findOne({ uniqueId: '5678' })

      // Then
      expect(foundUser).not.toBeNull()
    })

    it('should validate with OriginalType', async () => {
      // Given
      await placeModel.create({ placeId: 'placeId', phone: [{ phoneNumber: '1234' }] })

      // When
      const updateOp = placeModel.updateOne({ placeId: 'placeId' }, { $set: { phone: [{}] } }) // missing required field

      // Then
      await expect(updateOp).rejects.toThrow()
    })
  })

  describe('Misc queries', () => {
    it('should work with find()', async () => {
      // Given & When
      const foundThemelist = await themelistModel.find({ 'reviews.subUser.uniqueId': 'uniqueId' })

      // Then
      expect(foundThemelist).toHaveLength(3)
    })

    it('should work with findOneAndUpdate()', async () => {
      // Given
      const result = await themelistModel.findOneAndUpdate(
        { 'reviews.subUser.uniqueId': 'uniqueId' },
        { $set: { 'user.uniqueId': 'updatedUniqueId' } },
        { returnDocument: 'after' },
      )

      // When
      const rawThemelist = await themelistModel.collection.findOne({
        'user.uniqueId': encrypt('updatedUniqueId'),
      })

      // Then
      expect(rawThemelist).not.toBeNull()
      expect(result?.user.uniqueId).toEqual('updatedUniqueId')
    })

    it('should work with findOneAndUpdate() with rawResult: true option', async () => {
      // Given
      const result = await themelistModel.findOneAndUpdate(
        { 'reviews.subUser.uniqueId': 'uniqueId' },
        { $set: { 'user.uniqueId': 'updatedUniqueId' } },
        { rawResult: true, returnDocument: 'after' },
      )

      // When
      const rawThemelist = await themelistModel.collection.findOne({
        'user.uniqueId': encrypt('updatedUniqueId'),
      })

      // Then
      expect(rawThemelist).not.toBeNull()
      expect(result.value?.user.uniqueId).toEqual('updatedUniqueId')
    })

    it('should work with findOneAndReplace()', async () => {
      // Given
      await reviewModel.findOneAndReplace(
        { 'subUser.uniqueId': 'uniqueId' },
        {
          text: 'replacedText',
          sensitiveText: 'replacedSensitiveText',
          subUser: {
            _id: new Types.ObjectId(),
            uniqueId: 'replacedUniqueId',
          },
        },
      )

      // When
      const rawReview = await reviewModel.collection.findOne({
        'subUser.uniqueId': encrypt('replacedUniqueId'),
      })

      // Then
      expect(rawReview).not.toBeNull()
      expect(rawReview?.sensitiveText).toEqual(encrypt('replacedSensitiveText'))
    })

    it('should work with findOneAndDelete()', async () => {
      // Given
      await userModel.findOneAndDelete({ uniqueId: 'uniqueId' })

      // When
      const rawUser = await userModel.collection.findOne({ uniqueId: encrypt('uniqueId') })

      // Then
      expect(rawUser).toBeNull()
    })

    it('should work with findOneAndRemove()', async () => {
      // Given
      await userModel.findOneAndRemove({ uniqueId: 'uniqueId' })

      // When
      const rawUser = await userModel.collection.findOne({ uniqueId: encrypt('uniqueId') })

      // Then
      expect(rawUser).toBeNull()
    })

    it('should work with countDocuments()', async () => {
      // When
      const count = await reviewModel.countDocuments({ 'subUser.uniqueId': 'uniqueId' })

      // Then
      expect(count).toEqual(2)
    })

    it('should work with deleteOne()', async () => {
      // Given
      await userModel.deleteOne({ uniqueId: 'uniqueId' })

      // When
      const rawUser = await userModel.collection.findOne({ uniqueId: encrypt('uniqueId') })

      // Then
      expect(rawUser).toBeNull()
    })

    it('should work with deleteMany()', async () => {
      // Given
      await themelistModel.deleteMany({ 'reviews.sensitiveText': 'veryBad' })

      // When
      const rawThemelist = await themelistModel.collection.findOne({
        'reviews.sensitiveText': encrypt('veryBad'),
      })

      // Then
      expect(rawThemelist).toBeNull()
    })

    it('should work with distinct()', async () => {
      // When
      const uniqueIds = await userModel.distinct('uniqueId')

      // Then
      expect(uniqueIds).toHaveLength(1)
    })

    it('should work with updateMany()', async () => {
      // Given
      await reviewModel.updateMany({ 'subUser.uniqueId': 'uniqueId' }, { $set: { 'subUser.uniqueId': 'uniqueId2' } })

      // When
      const rawReview = await reviewModel.collection.findOne({ 'subUser.uniqueId': encrypt('uniqueId') })

      // Then
      expect(rawReview).toBeNull()
    })

    it('should work with replaceOne()', async () => {
      // Given
      await reviewModel.replaceOne(
        { 'subUser.uniqueId': 'uniqueId' },
        {
          text: 'replacedText',
          sensitiveText: 'replacedSensitiveText',
          subUser: {
            _id: new Types.ObjectId(),
            uniqueId: 'replacedUniqueId',
          },
        },
      )

      // When
      const rawReview = await reviewModel.collection.findOne({
        'subUser.uniqueId': encrypt('replacedUniqueId'),
      })

      // Then
      expect(rawReview).not.toBeNull()
      expect(rawReview?.sensitiveText).toEqual(encrypt('replacedSensitiveText'))
    })
  })

  it('cannot encrypt aggregate pipelines', async () => {
    // When
    const foundUser = await userModel.aggregate([
      {
        $match: {
          uniqueId: 'uniqueId',
        },
      },
    ])

    // Then
    expect(foundUser).toHaveLength(0) // uniqueId in $match is not encrypted
  })
})

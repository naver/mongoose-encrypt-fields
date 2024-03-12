/**
 * mongoose-field-encryption
 * Copyright (c) 2024-present NAVER Corp.
 * MIT license
 */

/* eslint-disable @typescript-eslint/no-loss-of-precision */
import { Model, Types } from 'mongoose'

import { rootModule } from './setup/setupApplication'
import { Review, ReviewDocument } from './app/database/schemas/review.schema'
import { User, UserDocument } from './app/database/schemas/user.schema'
import { Themelist, ThemelistDocument } from './app/database/schemas/themelist.schema'
import { getPUPDBModelToken, getReceiptDBModelToken } from './app/database/schemas'
import { Visit } from './app/database/schemas/visit.schema'
import { CheckIn } from './app/database/schemas/check-in.schema'
import { GPSCheckIn, GPSCheckInDocument } from './app/database/schemas/check-in.gps.schema'
import { SubShardKey } from './app/database/schemas/sub-shard-key.schema'
import { MultipleType } from './app/database/schemas/multiple-type.schema'
import { Place } from './app/database/schemas/place.schema'
import { decrypt, encrypt } from './app/crypto'

/**
 * basic encryption/decryption test on save and find
 */
describe('[plugin] encrypt/decrypt', () => {
  let userModel: Model<User>
  let reviewModel: Model<Review>
  let themelistModel: Model<Themelist>
  let visitModel: Model<Visit>
  let checkInModel: Model<CheckIn>
  let subShardKeyModel: Model<SubShardKey>
  let multipleTypeModel: Model<MultipleType>
  let placeModel: Model<Place>

  beforeAll(() => {
    userModel = rootModule.get(getPUPDBModelToken(User.name))
    reviewModel = rootModule.get(getPUPDBModelToken(Review.name))
    themelistModel = rootModule.get(getPUPDBModelToken(Themelist.name))
    multipleTypeModel = rootModule.get(getPUPDBModelToken(MultipleType.name))
    placeModel = rootModule.get(getPUPDBModelToken(Place.name))
    visitModel = rootModule.get(getReceiptDBModelToken(Visit.name))
    checkInModel = rootModule.get(getReceiptDBModelToken(CheckIn.name))
    subShardKeyModel = rootModule.get(getReceiptDBModelToken(SubShardKey.name))
  })

  beforeEach(() => {
    jest.restoreAllMocks()
  })

  it('should be defined', () => {
    expect(userModel).toBeDefined()
    expect(reviewModel).toBeDefined()
    expect(themelistModel).toBeDefined()
    expect(visitModel).toBeDefined()
    expect(checkInModel).toBeDefined()
    expect(subShardKeyModel).toBeDefined()
    expect(multipleTypeModel).toBeDefined()
    expect(placeModel).toBeDefined()
  })

  it('should encrypt/decrypt top-level fields', async () => {
    // Given
    const user = new User({ uniqueId: 'uniqueId' })

    // When
    const doc = await userModel.create(user)
    const rawDoc = await userModel.collection.findOne({ _id: new Types.ObjectId(doc._id) })

    // Then
    expect(doc.uniqueId).toEqual('uniqueId')
    expect(doc.toObject().uniqueId).toEqual('uniqueId') // check .toObject()
    expect(doc.toJSON().uniqueId).toEqual('uniqueId') // check .toJSON()
    expect(rawDoc?.uniqueId).toEqual(encrypt('uniqueId'))
  })

  it('should encrypt/decrypt fields with the correct type', async () => {
    // Given
    const multipleType = new MultipleType({
      _id: new Types.ObjectId(),
      stringField: '12345',
      stringField2: '12e12',
      subDoc: {
        numberField: 12345,
        numberField2: 12e12,
        gps: { lat: 123, long: 456 },
      },
      subDocs: [
        {
          numberField: 11111,
          numberField2: 34e34,
          gps: { lat: 345, long: 678 },
        },
      ],
    })
    await multipleTypeModel.create(multipleType)

    // When
    const foundDoc = await multipleTypeModel.findById(multipleType._id)
    const foundDocWithLean = await multipleTypeModel.findById(multipleType._id).lean()
    const rawDoc = await multipleTypeModel.collection.findOne({ _id: multipleType._id })

    // Then
    expect(foundDoc?.toObject()).toMatchObject({
      stringField: '12345',
      stringField2: '12e12',
      subDoc: {
        numberField: 12345,
        numberField2: 12e12,
        gps: { lat: 123, long: 456 },
      },
      subDocs: [
        {
          numberField: 11111,
          numberField2: 34e34,
          gps: { lat: 345, long: 678 },
        },
      ],
    })
    expect(foundDocWithLean).toMatchObject({
      stringField: '12345',
      stringField2: '12e12',
      subDoc: {
        numberField: 12345,
        numberField2: 12e12,
        gps: { lat: 123, long: 456 },
      },
      subDocs: [
        {
          numberField: 11111,
          numberField2: 34e34,
          gps: { lat: 345, long: 678 },
        },
      ],
    })
    expect(rawDoc).toMatchObject({
      stringField: encrypt('12345'),
      stringField2: encrypt('12e12'),
      subDoc: {
        numberField: encrypt(JSON.stringify(12345)),
        numberField2: encrypt(JSON.stringify(12e12)),
        gps: encrypt(JSON.stringify({ lat: 123, long: 456 })),
      },
      subDocs: [
        {
          numberField: encrypt(JSON.stringify(11111)),
          numberField2: encrypt(JSON.stringify(34e34)),
          gps: encrypt(JSON.stringify({ lat: 345, long: 678 })),
        },
      ],
    })
  })

  it('should encrypt/decrypt nested sub-document fields', async () => {
    // Given
    const user = new User({ uniqueId: 'uniqueId' })
    const userDoc = await userModel.create(user)

    const review = new Review({
      text: 'good',
      sensitiveText: 'veryBad',
      subUser: userDoc,
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

    // When
    const themelistDoc = await themelistModel.create(themelist)
    const rawReviewDoc1 = await reviewModel.collection.findOne({ _id: new Types.ObjectId(reviewDoc._id) })
    const rawReviewDoc2 = await reviewModel.collection.findOne({ _id: new Types.ObjectId(reviewDoc2._id) })
    const rawThemelistDoc = await themelistModel.collection.findOne({ _id: new Types.ObjectId(themelistDoc._id) })

    // review.sensitiveText, review.user.uniqueId
    expect(reviewDoc.sensitiveText).toEqual('veryBad')
    expect(reviewDoc.subUser.uniqueId).toEqual('uniqueId')
    expect(rawReviewDoc1?.sensitiveText).toEqual(encrypt('veryBad'))
    expect(rawReviewDoc1?.subUser.uniqueId).toEqual(encrypt('uniqueId'))
    expect(reviewDoc2.sensitiveText).toEqual('veryBad2')
    expect(reviewDoc2.subUser.uniqueId).toEqual('uniqueId')
    expect(rawReviewDoc2?.sensitiveText).toEqual(encrypt('veryBad2'))
    expect(rawReviewDoc2?.subUser.uniqueId).toEqual(encrypt('uniqueId'))

    // themelist.reviews.sensitiveText, themelist.reviews.user.uniqueId
    expect(themelistDoc.user.uniqueId).toEqual('uniqueId')
    expect(themelistDoc.reviews.map((review) => review.sensitiveText)).toEqual(['veryBad', 'veryBad2'])
    expect(themelistDoc.reviews.map((review) => review.subUser.uniqueId)).toEqual(['uniqueId', 'uniqueId'])
    expect(rawThemelistDoc?.user.uniqueId).toEqual(encrypt('uniqueId'))
    expect(rawThemelistDoc?.reviews.map((review: any) => review.sensitiveText)).toEqual([
      encrypt('veryBad'),
      encrypt('veryBad2'),
    ])
    expect(rawThemelistDoc?.reviews.map((review: any) => review.subUser.uniqueId)).toEqual([
      encrypt('uniqueId'),
      encrypt('uniqueId'),
    ])
  })

  it('should encrypt/decrypt a subDocument field from another connection', async () => {
    // When
    const visitDoc = await visitModel.create({
      placeId: 'place',
      subUser: { _id: new Types.ObjectId(), uniqueId: 'uniqueId' },
    })
    const foundVisitDoc = await visitModel.findById(visitDoc._id)
    const rawVisitDoc = await visitModel.collection.findOne({ _id: visitDoc._id })

    // Then
    expect(visitDoc.subUser.uniqueId).toEqual('uniqueId')
    expect(foundVisitDoc?.subUser.uniqueId).toEqual('uniqueId')
    expect(rawVisitDoc?.subUser.uniqueId).toEqual(encrypt('uniqueId'))
  })

  it('should decrypt virtual fields', async () => {
    // Given
    const user = new User({ uniqueId: 'uniqueId' })
    const userDoc = await userModel.create(user)

    const review = new Review({
      text: 'good',
      sensitiveText: 'veryBad',
      subUser: userDoc,
    })

    // When
    const reviewDoc = await reviewModel.create(review)
    const foundDoc = await reviewModel.findById(reviewDoc._id).populate('virtualUser')

    // Then
    expect(foundDoc?.virtualUser?.uniqueId).toEqual('uniqueId')
  })

  it('should decrypt populated fields', async () => {
    // Given
    const user = new User({ uniqueId: 'uniqueId' })
    const userDoc = await userModel.create(user)

    const review = new Review({
      text: 'good',
      sensitiveText: 'veryBad',
      subUser: userDoc,
      populatedUser: userDoc._id,
    })

    // When
    const reviewDoc = await reviewModel.create(review)
    const foundDoc = await reviewModel.findById(reviewDoc._id).populate<{ populatedUser: User }>('populatedUser')

    // Then
    expect(foundDoc?.populatedUser.uniqueId).toEqual('uniqueId')
  })

  it('should work with not encrypted values', async () => {
    // Given
    const doc = await userModel.collection.insertOne({ uniqueId: 'hello' })

    // When
    const foundDoc = (await userModel.findById(doc.insertedId)) as UserDocument

    // Then
    expect(foundDoc.uniqueId).toEqual('hello')

    // When - find
    foundDoc.uniqueId = 'updatedUniqueId'
    await foundDoc.save()

    // Then
    let updatedRawDoc = await userModel.collection.findOne({ _id: foundDoc._id })
    expect(updatedRawDoc?.uniqueId).toEqual(encrypt('updatedUniqueId'))

    // When - save
    // @ts-ignore
    foundDoc.coordinates = encrypt(JSON.stringify([123, 456]))
    await foundDoc.save()

    updatedRawDoc = await userModel.collection.findOne({ _id: foundDoc._id })
    expect(updatedRawDoc?.coordinates).toEqual(encrypt(JSON.stringify([123, 456])))
  })

  describe('bulk operations', () => {
    it('should work with create()', async () => {
      // Given
      await reviewModel.create([
        {
          _id: new Types.ObjectId(),
          text: 'insertedText1',
          sensitiveText: 'insertedText1',
          subUser: {
            _id: new Types.ObjectId(),
            uniqueId: 'insertedUniqueId1',
          },
        },
        {
          _id: new Types.ObjectId(),
          text: 'insertedText2',
          sensitiveText: 'insertedText2',
          subUser: {
            _id: new Types.ObjectId(),
            uniqueId: 'insertedUniqueId2',
          },
        },
      ])

      // When
      const rawReview1 = await reviewModel.collection.findOne({
        'subUser.uniqueId': encrypt('insertedUniqueId1'),
      })
      const rawReview2 = await reviewModel.collection.findOne({
        sensitiveText: encrypt('insertedText2'),
      })

      // Then
      expect(rawReview1?.sensitiveText).toEqual(encrypt('insertedText1'))
      expect(rawReview2?.sensitiveText).toEqual(encrypt('insertedText2'))
      expect(rawReview1?.subUser.uniqueId).toEqual(encrypt('insertedUniqueId1'))
      expect(rawReview2?.subUser.uniqueId).toEqual(encrypt('insertedUniqueId2'))
    })

    it('should work with insertMany()', async () => {
      // Given
      await reviewModel.insertMany([
        {
          _id: new Types.ObjectId(),
          text: 'insertedText1',
          sensitiveText: 'insertedText1',
          subUser: {
            _id: new Types.ObjectId(),
            uniqueId: 'insertedUniqueId1',
          },
        },
        {
          _id: new Types.ObjectId(),
          text: 'insertedText2',
          sensitiveText: 'insertedText2',
          subUser: {
            _id: new Types.ObjectId(),
            uniqueId: 'insertedUniqueId2',
          },
        },
      ])

      // When
      const rawReview1 = await reviewModel.collection.findOne({
        'subUser.uniqueId': encrypt('insertedUniqueId1'),
      })
      const rawReview2 = await reviewModel.collection.findOne({
        sensitiveText: encrypt('insertedText2'),
      })

      // Then
      expect(rawReview1?.sensitiveText).toEqual(encrypt('insertedText1'))
      expect(rawReview2?.sensitiveText).toEqual(encrypt('insertedText2'))
      expect(rawReview1?.subUser.uniqueId).toEqual(encrypt('insertedUniqueId1'))
      expect(rawReview2?.subUser.uniqueId).toEqual(encrypt('insertedUniqueId2'))
    })

    it('should work with bulkSave()', async () => {
      // Given
      const reviewIds = [new Types.ObjectId(), new Types.ObjectId()]
      await reviewModel.insertMany([
        {
          _id: reviewIds[0],
          text: 'insertedText1',
          sensitiveText: 'insertedText1',
          subUser: {
            _id: new Types.ObjectId(),
            uniqueId: 'insertedUniqueId1',
          },
        },
        {
          _id: reviewIds[1],
          text: 'insertedText2',
          sensitiveText: 'insertedText2',
          subUser: {
            _id: new Types.ObjectId(),
            uniqueId: 'insertedUniqueId2',
          },
        },
      ])
      const review1 = (await reviewModel.findById(reviewIds[0])) as ReviewDocument
      const review2 = (await reviewModel.findById(reviewIds[1])) as ReviewDocument

      // When
      review1.sensitiveText = 'updatedText1'
      review1.subUser.uniqueId = 'updatedUniqueId1'
      review2.sensitiveText = 'updatedText2'
      review2.subUser.uniqueId = 'updatedUniqueId2'
      await reviewModel.bulkSave([review1, review2])

      // Then
      const rawReview1 = await reviewModel.collection.findOne({
        _id: reviewIds[0],
      })
      const rawReview2 = await reviewModel.collection.findOne({
        _id: reviewIds[1],
      })

      expect(rawReview1?.sensitiveText).toEqual(encrypt('updatedText1'))
      expect(rawReview2?.sensitiveText).toEqual(encrypt('updatedText2'))
      expect(rawReview1?.subUser.uniqueId).toEqual(encrypt('updatedUniqueId1'))
      expect(rawReview2?.subUser.uniqueId).toEqual(encrypt('updatedUniqueId2'))
    })
  })

  describe('save()', () => {
    let userDoc: UserDocument
    let reviewDoc: ReviewDocument
    let reviewDoc2: ReviewDocument
    let themelistDoc: ThemelistDocument

    beforeEach(async () => {
      const user = new User({ uniqueId: 'uniqueId' })
      userDoc = await userModel.create(user)

      const review = new Review({
        text: 'good',
        sensitiveText: 'veryBad',
        subUser: userDoc,
      })
      reviewDoc = await reviewModel.create(review)
      const review2 = new Review({
        text: 'good2',
        sensitiveText: 'veryBad2',
        subUser: userDoc,
      })
      reviewDoc2 = await reviewModel.create(review2)

      const themelist = new Themelist({
        title: 'themelist',
        reviews: [reviewDoc, reviewDoc2],
        user: userDoc,
      })
      themelistDoc = await themelistModel.create(themelist)
    })

    it('should not set markModified fields after inserting save()', async () => {
      // Then
      expect(userDoc.modifiedPaths()).toEqual([])
      expect(themelistDoc.modifiedPaths()).toEqual([])
      expect(reviewDoc.modifiedPaths()).toEqual([])
      expect(reviewDoc2.modifiedPaths()).toEqual([])
    })

    it('should not set markModified fields after find()', async () => {
      // When
      const foundUser = await userModel.findById(userDoc._id)
      const foundReview = await reviewModel.findById(reviewDoc._id)
      const foundReview2 = await reviewModel.findById(reviewDoc2._id)
      const foundThemelist = await themelistModel.findById(themelistDoc._id)

      // Then
      expect(foundUser?.modifiedPaths()).toEqual([])
      expect(foundReview?.modifiedPaths()).toEqual([])
      expect(foundReview2?.modifiedPaths()).toEqual([])
      expect(foundThemelist?.modifiedPaths()).toEqual([])
    })

    it('should update correctly using save()', async () => {
      // Given
      themelistDoc.user.uniqueId = 'updatedUniqueId'
      themelistDoc.reviews[0].subUser.uniqueId = 'updatedReviewUniqueId'

      // When
      await themelistDoc.save()

      // Then
      const rawThemelist = await themelistModel.collection.findOne({ _id: themelistDoc._id })
      expect(rawThemelist?.user.uniqueId).toEqual(encrypt('updatedUniqueId'))
      expect(rawThemelist?.reviews[0].subUser.uniqueId).toEqual(encrypt('updatedReviewUniqueId'))
      expect(rawThemelist?.reviews[1].subUser.uniqueId).toEqual(encrypt('uniqueId')) // Not updated
    })

    it('should encrypt shardKey filter when using updating save()', async () => {
      // Given
      userDoc.createdDateTime = new Date()
      let spy = jest.spyOn(userDoc.collection, 'updateOne')

      // When
      await userDoc.save()

      // Then
      expect(spy).toHaveBeenCalledWith(
        { _id: userDoc._id, uniqueId: encrypt('uniqueId') },
        { $set: { createdDateTime: userDoc.createdDateTime } },
        {},
      )
      spy.mockRestore()

      // Given
      spy = jest.spyOn(userDoc.collection, 'updateOne')

      // When
      userDoc.uniqueId = 'updatedUniqueId'
      await userDoc.save()

      // Then
      expect(spy).toHaveBeenCalledWith(
        { _id: userDoc._id, uniqueId: encrypt('uniqueId') },
        { $set: { uniqueId: encrypt('updatedUniqueId') } },
        {},
      )
      spy.mockRestore()
    })

    it('should encrypt shardKey filter when using updating save() even if shardKey is from subDocument', async () => {
      // Given
      const subShardKeyDoc = await subShardKeyModel.create({
        subUser: { _id: new Types.ObjectId(), uniqueId: 'uniqueId' },
      })
      const spy = jest.spyOn(subShardKeyDoc.collection, 'updateOne')

      // When
      subShardKeyDoc.subUser.uniqueId = 'updatedUniqueId'
      await subShardKeyDoc.save()

      // Then
      expect(spy).toHaveBeenCalledWith(
        { _id: subShardKeyDoc._id, 'subUser.uniqueId': encrypt('uniqueId') },
        { $set: { 'subUser.uniqueId': encrypt('updatedUniqueId') } },
        {},
      )
      spy.mockRestore()
    })

    it('should update non-string type field using save()', async () => {
      // // Given
      const location = { type: 'Point', coordinates: [128, 37] }
      const gpsCheckIn = new GPSCheckIn({ location, type: 'gps' })
      const checkIn = (await checkInModel.create(gpsCheckIn)) as unknown as GPSCheckInDocument
      const rawCheckIn = (await checkInModel.collection.findOne({ _id: checkIn._id })) as GPSCheckInDocument

      // When
      checkIn.location.coordinates = [123, 456]
      const updatedCheckIn = await checkIn.save()

      // then
      const rawCheckInAfterUpdate = (await checkInModel.collection.findOne({ _id: checkIn._id })) as GPSCheckInDocument
      expect(rawCheckIn.location.coordinates).toEqual(encrypt(JSON.stringify([128, 37])))
      expect(rawCheckInAfterUpdate.location.coordinates).toEqual(encrypt(JSON.stringify([123, 456])))
      expect(updatedCheckIn.location.coordinates).toEqual([123, 456])
    })
  })

  describe('originalType', () => {
    it('should validate with OriginalType', async () => {
      // When
      const op = placeModel.create({
        placeId: 'placeId',
        phone: [{}], // missing required field
      })

      // Then
      await expect(op).rejects.toThrow()
    })

    it('should cast to OriginalType', async () => {
      // Given
      await placeModel.create({
        placeId: 'placeId',
        phone: [{ phoneNumber: 1234 }],
      })

      // When
      const rawDoc = await placeModel.collection.findOne({ placeId: 'placeId' })

      // Then
      expect(JSON.parse(decrypt(rawDoc?.phone))[0].phoneNumber).toEqual('1234')
    })

    it('should work with default, especially for array (`[]`)', async () => {
      // Given & When
      const placeDoc = await placeModel.create({
        placeId: 'placeId',
      })
      await placeModel.collection.insertOne({
        placeId: 'placeId2',
      })
      const foundDoc = await placeModel.findOne({ placeId: 'placeId2' })
      const leanDoc = await placeModel.findOne({ placeId: 'placeId' }).lean()
      const leanDocWithoutPhone = await placeModel.findOne({ placeId: 'placeId2' }).lean()

      // Then
      expect(placeDoc.phone).toEqual([])
      expect(placeDoc.toObject().phone).toEqual([])
      expect(foundDoc?.phone).toEqual([])
      expect(foundDoc?.toJSON().phone).toEqual([])
      expect(leanDoc?.phone).toEqual([])
      // When there is no field in document, default is not applied. Same as Mongoose.
      expect(leanDocWithoutPhone?.phone).toBeUndefined()

      // default: undefined.
      expect(placeDoc.phoneWithDefault).toBeUndefined()
      expect(placeDoc.toObject().phoneWithDefault).toBeUndefined()
      expect(foundDoc?.phoneWithDefault).toBeUndefined()
      expect(foundDoc?.toJSON().phoneWithDefault).toBeUndefined()
      expect(leanDoc?.phoneWithDefault).toBeUndefined()
      expect(leanDocWithoutPhone?.phoneWithDefault).toBeUndefined()
    })

    it('should skip validation on find', async () => {
      // Given
      const place = new Place({
        address: {
          addressElements: [{ longName: 'France' }],
        },
        placeId: '1234',
      })
      const placeDoc = await placeModel.create(place)

      // When
      await placeModel.collection.updateOne(
        { placeId: placeDoc.placeId },
        {
          $set: {
            address: encrypt(
              JSON.stringify({
                // longName is required
                addressElements: [{ longName: null }],
              }),
            ),
          },
        },
      )
      const foundPlace = await placeModel.findOne({ placeId: placeDoc.placeId })

      // Then
      expect(foundPlace?.address?.addressElements[0].longName).toBeNull()
    })
  })
})

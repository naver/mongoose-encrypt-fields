/**
 * mongoose-field-encryption
 * Copyright (c) 2024-present NAVER Corp.
 * MIT license
 */

import { Prop, Schema } from '@nestjs/mongoose'
import { EncryptedString } from '@lib'

@Schema({ _id: false })
class DateFormat {
  @Prop()
  year!: string

  @Prop()
  month!: string

  @Prop()
  day!: string
}

@Schema({ _id: false })
class TimeFormat {
  @Prop()
  hour!: string

  @Prop()
  minute!: string

  @Prop()
  second!: string
}

@Schema({ _id: false })
class ValueFormat {
  @Prop()
  value!: string
}

@Schema({ _id: false })
class BaseObject {
  @Prop()
  text!: string

  @Prop([[[Number]]])
  boundingBoxes?: number[][][]

  @Prop()
  keyText?: string
}

@Schema({ _id: false })
class StringObject extends BaseObject {
  @Prop()
  formatted?: ValueFormat
}

@Schema({ _id: false })
class DateObject extends BaseObject {
  @Prop()
  formatted?: DateFormat
}

@Schema({ _id: false })
class TimeObject extends BaseObject {
  @Prop()
  formatted?: TimeFormat
}

@Schema({ _id: false })
class TelObject extends BaseObject {
  @Prop()
  formatted?: ValueFormat
}

@Schema({ _id: false })
class FloatObject extends BaseObject {
  @Prop()
  formatted?: ValueFormat
}

@Schema({ _id: false })
class POIObject {
  @Prop()
  gid!: string

  @Prop()
  title!: string

  @Prop()
  phone!: string

  @Prop()
  address!: string

  @Prop()
  roadAddress!: string

  @Prop()
  biznum!: string

  @Prop()
  isConfident!: boolean
}

@Schema({ _id: false })
class KoreaStoreInfo {
  @Prop([POIObject])
  poiInfo?: POIObject[]

  @Prop()
  name?: StringObject

  @Prop()
  subName?: StringObject

  @Prop()
  bizNum?: StringObject

  @Prop()
  movieName?: StringObject

  @Prop({ type: EncryptedString, originalType: [StringObject] })
  address?: StringObject[]

  @Prop({ type: EncryptedString, originalType: [TelObject] })
  tel?: TelObject[]
}

@Schema({ _id: false })
class KoreaStoreInfoWithoutEncryption extends KoreaStoreInfo {
  @Prop([StringObject])
  address?: StringObject[]

  @Prop([TelObject])
  tel?: TelObject[]
}

@Schema({ _id: false })
class PriceInfo {
  @Prop()
  price?: FloatObject

  @Prop()
  unitPrice?: FloatObject
}

@Schema({ _id: false })
class Item {
  @Prop()
  count?: FloatObject
}

@Schema({ _id: false })
class KoreaItem extends Item {
  @Prop()
  name?: StringObject

  @Prop()
  code?: BaseObject

  @Prop()
  priceInfo?: PriceInfo
}

@Schema({ _id: false })
class SubResult {
  @Prop([KoreaItem])
  items?: KoreaItem[]
}

@Schema({ _id: false })
class TotalPrice {
  @Prop()
  price?: FloatObject
}

@Schema({ _id: false })
class CardInfo {
  @Prop()
  company?: StringObject

  @Prop()
  number?: StringObject
}
@Schema({ _id: false })
class PaymentInfo {
  @Prop()
  date?: DateObject

  @Prop()
  time?: TimeObject
}

@Schema({ _id: false })
class KoreaPaymentInfo extends PaymentInfo {
  @Prop()
  cardInfo?: CardInfo

  @Prop()
  confirmNum?: BaseObject
}

@Schema({ _id: false })
export class KoreaOCRResult {
  @Prop()
  storeInfo?: KoreaStoreInfo

  @Prop()
  paymentInfo?: KoreaPaymentInfo

  @Prop([SubResult])
  subResults?: SubResult[]

  @Prop()
  totalPrice?: TotalPrice
}

@Schema({ _id: false })
export class KoreaOCRResultWithoutEncryption extends KoreaOCRResult {
  @Prop()
  storeInfo?: KoreaStoreInfoWithoutEncryption
}

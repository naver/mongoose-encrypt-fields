/**
 * mongoose-encrypt-fields
 * Copyright (c) 2024-present NAVER Corp.
 * MIT license
 */

import { Prop, Schema } from '@nestjs/mongoose'

@Schema({ _id: false })
class ImageSize {
  @Prop()
  width!: number

  @Prop()
  height!: number
}

@Schema({ _id: false })
class OCRRawMeta {
  @Prop()
  domain?: string

  @Prop()
  imageSize?: ImageSize

  @Prop()
  language?: string

  @Prop()
  version?: string
}

@Schema({ _id: false })
class RecognizedWord {
  @Prop()
  id!: number

  @Prop([[Number]])
  boundingBox!: number[][]

  @Prop()
  isVertical!: boolean

  @Prop()
  text!: string

  @Prop()
  confidence!: number
}

@Schema({ _id: false })
class RecognizedLine {
  @Prop()
  id!: number

  @Prop([[Number]])
  boundingBox!: number[][]

  @Prop([Number])
  wordIDs!: number[]
}

@Schema({ _id: false })
export class OCRRawResult {
  @Prop()
  meta?: OCRRawMeta

  @Prop([RecognizedWord])
  words?: RecognizedWord[]

  @Prop([RecognizedLine])
  lines?: RecognizedLine[]

  @Prop()
  fullText?: string

  @Prop()
  estimatedLanguage?: string
}

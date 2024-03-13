/**
 * mongoose-encrypt-fields
 * Copyright (c) 2024-present NAVER Corp.
 * MIT license
 */

import { Schema } from 'mongoose'
import { EncryptedString } from './schemaType'

// eslint-disable-next-line @typescript-eslint/no-var-requires
const mpath = require('mpath')

// ref: https://github.com/mongoosejs/mongoose-lean-getters/blob/bbd2159ae0431f39458fa8968aff51381148ddbf/index.js#L39, https://github.com/mongoosejs/mongoose-lean-virtuals/blob/131130427547d319d33f1c7f75475600fabfb04e/index.js#L56
export function applyPluginMiddleware(schema: Schema, obj: any) {
  if (!obj) {
    return
  }

  if (Array.isArray(obj)) {
    for (const doc of obj) {
      applyPlugin(schema, doc)
    }
  } else {
    applyPlugin(schema, obj)
  }
}

function applyPlugin(schema: Schema, doc: any) {
  if (!doc) {
    return
  }

  const discriminatorSchema = getDiscriminatorSchema(schema, doc)
  decryptPlainObjects(discriminatorSchema ?? schema, doc)

  // Merge childSchemas of base schema and discriminator schema
  for (const childSchema of [...schema.childSchemas, ...(discriminatorSchema?.childSchemas ?? [])]) {
    const _path = childSchema.model.path
    const _schema = childSchema.schema

    const childDoc = mpath.get(_path, doc)
    if (!childDoc) {
      continue
    }

    applyPluginMiddleware(_schema, childDoc)
  }
}

// Support discriminator. ref: https://github.com/mongoosejs/mongoose-lean-getters/pull/26
function getDiscriminatorSchema(schema: any, doc: any): Schema | null {
  const discriminatorKey = schema.discriminatorMapping?.key
  if (!discriminatorKey || !schema.discriminators) {
    return null
  }

  const fieldValue = doc[discriminatorKey]
  if (!fieldValue) {
    return null
  }

  const baseDiscriminatedSchema = schema.discriminators[fieldValue]
  if (baseDiscriminatedSchema) {
    return baseDiscriminatedSchema
  }

  // For Nest.js discriminator. ref. https://github.com/nestjs/mongoose/blob/92444f9018687bc703b52bf0b01027fdddd1cef4/lib/mongoose.providers.ts#L16
  for (const discriminatedSchema of Object.values(schema.discriminators) as any[]) {
    const discriminatorValue = discriminatedSchema.discriminatorMapping?.value
    if (discriminatorValue === fieldValue) {
      return discriminatedSchema
    }
  }

  return null
}

function decryptPlainObjects(schema: Schema, doc: any) {
  if (!doc) {
    return
  }

  if (Array.isArray(doc)) {
    for (const eachDoc of doc) {
      decryptPlainObjects(schema, eachDoc)
    }
    return
  }

  schema.eachPath((path, schemaType) => {
    if (schemaType.instance !== 'EncryptedString') {
      return
    }

    if (!mpath.has(path, doc)) {
      return
    }

    mpath.set(path, (schemaType as EncryptedString).decrypt(mpath.get(path, doc), true), doc)
  })
}

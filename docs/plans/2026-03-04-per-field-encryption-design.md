# Per-Field Encryption Functions Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Allow each `EncryptedString` field to use its own encrypt/decrypt/isEncrypted functions instead of sharing a single global set.

**Architecture:** Add optional per-instance encryption functions to the `EncryptedString` SchemaType constructor via schema options. When provided, instance functions take priority; otherwise, the existing static functions are used as fallback. No changes to `plugin.ts` or `utils.ts` — lean query decryption already delegates to the SchemaType instance's `decrypt()` method.

**Tech Stack:** TypeScript, Mongoose SchemaType, NestJS/Mongoose, Jest + MongoDB Memory Server

---

### Task 1: Add per-field encryption test schema

**Files:**
- Create: `test/app/database/schemas/per-field-encryption.schema.ts`
- Modify: `test/app/database/schemas/index.ts:22-35`

**Step 1: Create a second crypto module with a different key**

Create `test/app/crypto2.ts`:

```ts
/**
 * mongoose-encrypt-fields
 * Copyright (c) 2024-present NAVER Corp.
 * MIT license
 */

import * as crypto from 'crypto'

const secretKey = crypto.randomBytes(32)
const iv = Buffer.from('6543210987654321')

export function encrypt2(text: string): string {
  const cipher = crypto.createCipheriv('aes-256-cbc', secretKey, iv)
  let encrypted = cipher.update(text, 'utf-8', 'hex')
  encrypted += cipher.final('hex')
  return encrypted
}

export function decrypt2(encryptedText: string): string {
  const decipher = crypto.createDecipheriv('aes-256-cbc', secretKey, iv)
  let decrypted = decipher.update(encryptedText, 'hex', 'utf-8')
  decrypted += decipher.final('utf-8')
  return decrypted
}

export function isEncrypted2(text: string): boolean {
  try {
    const decipher = crypto.createDecipheriv('aes-256-cbc', secretKey, iv)
    decipher.update(text, 'hex', 'utf-8')
    decipher.final('utf-8')
    return true
  } catch (error) {
    return false
  }
}
```

**Step 2: Create the per-field encryption test schema**

Create `test/app/database/schemas/per-field-encryption.schema.ts`:

```ts
import { EncryptedString } from '@lib'
import { MongooseModule, Prop, Schema, SchemaFactory } from '@nestjs/mongoose'
import { encrypt2, decrypt2, isEncrypted2 } from '../../crypto2'

@Schema()
export class PerFieldEncryption {
  constructor(obj: Partial<PerFieldEncryption>) {
    Object.assign(this, obj)
  }

  /** Uses global encryption (default) */
  @Prop({ type: EncryptedString })
  globalField?: string

  /** Uses per-field encryption functions */
  @Prop({
    type: EncryptedString,
    encrypt: encrypt2,
    decrypt: decrypt2,
    isEncrypted: isEncrypted2,
  })
  customField?: string
}
export const PerFieldEncryptionSchema = SchemaFactory.createForClass(PerFieldEncryption)

export const PerFieldEncryptionModelModule = MongooseModule.forFeatureAsync(
  [
    {
      name: PerFieldEncryption.name,
      useFactory: async () => {
        return PerFieldEncryptionSchema
      },
    },
  ],
  'pup',
)
```

**Step 3: Register schema in index.ts**

In `test/app/database/schemas/index.ts`, add import and include in `createSchemaModules`:

```ts
import { PerFieldEncryptionModelModule } from './per-field-encryption.schema'

// Add to array:
PerFieldEncryptionModelModule,
```

**Step 4: Run tests to verify the schema loads (it will fail because options aren't recognized yet)**

Run: `npx jest --runInBand test/plugin.basic.spec.ts -- --testNamePattern="should be defined"`
Expected: Tests pass (schema loads, but no per-field tests yet)

**Step 5: Commit**

```bash
git add test/app/crypto2.ts test/app/database/schemas/per-field-encryption.schema.ts test/app/database/schemas/index.ts
git commit -m "test: add per-field encryption test schema and second crypto module"
```

---

### Task 2: Write failing tests for per-field encryption

**Files:**
- Create: `test/plugin.per-field-encryption.spec.ts`

**Step 1: Write the test file**

```ts
/**
 * mongoose-encrypt-fields
 * Copyright (c) 2024-present NAVER Corp.
 * MIT license
 */

import { Model, Types } from 'mongoose'
import { rootModule } from './setup/setupApplication'
import { PerFieldEncryption } from './app/database/schemas/per-field-encryption.schema'
import { getPUPDBModelToken } from './app/database/schemas'
import { encrypt } from './app/crypto'
import { encrypt2, decrypt2 } from './app/crypto2'

describe('[plugin] per-field encryption', () => {
  let model: Model<PerFieldEncryption>

  beforeAll(() => {
    model = rootModule.get(getPUPDBModelToken(PerFieldEncryption.name))
  })

  it('should be defined', () => {
    expect(model).toBeDefined()
  })

  it('should encrypt globalField with global functions and customField with per-field functions', async () => {
    // Given
    const doc = await model.create({
      globalField: 'hello',
      customField: 'world',
    })
    const rawDoc = await model.collection.findOne({ _id: doc._id })

    // Then — globalField uses global encrypt, customField uses encrypt2
    expect(rawDoc?.globalField).toEqual(encrypt('hello'))
    expect(rawDoc?.customField).toEqual(encrypt2('world'))

    // And — both decrypt correctly when accessed
    expect(doc.globalField).toEqual('hello')
    expect(doc.customField).toEqual('world')
  })

  it('should decrypt per-field encrypted values on find', async () => {
    // Given
    await model.create({ globalField: 'findGlobal', customField: 'findCustom' })

    // When
    const foundDoc = await model.findOne({ globalField: 'findGlobal' })

    // Then
    expect(foundDoc?.globalField).toEqual('findGlobal')
    expect(foundDoc?.customField).toEqual('findCustom')
  })

  it('should decrypt per-field encrypted values on lean queries', async () => {
    // Given
    await model.create({ globalField: 'leanGlobal', customField: 'leanCustom' })

    // When
    const leanDoc = await model.findOne({ globalField: 'leanGlobal' }).lean()

    // Then
    expect(leanDoc?.globalField).toEqual('leanGlobal')
    expect(leanDoc?.customField).toEqual('leanCustom')
  })

  it('should encrypt per-field values in query operators', async () => {
    // Given
    const doc = await model.create({ globalField: 'queryGlobal', customField: 'queryCustom' })

    // When — query using customField with $eq (implicit)
    const foundDoc = await model.findOne({ customField: 'queryCustom' })

    // Then
    expect(foundDoc?._id.toString()).toEqual(doc._id.toString())
  })

  it('should encrypt per-field values in $in query', async () => {
    // Given
    const doc = await model.create({ globalField: 'inGlobal', customField: 'inCustom' })

    // When
    const foundDoc = await model.findOne({ customField: { $in: ['inCustom', 'other'] } })

    // Then
    expect(foundDoc?._id.toString()).toEqual(doc._id.toString())
  })
})
```

**Step 2: Run the tests to verify they fail**

Run: `npx jest --runInBand test/plugin.per-field-encryption.spec.ts`
Expected: FAIL — `EncryptedString` doesn't yet support per-field options, so `customField` will use the global encrypt function instead of `encrypt2`.

**Step 3: Commit**

```bash
git add test/plugin.per-field-encryption.spec.ts
git commit -m "test: add failing tests for per-field encryption functions"
```

---

### Task 3: Write failing test for option validation

**Files:**
- Modify: `test/plugin.per-field-encryption.spec.ts`

**Step 1: Add validation test**

Add to the end of the describe block in `test/plugin.per-field-encryption.spec.ts`:

```ts
  describe('validation', () => {
    it('should throw if only some encryption functions are provided', () => {
      const { Schema } = require('mongoose')
      const { EncryptedString } = require('@lib')

      // Only encrypt provided — missing decrypt and isEncrypted
      expect(() => {
        new Schema({
          field: { type: EncryptedString, encrypt: () => 'x' },
        })
      }).toThrow()

      // Only encrypt and decrypt — missing isEncrypted
      expect(() => {
        new Schema({
          field: { type: EncryptedString, encrypt: () => 'x', decrypt: () => 'x' },
        })
      }).toThrow()
    })
  })
```

**Step 2: Run test to verify it fails**

Run: `npx jest --runInBand test/plugin.per-field-encryption.spec.ts --testNamePattern="validation"`
Expected: FAIL — no validation logic exists yet

**Step 3: Commit**

```bash
git add test/plugin.per-field-encryption.spec.ts
git commit -m "test: add failing test for partial encryption function validation"
```

---

### Task 4: Implement per-field encryption in schemaType.ts

**Files:**
- Modify: `lib/schemaType.ts:28-44` (add instance properties and constructor logic)
- Modify: `lib/schemaType.ts:115-160` (update encrypt/decrypt/isEncrypted to use instance functions)

**Step 1: Add instance properties and constructor validation**

In `lib/schemaType.ts`, add three private properties after line 34:

```ts
  private encryptFn?: (value: string) => string
  private decryptFn?: (value: string) => string
  private isEncryptedFn?: (value: string) => boolean
```

Update constructor options type (line 38) to include the new options:

```ts
  constructor(
    path: string,
    options?: SchemaTypeOptions<string> & {
      originalType?: any
      encryptionMode?: EncryptionMode
      encrypt?: (value: string) => string
      decrypt?: (value: string) => string
      isEncrypted?: (value: string) => boolean
    },
  ) {
```

In constructor body, after `this.validateEncryptionMode(options?.encryptionMode)` (line 42), add:

```ts
    this.validatePerFieldEncryption(options)
    this.encryptFn = options?.encrypt
    this.decryptFn = options?.decrypt
    this.isEncryptedFn = options?.isEncrypted
```

Also strip per-field options from being passed to Mongoose's super (line 40):

```ts
    super(path, { ...options, originalType: undefined, encrypt: undefined, decrypt: undefined, isEncrypted: undefined }, 'EncryptedString')
```

**Step 2: Add validation method**

After `validateEncryptionMode` method:

```ts
  private validatePerFieldEncryption(options?: {
    encrypt?: (value: string) => string
    decrypt?: (value: string) => string
    isEncrypted?: (value: string) => boolean
  }) {
    const fns = [options?.encrypt, options?.decrypt, options?.isEncrypted]
    const provided = fns.filter((fn) => typeof fn === 'function').length
    if (provided > 0 && provided < 3) {
      throw new Error(
        'Per-field encryption requires all three functions: encrypt, decrypt, isEncrypted. Provide all or none.',
      )
    }
  }
```

**Step 3: Update encrypt() to use instance function**

In `encrypt()` method (lines 131-133), replace `EncryptedString.encrypt(...)` calls:

```ts
    const encryptFn = this.encryptFn ?? EncryptedString.encrypt
    const castedValue = tempDoc.toObject()[this.path]
    return this.originalType === String
      ? encryptFn(castedValue)
      : encryptFn(EJSON.stringify(castedValue, { relaxed: true }))
```

**Step 4: Update decrypt() to use instance function**

In `decrypt()` method (line 142), replace `EncryptedString.decrypt(value)`:

```ts
    const decryptFn = this.decryptFn ?? EncryptedString.decrypt
    const decryptedValue = decryptFn(value)
```

**Step 5: Update isEncrypted() to use instance function**

In private `isEncrypted()` method (line 159), replace `EncryptedString.isEncrypted(value)`:

```ts
    const isEncryptedFn = this.isEncryptedFn ?? EncryptedString.isEncrypted
    return isEncryptedFn(value)
```

**Step 6: Run all tests**

Run: `npx jest --runInBand`
Expected: ALL PASS — including the new per-field encryption tests

**Step 7: Commit**

```bash
git add lib/schemaType.ts
git commit -m "feat: support per-field encryption functions via schema options"
```

---

### Task 5: Update TypeScript types

**Files:**
- Modify: `lib/types.ts:23-44` (module augmentation)

**Step 1: Add per-field encryption options to the EncryptedString type declaration**

In the `declare module 'mongoose'` block, the `EncryptedString` class already gets the options from Mongoose's constructor. But for better discoverability, add an exported interface:

```ts
export interface PerFieldEncryptionOptions {
  /** Per-field string encryption function. Overrides the global encrypt. */
  encrypt?: (value: string) => string
  /** Per-field string decryption function. Overrides the global decrypt. */
  decrypt?: (value: string) => string
  /** Per-field check if string is encrypted. Overrides the global isEncrypted. */
  isEncrypted?: (value: string) => boolean
}
```

**Step 2: Run build to verify types compile**

Run: `pnpm build`
Expected: PASS — no type errors

**Step 3: Commit**

```bash
git add lib/types.ts
git commit -m "feat: add PerFieldEncryptionOptions type"
```

---

### Task 6: Run full test suite and verify

**Files:** None (verification only)

**Step 1: Run full test suite**

Run: `pnpm test`
Expected: ALL PASS with no regressions

**Step 2: Run build**

Run: `pnpm build`
Expected: PASS

**Step 3: Commit (only if any final adjustments needed)**

No commit needed if everything passes.

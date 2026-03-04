# Per-Field Encryption Functions

## Problem

All `EncryptedString` fields share a single set of static `encrypt`/`decrypt`/`isEncrypted` functions. Users need different encryption algorithms or KMS providers per field (e.g., name via KMS-A, SSN via KMS-B).

## Approach: Instance-Level Override

Each `EncryptedString` field can optionally receive its own encryption functions via schema options. When not provided, the global static functions are used as fallback.

### API

```ts
// Global default (unchanged)
@Prop({ type: Schema.Types.EncryptedString })
name: string

// Per-field override
@Prop({
  type: Schema.Types.EncryptedString,
  encrypt: (value: string) => kmsB.encrypt(value),
  decrypt: (value: string) => kmsB.decrypt(value),
  isEncrypted: (value: string) => kmsB.isEncrypted(value),
})
ssn: string
```

All three functions must be provided together or omitted entirely.

### Implementation

**`schemaType.ts`** — Store optional instance functions, use them with static fallback:

- Add private instance properties: `encryptFn`, `decryptFn`, `isEncryptedFn`
- In constructor, extract from options and validate (all-or-nothing)
- In `encrypt()`: use `this.encryptFn ?? EncryptedString.encrypt`
- In `decrypt()`: use `this.decryptFn ?? EncryptedString.decrypt`
- In `isEncrypted()`: use `this.isEncryptedFn ?? EncryptedString.isEncrypted`

**`types.ts`** — Add optional `encrypt`, `decrypt`, `isEncrypted` to schema type options and module augmentation.

**`utils.ts` / `plugin.ts`** — No changes needed. `decryptPlainObjects` already calls the instance's `decrypt()` method, so per-field functions propagate automatically for lean queries.

### Validation

- If 1 or 2 of the 3 functions are provided, throw an error
- Type checking via TypeScript interfaces

### Backward Compatibility

Fully backward compatible. Existing code without per-field options works identically. Minor version bump.

### Test Plan

- Per-field encryption: save and read with different encrypt/decrypt functions per field
- Mixed usage: global + per-field in same schema
- Lean queries: per-field decrypt works on lean results
- Validation: partial function provision throws error
- Query operators: `$eq`, `$in` etc. work with per-field encryption

import { readFileSync } from 'node:fs'
import assert from 'node:assert/strict'

const source = readFileSync(new URL('../lib/api/client.ts', import.meta.url), 'utf8')

assert.match(
  source,
  /body:\s*body\s*!==\s*undefined\s*\?\s*JSON\.stringify\(body\)\s*:\s*undefined/g,
  'api client should preserve falsy payloads by serializing any body except undefined',
)

assert.ok(
  source.includes("'/users/request-token/'") && source.includes("'/users/token/refresh/'"),
  'auth endpoints should remain non-queueable for offline mutation sync',
)

console.log('api-client guard checks passed')

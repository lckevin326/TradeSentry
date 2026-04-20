import { strict as assert } from 'node:assert'
import { test } from 'node:test'

import { safeFetchJson } from './http'

test('safeFetchJson returns parsed json for ok json responses', async () => {
  const result = await safeFetchJson('/api/example', {
    fallback: [],
    fetcher: async () =>
      new Response(JSON.stringify([{ id: 1 }]), {
        status: 200,
        headers: {
          'content-type': 'application/json',
        },
      }),
  })

  assert.deepEqual(result, [{ id: 1 }])
})

test('safeFetchJson returns fallback for empty response bodies', async () => {
  const result = await safeFetchJson('/api/example', {
    fallback: [],
    fetcher: async () => new Response('', { status: 500 }),
  })

  assert.deepEqual(result, [])
})

test('safeFetchJson returns fallback for invalid json payloads', async () => {
  const result = await safeFetchJson('/api/example', {
    fallback: [],
    fetcher: async () =>
      new Response('not-json', {
        status: 200,
        headers: {
          'content-type': 'application/json',
        },
      }),
  })

  assert.deepEqual(result, [])
})

import { strict as assert } from 'node:assert'
import { test } from 'node:test'

import { renderToStaticMarkup } from 'react-dom/server'

import ExchangeRatesPage, {
  buildRefreshErrorState,
  buildRefreshState,
  fetchExchangeRatesViewData,
  refreshExchangeRates,
  runExchangeRatesRefreshFlow,
} from './page'

test('exchange rates page renders currency controls and manual refresh action', () => {
  const markup = renderToStaticMarkup(<ExchangeRatesPage />)

  assert.match(markup, /汇率/)
  assert.match(markup, /全部/)
  assert.match(markup, /7日/)
  assert.match(markup, /手动更新汇率/)
})

test('fetchExchangeRatesViewData returns single currency rows for a focused currency', async () => {
  const result = await fetchExchangeRatesViewData('AED', 30, async () =>
    new Response(
      JSON.stringify([
        { date: '2026-04-19', rate: 1.98, change_pct: -0.12 },
        { date: '2026-04-18', rate: 1.99, change_pct: 0.1 },
      ]),
    ),
  )

  assert.deepEqual(result.data, [
    { date: '2026-04-19', rate: 1.98, change_pct: -0.12 },
    { date: '2026-04-18', rate: 1.99, change_pct: 0.1 },
  ])
  assert.deepEqual(result.allData, {})
})

test('fetchExchangeRatesViewData aggregates all currencies in ALL mode', async () => {
  const result = await fetchExchangeRatesViewData('ALL', 7, async (input) =>
    new Response(
      JSON.stringify([
        {
          date: '2026-04-19',
          rate: String(input).includes('target=AED') ? 1.98 : 7.2,
          change_pct: 0.1,
        },
      ]),
    ),
  )

  assert.equal(result.data.length, 0)
  assert.equal(result.allData.AED?.[0]?.rate, 1.98)
  assert.equal(result.allData.USD?.[0]?.rate, 7.2)
})

test('refreshExchangeRates returns fetch summary on success', async () => {
  const result = await refreshExchangeRates(async () =>
    new Response(
      JSON.stringify({
        ok: true,
        inserted: 3,
        updated: 4,
      }),
    ),
  )

  assert.deepEqual(result, {
    ok: true,
    inserted: 3,
    updated: 4,
  })
})

test('refreshExchangeRates throws provider error on failure', async () => {
  await assert.rejects(
    () =>
      refreshExchangeRates(async () =>
        new Response(
          JSON.stringify({
            ok: false,
            error: '汇率抓取失败',
          }),
          { status: 500 },
        ),
      ),
    /汇率抓取失败/,
  )
})

test('runExchangeRatesRefreshFlow reloads current view data after a successful refresh', async () => {
  let reloadCount = 0

  const state = await runExchangeRatesRefreshFlow(
    async () => {
      reloadCount += 1
    },
    async () =>
      new Response(
        JSON.stringify({
          ok: true,
          inserted: 2,
          updated: 5,
        }),
      ),
  )

  assert.equal(reloadCount, 1)
  assert.deepEqual(state, {
    tone: 'success',
    message: '汇率已更新，新增 2 条，更新 5 条。',
  })
})

test('refresh state helpers build success and error messages for the page', () => {
  assert.deepEqual(
    buildRefreshState({
      inserted: 1,
      updated: 3,
    }),
    {
      tone: 'success',
      message: '汇率已更新，新增 1 条，更新 3 条。',
    },
  )

  assert.deepEqual(buildRefreshErrorState(new Error('汇率抓取失败')), {
    tone: 'error',
    message: '汇率抓取失败',
  })
})

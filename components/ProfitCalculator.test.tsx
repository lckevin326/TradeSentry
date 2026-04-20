import { strict as assert } from 'node:assert'
import { test } from 'node:test'

import { renderToStaticMarkup } from 'react-dom/server'

import ProfitCalculator, {
  DEFAULT_PROFIT_ORDER_INPUT,
  submitProfitCalculation,
  updateProfitCalculatorField,
  type ProfitCalculatorFormState,
  type ProfitCalculationResponse,
} from './ProfitCalculator'

test('ProfitCalculator renders default values, grouped sections, baseline freight, and manual override input', () => {
  const markup = renderToStaticMarkup(<ProfitCalculator baselineFreight={1680} />)

  assert.match(markup, /手工录入订单参数/)
  assert.match(markup, /系统推导值/)
  assert.match(markup, /value="UAE"/)
  assert.match(markup, /value="401110"/)
  assert.match(markup, /value="FOB"/)
  assert.match(markup, /value="USD"/)
  assert.match(markup, /基准海运费/)
  assert.match(markup, /1,680/)
  assert.match(markup, /手工覆盖海运费/)
  assert.match(markup, /name="overrideFreight"/)
})

test('updateProfitCalculatorField updates trade term and quote currency in controlled state', () => {
  const withCif = updateProfitCalculatorField(DEFAULT_PROFIT_ORDER_INPUT, 'tradeTerm', 'CIF')
  const withCny = updateProfitCalculatorField(withCif, 'quoteCurrency', 'CNY')

  assert.equal(withCif.tradeTerm, 'CIF')
  assert.equal(withCny.quoteCurrency, 'CNY')
  assert.equal(withCny.tradeTerm, 'CIF')
})

test('updateProfitCalculatorField supports manual freight override', () => {
  const next = updateProfitCalculatorField(DEFAULT_PROFIT_ORDER_INPUT, 'overrideFreight', 2120)

  assert.equal(next.overrideFreight, 2120)
})

test('updateProfitCalculatorField keeps routeKey compatible when destination or container changes', () => {
  const saState = updateProfitCalculatorField(DEFAULT_PROFIT_ORDER_INPUT, 'destinationCountry', 'SA')
  const hqState = updateProfitCalculatorField(saState, 'containerType', '40HQ')

  assert.equal(saState.destinationCountry, 'SA')
  assert.equal(saState.routeKey, 'shanghai-dammam-20gp')
  assert.equal(hqState.containerType, '40HQ')
  assert.equal(hqState.routeKey, 'shanghai-dammam-40hq')
})

test('submitProfitCalculation sends typed order payload including freight override to /api/profit', async () => {
  const requests: Array<{
    input: string | URL | Request
    init?: RequestInit
  }> = []
  const state: ProfitCalculatorFormState = {
    ...DEFAULT_PROFIT_ORDER_INPUT,
    overrideFreight: 2120,
  }
  const response: ProfitCalculationResponse = {
    input: state,
    todayResult: null,
    yesterdayResult: null,
    attribution: null,
    selectedMarketValues: {
      today: {
        fxRate: 5,
        fxSourceRate: 0.2,
        fxSourceDate: '2026-04-18',
        fxSourceKind: 'market_rate',
        tariffRatePct: 12,
        tariffSourceDate: '2026-04-18',
        tariffSourceFetchedAt: '2026-04-18T08:00:00.000Z',
        freightCny: 140,
        freightSourceDate: '2026-04-18',
        freightSourceFetchedAt: '2026-04-18T08:00:00.000Z',
        freightSourceUrl: 'https://example.com/freight/today',
        rebateRatePct: 13,
        rebateSource: 'fixture',
      },
      yesterday: {
        fxRate: 4,
        fxSourceRate: 0.25,
        fxSourceDate: '2026-04-17',
        fxSourceKind: 'market_rate',
        tariffRatePct: 10,
        tariffSourceDate: '2026-04-17',
        tariffSourceFetchedAt: '2026-04-17T08:00:00.000Z',
        freightCny: 100,
        freightSourceDate: '2026-04-17',
        freightSourceFetchedAt: '2026-04-17T08:00:00.000Z',
        freightSourceUrl: 'https://example.com/freight/yesterday',
        rebateRatePct: 13,
        rebateSource: 'fixture',
      },
    },
  }

  const result = await submitProfitCalculation(state, async (input, init) => {
    requests.push({ input, init })

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    })
  })

  assert.deepEqual(result, response)
  assert.equal(requests.length, 1)
  assert.equal(requests[0]?.input, '/api/profit')
  assert.equal(requests[0]?.init?.method, 'POST')
  assert.deepEqual(requests[0]?.init?.headers, { 'Content-Type': 'application/json' })
  assert.deepEqual(JSON.parse(String(requests[0]?.init?.body)), {
    destinationCountry: 'UAE',
    hsCode: '401110',
    tradeTerm: 'FOB',
    quoteCurrency: 'USD',
    quotedAmount: 1000,
    quantity: 10,
    productCost: 4000,
    miscFees: 100,
    routeKey: 'shanghai-jebel-ali-20gp',
    containerType: '20GP',
    overrideFreight: 2120,
  })
})

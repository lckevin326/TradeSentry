'use client'

import { useState, type ChangeEvent, type FormEvent } from 'react'

import { FREIGHT_ROUTE_OPTIONS } from '../lib/freight/constants'
import {
  PROFIT_CONTAINER_TYPES,
  PROFIT_QUOTE_CURRENCIES,
  PROFIT_TRADE_TERMS,
  type AttributionResult,
  type ProfitCalculationInput,
  type ProfitResult,
} from '../lib/profit/index'

export interface ProfitSelectedMarketValue {
  fxRate: number
  fxSourceRate: number
  fxSourceDate: string
  fxSourceKind: 'market_rate' | 'synthetic_cny_parity'
  tariffRatePct: number
  tariffSourceDate: string
  tariffSourceFetchedAt: string
  freightCny: number
  freightSourceDate: string
  freightSourceFetchedAt: string
  freightSourceUrl: string
  rebateRatePct: number
  rebateSource: 'fixture' | 'fallback'
}

export interface ProfitCalculationResponse {
  todayResult: ProfitResult | null
  yesterdayResult: ProfitResult | null
  attribution: AttributionResult | null
  selectedMarketValues:
    | {
        today: ProfitSelectedMarketValue
        yesterday: ProfitSelectedMarketValue
      }
    | null
}

export type ProfitCalculatorFormState = ProfitCalculationInput

export const DEFAULT_PROFIT_ORDER_INPUT: ProfitCalculatorFormState = {
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
  overrideFreight: null,
}

type ProfitCalculatorField = keyof ProfitCalculatorFormState

const DESTINATION_COUNTRY_OPTIONS = Array.from(new Set(FREIGHT_ROUTE_OPTIONS.map((route) => route.destinationCountry)))

function selectCompatibleRoute(state: ProfitCalculatorFormState): string {
  const currentRoute = FREIGHT_ROUTE_OPTIONS.find((route) => route.routeKey === state.routeKey)
  if (
    currentRoute &&
    currentRoute.destinationCountry === state.destinationCountry &&
    currentRoute.containerType === state.containerType
  ) {
    return currentRoute.routeKey
  }

  return (
    FREIGHT_ROUTE_OPTIONS.find(
      (route) =>
        route.destinationCountry === state.destinationCountry && route.containerType === state.containerType,
    )?.routeKey ?? state.routeKey
  )
}

export function updateProfitCalculatorField<K extends ProfitCalculatorField>(
  state: ProfitCalculatorFormState,
  field: K,
  value: ProfitCalculatorFormState[K],
): ProfitCalculatorFormState {
  const nextState = {
    ...state,
    [field]: value,
  }

  if (field === 'destinationCountry' || field === 'containerType') {
    return {
      ...nextState,
      routeKey: selectCompatibleRoute(nextState),
    }
  }

  return nextState
}

export function buildProfitCalculationPayload(state: ProfitCalculatorFormState): ProfitCalculationInput {
  return state
}

export async function submitProfitCalculation(
  state: ProfitCalculatorFormState,
  fetcher: (input: string | URL | Request, init?: RequestInit) => Promise<Response> = fetch,
): Promise<ProfitCalculationResponse> {
  const response = await fetcher('/api/profit', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(buildProfitCalculationPayload(state)),
  })

  return (await response.json()) as ProfitCalculationResponse
}

interface ProfitCalculatorProps {
  baselineFreight: number
  initialValue?: ProfitCalculatorFormState
  fetcher?: (input: string | URL | Request, init?: RequestInit) => Promise<Response>
  onCalculated?: (result: ProfitCalculationResponse) => void
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', {
    maximumFractionDigits: 0,
  }).format(value)
}

function numberFromInput(event: ChangeEvent<HTMLInputElement>): number {
  return Number(event.currentTarget.value)
}

export default function ProfitCalculator({
  baselineFreight,
  initialValue = DEFAULT_PROFIT_ORDER_INPUT,
  fetcher = fetch,
  onCalculated,
}: ProfitCalculatorProps) {
  const [formState, setFormState] = useState<ProfitCalculatorFormState>(initialValue)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setIsSubmitting(true)

    try {
      const result = await submitProfitCalculation(formState, fetcher)
      onCalculated?.(result)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form className="card p-5 space-y-5 page-enter page-enter-2" onSubmit={handleSubmit}>
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold" style={{ color: 'var(--text)' }}>
            利润试算
          </h2>
          <p className="text-sm" style={{ color: 'var(--text-2)' }}>
            先录入订单参数，再用系统基准运费发起测算。
          </p>
        </div>
        <button
          type="submit"
          className="rounded-lg px-4 py-2 text-sm font-medium transition-colors"
          style={{
            background: 'var(--text)',
            color: 'white',
            opacity: isSubmitting ? 0.7 : 1,
          }}
          disabled={isSubmitting}
        >
          {isSubmitting ? '测算中...' : '开始测算'}
        </button>
      </div>

      <section className="card-2 p-4 space-y-4">
        <div>
          <h3 className="text-sm font-semibold tracking-wide" style={{ color: 'var(--text)' }}>
            手工录入订单参数
          </h3>
          <p className="text-xs mt-1" style={{ color: 'var(--text-2)' }}>
            只保留当前测算需要的报价与成本字段。
          </p>
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          <label className="flex flex-col gap-1.5 text-sm">
            <span style={{ color: 'var(--text-2)' }}>目的国</span>
            <select
              name="destinationCountry"
              className="rounded-lg border px-3 py-2 bg-white"
              style={{ borderColor: 'var(--border)', color: 'var(--text)' }}
              value={formState.destinationCountry}
              onChange={(event) =>
                setFormState(updateProfitCalculatorField(formState, 'destinationCountry', event.currentTarget.value as ProfitCalculatorFormState['destinationCountry']))
              }
            >
              {DESTINATION_COUNTRY_OPTIONS.map((country) => (
                <option key={country} value={country}>
                  {country}
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-1.5 text-sm">
            <span style={{ color: 'var(--text-2)' }}>HS Code</span>
            <input
              name="hsCode"
              className="rounded-lg border px-3 py-2 bg-white"
              style={{ borderColor: 'var(--border)', color: 'var(--text)' }}
              value={formState.hsCode}
              onChange={(event) => setFormState(updateProfitCalculatorField(formState, 'hsCode', event.currentTarget.value))}
            />
          </label>

          <label className="flex flex-col gap-1.5 text-sm">
            <span style={{ color: 'var(--text-2)' }}>贸易条款</span>
            <select
              name="tradeTerm"
              className="rounded-lg border px-3 py-2 bg-white"
              style={{ borderColor: 'var(--border)', color: 'var(--text)' }}
              value={formState.tradeTerm}
              onChange={(event) =>
                setFormState(updateProfitCalculatorField(formState, 'tradeTerm', event.currentTarget.value as ProfitCalculatorFormState['tradeTerm']))
              }
            >
              {PROFIT_TRADE_TERMS.map((tradeTerm) => (
                <option key={tradeTerm} value={tradeTerm}>
                  {tradeTerm}
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-1.5 text-sm">
            <span style={{ color: 'var(--text-2)' }}>报价币种</span>
            <select
              name="quoteCurrency"
              className="rounded-lg border px-3 py-2 bg-white"
              style={{ borderColor: 'var(--border)', color: 'var(--text)' }}
              value={formState.quoteCurrency}
              onChange={(event) =>
                setFormState(updateProfitCalculatorField(formState, 'quoteCurrency', event.currentTarget.value as ProfitCalculatorFormState['quoteCurrency']))
              }
            >
              {PROFIT_QUOTE_CURRENCIES.map((quoteCurrency) => (
                <option key={quoteCurrency} value={quoteCurrency}>
                  {quoteCurrency}
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-1.5 text-sm">
            <span style={{ color: 'var(--text-2)' }}>报价金额</span>
            <input
              name="quotedAmount"
              type="number"
              className="rounded-lg border px-3 py-2 bg-white"
              style={{ borderColor: 'var(--border)', color: 'var(--text)' }}
              value={formState.quotedAmount}
              onChange={(event) => setFormState(updateProfitCalculatorField(formState, 'quotedAmount', numberFromInput(event)))}
            />
          </label>

          <label className="flex flex-col gap-1.5 text-sm">
            <span style={{ color: 'var(--text-2)' }}>数量</span>
            <input
              name="quantity"
              type="number"
              className="rounded-lg border px-3 py-2 bg-white"
              style={{ borderColor: 'var(--border)', color: 'var(--text)' }}
              value={formState.quantity}
              onChange={(event) => setFormState(updateProfitCalculatorField(formState, 'quantity', numberFromInput(event)))}
            />
          </label>

          <label className="flex flex-col gap-1.5 text-sm">
            <span style={{ color: 'var(--text-2)' }}>产品成本</span>
            <input
              name="productCost"
              type="number"
              className="rounded-lg border px-3 py-2 bg-white"
              style={{ borderColor: 'var(--border)', color: 'var(--text)' }}
              value={formState.productCost}
              onChange={(event) => setFormState(updateProfitCalculatorField(formState, 'productCost', numberFromInput(event)))}
            />
          </label>

          <label className="flex flex-col gap-1.5 text-sm">
            <span style={{ color: 'var(--text-2)' }}>杂费</span>
            <input
              name="miscFees"
              type="number"
              className="rounded-lg border px-3 py-2 bg-white"
              style={{ borderColor: 'var(--border)', color: 'var(--text)' }}
              value={formState.miscFees}
              onChange={(event) => setFormState(updateProfitCalculatorField(formState, 'miscFees', numberFromInput(event)))}
            />
          </label>

          <label className="flex flex-col gap-1.5 text-sm">
            <span style={{ color: 'var(--text-2)' }}>航线</span>
            <select
              name="routeKey"
              className="rounded-lg border px-3 py-2 bg-white"
              style={{ borderColor: 'var(--border)', color: 'var(--text)' }}
              value={formState.routeKey}
              onChange={(event) => setFormState(updateProfitCalculatorField(formState, 'routeKey', event.currentTarget.value))}
            >
              {FREIGHT_ROUTE_OPTIONS.map((route) => (
                <option key={route.routeKey} value={route.routeKey}>
                  {route.label}
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-1.5 text-sm">
            <span style={{ color: 'var(--text-2)' }}>柜型</span>
            <select
              name="containerType"
              className="rounded-lg border px-3 py-2 bg-white"
              style={{ borderColor: 'var(--border)', color: 'var(--text)' }}
              value={formState.containerType}
              onChange={(event) =>
                setFormState(updateProfitCalculatorField(formState, 'containerType', event.currentTarget.value as ProfitCalculatorFormState['containerType']))
              }
            >
              {PROFIT_CONTAINER_TYPES.map((containerType) => (
                <option key={containerType} value={containerType}>
                  {containerType}
                </option>
              ))}
            </select>
          </label>
        </div>
      </section>

      <section className="card-2 p-4 space-y-4">
        <div>
          <h3 className="text-sm font-semibold tracking-wide" style={{ color: 'var(--text)' }}>
            系统推导值
          </h3>
          <p className="text-xs mt-1" style={{ color: 'var(--text-2)' }}>
            基准值用于对照，覆盖值仅影响当前表单判断，不改后台口径。
          </p>
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          <div className="rounded-lg border px-3 py-3 bg-white" style={{ borderColor: 'var(--border)' }}>
            <div className="text-xs uppercase tracking-[0.18em]" style={{ color: 'var(--text-3)' }}>
              基准海运费
            </div>
            <div className="mt-2 text-2xl font-semibold" style={{ color: 'var(--text)', fontFamily: 'var(--font-mono)' }}>
              {formatCurrency(baselineFreight)}
            </div>
          </div>

          <label className="flex flex-col gap-1.5 text-sm">
            <span style={{ color: 'var(--text-2)' }}>手工覆盖海运费</span>
            <input
              name="overrideFreight"
              type="number"
              className="rounded-lg border px-3 py-2 bg-white"
              style={{ borderColor: 'var(--border)', color: 'var(--text)' }}
              value={formState.overrideFreight ?? ''}
              onChange={(event) => {
                const nextValue = event.currentTarget.value === '' ? null : numberFromInput(event)
                setFormState(updateProfitCalculatorField(formState, 'overrideFreight', nextValue))
              }}
            />
          </label>
        </div>
      </section>
    </form>
  )
}

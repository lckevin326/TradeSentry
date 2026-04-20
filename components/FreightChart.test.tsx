import { strict as assert } from 'node:assert'
import { test } from 'node:test'

import { renderToStaticMarkup } from 'react-dom/server'

import FreightChart, { sliceFreightSeries, type FreightChartPoint } from './FreightChart'

const freightData: FreightChartPoint[] = [
  { date: '2026-04-01', baselineFreight: 1100 },
  { date: '2026-04-08', baselineFreight: 1180 },
  { date: '2026-04-15', baselineFreight: 1260 },
  { date: '2026-04-22', baselineFreight: 1210 },
]

test('FreightChart renders ordered freight history data', () => {
  const markup = renderToStaticMarkup(
    <FreightChart data={freightData} days={30} title="中东航线基准运费" />,
  )

  assert.match(markup, /中东航线基准运费/)
  assert.match(markup, /7日/)
  assert.match(markup, /30日/)
  assert.match(markup, /90日/)
})

test('FreightChart renders empty state when no data is available', () => {
  const markup = renderToStaticMarkup(
    <FreightChart data={[]} days={30} title="中东航线基准运费" />,
  )

  assert.match(markup, /暂无运费数据/)
})

test('sliceFreightSeries changes the displayed data slice for selected periods', () => {
  assert.deepEqual(sliceFreightSeries(freightData, 7), [freightData[3]])
  assert.deepEqual(sliceFreightSeries(freightData, 30), freightData.slice(0, 4))
  assert.deepEqual(sliceFreightSeries(freightData, 14), freightData.slice(2, 4))
})

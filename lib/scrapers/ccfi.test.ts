import { strict as assert } from 'node:assert'
import { readFileSync } from 'node:fs'
import { test } from 'node:test'

import { parsePersianGulfCcfi } from './ccfi'

const fixtureUrl = new URL('./fixtures/ccfi-persian-gulf.html', import.meta.url)
const fixtureHtml = readFileSync(fixtureUrl, 'utf8')

test('parsePersianGulfCcfi extracts weekly dates and Persian Gulf route values from mixed chinese-english cells', () => {
  const result = parsePersianGulfCcfi(fixtureHtml)

  assert.deepEqual(result, {
    routeName: 'PERSIAN GULF/RED SEA SERVICE',
    previousDate: '2026-04-10',
    currentDate: '2026-04-17',
    previousIndex: 1834.9,
    currentIndex: 1683.1,
    changePct: -8.3,
  })
})

test('parsePersianGulfCcfi fails when route row exists outside a table with bound dates', () => {
  const driftedHtml = `
    <table>
      <tr><td>header only</td></tr>
    </table>
    <table>
      <tr>
        <td>notice</td>
        <td>2026-04-01</td>
        <td>2026-04-08</td>
      </tr>
    </table>
    <table>
      <tr>
        <td><p>波红航线</p><p>(PERSIAN GULF/RED SEA SERVICE)</p></td>
        <td>1834.90</td>
        <td>1683.10</td>
        <td>-8.3</td>
      </tr>
    </table>
  `

  assert.throws(
    () => parsePersianGulfCcfi(driftedHtml),
    /Unable to bind CCFI dates to route row/,
  )
})

test('parsePersianGulfCcfi fails when numeric values are not strictly parseable', () => {
  const invalidNumberHtml = fixtureHtml.replace('1683.10', '1683.10abc')

  assert.throws(
    () => parsePersianGulfCcfi(invalidNumberHtml),
    /Unable to parse CCFI number/,
  )
})

'use client'
import { useState } from 'react'
import type { Tariff, Country } from '@/types'

const COUNTRIES: Country[] = ['UAE', 'SA', 'KW', 'QA', 'BH', 'OM']
const COUNTRY_NAMES: Record<Country, string> = {
  UAE: '阿联酋',
  SA:  '沙特',
  KW:  '科威特',
  QA:  '卡塔尔',
  BH:  '巴林',
  OM:  '阿曼',
}
const HS_CODES = ['401110', '401120', '401140', '401150', '401170', '401180']
const HS_NAMES: Record<string, string> = {
  '401110': '乘用车轮胎',
  '401120': '公共汽车/卡车轮胎',
  '401140': '摩托车轮胎',
  '401150': '自行车轮胎',
  '401170': '农业/林业机械轮胎',
  '401180': '其他轮胎',
}

interface Props {
  data: Tariff[]
  onRefresh: () => void
  loading: boolean
}

const selectStyle: React.CSSProperties = {
  background: 'var(--surface-2)',
  border: '1px solid var(--border-2)',
  color: 'var(--text)',
  borderRadius: 8,
  padding: '6px 10px',
  fontSize: 13,
  outline: 'none',
  cursor: 'pointer',
}

export default function TariffTable({ data, onRefresh, loading }: Props) {
  const [country, setCountry] = useState<Country | ''>('')
  const [hs, setHs] = useState('')

  const filtered = data.filter(row =>
    (!country || row.country === country) &&
    (!hs || row.hs_code === hs)
  )

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-wrap gap-3 items-center justify-between">
        <div className="flex gap-2 flex-wrap">
          <select value={country} onChange={e => setCountry(e.target.value as Country | '')} style={selectStyle}>
            <option value="">全部国家</option>
            {COUNTRIES.map(c => <option key={c} value={c}>{c} · {COUNTRY_NAMES[c]}</option>)}
          </select>
          <select value={hs} onChange={e => setHs(e.target.value)} style={selectStyle}>
            <option value="">全部 HS 编码</option>
            {HS_CODES.map(h => <option key={h} value={h}>{h} · {HS_NAMES[h]}</option>)}
          </select>
        </div>
        <button
          onClick={onRefresh}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-all disabled:opacity-40"
          style={{ background: 'var(--gold-dim)', color: 'var(--gold-l)', border: '1px solid rgba(212,146,10,0.3)' }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="23 4 23 10 17 10" />
            <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
          </svg>
          {loading ? '更新中…' : '手动更新关税'}
        </button>
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>国家</th>
                <th>HS 编码 · 品类</th>
                <th className="right">当前税率</th>
                <th className="right">上次税率</th>
                <th className="right">变化</th>
                <th>更新时间</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={6} className="text-center py-12" style={{ color: 'var(--text-3)' }}>
                    暂无数据，请点击「手动更新关税」
                  </td>
                </tr>
              )}
              {filtered.map(row => {
                const diff = row.prev_rate_pct != null ? row.rate_pct - row.prev_rate_pct : null
                return (
                  <tr key={row.id} className={row.changed ? 'row-alert' : ''}>
                    <td>
                      <span className="font-semibold text-xs px-2 py-0.5 rounded" style={{ background: 'var(--surface-3)', color: 'var(--text-2)', fontFamily: 'var(--font-mono)' }}>
                        {row.country}
                      </span>
                      <span className="ml-2 text-xs" style={{ color: 'var(--text-2)' }}>{COUNTRY_NAMES[row.country]}</span>
                    </td>
                    <td>
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--text-2)' }}>{row.hs_code}</span>
                      <span className="ml-2 text-xs" style={{ color: 'var(--text-3)' }}>{HS_NAMES[row.hs_code] ?? ''}</span>
                    </td>
                    <td className="text-right">
                      <span className="font-semibold" style={{ fontFamily: 'var(--font-mono)', color: 'var(--text)' }}>{row.rate_pct}%</span>
                    </td>
                    <td className="text-right" style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-3)', fontSize: 12 }}>
                      {row.prev_rate_pct != null ? `${row.prev_rate_pct}%` : '—'}
                    </td>
                    <td
                      className="text-right font-semibold"
                      style={{
                        fontFamily: 'var(--font-mono)',
                        fontSize: 12,
                        color: diff == null ? 'var(--text-3)' : diff > 0 ? 'var(--red)' : diff < 0 ? 'var(--green)' : 'var(--text-3)',
                      }}
                    >
                      {diff != null ? `${diff > 0 ? '+' : ''}${diff.toFixed(2)}%` : '—'}
                    </td>
                    <td className="text-xs" style={{ color: 'var(--text-3)' }}>
                      {new Date(row.fetched_at).toLocaleDateString('zh-CN')}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

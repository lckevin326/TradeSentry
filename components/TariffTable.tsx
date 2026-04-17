'use client'
import { useState } from 'react'
import type { Tariff, Country } from '@/types'

const COUNTRIES: Country[] = ['UAE', 'SA', 'KW', 'QA', 'BH', 'OM']
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

export default function TariffTable({ data, onRefresh, loading }: Props) {
  const [country, setCountry] = useState<Country | ''>('')
  const [hs, setHs] = useState('')

  const filtered = data.filter(row =>
    (!country || row.country === country) &&
    (!hs || row.hs_code === hs)
  )

  return (
    <div className="space-y-4">
      {/* 筛选器 */}
      <div className="flex flex-wrap gap-3 items-center justify-between">
        <div className="flex gap-2 flex-wrap">
          <select
            value={country}
            onChange={e => setCountry(e.target.value as Country | '')}
            className="text-sm border rounded px-2 py-1.5 bg-white"
          >
            <option value="">全部国家</option>
            {COUNTRIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <select
            value={hs}
            onChange={e => setHs(e.target.value)}
            className="text-sm border rounded px-2 py-1.5 bg-white"
          >
            <option value="">全部 HS 编码</option>
            {HS_CODES.map(h => <option key={h} value={h}>{h} {HS_NAMES[h]}</option>)}
          </select>
        </div>
        <button
          onClick={onRefresh}
          disabled={loading}
          className="px-4 py-1.5 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 transition-colors"
        >
          {loading ? '更新中…' : '手动更新关税'}
        </button>
      </div>

      {/* 表格 */}
      <div className="bg-white rounded-xl border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
              <tr>
                <th className="px-4 py-3 text-left">国家</th>
                <th className="px-4 py-3 text-left">HS 编码</th>
                <th className="px-4 py-3 text-right">当前税率</th>
                <th className="px-4 py-3 text-right">上次税率</th>
                <th className="px-4 py-3 text-right">变化</th>
                <th className="px-4 py-3 text-left">更新时间</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.length === 0 && (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-400">暂无数据，请点击「手动更新关税」</td></tr>
              )}
              {filtered.map(row => {
                const diff = row.prev_rate_pct != null ? row.rate_pct - row.prev_rate_pct : null
                return (
                  <tr key={row.id} className={row.changed ? 'bg-red-50' : ''}>
                    <td className="px-4 py-3 font-medium">{row.country}</td>
                    <td className="px-4 py-3">
                      <span className="font-mono">{row.hs_code}</span>
                      <span className="ml-2 text-xs text-gray-400">{HS_NAMES[row.hs_code] ?? ''}</span>
                    </td>
                    <td className="px-4 py-3 text-right font-mono">{row.rate_pct}%</td>
                    <td className="px-4 py-3 text-right font-mono text-gray-400">{row.prev_rate_pct != null ? `${row.prev_rate_pct}%` : '--'}</td>
                    <td className={`px-4 py-3 text-right font-mono ${diff == null ? 'text-gray-400' : diff > 0 ? 'text-red-600' : diff < 0 ? 'text-green-600' : 'text-gray-400'}`}>
                      {diff != null ? `${diff > 0 ? '+' : ''}${diff.toFixed(2)}%` : '--'}
                    </td>
                    <td className="px-4 py-3 text-gray-500 text-xs">{new Date(row.fetched_at).toLocaleDateString('zh-CN')}</td>
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

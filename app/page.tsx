import AlertBanner from '@/components/AlertBanner'
import RateCard from '@/components/RateCard'
import RateChart from '@/components/RateChart'
import { supabase } from '@/lib/supabase'

export const revalidate = 300

async function getLatestRate(target: string) {
  const { data } = await supabase
    .from('exchange_rates')
    .select('rate, change_pct, date')
    .eq('target', target)
    .order('date', { ascending: false })
    .limit(1)
    .single()
  return data
}

async function getLatestTariffUpdate() {
  const { data } = await supabase
    .from('tariffs')
    .select('fetched_at, changed')
    .order('fetched_at', { ascending: false })
    .limit(1)
    .single()
  return data
}

async function getRecentPolicyCount() {
  const since = new Date(Date.now() - 7 * 86400000).toISOString()
  const { count } = await supabase
    .from('policies')
    .select('id', { count: 'exact', head: true })
    .eq('is_relevant', true)
    .gte('created_at', since)
  return count ?? 0
}

async function getChartData(target: string) {
  const since = new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10)
  const { data } = await supabase
    .from('exchange_rates')
    .select('date, rate, change_pct')
    .eq('target', target)
    .gte('date', since)
    .order('date', { ascending: true })
  return data ?? []
}

export default async function DashboardPage() {
  const [aedRate, tariffUpdate, policyCount, chartData] = await Promise.all([
    getLatestRate('AED'),
    getLatestTariffUpdate(),
    getRecentPolicyCount(),
    getChartData('AED'),
  ])

  const changePct = aedRate?.change_pct
  const changeStr = changePct != null ? `${changePct > 0 ? '+' : ''}${changePct}%` : '暂无数据'
  const highlight = changePct == null ? null : changePct > 0 ? 'up' : 'down'

  const tariffDate = tariffUpdate?.fetched_at
    ? new Date(tariffUpdate.fetched_at).toLocaleDateString('zh-CN')
    : '尚未抓取'
  const tariffStatus = tariffUpdate?.changed ? '有税率变化 ⚠' : '税率稳定'

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="page-enter">
        <h1 className="text-2xl font-semibold" style={{ color: 'var(--text)' }}>总览</h1>
        <p className="text-sm mt-1" style={{ color: 'var(--text-3)' }}>
          中国 → GCC 轮胎出口监控 · CNY/海湾货币 · HS 4011
        </p>
      </div>

      <AlertBanner />

      {/* Metric cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <RateCard
          label="CNY / AED 今日汇率"
          value={aedRate?.rate?.toFixed(6) ?? '—'}
          sub={changeStr}
          highlight={highlight}
        />
        <div className="card p-5 flex flex-col gap-2 page-enter page-enter-1">
          <span className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: 'var(--text-3)' }}>
            最近关税更新
          </span>
          <span className="text-3xl font-semibold leading-none" style={{ fontFamily: 'var(--font-mono)', color: 'var(--text)', fontSize: '1.4rem' }}>
            {tariffDate}
          </span>
          <span className="text-xs font-medium" style={{ color: tariffUpdate?.changed ? 'var(--red)' : 'var(--text-2)' }}>
            {tariffUpdate ? tariffStatus : '点击关税页手动更新'}
          </span>
        </div>
        <div className="card p-5 flex flex-col gap-2 page-enter page-enter-2">
          <span className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: 'var(--text-3)' }}>
            近 7 日新增政策
          </span>
          <span className="text-3xl font-semibold leading-none" style={{ fontFamily: 'var(--font-mono)', color: 'var(--text)' }}>
            {policyCount}
          </span>
          <span className="text-xs" style={{ color: 'var(--text-2)' }}>条相关政策公告</span>
        </div>
      </div>

      {/* Chart */}
      <div className="card p-5 page-enter page-enter-3">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xs font-semibold uppercase tracking-widest" style={{ color: 'var(--text-3)' }}>
            CNY / AED · 近 30 日走势
          </h2>
          {aedRate?.date && (
            <span className="text-[11px]" style={{ color: 'var(--text-3)' }}>
              更新于 {aedRate.date}
            </span>
          )}
        </div>
        <RateChart data={chartData} />
      </div>
    </div>
  )
}

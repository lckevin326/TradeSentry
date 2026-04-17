import AlertBanner from '@/components/AlertBanner'
import RateCard from '@/components/RateCard'
import RateChart from '@/components/RateChart'
import { supabase } from '@/lib/supabase'

export const revalidate = 300 // 5 分钟重新验证

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
  const changeStr = changePct != null
    ? `${changePct > 0 ? '+' : ''}${changePct}%`
    : '暂无数据'
  const highlight = changePct == null ? null : changePct > 0 ? 'up' : 'down'

  const tariffDate = tariffUpdate?.fetched_at
    ? new Date(tariffUpdate.fetched_at).toLocaleDateString('zh-CN')
    : '尚未抓取'
  const tariffStatus = tariffUpdate?.changed ? '有变化' : '无变化'

  return (
    <div className="space-y-6">
      <AlertBanner />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <RateCard
          label="CNY / AED 今日汇率"
          value={aedRate?.rate?.toFixed(6) ?? '--'}
          sub={changeStr}
          highlight={highlight}
        />
        <RateCard
          label="最近关税更新"
          value={tariffDate}
          sub={tariffUpdate ? tariffStatus : '点击关税页手动更新'}
        />
        <RateCard
          label="近 7 日新增政策"
          value={String(policyCount)}
          sub="条相关政策公告"
        />
      </div>

      <div className="bg-white rounded-xl border p-4">
        <h2 className="text-sm font-medium text-gray-500 mb-4">CNY/AED 近 30 日汇率走势</h2>
        <RateChart data={chartData} />
      </div>
    </div>
  )
}

import cron from 'node-cron'

export function registerCronJobs() {
  // 每日 09:00 抓取汇率
  cron.schedule('0 9 * * *', async () => {
    console.log('[cron] Fetching exchange rates...')
    try {
      await fetch('http://localhost:3000/api/fetch/rates', { method: 'POST' })
    } catch (e) {
      console.error('[cron] Rate fetch failed:', e)
    }
  }, { timezone: 'Asia/Shanghai' })

  // 每日 10:00 扫描政策
  cron.schedule('0 10 * * *', async () => {
    console.log('[cron] Scanning policies...')
    try {
      await fetch('http://localhost:3000/api/fetch/policies', { method: 'POST' })
    } catch (e) {
      console.error('[cron] Policy scan failed:', e)
    }
  }, { timezone: 'Asia/Shanghai' })

  // 每周一 09:30 抓取运费
  cron.schedule('30 9 * * 1', async () => {
    console.log('[cron] Fetching freight rates...')
    try {
      const response = await fetch('http://localhost:3000/api/fetch/freight', { method: 'POST' })
      if (!response.ok) {
        throw new Error(`Freight fetch returned ${response.status}`)
      }
    } catch (e) {
      console.error('[cron] Freight fetch failed:', e)
    }
  }, { timezone: 'Asia/Shanghai' })

  console.log('[cron] Jobs registered: rates@09:00, policies@10:00, freight@Mon 09:30 (Asia/Shanghai)')
}

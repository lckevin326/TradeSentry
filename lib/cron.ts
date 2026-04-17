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

  console.log('[cron] Jobs registered: rates@09:00, policies@10:00 (Asia/Shanghai)')
}

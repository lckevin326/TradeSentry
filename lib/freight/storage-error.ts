export const FREIGHT_TABLE_SETUP_SQL_PATH = 'docs/sql/2026-04-18-create-freight-rates.sql'

export function formatFreightStorageError(message: string): string {
  if (message.includes("Could not find the table 'public.freight_rates'")) {
    return `缺少 freight_rates 表。请先在 Supabase SQL Editor 执行 ${FREIGHT_TABLE_SETUP_SQL_PATH}，再点击“立即刷新运费”。`
  }

  return message
}

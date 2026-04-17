import type { Policy, PolicySource } from '@/types'

interface Props {
  data: Policy[]
  source: PolicySource | ''
  onSourceChange: (s: PolicySource | '') => void
}

const SOURCE_TABS = [
  { value: '' as const,        label: '全部',  color: 'var(--text-2)' },
  { value: 'mofcom' as const,  label: '商务部', color: '#fb923c' },
  { value: 'wto' as const,     label: 'WTO',   color: '#a78bfa' },
]

export default function PolicyTimeline({ data, source, onSourceChange }: Props) {
  return (
    <div className="space-y-4">
      {/* Source filter */}
      <div className="flex gap-2">
        {SOURCE_TABS.map(t => {
          const active = source === t.value
          return (
            <button
              key={t.value}
              onClick={() => onSourceChange(t.value)}
              className="px-3.5 py-1.5 rounded-lg text-sm font-medium transition-all"
              style={{
                background: active ? 'var(--surface-3)' : 'transparent',
                color: active ? t.color : 'var(--text-3)',
                border: `1px solid ${active ? 'var(--border-2)' : 'transparent'}`,
              }}
            >
              {t.label}
            </button>
          )
        })}
      </div>

      {/* Timeline */}
      <div className="space-y-2">
        {data.length === 0 && (
          <div className="text-center py-14 text-sm" style={{ color: 'var(--text-3)' }}>
            暂无相关政策数据
          </div>
        )}
        {data.map((p, i) => {
          const isMofcom = p.source === 'mofcom'
          const dotColor = isMofcom ? '#fb923c' : '#a78bfa'
          return (
            <div
              key={p.id}
              className="flex gap-4 group page-enter"
              style={{ animationDelay: `${i * 0.04}s` }}
            >
              {/* Timeline indicator */}
              <div className="flex flex-col items-center pt-1 shrink-0 w-4">
                <div
                  className="w-2 h-2 rounded-full shrink-0 transition-all"
                  style={{
                    background: dotColor,
                    boxShadow: `0 0 0 3px var(--bg), 0 0 0 4px ${dotColor}30`,
                  }}
                />
                {i < data.length - 1 && (
                  <div className="flex-1 w-px mt-2" style={{ background: 'var(--border)' }} />
                )}
              </div>

              {/* Content */}
              <div
                className="flex-1 min-w-0 mb-3 p-4 rounded-lg transition-all cursor-default"
                style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
              >
                <div className="flex items-center gap-2 flex-wrap mb-2">
                  <span
                    className="text-[10px] font-semibold px-2 py-0.5 rounded"
                    style={{ background: isMofcom ? 'rgba(251,146,60,0.15)' : 'rgba(167,139,250,0.15)', color: dotColor }}
                  >
                    {isMofcom ? '商务部' : 'WTO'}
                  </span>
                  <span className="text-[11px]" style={{ color: 'var(--text-3)' }}>
                    {p.published_at ? new Date(p.published_at).toLocaleDateString('zh-CN') : '—'}
                  </span>
                  {p.keywords?.slice(0, 4).map(kw => (
                    <span
                      key={kw}
                      className="text-[10px] px-1.5 py-0.5 rounded"
                      style={{ background: 'var(--surface-3)', color: 'var(--text-3)' }}
                    >
                      {kw}
                    </span>
                  ))}
                </div>
                <a
                  href={p.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm font-medium leading-snug line-clamp-2 block transition-colors hover:underline"
                  style={{ color: 'var(--text)' }}
                >
                  {p.title}
                </a>
                {p.summary && (
                  <p className="mt-1.5 text-xs leading-relaxed line-clamp-2" style={{ color: 'var(--text-2)' }}>
                    {p.summary}
                  </p>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

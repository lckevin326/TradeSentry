import type { Policy, PolicySource } from '@/types'

interface Props {
  data: Policy[]
  source: PolicySource | ''
  onSourceChange: (s: PolicySource | '') => void
}

export default function PolicyTimeline({ data, source, onSourceChange }: Props) {
  return (
    <div className="space-y-4">
      {/* 来源筛选 */}
      <div className="flex gap-2">
        {(['', 'mofcom', 'wto'] as const).map(s => (
          <button
            key={s}
            onClick={() => onSourceChange(s)}
            className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-colors ${source === s ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-600 border-gray-200'}`}
          >
            {s === '' ? '全部' : s === 'mofcom' ? '商务部' : 'WTO'}
          </button>
        ))}
      </div>

      {/* 时间线 */}
      <div className="space-y-3">
        {data.length === 0 && (
          <div className="text-center text-gray-400 py-8">暂无相关政策数据</div>
        )}
        {data.map(p => (
          <div key={p.id} className="bg-white rounded-xl border p-4 flex gap-4">
            <div className="flex flex-col items-center gap-1 shrink-0">
              <div className="w-2 h-2 rounded-full bg-blue-500 mt-1" />
              <div className="w-px flex-1 bg-gray-200" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <span className="text-xs text-gray-400">
                  {p.published_at ? new Date(p.published_at).toLocaleDateString('zh-CN') : '--'}
                </span>
                <span className={`text-xs px-2 py-0.5 rounded-full ${p.source === 'mofcom' ? 'bg-orange-100 text-orange-700' : 'bg-purple-100 text-purple-700'}`}>
                  {p.source === 'mofcom' ? '商务部' : 'WTO'}
                </span>
                {p.keywords?.map(kw => (
                  <span key={kw} className="text-xs bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded">{kw}</span>
                ))}
              </div>
              <a href={p.url} target="_blank" rel="noopener noreferrer" className="font-medium text-gray-900 hover:text-blue-600 line-clamp-2 block">
                {p.title}
              </a>
              {p.summary && <p className="text-sm text-gray-500 mt-1 line-clamp-2">{p.summary}</p>}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

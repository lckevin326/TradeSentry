interface RateCardProps {
  label: string
  value: string
  sub?: string
  highlight?: 'up' | 'down' | null
}

export default function RateCard({ label, value, sub, highlight }: RateCardProps) {
  const subColor =
    highlight === 'up'   ? 'var(--green)' :
    highlight === 'down' ? 'var(--red)'   : 'var(--text-2)'

  const glowColor =
    highlight === 'up'   ? 'var(--green-dim)' :
    highlight === 'down' ? 'var(--red-dim)'   : 'transparent'

  return (
    <div
      className="card p-5 flex flex-col gap-2 transition-all page-enter"
      style={{ boxShadow: highlight ? `0 0 0 1px ${glowColor}, inset 0 0 24px ${glowColor}` : undefined }}
    >
      <span
        className="text-[10px] font-semibold uppercase tracking-widest"
        style={{ color: 'var(--text-3)' }}
      >
        {label}
      </span>
      <span
        className="text-3xl font-semibold leading-none tracking-tight"
        style={{ fontFamily: 'var(--font-mono)', color: 'var(--text)' }}
      >
        {value}
      </span>
      {sub && (
        <span className="text-xs font-medium" style={{ color: subColor }}>
          {highlight === 'up' ? '▲ ' : highlight === 'down' ? '▼ ' : ''}{sub}
        </span>
      )}
    </div>
  )
}

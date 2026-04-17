interface RateCardProps {
  label: string
  value: string
  sub?: string
  highlight?: 'up' | 'down' | null
}

export default function RateCard({ label, value, sub, highlight }: RateCardProps) {
  const subColor = highlight === 'up' ? 'text-green-600' : highlight === 'down' ? 'text-red-600' : 'text-gray-500'
  return (
    <div className="bg-white rounded-xl border p-4 flex flex-col gap-1">
      <span className="text-xs text-gray-500 uppercase tracking-wide">{label}</span>
      <span className="text-2xl font-bold">{value}</span>
      {sub && <span className={`text-sm font-medium ${subColor}`}>{sub}</span>}
    </div>
  )
}

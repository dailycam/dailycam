import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts'

interface ActivityBarChartProps {
  data: Array<{
    day: string
    activity: number
  }>
}

export default function ActivityBarChart({ data }: ActivityBarChartProps) {
  const getBarColor = (value: number) => {
    if (value >= 90) return '#22c55e'
    if (value >= 70) return '#3b82f6'
    if (value >= 50) return '#f59e0b'
    return '#ef4444'
  }

  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
        <XAxis
          dataKey="day"
          stroke="#6b7280"
          tick={{ fill: '#6b7280', fontSize: 12 }}
          axisLine={{ stroke: '#e5e7eb' }}
        />
        <YAxis
          stroke="#6b7280"
          tick={{ fill: '#6b7280', fontSize: 12 }}
          axisLine={{ stroke: '#e5e7eb' }}
          domain={[0, 100]}
        />
        <Tooltip
          contentStyle={{
            backgroundColor: '#ffffff',
            border: '1px solid #e5e7eb',
            borderRadius: '8px',
            boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
          }}
          labelStyle={{ color: '#111827', fontWeight: 600, marginBottom: '4px' }}
          itemStyle={{ color: '#6b7280', fontSize: '13px' }}
          cursor={{ fill: 'rgba(59, 130, 246, 0.1)' }}
        />
        <Bar dataKey="activity" radius={[8, 8, 0, 0]} name="활동량">
          {data.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={getBarColor(entry.activity)} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}


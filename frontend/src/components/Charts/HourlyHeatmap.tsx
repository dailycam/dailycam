import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts'

interface HourlyHeatmapProps {
  data: Array<{
    hour: string
    activity: number
    safety: number
  }>
}

export default function HourlyHeatmap({ data }: HourlyHeatmapProps) {
  const getColor = (value: number) => {
    if (value >= 90) return '#22c55e'
    if (value >= 70) return '#3b82f6'
    if (value >= 50) return '#f59e0b'
    return '#ef4444'
  }

  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart
        data={data}
        margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
        layout="vertical"
      >
        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" horizontal={false} />
        <XAxis
          type="number"
          stroke="#6b7280"
          tick={{ fill: '#6b7280', fontSize: 12 }}
          axisLine={{ stroke: '#e5e7eb' }}
          domain={[0, 100]}
        />
        <YAxis
          type="category"
          dataKey="hour"
          stroke="#6b7280"
          tick={{ fill: '#6b7280', fontSize: 11 }}
          axisLine={{ stroke: '#e5e7eb' }}
          width={60}
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
        />
        <Bar dataKey="activity" radius={[0, 4, 4, 0]} name="활동량">
          {data.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={getColor(entry.activity)} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}


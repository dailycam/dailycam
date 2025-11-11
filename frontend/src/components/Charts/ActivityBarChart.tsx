import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts'

interface ActivityBarChartProps {
  data: Array<{
    day: string
    activity: number
  }>
}

export default function ActivityBarChart({ data }: ActivityBarChartProps) {
  // JP Morgan 스타일: 단일 색상의 농도로 표현
  const getBarColor = (value: number) => {
    if (value >= 90) return '#003d82' // 진한 네이비
    if (value >= 70) return '#0057b8' // 중간 블루
    if (value >= 50) return '#4a90e2' // 밝은 블루
    return '#94b8d8' // 연한 블루
  }

  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" vertical={false} />
        <XAxis
          dataKey="day"
          stroke="#666666"
          tick={{ fill: '#666666', fontSize: 13, fontWeight: 500 }}
          axisLine={{ stroke: '#d0d0d0' }}
        />
        <YAxis
          stroke="#666666"
          tick={{ fill: '#666666', fontSize: 13, fontWeight: 500 }}
          axisLine={{ stroke: '#d0d0d0' }}
          domain={[0, 100]}
        />
        <Tooltip
          contentStyle={{
            backgroundColor: '#ffffff',
            border: '1px solid #d0d0d0',
            borderRadius: '6px',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.15)',
          }}
          labelStyle={{ color: '#333333', fontWeight: 600, marginBottom: '6px' }}
          itemStyle={{ color: '#003d82', fontSize: '14px', fontWeight: 500 }}
          cursor={{ fill: 'rgba(0, 61, 130, 0.05)' }}
        />
        <Bar dataKey="activity" radius={[6, 6, 0, 0]} name="활동량" maxBarSize={50}>
          {data.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={getBarColor(entry.activity)} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}


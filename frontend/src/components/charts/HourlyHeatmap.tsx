import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts'

interface HourlyHeatmapProps {
  data: Array<{
    hour: string
    activity: number
    safety: number
  }>
}

export default function HourlyHeatmap({ data }: HourlyHeatmapProps) {
  // JP Morgan 스타일: 블루 그라데이션으로 활동 강도 표현
  const getColor = (value: number) => {
    if (value >= 80) return '#003d82' // 매우 높음 - 진한 네이비
    if (value >= 60) return '#0057b8' // 높음 - 네이비 블루
    if (value >= 40) return '#4a90e2' // 중간 - 밝은 블루
    if (value >= 20) return '#7bb4ec' // 낮음 - 연한 블루
    return '#c5ddf5' // 매우 낮음 - 아주 연한 블루
  }

  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart
        data={data}
        margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
        layout="vertical"
      >
        <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" horizontal={false} />
        <XAxis
          type="number"
          stroke="#666666"
          tick={{ fill: '#666666', fontSize: 13, fontWeight: 500 }}
          axisLine={{ stroke: '#d0d0d0' }}
          domain={[0, 100]}
        />
        <YAxis
          type="category"
          dataKey="hour"
          stroke="#666666"
          tick={{ fill: '#666666', fontSize: 12, fontWeight: 500 }}
          axisLine={{ stroke: '#d0d0d0' }}
          width={70}
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
        />
        <Bar dataKey="activity" radius={[0, 6, 6, 0]} name="활동량" maxBarSize={30}>
          {data.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={getColor(entry.activity)} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}


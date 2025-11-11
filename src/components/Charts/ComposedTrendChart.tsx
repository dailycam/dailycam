import {
  ComposedChart,
  Line,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'

interface ComposedTrendChartProps {
  data: Array<{
    date: string
    safety: number
    incidents: number
    activity: number
  }>
}

export default function ComposedTrendChart({ data }: ComposedTrendChartProps) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <ComposedChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="colorSafety" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#22c55e" stopOpacity={0.8}/>
            <stop offset="95%" stopColor="#22c55e" stopOpacity={0.1}/>
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
        <XAxis
          dataKey="date"
          stroke="#6b7280"
          tick={{ fill: '#6b7280', fontSize: 12 }}
          axisLine={{ stroke: '#e5e7eb' }}
        />
        <YAxis
          yAxisId="left"
          stroke="#6b7280"
          tick={{ fill: '#6b7280', fontSize: 12 }}
          axisLine={{ stroke: '#e5e7eb' }}
          domain={[0, 100]}
        />
        <YAxis
          yAxisId="right"
          orientation="right"
          stroke="#6b7280"
          tick={{ fill: '#6b7280', fontSize: 12 }}
          axisLine={{ stroke: '#e5e7eb' }}
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
        <Legend
          verticalAlign="top"
          height={36}
          iconType="line"
          formatter={(value) => <span style={{ color: '#6b7280', fontSize: '13px' }}>{value}</span>}
        />
        <Bar
          yAxisId="right"
          dataKey="incidents"
          fill="#ef4444"
          radius={[8, 8, 0, 0]}
          name="위험 감지"
          opacity={0.8}
        />
        <Line
          yAxisId="left"
          type="monotone"
          dataKey="safety"
          stroke="#22c55e"
          strokeWidth={3}
          dot={{ fill: '#22c55e', r: 4 }}
          activeDot={{ r: 6 }}
          name="안전도"
        />
        <Line
          yAxisId="left"
          type="monotone"
          dataKey="activity"
          stroke="#3b82f6"
          strokeWidth={2}
          strokeDasharray="5 5"
          dot={{ fill: '#3b82f6', r: 3 }}
          name="활동량"
        />
      </ComposedChart>
    </ResponsiveContainer>
  )
}


import {
    RadarChart,
    PolarGrid,
    PolarAngleAxis,
    PolarRadiusAxis,
    Radar,
    ResponsiveContainer,
} from 'recharts';
import { RadarDataItem } from '../../types/development';

interface DevelopmentRadarChartProps {
    data: RadarDataItem[];
}

export const DevelopmentRadarChart = ({ data }: DevelopmentRadarChartProps) => {
    return (
        <ResponsiveContainer width="100%" height={320}>
            <RadarChart data={data}>
                <defs>
                    <linearGradient id="radarGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#0284c7" stopOpacity={0.8} />
                        <stop offset="100%" stopColor="#0ea5e9" stopOpacity={0.6} />
                    </linearGradient>
                </defs>
                <PolarGrid stroke="#e5e7eb" strokeWidth={1.5} />
                <PolarAngleAxis dataKey="category" tick={{ fill: '#6b7280', fontSize: 13, fontWeight: 500 }} />
                <PolarRadiusAxis angle={90} domain={[0, 100]} tick={{ fill: '#9ca3af', fontSize: 11 }} tickCount={6} />
                <Radar
                    name="내 아이"
                    dataKey="score"
                    stroke="#14b8a6"
                    fill="#14b8a6"
                    fillOpacity={0.35}
                    strokeWidth={2.5}
                    dot={{ fill: '#14b8a6', strokeWidth: 2, r: 5, stroke: '#fff' }}
                />
                <Radar
                    name="또래 평균"
                    dataKey="average"
                    stroke="#9ca3af"
                    fill="none"
                    strokeDasharray="5 5"
                    strokeWidth={2}
                    dot={{ fill: '#9ca3af', strokeWidth: 2, r: 4, stroke: '#fff' }}
                />
            </RadarChart>
        </ResponsiveContainer>
    );
};

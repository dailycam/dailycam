import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Cell,
    ResponsiveContainer,
} from 'recharts';
import { DevelopmentFrequencyItem } from '../../lib/api';

interface DevelopmentBarChartProps {
    data: DevelopmentFrequencyItem[];
}

export const DevelopmentBarChart = ({ data }: DevelopmentBarChartProps) => {
    return (
        <ResponsiveContainer width="100%" height={320}>
            <BarChart data={data}>
                <defs>
                    {data.map((item, index) => (
                        <linearGradient key={index} id={`gradient-${index}`} x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor={item.color} stopOpacity={0.9} />
                            <stop offset="95%" stopColor={item.color} stopOpacity={0.5} />
                        </linearGradient>
                    ))}
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="category" stroke="#9ca3af" style={{ fontSize: '12px' }} />
                <YAxis stroke="#9ca3af" style={{ fontSize: '12px' }} />
                <Tooltip
                    contentStyle={{
                        backgroundColor: 'white',
                        border: 'none',
                        borderRadius: '12px',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                    }}
                />
                <Bar dataKey="count" name="감지 횟수" radius={[8, 8, 0, 0]}>
                    {data.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={`url(#gradient-${index})`} />
                    ))}
                </Bar>
            </BarChart>
        </ResponsiveContainer>
    );
};

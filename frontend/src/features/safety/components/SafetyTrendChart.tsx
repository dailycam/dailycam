import { motion } from 'framer-motion';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip } from 'recharts';
import { SafetyReportData } from '../types';

interface SafetyTrendChartProps {
    trendData: SafetyReportData['trendData'];
    periodType: 'week' | 'month';
    setPeriodType: (type: 'week' | 'month') => void;
}

export const SafetyTrendChart = ({ trendData, periodType, setPeriodType }: SafetyTrendChartProps) => {
    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.6 }}
            className="card p-8 bg-white border-0"
        >
            <div className="flex items-center justify-between mb-6">
                <h3 className="flex items-center gap-2 text-lg font-semibold">
                    <div className="w-1 h-6 bg-gradient-to-b from-primary-400 to-primary-600 rounded-full" />
                    안전도 추이
                </h3>
                <div className="flex gap-2">
                    <button
                        onClick={() => setPeriodType('week')}
                        className={`px-3 py-1 text-xs rounded-full transition-colors ${periodType === 'week' ? 'bg-emerald-100 text-emerald-700 font-bold' : 'bg-gray-100 text-gray-500'}`}
                    >
                        주간
                    </button>
                    <button
                        onClick={() => setPeriodType('month')}
                        className={`px-3 py-1 text-xs rounded-full transition-colors ${periodType === 'month' ? 'bg-emerald-100 text-emerald-700 font-bold' : 'bg-gray-100 text-gray-500'}`}
                    >
                        월간
                    </button>
                </div>
            </div>

            <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={trendData || []} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                        <XAxis
                            dataKey="date"
                            axisLine={false}
                            tickLine={false}
                            tick={{ fill: '#9ca3af', fontSize: 12 }}
                            dy={10}
                        />
                        <YAxis
                            hide={false}
                            axisLine={false}
                            tickLine={false}
                            tick={{ fill: '#9ca3af', fontSize: 12 }}
                            domain={[0, 100]}
                            ticks={[0, 25, 50, 75, 100]}
                        />
                        <RechartsTooltip
                            contentStyle={{
                                backgroundColor: 'white',
                                border: 'none',
                                borderRadius: '8px',
                                boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                            }}
                            formatter={(value: number) => [`${value}점`, '안전도']}
                        />
                        <Line
                            type="monotone"
                            dataKey="안전도"
                            stroke="#10b981"
                            strokeWidth={3}
                            dot={{ r: 4, fill: '#10b981', strokeWidth: 0 }}
                            activeDot={{ r: 6, fill: '#059669', strokeWidth: 0 }}
                        />
                    </LineChart>
                </ResponsiveContainer>
            </div>
        </motion.div>
    );
};

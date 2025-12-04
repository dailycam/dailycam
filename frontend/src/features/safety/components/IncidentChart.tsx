import { motion } from 'framer-motion';
import { PieChart, Pie, Cell, Tooltip as RechartsTooltip } from 'recharts';
import { SafetyReportData } from '../types';

interface IncidentChartProps {
    incidentTypeData: SafetyReportData['incidentTypeData'];
}

export const IncidentChart = ({ incidentTypeData }: IncidentChartProps) => {
    return (
        <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
        >
            <div className="card p-8 h-full border-0 bg-white flex flex-col min-h-[600px]">
                <h3 className="mb-6 flex items-center gap-2 text-lg font-semibold h-8">
                    <div className="w-1 h-6 bg-gradient-to-b from-primary-400 to-primary-600 rounded-full" />
                    안전사고 유형
                </h3>

                <div className="flex items-center justify-center flex-1 min-h-0 py-4 h-[500px]">
                    <PieChart width={500} height={500}>
                        <Pie
                            data={incidentTypeData}
                            cx="50%"
                            cy="50%"
                            labelLine={false}
                            outerRadius={180}
                            fill="#8884d8"
                            dataKey="count"
                            label={({ percent }) => percent > 0 ? `${(percent * 100).toFixed(0)}%` : ''}
                        >
                            {incidentTypeData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                        </Pie>
                        <RechartsTooltip
                            contentStyle={{
                                backgroundColor: 'white',
                                border: 'none',
                                borderRadius: '12px',
                                boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                            }}
                            formatter={(value: number) => `${value}건`}
                        />
                    </PieChart>
                </div >

                <div className="flex flex-wrap items-center justify-center gap-3 mt-4">
                    {incidentTypeData.map((item, index) => (
                        <motion.div
                            key={item.name}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.5 + index * 0.05 }}
                            className="flex items-center gap-1.5 text-xs"
                        >
                            <div className="w-3 h-3 rounded-full shadow-sm flex-shrink-0" style={{ backgroundColor: item.color }} />
                            <span className="text-gray-700">{item.name} ({item.count}건)</span>
                        </motion.div>
                    ))}
                </div>
            </div >
        </motion.div >
    );
};

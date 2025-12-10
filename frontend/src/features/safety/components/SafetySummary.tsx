import { motion } from 'framer-motion';
import { Sparkles, Shield, Eye, Lightbulb } from 'lucide-react';
import { SafetyReportData } from '../types';
import { COLOR_PALETTE } from '../constants';

interface SafetySummaryProps {
    safetyData: SafetyReportData;
    incidentTypeData: SafetyReportData['incidentTypeData'];
}

export const SafetySummary = ({ safetyData, incidentTypeData }: SafetySummaryProps) => {
    return (
        <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="lg:col-span-2"
        >
            <div
                className={`card p-8 bg-gradient-to-br ${COLOR_PALETTE.SUMMARY_BG_GRADIENT} border-0 relative overflow-hidden h-full flex flex-col`}
            >
                <div className="flex-grow relative">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-emerald-200/30 to-green-200/30 rounded-full blur-3xl" />
                    <div className="absolute bottom-0 left-0 w-64 h-64 bg-gradient-to-tr from-teal-200/30 to-emerald-200/30 rounded-full blur-3xl" />

                    <div className="relative">
                        <div className="flex items-center gap-2 mb-4">
                            <Sparkles className="w-6 h-6 text-primary-600" />
                            <h2 className="text-gray-900 text-xl font-semibold">오늘의 안전 요약</h2>
                        </div>
                        <div className="space-y-3 text-sm text-gray-700 leading-relaxed mb-6">
                            <div className="flex items-start gap-3">
                                <div className="w-8 h-8 rounded-lg bg-primary-100/60 flex items-center justify-center flex-shrink-0">
                                    <Shield className="w-5 h-5 text-primary-600" />
                                </div>
                                <span>
                                    {safetyData.safetySummary}
                                </span>
                            </div>
                            {incidentTypeData.reduce((sum, item) => sum + item.count, 0) > 0 && (
                                <div className="flex items-start gap-3">
                                    <div className="w-8 h-8 rounded-lg bg-yellow-100 flex items-center justify-center flex-shrink-0">
                                        <Eye className="w-5 h-5 text-yellow-600" />
                                    </div>
                                    <span>
                                        총 <span className="text-orange-600 font-semibold">{incidentTypeData.reduce((sum, item) => sum + item.count, 0)}건</span>의 안전 이벤트가 감지되었습니다.
                                    </span>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-4 border border-emerald-100 mt-auto">
                    <div className="flex items-center gap-2 mb-2">
                        <Lightbulb className="w-4 h-4 text-primary-600" />
                        <p className="text-xs text-primary-600 font-semibold">안전 인사이트</p>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm text-gray-700 leading-relaxed">
                        {safetyData?.insights && safetyData.insights.length > 0 ? (
                            safetyData.insights.map((insight, idx) => (
                                <p key={idx} className="flex items-start gap-1">
                                    <span>•</span>
                                    <span className="text-sm">{insight}</span>
                                </p>
                            ))
                        ) : (
                            <p className="text-gray-400 italic">분석된 인사이트가 없습니다.</p>
                        )}
                    </div>
                </div>
            </div>
        </motion.div>
    );
};

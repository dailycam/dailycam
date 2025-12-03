import { motion, AnimatePresence } from 'framer-motion';
import { CheckSquare, Shield, Zap, Bed, Blocks, ShieldCheck } from 'lucide-react';
import { ChecklistItem } from '../types';

interface SafetyChecklistProps {
    localChecklist: ChecklistItem[];
    onCheck: (item: ChecklistItem) => void;
}

export const SafetyChecklist = ({ localChecklist, onCheck }: SafetyChecklistProps) => {
    // 아이콘 선택 헬퍼 함수
    const getIconComponent = (iconName: string) => {
        switch (iconName) {
            case 'Shield':
                return Shield;
            case 'Zap':
                return Zap;
            case 'Bed':
                return Bed;
            case 'Blocks':
                return Blocks;
            default:
                return Shield;
        }
    };

    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, delay: 0.3 }}
        >
            <div className="card p-6 border-0 h-full bg-white flex flex-col min-h-[600px]">
                <div className="flex items-center gap-2 mb-6">
                    <CheckSquare className="w-6 h-6 text-primary-500" />
                    <h3 className="text-lg font-semibold section-title-accent">오늘의 안전 체크리스트</h3>
                </div>

                <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
                    <div className="flex flex-col gap-4">
                        <AnimatePresence initial={false}>
                            {localChecklist.length > 0 ? (
                                localChecklist.slice(0, 4).map((item) => {
                                    const IconComponent = getIconComponent(item.icon);

                                    return (
                                        <motion.div
                                            key={item.title}
                                            initial={{ opacity: 0, x: -20 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            exit={{ opacity: 0, height: 0, marginBottom: 0 }}
                                            transition={{ duration: 0.3 }}
                                            className={`p-5 bg-gradient-to-br ${item.gradient} rounded-3xl border-0 transition-all hover:shadow-soft-lg relative overflow-hidden ${item.priority === 'high' && !item.checked ? 'breathing-border' : ''
                                                }`}
                                        >
                                            {item.priority === 'high' && !item.checked && (
                                                <motion.div
                                                    className="absolute inset-0 rounded-3xl"
                                                    animate={{
                                                        backgroundColor: [
                                                            'rgba(252, 165, 165, 0.15)',
                                                            'rgba(252, 165, 165, 0.3)',
                                                            'rgba(252, 165, 165, 0.15)'
                                                        ]
                                                    }}
                                                    transition={{
                                                        duration: 2,
                                                        repeat: Infinity,
                                                        ease: "easeInOut"
                                                    }}
                                                />
                                            )}

                                            <div className="flex items-start gap-4 relative z-20">
                                                <div className={`p-3 rounded-full shadow-sm bg-white ${item.icon === 'Shield' ? 'text-red-500' :
                                                    item.icon === 'Zap' ? 'text-orange-500' :
                                                        item.icon === 'Bed' ? 'text-emerald-600' : 'text-teal-600'
                                                    }`}>
                                                    <IconComponent className="w-6 h-6" />
                                                </div>

                                                <div className="flex-1">
                                                    <div className="flex justify-between items-start mb-2">
                                                        <h3 className="font-bold text-gray-900 text-lg">{item.title}</h3>
                                                        <button
                                                            onClick={() => onCheck(item)}
                                                            className="w-6 h-6 border-2 border-gray-300 rounded-lg bg-white/50 hover:bg-emerald-50 hover:border-emerald-500 transition-colors flex items-center justify-center"
                                                        >
                                                            {/* 체크되지 않은 상태이므로 빈 박스 */}
                                                        </button>
                                                    </div>

                                                    <p className="text-sm text-gray-700 mb-3 leading-relaxed font-medium">
                                                        {item.description}
                                                    </p>

                                                    <span className={`text-xs px-3 py-1 rounded-full font-semibold ${item.priority === 'high'
                                                        ? 'bg-rose-100 text-rose-700 border border-rose-200'
                                                        : item.priority === '권장'
                                                            ? 'bg-blue-100 text-blue-700 border border-blue-200'
                                                            : item.priority === 'medium'
                                                                ? 'bg-amber-100 text-amber-700 border border-amber-200'
                                                                : 'bg-emerald-100 text-emerald-700 border border-emerald-200'
                                                        }`}>
                                                        {item.priority === 'high'
                                                            ? '높은 우선순위'
                                                            : item.priority === '권장'
                                                                ? '권장사항'
                                                                : item.priority === 'medium'
                                                                    ? '중간 우선순위'
                                                                    : '낮은 우선순위'
                                                        }
                                                    </span>
                                                </div>
                                            </div>
                                        </motion.div>
                                    );
                                })
                            ) : (
                                <motion.div
                                    initial={{ opacity: 0, scale: 0.9 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    className="flex flex-col items-center justify-center h-full py-12 text-center relative overflow-hidden rounded-3xl"
                                >
                                    <div className="absolute inset-0 bg-gradient-to-br from-emerald-50/50 to-teal-50/30" />
                                    <div className="absolute top-1/4 left-1/4 w-32 h-32 bg-emerald-200/20 rounded-full blur-3xl" />
                                    <div className="absolute bottom-1/4 right-1/4 w-32 h-32 bg-teal-200/20 rounded-full blur-3xl" />

                                    <div className="relative z-10">
                                        <div className="w-20 h-20 bg-gradient-to-br from-emerald-100 to-teal-100 rounded-full flex items-center justify-center mx-auto mb-6 shadow-sm">
                                            <ShieldCheck className="w-10 h-10 text-emerald-600" />
                                        </div>
                                        <h3 className="text-gray-900 text-xl font-bold mb-3">
                                            완벽해요! 우리 아이가 안전해졌어요
                                        </h3>
                                        <p className="text-gray-600 text-sm leading-relaxed max-w-xs mx-auto">
                                            모든 위험 요소를 확인하셨네요.<br />
                                            부모님의 세심한 배려로<br />
                                            아이가 더 마음껏 세상을 탐험할 수 있어요.
                                        </p>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                </div>
            </div>
        </motion.div>
    );
};

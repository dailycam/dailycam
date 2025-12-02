import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Shield,
  Eye,
  CheckSquare,
  Zap,
  Bed,
  Blocks,
  Sparkles,
  Lightbulb,
  Download,
  Calendar as CalendarIcon,
  Award,
  CheckCircle,
  ShieldCheck,
} from 'lucide-react';
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip as RechartsTooltip,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
} from 'recharts';
import { getAuthHeader } from '../lib/auth';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

// ===== Interfaces =====

interface ChecklistItem {
  id: number;
  title: string;
  icon: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
  gradient: string;
  checked: boolean;
}

interface SafetyReportData {
  trendData: Array<{ date: string; 안전도: number }>;
  incidentTypeData: Array<{ name: string; value: number; color: string; count: number }>;
  clockData: Array<{ hour: number; safetyLevel: string; safetyScore: number }>; // API 응답 호환성을 위해 유지
  safetySummary: string;
  safetyScore: number;
  checklist?: ChecklistItem[];
  insights?: string[];
}

// ===== Components =====

export default function SafetyReport() {
  const [periodType, setPeriodType] = useState<'week' | 'month'>('week');
  const [safetyData, setSafetyData] = useState<SafetyReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [date] = useState<Date>(new Date());

  // 로컬 체크리스트 상태 (사용자 인터랙션용)
  const [localChecklist, setLocalChecklist] = useState<ChecklistItem[]>([]);

  // 안전/안심 테마 팔레트 정의 (파스텔 민트)
  const COLOR_PALETTE = {
    PRIMARY: '#14b8a6',
    PRIMARY_LIGHT: '#2dd4bf',
    PRIMARY_DARK: '#0d9488',
    HEADER_GRADIENT: 'from-primary-500 via-primary-600 to-primary-700',
    SUMMARY_BG_GRADIENT: 'from-primary-100/40 via-primary-50/30 to-cyan-50/30',
    LINE_STROKE: '#14b8a6',
    HOUR_LINE_INACTIVE: '#e5e7eb',
  };

  // 실제 데이터 가져오기
  useEffect(() => {
    async function loadSafetyData() {
      try {
        setLoading(true)
        const response = await fetch(
          `${API_BASE_URL}/api/safety/summary?period_type=${periodType}`,
          {
            method: 'GET',
            headers: {
              ...getAuthHeader(),
            },
          }
        )

        if (response.ok) {
          const data = await response.json()
          setSafetyData(data)
        } else {
          // API 실패 시 기본값 사용
          setSafetyData({
            trendData: periodType === 'week'
              ? Array.from({ length: 7 }, (_, i) => ({ date: ['월', '화', '수', '목', '금', '토', '일'][i], 안전도: 0 }))
              : Array.from({ length: 4 }, (_, i) => ({ date: `${i + 1}주`, 안전도: 0 })),
            incidentTypeData: [
              { name: '낙상', value: 35, color: '#fca5a5', count: 0 },
              { name: '충돌/부딛힘', value: 25, color: '#fdba74', count: 0 },
              { name: '끼임', value: 15, color: '#fde047', count: 0 },
              { name: '전도(가구 넘어짐)', value: 10, color: '#86efac', count: 0 },
              { name: '감전', value: 10, color: '#7dd3fc', count: 0 },
              { name: '질식', value: 5, color: '#c4b5fd', count: 0 },
            ],
            clockData: [],
            safetySummary: '아직 분석된 데이터가 없습니다.',
            safetyScore: 0,
            checklist: [],
            insights: []
          })
        }
      } catch (error) {
        console.error('안전 리포트 데이터 로딩 오류:', error)
        // 에러 시 기본값 사용
        setSafetyData({
          trendData: periodType === 'week'
            ? Array.from({ length: 7 }, (_, i) => ({ date: ['월', '화', '수', '목', '금', '토', '일'][i], 안전도: 0 }))
            : Array.from({ length: 4 }, (_, i) => ({ date: `${i + 1}주`, 안전도: 0 })),
          incidentTypeData: [
            { name: '낙상', value: 35, color: '#fca5a5', count: 0 },
            { name: '충돌/부딛힘', value: 25, color: '#fdba74', count: 0 },
            { name: '끼임', value: 15, color: '#fde047', count: 0 },
            { name: '전도(가구 넘어짐)', value: 10, color: '#86efac', count: 0 },
            { name: '감전', value: 10, color: '#7dd3fc', count: 0 },
            { name: '질식', value: 5, color: '#c4b5fd', count: 0 },
          ],
          clockData: [],
          safetySummary: '아직 분석된 데이터가 없습니다.',
          safetyScore: 0,
          checklist: [],
          insights: []
        })
      } finally {
        setLoading(false)
      }
    }

    loadSafetyData()
  }, [periodType])

  // 데이터 로드 시 로컬 체크리스트 초기화
  useEffect(() => {
    if (safetyData?.checklist) {
      setLocalChecklist(safetyData.checklist);
    }
  }, [safetyData]);

  // 체크리스트 완료 처리
  const handleCheck = async (item: ChecklistItem) => {
    // 1. 로컬 목록에서 제거 (UI 즉시 반영)
    setLocalChecklist(prev => prev.filter(i => i.title !== item.title));

    // 2. 서버 상태 업데이트
    try {
      await fetch(`${API_BASE_URL}/api/safety/events/${item.id}/resolve?resolved=true`, {
        method: 'POST',
        headers: {
          ...getAuthHeader(),
        },
      });
    } catch (error) {
      console.error('체크리스트 상태 업데이트 실패:', error);
    }

    // 3. 완료 이벤트 발생 (Header 알림용)
    const event = new CustomEvent('checklist-completed', {
      detail: { item }
    });
    window.dispatchEvent(event);
  };

  // 롤백 이벤트 리스너
  useEffect(() => {
    const handleRollback = async (event: CustomEvent) => {
      const { item } = event.detail;

      // 서버 상태 업데이트 (롤백)
      try {
        await fetch(`${API_BASE_URL}/api/safety/events/${item.id}/resolve?resolved=false`, {
          method: 'POST',
          headers: {
            ...getAuthHeader(),
          },
        });
      } catch (error) {
        console.error('체크리스트 롤백 실패:', error);
      }

      setLocalChecklist(prev => {
        // 중복 방지
        if (prev.find(i => i.title === item.title)) return prev;

        // 우선순위 점수 계산 함수 (정렬용)
        const getPriorityScore = (priority: string) => {
          if (priority === 'high') return 3;
          if (priority === 'medium') return 2;
          return 1;
        };

        // 다시 추가하고 정렬
        const newList = [item, ...prev];
        return newList.sort((a, b) => {
          // 1. 우선순위 비교
          const scoreA = getPriorityScore(a.priority);
          const scoreB = getPriorityScore(b.priority);
          if (scoreA !== scoreB) return scoreB - scoreA; // 내림차순

          // 2. 이름순 (보조 정렬)
          return a.title.localeCompare(b.title);
        });
      });
    };

    window.addEventListener('checklist-rollback' as any, handleRollback);
    return () => {
      window.removeEventListener('checklist-rollback' as any, handleRollback);
    };
  }, []);

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
  const incidentTypeData = safetyData?.incidentTypeData || [];

  const currentSafetyScore = safetyData?.safetyScore || 0;

  if (loading || !safetyData) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-600">로딩 중...</div>
      </div>
    )
  }

  return (
    <div className="p-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="mb-8 flex items-center justify-between"
      >
        <div>
          <div className="flex items-center gap-3 mb-2">
            <Shield className="w-8 h-8 text-primary-600" />
            <h1
              className={`bg-gradient-to-r ${COLOR_PALETTE.HEADER_GRADIENT} bg-clip-text text-transparent text-3xl font-bold`}
            >
              아이 안전 리포트
            </h1>
          </div>
          <p className="text-gray-600">영유아 안전 현황을 확인하세요</p>
        </div>
        <div className="flex items-center gap-3">
          <button className="btn-secondary flex items-center gap-2 border-emerald-200 hover:border-emerald-300 hover:bg-emerald-50 px-4 py-2 rounded-lg transition-colors">
            <CalendarIcon className="w-4 h-4" />
            {date.toLocaleDateString('ko-KR')}
          </button>
          <button className="btn-primary flex items-center gap-2">
            <Download className="w-4 h-4" />
            리포트 다운로드
          </button>
        </div>
      </motion.div>

      {/* AI Summary & Score Card Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        {/* 1. AI Summary (2/3 크기) */}
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
                          </div>              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm text-gray-700 leading-relaxed">
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

        {/* 2. 안전 점수 카드 (1/3 크기) */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="lg:col-span-1"
        >
          <div className="card p-6 bg-gradient-to-br from-primary-100/40 to-cyan-50/30 border-0 h-full">
            <div className="text-center h-full flex flex-col justify-center">
              <motion.div
                initial={{ scale: 0.8 }}
                animate={{ scale: 1 }}
                transition={{ duration: 0.8, delay: 0.4 }}
              >
                <div className="bg-gradient-to-br from-primary-500 to-primary-600 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Shield className="w-10 h-10 text-white" />
                </div>
              </motion.div>
              <p className="text-sm text-gray-600 mb-2">오늘의 종합 안전 점수</p>
              <p className="text-primary-600 mb-4 text-4xl font-bold">{currentSafetyScore}점</p>

              <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-4 shadow-sm">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <Award className="w-5 h-5 text-green-600" />
                  <p className="text-sm text-gray-700 font-medium">안전 상태</p>
                </div>
                <p className="text-base text-gray-800 leading-relaxed">
                  <span className="text-primary-600 font-semibold">
                    {currentSafetyScore >= 90 ? '매우 우수' : currentSafetyScore >= 70 ? '양호' : '주의'}
                  </span>합니다.
                </p>
              </div>

              <div className="mt-4 text-xs text-gray-400 border-t pt-3">
                <p>💡 24시간 감지 데이터 기반의 분석 결과입니다.</p>
              </div>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Charts Section: 체크리스트 + 사고 유형 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* 1. Safety Checklist (Left Column) - 시계 대신 배치 */}
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
                    localChecklist.slice(0, 4).map((item, index) => {
                      const IconComponent = getIconComponent(item.icon);

                      return (
                        <motion.div
                          key={item.title} // 키를 title로 변경하여 고유성 보장 및 애니메이션 정상화
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
                                  onClick={() => handleCheck(item)}
                                  className="w-6 h-6 border-2 border-gray-300 rounded-lg bg-white/50 hover:bg-emerald-50 hover:border-emerald-500 transition-colors flex items-center justify-center"
                                >
                                  {/* 체크되지 않은 상태이므로 빈 박스 */}
                                </button>
                              </div>

                              <p className="text-sm text-gray-700 mb-3 leading-relaxed font-medium">
                                {item.description}
                              </p>

                              <span className={`text-xs px-3 py-1 rounded-full font-semibold ${
                                item.priority === 'high'
                                  ? 'bg-rose-100 text-rose-700 border border-rose-200'
                                  : item.priority === '권장'
                                    ? 'bg-blue-100 text-blue-700 border border-blue-200'
                                    : 'bg-emerald-100 text-emerald-700 border border-emerald-200'
                                }`}>
                                {item.priority === 'high'
                                  ? '높은 우선순위'
                                  : item.priority === '권장'
                                    ? '권장사항'
                                    : '중간 우선순위'
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

        {/* 2. 안전사고 유형 원그래프 (크기 재확대 및 고정) */}
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

            {/* 🚩 수정: 차트 컨테이너의 높이를 h-[500px]로 확장 */}
            <div className="flex items-center justify-center flex-1 min-h-0 py-4 h-[500px]">
              {/* 🚩 수정: PieChart의 width와 height를 500으로 확장 */}
              <PieChart width={500} height={500}>
                <Pie
                  data={incidentTypeData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  outerRadius={180} /* Pie의 반지름도 180으로 대폭 확대 */
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
      </div >

      {/* 4. Safety Trend Section */}
      < motion.div
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
            <LineChart data={safetyData?.trendData || []} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
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
      </motion.div >
    </div >
  );
}
import { useState, useMemo, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  Shield,
  Clock,
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
  AlertTriangle,
  CheckCircle,
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

interface ClockData {
  hour: number;
  safetyLevel: 'safe' | 'warning' | 'danger' | null;
  safetyScore: number;
  color: string;
  incident: string;
}

interface TooltipState {
  visible: boolean;
  x: number;
  y: number;
  data: ClockData | null;
}

interface SafetyReportData {
  trendData: Array<{ date: string; 안전도: number }>;
  incidentTypeData: Array<{ name: string; value: number; color: string; count: number }>;
  clockData: Array<{ hour: number; safetyLevel: string; safetyScore: number }>;
  safetySummary: string;
  safetyScore: number;
}

// ===== Helper Functions =====

const getSeverityColor = (severity: string | null) => {
  switch (severity) {
    case 'safe':
      return '#34d399'; // Emerald-400 (네온 그린)
    case 'warning':
      return '#facc15'; // Yellow-400 (네온 옐로우)
    case 'danger':
      return '#f87171'; // Red-400 (네온 레드)
    default:
      return '#e5e7eb'; // Gray-200 (비활성)
  }
};

// ===== Components =====

// 커스텀 툴팁 컴포넌트 (Framer Motion 사용)
const CustomTooltip = ({ tooltip }: { tooltip: TooltipState }) => {
  if (!tooltip.visible || !tooltip.data) return null;

  // 툴팁 위치를 SVG 기준으로 계산 (SVG 컨테이너의 절대 위치를 더함)
  const finalX = tooltip.x;
  const finalY = tooltip.y;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.8 }}
      transition={{ duration: 0.2, type: 'spring', stiffness: 200 }}
      style={{
        position: 'absolute', // 상위 relative div 기준
        top: finalY,
        left: finalX,
        transform: 'translate(-50%, -110%)', // 점 위에 중앙 정렬
        pointerEvents: 'none',
        backgroundColor: '#111827',
        color: 'white',
        padding: '8px 12px',
        borderRadius: '8px',
        boxShadow: `0 4px 15px rgba(0, 0, 0, 0.4), 0 0 10px ${tooltip.data.color}33`,
        zIndex: 100,
        whiteSpace: 'nowrap',
        fontSize: '12px',
        border: `1px solid ${tooltip.data.color}`
      }}
    >
      <div className="font-bold mb-1" style={{ color: tooltip.data.color }}>
        {tooltip.data.hour < 12 ? `AM ${tooltip.data.hour === 0 ? 12 : tooltip.data.hour}` : `PM ${tooltip.data.hour === 12 ? 12 : tooltip.data.hour - 12}`} ({tooltip.data.safetyScore}점)
      </div>
      <div className="text-gray-300">{tooltip.data.incident}</div>
    </motion.div>
  );

};

// 미니멀 시계 컴포넌트 (Braun 스타일)
const SafetyMinimalClockChart = ({ fullClockData, overallScore }: { fullClockData: ClockData[], overallScore: number }) => {
  const cx = 160;
  const cy = 160;


  const [tooltip, setTooltip] = useState<TooltipState>({
    visible: false,
    x: 0,
    y: 0,
    data: null,
  });

  // 로컬 시간 연동을 위한 state
  const [currentTime, setCurrentTime] = useState(new Date());
  const currentLocalHour = currentTime.getHours();

  // 실시간 업데이트 (1초마다)
  useEffect(() => {
    const updateTime = () => {
      setCurrentTime(new Date());
    };

    const intervalId = setInterval(updateTime, 1000);
    return () => clearInterval(intervalId);
  }, []);

  // 1. 24시간 데이터를 12개의 시계 위치로 재구성합니다.
  const hourMapData = useMemo(() => {
    const dataArray = [];
    const defaultIncident = '안정적인 상태 유지';
    const defaultData: ClockData = { hour: 0, safetyLevel: null, safetyScore: 0, color: '#1f2937', incident: defaultIncident }; // 기본 검은색

    for (let i = 0; i < 12; i++) {
      const amData = fullClockData.find(d => d.hour === i);
      const pmData = fullClockData.find(d => d.hour === i + 12);

      // Braun 스타일: 모든 상태에 대해 색상 표시
      const getColor = (data: ClockData | undefined) => {
        if (!data || !data.safetyLevel) return '#e5e7eb';
        return getSeverityColor(data.safetyLevel);
      };

      dataArray.push({
        am: amData ? { ...amData, color: getColor(amData) } : { ...defaultData, hour: i },
        pm: pmData ? { ...pmData, color: getColor(pmData) } : { ...defaultData, hour: i + 12 }
      });
    }
    return dataArray;
  }, [fullClockData]);

  // 마우스 이벤트 핸들러
  const handleMouseEnter = useCallback((event: React.MouseEvent<SVGElement>, data: ClockData) => {
    const targetElement = event.currentTarget as SVGElement;
    const rect = targetElement.getBoundingClientRect();
    const svgRect = (event.currentTarget as SVGElement).viewportElement?.getBoundingClientRect();

    if (svgRect) {
      const svgX = rect.left - svgRect.left + rect.width / 2;
      const svgY = rect.top - svgRect.top + rect.height / 2;

      setTooltip({
        visible: true,
        x: svgX,
        y: svgY,
        data,
      });
    }
  }, []);

  const handleMouseLeave = useCallback(() => {
    setTooltip(prev => ({ ...prev, visible: false }));
  }, []);



  // 눈금 생성 (60개)
  const ticks = Array.from({ length: 60 }, (_, i) => {
    const isMajor = i % 5 === 0;
    const angle = i * 6; // 6도씩 회전
    return { index: i, isMajor, angle };
  });

  return (
    <div className="flex flex-col items-center justify-center flex-1 w-full h-full relative min-h-[400px]">
      <svg viewBox="0 0 320 320" className="w-full h-full">
        <defs>
          <filter id="hand-shadow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur in="SourceAlpha" stdDeviation="1" result="blur" />
            <feOffset in="blur" dx="1" dy="1" result="offsetBlur" />
            <feMerge>
              <feMergeNode in="offsetBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* 2. 눈금 (Ticks) 및 데이터 표시 */}
        <g transform={`translate(${cx}, ${cy})`}>
          {ticks.map((tick) => {
            if (tick.isMajor) {
              // 5분 단위 주요 눈금 -> 데이터 표시 (AM/PM 분할)
              const hourIndex = tick.index / 5;
              const dataPair = hourMapData[hourIndex];
              // 12시는 인덱스 0으로 처리됨

              return (
                <g key={tick.index} transform={`rotate(${tick.angle - 90})`}>
                  {/* PM 데이터 (바깥쪽 절반) */}
                  <motion.rect
                    x={105}
                    y={-2}
                    width={10}
                    height={4}
                    fill={dataPair.pm.color}
                    className="cursor-pointer hover:opacity-80"
                    onMouseEnter={(e) => handleMouseEnter(e, dataPair.pm)}
                    onMouseLeave={handleMouseLeave}
                  />
                  {/* AM 데이터 (안쪽 절반) */}
                  <motion.rect
                    x={94}
                    y={-2}
                    width={10}
                    height={4}
                    fill={dataPair.am.color}
                    className="cursor-pointer hover:opacity-80"
                    onMouseEnter={(e) => handleMouseEnter(e, dataPair.am)}
                    onMouseLeave={handleMouseLeave}
                  />
                </g>
              );
            } else {
              // 1분 단위 작은 눈금
              return (
                <g key={tick.index} transform={`rotate(${tick.angle - 90})`}>
                  <rect x={110} y={-0.5} width={5} height={1} fill="#9ca3af" />
                </g>
              );
            }
          })}

          {/* 3. 숫자 (Numbers) */}
          {hourMapData.map((_, i) => {
            const angle = i * 30 - 90;
            const rad = (angle * Math.PI) / 180;
            const numX = Math.cos(rad) * 75; // 숫자 위치 반지름
            const numY = Math.sin(rad) * 75;
            const number = i === 0 ? 12 : i;

            return (
              <text
                key={i}
                x={numX}
                y={numY}
                dy={5} // 수직 중앙 정렬 보정
                textAnchor="middle"
                className="text-xl font-bold fill-gray-900"
                style={{ fontFamily: 'Inter, sans-serif' }}
              >
                {number}
              </text>
            );
          })}
        </g>

        {/* 중앙 데이터 표시 (심플하게) */}
        {/* 요청에 따라 안전 점수 표시 요소를 주석 처리합니다. */}
        {/* <g transform={`translate(${cx}, ${cy + 40})`}>
          <text y={0} textAnchor="middle" className="text-[10px] font-bold fill-gray-400 tracking-widest uppercase">Safety Score</text>
          <text y={15} textAnchor="middle" className="text-lg font-black fill-gray-800">{overallScore}</text>
        </g> */}

        {/* 4. 시계 바늘 (Braun 스타일 - 심플 & 모던) */}
        {/* 시침 */}
        <motion.g
          transform={`translate(${cx}, ${cy}) rotate(${currentLocalHour % 12 * 30 + currentTime.getMinutes() * 0.5 - 90})`}
          filter="url(#hand-shadow)"
        >
          <rect x={-10} y={-3} width={60} height={6} rx={3} fill="#1f2937" />
        </motion.g>

        {/* 분침 */}
        <motion.g
          transform={`translate(${cx}, ${cy}) rotate(${currentTime.getMinutes() * 6 - 90})`}
          filter="url(#hand-shadow)"
        >
          <rect x={-10} y={-2.5} width={90} height={5} rx={2.5} fill="#374151" />
        </motion.g>

        {/* 초침 (노란색 포인트) */}
        <motion.g
          transform={`translate(${cx}, ${cy}) rotate(${currentTime.getSeconds() * 6 - 90})`}
          filter="url(#hand-shadow)"
        >
          <rect x={-15} y={-1} width={100} height={2} fill="#f59e0b" /> {/* Amber-500 */}
          <circle cx={0} cy={0} r={3} fill="#f59e0b" />
        </motion.g>

        {/* 중앙 캡 (검은색) */}
        <circle cx={cx} cy={cy} r={4} fill="#1f2937" />

      </svg>

      {/* 커스텀 툴팁 */}
      <CustomTooltip tooltip={tooltip} />
    </div>
  );
};

// ===== SafetyReport Main Component =====

export default function SafetyReport() {
  const [periodType, setPeriodType] = useState<'week' | 'month'>('week');
  const [safetyData, setSafetyData] = useState<SafetyReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [date] = useState<Date>(new Date());

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
            clockData: Array.from({ length: 24 }, (_, hour) => ({
              hour,
              safetyLevel: 'safe',
              safetyScore: 95
            })),
            safetySummary: '아직 분석된 데이터가 없습니다.',
            safetyScore: 0
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
          clockData: Array.from({ length: 24 }, (_, hour) => ({
            hour,
            safetyLevel: 'safe',
            safetyScore: 95
          })),
          safetySummary: '아직 분석된 데이터가 없습니다.',
          safetyScore: 0
        })
      } finally {
        setLoading(false)
      }
    }

    loadSafetyData()
  }, [periodType])

  // 데이터 변환: API 데이터 -> 컴포넌트용 ClockData
  const clockData: ClockData[] = useMemo(() => {
    if (!safetyData) return [];
    return safetyData.clockData.map(d => ({
      hour: d.hour,
      safetyLevel: d.safetyLevel as any,
      safetyScore: d.safetyScore,
      color: getSeverityColor(d.safetyLevel),
      incident: d.safetyLevel === 'safe' ? '안정적인 상태' : '주의 필요'
    }));
  }, [safetyData]);

  const currentData = safetyData?.trendData || [];
  // 안전 체크리스트 (UI 애니메이션용 데이터)
  const safetyChecklist = [
    {
      title: '모서리 가드 설치',
      icon: 'Shield',
      description: '아이가 가구를 잡고 서기 시작했습니다. 뽰족한 모서리에 가드를 설치해주세요.',
      priority: 'high',
      gradient: 'from-danger-light/30 to-pink-50',
      checked: false,
    },
    {
      title: '전기 콘센트 안전 장치',
      icon: 'Zap',
      description: '전기 콘센트에 안전 장치가 설치돼있는지 확인해주세요.',
      priority: 'high',
      gradient: 'from-warning-light/30 to-orange-50',
      checked: true,
    },
    {
      title: '침대 낙상 방지',
      icon: 'Bed',
      description: '침대 가장자리 안전 패드가 제대로 고정되어 있는지 확인하세요.',
      priority: 'medium',
      gradient: 'from-primary-100/40 to-primary-50',
      checked: false,
    },
    {
      title: '작은 물건 정리',
      icon: 'Blocks',
      description: '아이가 삼킬 수 있는 작은 물건들을 손이 닿지 않는 곳에 보관하세요.',
      priority: 'medium',
      gradient: 'from-safe-light/30 to-cyan-50',
      checked: true,
    },
  ];

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
          <p className="text-gray-600">AI 분석 기반 영유아 안전 현황을 확인하세요</p>
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
                <p className="text-xs text-primary-600 font-semibold">AI 안전 인사이트</p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs text-gray-700">
                <p className="flex items-start gap-1">
                  <span>•</span>
                  <span>오후 시간대 활발한 활동 중 낙상 위험이 잠재적으로 높습니다.</span>
                </p>
                <p className="flex items-start gap-1">
                  <span>•</span>
                  <span>창문 및 베란다 접근 감지율은 0%입니다. 안전 장치 작동 상태 양호.</span>
                </p>
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
                <p>💡 24시간 감지 데이터 기반의 AI 분석 결과입니다.</p>
              </div>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Charts Section: 24시간 시계 + 사고 유형 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* 24시간 시계 (Vibrant Green Tone) -> SafetyMinimalClockChart 적용 */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6, delay: 0.3 }}
        >
          <div className="card p-4 border-0 h-full flex flex-col min-h-[600px] bg-white">
            <div className="flex items-center justify-between mb-6 h-8">
              <h3 className="flex items-center gap-2 text-lg font-semibold">
                <div className="w-1 h-6 bg-gradient-to-b from-primary-400 to-primary-600 rounded-full" />
                24시간 안전 현황

              </h3>
              <Clock className="w-5 h-5 text-primary-500" />
            </div>

            {/* 변경된 시계 컴포넌트 삽입 */}
            <SafetyMinimalClockChart fullClockData={clockData} overallScore={currentSafetyScore} />

            <div className="flex items-center justify-center gap-4 mt-4 text-xs">
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-full bg-emerald-400 shadow-sm" />
                <span className="text-gray-600">안전 (90+)</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-full bg-yellow-400 shadow-sm" />
                <span className="text-gray-600">주의 (70-89)</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-full bg-red-400 shadow-sm" />
                <span className="text-gray-600">위험 (70미만)</span>
              </div>
            </div>
          </div>
        </motion.div>



        {/* 안전사고 유형 원그래프 (크기 재확대 및 고정) */}
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

      {/* 3. Safety Checklist Section */}
      < motion.div
        initial={{ opacity: 0, y: 20 }
        }
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.5 }}
        className="mb-8"
      >
        <div className="card p-6 border-0">
          <div className="flex items-center gap-2 mb-6">
            <CheckSquare className="w-6 h-6 text-primary-500" />
            <h3 className="text-lg font-semibold section-title-accent">오늘의 안전 체크리스트</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {safetyChecklist.map((item, index) => {
              const IconComponent = getIconComponent(item.icon);

              return (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.6 + index * 0.1 }}
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

                  {/* 아이콘 깜박임 */}
                  {item.priority === 'high' && !item.checked && (
                    <motion.div
                      className="absolute top-2 left-2 z-10"
                      animate={{
                        scale: [1, 1.2, 1],
                        opacity: [0.8, 1, 0.8],
                      }}
                      transition={{
                        duration: 1.5,
                        repeat: Infinity,
                        ease: "easeInOut"
                      }}
                    >
                      <AlertTriangle className="w-4 h-4 text-danger" />
                    </motion.div>
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
                        {item.checked ? (
                          <div className="w-6 h-6 bg-emerald-500 rounded-full flex items-center justify-center shadow-sm">
                            <CheckCircle className="w-4 h-4 text-white" />
                          </div>
                        ) : (
                          <div className="w-6 h-6 border-2 border-gray-300 rounded-lg bg-white/50" />
                        )}
                      </div>

                      <p className="text-sm text-gray-700 mb-3 leading-relaxed font-medium">
                        {item.description}
                      </p>

                      <span className={`text-xs px-3 py-1 rounded-full font-semibold ${item.priority === 'high'
                        ? 'bg-rose-100 text-rose-700 border border-rose-200'
                        : 'bg-emerald-100 text-emerald-700 border border-emerald-200'
                        }`}>
                        {item.priority === 'high' ? '높은 우선순위' : '중간 우선순위'}
                      </span>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      </motion.div >

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
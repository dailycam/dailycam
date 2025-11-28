import { useState, useMemo, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  Shield,
  CheckCircle,
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
  AlertTriangle, // 🚨 경고 애니메이션을 위해 AlertTriangle 아이콘을 추가했습니다.
} from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';

// ===== 미니멀/미래지향적 시계 컴포넌트 로직 (최종 버전 - 툴팁 안정화) =====

interface ClockData {
  hour: number;
  safetyLevel: 'safe' | 'warning' | 'danger' | null;
  safetyScore: number;
  color: string;
  incident: string;
}

// 툴팁 상태 인터페이스
interface TooltipState {
  visible: boolean;
  x: number;
  y: number;
  data: ClockData | null;
}

// 안전 레벨에 따른 색상 (네온 효과를 위해 단색 유지)
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

// 커스텀 툴팁 컴포넌트 (Framer Motion 사용)
const CustomTooltip = ({ tooltip, svgOffset }: { tooltip: TooltipState, svgOffset: { top: number, left: number } }) => {
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

// 미니멀 시계 컴포넌트
const SafetyMinimalClockChart = ({ fullClockData }: { fullClockData: ClockData[] }) => {
  const cx = 160;
  const cy = 160;
  const radius = 140; // 시계 휠의 반경 (기준선)
  const centerRadius = 80; // 중앙 정보 영역 반경
  const svgWidth = 320;

  const [tooltip, setTooltip] = useState<TooltipState>({
    visible: false,
    x: 0,
    y: 0,
    data: null,
  });

  // 로컬 시간 연동을 위한 state
  const [currentTime, setCurrentTime] = useState(new Date());
  const currentLocalHour = currentTime.getHours();

  // 중앙 정보는 항상 현재 시간에 고정
  const activeHour = currentLocalHour;

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
    const defaultData: ClockData = { hour: 0, safetyLevel: null, safetyScore: 0, color: getSeverityColor(null), incident: defaultIncident };

    for (let i = 0; i < 12; i++) {
      const amData = fullClockData.find(d => d.hour === i);
      const pmData = fullClockData.find(d => d.hour === i + 12);

      dataArray.push({
        am: amData || { ...defaultData, hour: i },
        pm: pmData || { ...defaultData, hour: i + 12 }
      });
    }
    return dataArray;
  }, [fullClockData]);

  // 2. 활성화된 시간의 데이터를 찾습니다. (currentLocalHour에 고정)
  const activeData = useMemo(() => {
    return fullClockData.find((d) => d.hour === activeHour) || null;
  }, [fullClockData, activeHour]);


  // 마우스 이벤트 핸들러 (툴팁 위치 및 확대 적용)
  const handleMouseEnter = useCallback((event: React.MouseEvent<SVGElement>, data: ClockData, index: number, type: 'am' | 'pm') => {
    const targetElement = event.currentTarget as SVGElement;
    const rect = targetElement.getBoundingClientRect();
    const svgRect = (event.currentTarget as SVGElement).viewportElement?.getBoundingClientRect();

    if (svgRect) {
      // 툴팁 위치를 SVG 내부 좌표 (점의 중앙) 기준으로 설정
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

  /**
   * 24시간 형식을 12시간 시계 라벨 형식으로 변환합니다.
   */
  const formatClockHour = (hour: number, isLabel = false, includeMinutes = false) => {
    let formattedHour: string;
    let period: string;

    if (hour === 0) {
      formattedHour = '12';
      period = 'AM';
    } else if (hour === 12) {
      formattedHour = '12';
      period = 'PM';
    } else if (hour < 12) {
      formattedHour = String(hour);
      period = 'AM';
    } else {
      formattedHour = String(hour - 12);
      period = 'PM';
    }

    if (isLabel) {
      return formattedHour;
    }

    // 분(Minute) 표시 로직 추가
    if (includeMinutes) {
      const minutes = currentTime.getMinutes().toString().padStart(2, '0');
      return `${period} ${formattedHour}:${minutes}`;
    }

    return `${period} ${formattedHour}`;
  };

  // 안전 점수에 따른 설명
  const getScoreDescription = (level: 'safe' | 'warning' | 'danger' | null) => {
    switch (level) {
      case 'safe':
        return '매우 안전';
      case 'warning':
        return '주의 필요';
      case 'danger':
        return '즉각 조치';
      default:
        return '데이터 없음';
    }
  };

  return (
    // relative 포지셔닝을 통해 CustomTooltip이 SVG 기준으로 절대 위치하도록 설정
    <div className="flex flex-col items-center justify-center flex-1 py-4 relative">
      <svg width={svgWidth} height={svgWidth} viewBox="0 0 320 320" className="relative max-w-full">
        <defs>
          {/* 네온 글로우 필터 */}
          <filter id="neon-glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="2" result="blur5" />
            <feOffset in="blur5" dx="0" dy="0" result="offsetBlur" />
            <feFlood floodColor="white" floodOpacity="0.4" result="flood" />
            <feComposite in="flood" in2="offsetBlur" operator="in" result="glow" />
            <feMerge>
              <feMergeNode in="glow" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* 1. Outer Clock Ring (12개의 시계 위치에 단일 점을 배치) */}
        {hourMapData.map((dataPair, index) => {
          const amData = dataPair.am;
          const pmData = dataPair.pm;

          // 12개의 시계 위치 (index 0=12시, index 1=1시, ..., index 11=11시)
          const angle = index * 30 - 90; // -90도부터 시작하여 12시 방향을 위로 맞춤
          const radian = (angle * Math.PI) / 180;

          // 각 직사각형의 중심 위치
          const xCenter = cx + radius * Math.cos(radian);
          const yCenter = cy + radius * Math.sin(radian);

          // 점의 기본 크기 및 호버 상태
          const baseWidth = 20;
          const baseHeight = 4;
          const hoveredWidth = 28;
          const hoveredHeight = 6;

          // 호버 상태 체크 (툴팁 데이터의 시간과 일치하는지 확인)
          const isAmHovered = tooltip.data?.hour === amData.hour;
          const isPmHovered = tooltip.data?.hour === pmData?.hour;

          // 현재 로컬 시간 강조 상태
          const isCurrentAm = amData.hour === activeHour;
          const isCurrentPm = pmData && pmData.hour === activeHour;

          // 최종 크기 결정 (호버 또는 현재 시간이면 확대)
          const currentAmWidth = isAmHovered || isCurrentAm ? hoveredWidth : baseWidth;
          const currentAmHeight = isAmHovered || isCurrentAm ? hoveredHeight : baseHeight;
          const currentPmWidth = isPmHovered || isCurrentPm ? hoveredWidth : baseWidth;
          const currentPmHeight = isPmHovered || isCurrentPm ? hoveredHeight : baseHeight;


          // 라벨 표시 여부 (0, 3, 6, 9 시 위치에만)
          const isLabelHour = index % 3 === 0;

          // 라벨 위치 조정
          const labelRadius = radius - 30;
          const x_label = cx + labelRadius * Math.cos(radian);
          const y_label = cy + labelRadius * Math.sin(radian) + 4;

          return (
            <motion.g
              key={index}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: index * 0.05, duration: 0.3 }}
            >
              {/* AM 데이터 기반의 길쭉한 직사각형 점 */}
              <motion.rect
                // x, y 좌표는 중앙 및 크기에 따라 애니메이션 됨
                width={currentAmWidth}
                height={currentAmHeight}
                rx={currentAmHeight / 2}
                fill={amData.color}
                filter={(amData.safetyLevel === 'warning' || amData.safetyLevel === 'danger') ? 'url(#neon-glow)' : undefined}
                className="cursor-pointer"
                style={{ transformOrigin: `${xCenter}px ${yCenter}px` }}
                animate={{
                  rotate: angle, // 각도에 따라 회전
                  width: currentAmWidth,
                  height: currentAmHeight,
                  x: xCenter - currentAmWidth / 2,
                  y: yCenter - currentAmHeight / 2,
                }}
                transition={{ duration: 0.2 }}
                onMouseEnter={(e) => handleMouseEnter(e, amData, index, 'am')}
                onMouseLeave={handleMouseLeave}
              />

              {/* PM 데이터 기반의 길쭉한 직사각형 점 */}
              {pmData && (
                <motion.rect
                  // x, y 좌표는 중앙 및 크기에 따라 애니메이션 됨
                  width={currentPmWidth}
                  height={currentPmHeight}
                  rx={currentPmHeight / 2}
                  fill={pmData.color}
                  filter={(pmData.safetyLevel === 'warning' || pmData.safetyLevel === 'danger') ? 'url(#neon-glow)' : undefined}
                  className="cursor-pointer"
                  style={{ transformOrigin: `${xCenter}px ${yCenter}px` }}
                  animate={{
                    rotate: angle,
                    width: currentPmWidth,
                    height: currentPmHeight,
                    x: xCenter - currentPmWidth / 2,
                    y: yCenter - currentPmHeight / 2,
                  }}
                  transition={{ duration: 0.2 }}
                  onMouseEnter={(e) => handleMouseEnter(e, pmData, index, 'pm')}
                  onMouseLeave={handleMouseLeave}
                />
              )}

              {/* 3시간 단위 라벨 (12, 3, 6, 9 시만 표시) */}
              {isLabelHour && (
                <text
                  x={x_label}
                  y={y_label}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  className="text-xs font-bold"
                  fill="#9ca3af"
                >
                  {formatClockHour(amData.hour, true)}
                </text>
              )}
            </motion.g>
          );
        })}

        {/* 2. 중앙 정보 디스플레이 (스마트 워치 스타일) */}
        <motion.circle
          cx={cx}
          cy={cy}
          r={centerRadius}
          fill="#064e3b" // 🟢 Emerald-900 (어두운 녹색 배경)
          className="shadow-xl"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5, duration: 0.5 }}
        />

        {/* 중앙 하이라이트/링 (선택된 시간의 테마색상 반영) */}
        <motion.circle
          cx={cx}
          cy={cy}
          r={centerRadius * 0.9}
          fill="none"
          stroke={activeData?.color || '#374151'}
          strokeWidth="3"
          strokeDasharray="40 10"
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 20, ease: "linear" }}
        />

        {activeData && (
          <>
            {/* 시간 라벨 (AM/PM 포함 + 분 표시) */}
            <motion.text
              x={cx}
              y={cy - centerRadius * 0.4}
              textAnchor="middle"
              className="text-lg font-bold"
              fill={activeData.color}
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.8 }}
            >
              {formatClockHour(activeData.hour, false, true)}
            </motion.text>

            {/* 안전 점수 (텍스트 크기 text-5xl) */}
            <motion.text
              x={cx}
              y={cy + 10}
              textAnchor="middle"
              className="text-5xl font-extrabold"
              fill={activeData.color}
              filter="url(#neon-glow)"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.9, type: 'spring', stiffness: 200 }}
            >
              {activeData.safetyScore}
            </motion.text>

            {/* 안전 상태 설명 (수정 반영됨: 간격 조정 및 글자색 통일) */}
            <motion.text
              x={cx}
              y={cy + centerRadius * 0.35 + 20} // Y좌표 조정
              textAnchor="middle"
              className="text-sm font-medium"
              fill={activeData.color} // 색상 통일
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1.0 }}
            >
              {getScoreDescription(activeData.safetyLevel)}
            </motion.text>
          </>
        )}
      </svg>

      {/* 커스텀 툴팁 렌더링 (SVG 위에 HTML로 띄움) */}
      <CustomTooltip tooltip={tooltip} svgOffset={{ top: 0, left: 0 }} />
    </div>
  );
};

// ===== SafetyReport 컴포넌트 (최종 수정 적용) =====

export default function SafetyReport() {
  const [periodType, setPeriodType] = useState<'week' | 'month'>('week');
  const [date] = useState<Date>(new Date());

  // 안전/안심 테마 팔레트 정의
  const COLOR_PALETTE = {
    PRIMARY: '#059669',
    PRIMARY_LIGHT: '#10b981',
    PRIMARY_DARK: '#047857',
    HEADER_GRADIENT: 'from-emerald-500 via-green-600 to-green-700',
    SUMMARY_BG_GRADIENT: 'from-emerald-50 via-green-50 to-teal-50',
    LINE_STROKE: '#059669',
    HOUR_LINE_INACTIVE: '#e5e7eb',
  };

  // 주간 안전도 추이 데이터 (더미 데이터)
  const weeklySafetyData = [
    { date: '월', 안전도: 90 },
    { date: '화', 안전도: 92 },
    { date: '수', 안전도: 88 },
    { date: '목', 안전도: 91 },
    { date: '금', 안전도: 93 },
    { date: '토', 안전도: 89 },
    { date: '일', 안전도: 92 },
  ];

  // 월간 안전도 추이 데이터 (더미 데이터)
  const monthlySafetyData = [
    { date: '1주', 안전도: 88 },
    { date: '2주', 안전도: 90 },
    { date: '3주', 안전도: 91 },
    { date: '4주', 안전도: 92 },
  ];

  const currentData = periodType === 'week' ? weeklySafetyData : monthlySafetyData;

  // 24시간 시계 데이터 (안전 레벨 및 사건 더미 데이터 포함)
  const clockData: ClockData[] = Array.from({ length: 24 }, (_, hour) => {
    let safetyLevel: 'safe' | 'warning' | 'danger' | null = null;
    let safetyScore = 95;
    let incident = '안정적인 상태 유지';

    const currentLocalHour = new Date().getHours();

    // 더미 데이터 로직
    if (hour === currentLocalHour) {
      safetyLevel = 'warning';
      safetyScore = 70;
      incident = '현재 시간: 놀이 중 갑작스러운 방향 전환, 낙상 주의!';
    } else if (hour === 11) {
      safetyLevel = 'warning';
      safetyScore = 75;
      incident = 'AM 11시: 소파에서 뛰어내리려 시도, 보호자 시선 필요';
    } else if (hour === 13) {
      safetyLevel = 'warning';
      safetyScore = 80;
      incident = 'PM 1시: 주방 쪽에 3회 접근 감지됨';
    } else if (hour >= 0 && hour < 6) {
      safetyLevel = 'safe';
      safetyScore = 98;
      incident = '새벽 시간: 안정적인 수면 및 휴식 중';
    } else if (hour >= 20 && hour < 24) {
      safetyLevel = 'safe';
      safetyScore = 95;
      incident = '저녁 시간: 취침 전 조용한 활동';
    } else if (hour >= 6 && hour < 20) {
      safetyLevel = 'safe';
      safetyScore = 90;
      incident = '낮 시간: 활동량이 많음, 큰 위험 감지 없음';
    }

    const color = getSeverityColor(safetyLevel);

    return {
      hour,
      safetyLevel,
      safetyScore,
      color,
      incident,
    };
  });

  // 안전사고 유형 데이터
  const incidentTypeData = [
    { name: '낙상', value: 35, color: '#f87171', count: 2 },
    { name: '충돌/부딛힘', value: 25, color: '#facc15', count: 1 },
    { name: '끼임', value: 15, color: '#10b981', count: 0 },
    { name: '전도(가구 넘어짐)', value: 10, color: '#059669', count: 0 },
    { name: '감전', value: 10, color: '#047857', count: 0 },
    { name: '질식', value: 5, color: '#065f46', count: 0 },
  ];

  // 안전 체크리스트
  const safetyChecklist = [
    {
      title: '모서리 가드 설치',
      icon: 'Shield',
      description: '아이가 가구를 잡고 서기 시작했습니다. 뾰족한 모서리에 가드를 설치해주세요.',
      priority: 'high',
      gradient: 'from-red-50 to-pink-50',
      checked: false,
    },
    {
      title: '전기 콘센트 안전 장치',
      icon: 'Zap',
      description: '전기 콘센트에 안전 장치가 설치돼있는지 확인해주세요.',
      priority: 'high',
      gradient: 'from-amber-50 to-orange-50',
      checked: true,
    },
    {
      title: '침대 낙상 방지',
      icon: 'Bed',
      description: '침대 가장자리 안전 패드가 제대로 고정되어 있는지 확인하세요.',
      priority: 'medium',
      gradient: 'from-emerald-50 to-green-50',
      checked: false,
    },
    {
      title: '작은 물건 정리',
      icon: 'Blocks',
      description: '아이가 삼킬 수 있는 작은 물건들을 손이 닿지 않는 곳에 보관하세요.',
      priority: 'medium',
      gradient: 'from-green-50 to-teal-50',
      checked: true,
    },
  ];

  const currentSafetyScore = 92;

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
    <div className="p-8">
      {/* Header (DevelopmentReport Style 적용) */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="mb-8 flex items-center justify-between"
      >
        <div>
          <div className="flex items-center gap-3 mb-2">
            <Shield className="w-8 h-8 text-emerald-600" />
            <h1
              className={`bg-gradient-to-r ${COLOR_PALETTE.HEADER_GRADIENT} bg-clip-text text-transparent text-3xl font-bold`}
            >
              아이 안전 리포트
            </h1>
          </div>
          <p className="text-gray-600">AI 분석 기반 영유아 안전 현황을 확인하세요</p>
        </div>
        <div className="flex items-center gap-3">
          <button className="btn-secondary flex items-center gap-2 border-emerald-200 hover:border-emerald-300 hover:bg-emerald-50">
            <CalendarIcon className="w-4 h-4" />
            {date.toLocaleDateString('ko-KR')}
          </button>
          <button className="btn-primary flex items-center gap-2 shadow-md bg-emerald-500 hover:bg-emerald-600">
            <Download className="w-4 h-4" />
            리포트 다운로드
          </button>
        </div>
      </motion.div>

      {/* AI Summary & Score Card Section (DevelopmentReport 비율 적용) */}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        {/* 1. AI Summary (2/3 크기) */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="lg:col-span-2"
        >
          <div
            className={`card p-8 bg-gradient-to-br ${COLOR_PALETTE.SUMMARY_BG_GRADIENT} border-0 shadow-xl relative overflow-hidden h-full flex flex-col`}
          >
            <div className="flex-grow relative">
              <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-emerald-200/30 to-green-200/30 rounded-full blur-3xl" />
              <div className="absolute bottom-0 left-0 w-64 h-64 bg-gradient-to-tr from-teal-200/30 to-emerald-200/30 rounded-full blur-3xl" />

              <div className="relative">
                <div className="flex items-center gap-2 mb-4">
                  <Sparkles className="w-6 h-6 text-emerald-600" />
                  <h2 className="text-gray-900 text-xl font-semibold">오늘의 안전 요약</h2>
                </div>
                <div className="space-y-3 text-sm text-gray-700 leading-relaxed mb-6">
                  <p className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center flex-shrink-0">
                      <Shield className="w-5 h-5 text-emerald-600" />
                    </div>
                    <span>
                      오늘 아이의 안전 상태는{' '}
                      <span className="text-emerald-600 font-semibold">매우 양호</span>합니다. 총 72건의
                      움직임이 관찰되었으며, 위험 감지 경보가 0건으로 유지되었습니다.
                    </span>
                  </p>
                  <p className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-lg bg-yellow-100 flex items-center justify-center flex-shrink-0">
                      <Eye className="w-5 h-5 text-yellow-600" />
                    </div>
                    <span>
                      오후 1시경{' '}
                      <span className="text-orange-600 font-semibold">침대 가장자리 접근 주의 알림</span>
                      이 2회 감지되었으나, 아이가 즉시 안전 영역으로 복귀했습니다.
                    </span>
                  </p>
                  <p className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-lg bg-teal-100 flex items-center justify-center flex-shrink-0">
                      <Clock className="w-5 h-5 text-teal-600" />
                    </div>
                    <span>
                      평균 수면 시간인{' '}
                      <span className="text-emerald-600 font-semibold">10시간 30분</span> 동안 움직임이
                      적어 안정적인 수면 환경이 유지되었습니다.
                    </span>
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-4 border border-emerald-100 mt-auto">
              <div className="flex items-center gap-2 mb-2">
                <Lightbulb className="w-4 h-4 text-emerald-600" />
                <p className="text-xs text-emerald-600 font-semibold">AI 안전 인사이트</p>
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
                <p className="flex items-start gap-1">
                  <span>•</span>
                  <span>추천: 침대 주변의 충격을 흡수할 수 있는 매트를 보강해주세요.</span>
                </p>
                <p className="flex items-start gap-1">
                  <span>•</span>
                  <span>전기 콘센트 안전 장치를 정기적으로 점검하는 습관이 필요합니다.</span>
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
          <div className="card p-6 bg-gradient-to-br from-emerald-100 to-green-100 border-0 shadow-xl h-full">
            <div className="text-center h-full flex flex-col justify-center">
              <motion.div
                initial={{ scale: 0.8 }}
                animate={{ scale: 1 }}
                transition={{ duration: 0.8, delay: 0.4 }}
              >
                <div className="bg-gradient-to-br from-emerald-500 to-green-600 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
                  <Shield className="w-10 h-10 text-white" />
                </div>
              </motion.div>
              <p className="text-sm text-gray-600 mb-2">오늘의 종합 안전 점수</p>
              <p className="text-emerald-600 mb-4 text-4xl font-bold">{currentSafetyScore}점</p>

              <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-4 shadow-sm">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <Award className="w-5 h-5 text-green-600" />
                  <p className="text-sm text-gray-700 font-medium">안전 상태</p>
                </div>
                <p className="text-base text-gray-800 leading-relaxed">
                  <span className="text-emerald-600 font-semibold">매우 우수</span>합니다.
                  <br />
                  위험 예측률 <span className="text-emerald-600 font-semibold">1% 미만</span>
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
          <div className="card p-8 border-0 shadow-lg h-full flex flex-col min-h-[600px] bg-white">
            <div className="flex items-center justify-between mb-6 h-8">
              <h3 className="flex items-center gap-2 text-lg font-semibold">
                <div className="w-1 h-6 bg-gradient-to-b from-emerald-400 to-emerald-600 rounded-full" />
                24시간 안전 현황
              </h3>
              <Clock className="w-5 h-5 text-emerald-500" />
            </div>

            {/* 변경된 시계 컴포넌트 삽입 */}
            <SafetyMinimalClockChart fullClockData={clockData} />

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

        {/* 안전사고 유형 원그래프 (기존 유지) */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
        >
          <div className="card p-8 h-full border-0 shadow-lg bg-white flex flex-col min-h-[600px]">
            <h3 className="mb-6 flex items-center gap-2 text-lg font-semibold h-8">
              <div className="w-1 h-6 bg-gradient-to-b from-emerald-400 to-emerald-600 rounded-full" />
              안전사고 유형
            </h3>

            <div className="flex items-center justify-center flex-1 min-h-0 py-4">
              <ResponsiveContainer width="100%" height={320}>
                <PieChart>
                  <Pie
                    data={incidentTypeData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    outerRadius={130}
                    fill="#8884d8"
                    dataKey="value"
                    label={({ percent }) => `${(percent * 100).toFixed(0)}%`}
                  >
                    {incidentTypeData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'white',
                      border: 'none',
                      borderRadius: '12px',
                      boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                    }}
                  />
                  {/* Legend 컴포넌트는 수동 범례를 위해 제거되었습니다. */}
                </PieChart>
              </ResponsiveContainer>
            </div>

            {/* 수동으로 구현된 범례 (Legend) */}
            <div className="flex flex-wrap items-center justify-center gap-3 mt-4">
              {incidentTypeData.map((item, index) => (
                <motion.div
                  key={item.name}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.5 + index * 0.05 }}
                  className="flex items-center gap-1.5 text-xs"
                >
                  <div
                    className="w-3 h-3 rounded-full shadow-sm flex-shrink-0"
                    style={{ backgroundColor: item.color }}
                  />
                  <span className="text-gray-700">
                    {item.name} ({item.count}건)
                  </span>
                </motion.div>
              ))}
            </div>
          </div>
        </motion.div>
      </div>

      {/* 안전 체크리스트 (수정 적용) */}

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.5 }}
        className="mb-8"
      >
        <div className="card p-6 border-0 shadow-lg">
          <div className="flex items-center gap-2 mb-6">
            <CheckSquare className="w-6 h-6 text-emerald-500" />
            <h3 className="text-lg font-semibold">오늘의 안전 체크리스트</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {safetyChecklist.map((item, index) => {
              const IconComponent = getIconComponent(item.icon);

              const iconColor =
                item.icon === 'Shield'
                  ? 'text-red-600'
                  : item.icon === 'Zap'
                    ? 'text-orange-600'
                    : item.icon === 'Bed'
                      ? 'text-green-600'
                      : 'text-teal-600';

              const priorityBadge =
                item.priority === 'high' ? 'bg-red-200 text-red-800' : 'bg-green-200 text-green-800';

             return (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.6 + index * 0.1 }}
                  className={`p-5 bg-gradient-to-br ${item.gradient} rounded-2xl border-0 shadow-md hover:shadow-lg transition-all hover:-translate-y-1 relative overflow-hidden`}
                >
                  {/* 🚨 하이라이트/경고 애니메이션 (회전/Y축 이동 제거) */}
                  {item.priority === 'high' && (
                    <motion.div
                      className="absolute top-2 left-2 z-10"
                      animate={{
                        scale: [1, 1.2, 1], // 크기 변화 (유지)
                        opacity: [0.8, 1, 0.8], // 불투명도 변화 (유지)
                        filter: [ // 그림자 효과 (유지)
                          'drop-shadow(0 0px 0px rgba(255,0,0,0))',
                          'drop-shadow(0 5px 8px rgba(255,0,0,0.5))',
                          'drop-shadow(0 0px 0px rgba(255,0,0,0))',
                        ],
                      }}
                      transition={{
                        duration: 1.5,
                        repeat: Infinity,
                        ease: "easeInOut",
                      }}
                    >
                      <AlertTriangle className="w-6 h-6 text-red-600 fill-transparent" />
                    </motion.div>
                  )}

                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-xl bg-white/60 backdrop-blur-sm flex items-center justify-center shadow-sm flex-shrink-0">
                      <IconComponent className={`w-6 h-6 ${iconColor}`} />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="text-gray-800 font-semibold">{item.title}</h4>
                        <div
                          className={`w-5 h-5 rounded-md border-2 flex items-center justify-center ${item.checked
                            ? 'bg-emerald-500 border-emerald-500'
                            : 'border-gray-300 bg-white'
                            }`}
                        >
                          {item.checked && <CheckCircle className="w-3 h-3 text-white" />}
                        </div>
                      </div>
                      <p className="text-sm text-gray-600 mb-3">{item.description}</p>
                      <span
                        className={`text-xs px-3 py-1 rounded-full shadow-sm ${priorityBadge}`}
                      >
                        {item.priority === 'high' ? '높은 우선순위' : '중간 우선순위'}
                      </span>
                    </div>
                  </div>
                </motion.div>
              );
            })}

          </div>
        </div>
      </motion.div>

      {/* 안전도 추이 (기존 템플릿 유지) */}

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.6 }}
        className="mb-8"
      >
        <div className="card p-6 border-0 shadow-lg">
          <div className="flex items-center justify-between mb-4">
            <h3 className="flex items-center gap-2 text-lg font-semibold">
              <div className="w-1 h-6 bg-gradient-to-b from-emerald-400 to-emerald-600 rounded-full" />
              안전도 추이
            </h3>
            <div className="flex gap-2">
              <button
                onClick={() => setPeriodType('week')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${periodType === 'week'
                  ? 'bg-emerald-500 text-white hover:bg-emerald-600'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
              >
                주간
              </button>
              <button
                onClick={() => setPeriodType('month')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${periodType === 'month'
                  ? 'bg-emerald-500 text-white hover:bg-emerald-600'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
              >
                월간
              </button>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={currentData}>
              <defs>
                <linearGradient id="safetyGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={COLOR_PALETTE.LINE_STROKE} stopOpacity={0.4} />
                  <stop offset="95%" stopColor={COLOR_PALETTE.LINE_STROKE} stopOpacity={0.05} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="date" stroke="#9ca3af" style={{ fontSize: '12px' }} />
              <YAxis domain={[0, 100]} stroke="#9ca3af" style={{ fontSize: '12px' }} />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'white',
                  border: 'none',
                  borderRadius: '12px',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                }}
              />
              <Legend />
              <Line
                type="monotone"
                dataKey="안전도"
                stroke={COLOR_PALETTE.LINE_STROKE}
                strokeWidth={3}
                dot={{ fill: COLOR_PALETTE.LINE_STROKE, strokeWidth: 2, r: 5, stroke: '#fff' }}
                activeDot={{ r: 7 }}
                fill="url(#safetyGradient)"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </motion.div>
    </div>
  );
}
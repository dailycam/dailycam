import React from 'react';

interface Event {
  time: string;
  type: string;
  title: string;
  description: string;
  startTime?: string;
  endTime?: string;
  color?: string;
  severity?: string;
}

interface ActivityClockProps {
  events: Event[];
  currentScore?: number;
  developmentScore?: number;
  safetyScore?: number;
}

export const ActivityClock: React.FC<ActivityClockProps> = ({
  events,
  currentScore = 89,
  developmentScore = 70,
  safetyScore = 95
}) => {
  // SVG 설정
  const size = 340;
  const center = size / 2;
  const radius = {
    outer: 155,  // 타임라인 (활동)
    middle: 120, // 안전
    inner: 85    // 발달
  };
  const strokeWidth = 22;

  // 시간(HH:MM)을 각도(0~360)로 변환하는 함수
  const timeToDegree = (timeStr: string): number => {
    const [h, m] = timeStr.split(':').map(Number);
    const totalMinutes = h * 60 + m;
    return (totalMinutes / 1440) * 360; // 24시간 = 1440분
  };

  // 도넛 조각(Arc) 경로 생성 함수
  const createArc = (startAngle: number, endAngle: number, r: number): string => {
    const startRad = (startAngle - 90) * Math.PI / 180;
    const endRad = (endAngle - 90) * Math.PI / 180;
    
    const x1 = center + r * Math.cos(startRad);
    const y1 = center + r * Math.sin(startRad);
    const x2 = center + r * Math.cos(endRad);
    const y2 = center + r * Math.sin(endRad);

    const largeArc = endAngle - startAngle <= 180 ? 0 : 1;

    return `M ${center} ${center} L ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2} Z`;
  };

  // 현재 시간 계산
  const now = new Date();
  const currentHour = now.getHours();
  const currentMinute = now.getMinutes();
  const currentDegree = timeToDegree(`${currentHour.toString().padStart(2, '0')}:${currentMinute.toString().padStart(2, '0')}`);

  // 시계 바늘 위치 계산
  const needleRad = (currentDegree - 90) * Math.PI / 180;
  const needleX = center + (radius.inner - 20) * Math.cos(needleRad);
  const needleY = center + (radius.inner - 20) * Math.sin(needleRad);

  // 발달 점수를 원호로 변환 (0-100% -> 0-360도)
  const devScoreAngle = (developmentScore / 100) * 360;
  
  // 안전 위험 시간대 필터링
  const safetyEvents = events.filter(e => e.type === 'safety');
  
  // 타임라인 이벤트 (기간이 있는 이벤트)
  const timelineEvents = events.filter(e => e.startTime && e.endTime);

  return (
    <div className="relative flex items-center justify-center">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="transform -rotate-0">
        {/* 배경 원들 */}
        <circle cx={center} cy={center} r={radius.outer} fill="none" stroke="#f3f4f6" strokeWidth={strokeWidth} />
        <circle cx={center} cy={center} r={radius.middle} fill="none" stroke="#f3f4f6" strokeWidth={strokeWidth} />
        <circle cx={center} cy={center} r={radius.inner} fill="none" stroke="#f3f4f6" strokeWidth={strokeWidth} />

        {/* 시간 마커 (3시간 간격) */}
        {[0, 3, 6, 9, 12, 15, 18, 21].map((hour) => {
          const angle = (hour / 24) * 360;
          const rad = (angle - 90) * Math.PI / 180;
          const x = center + (radius.outer + 30) * Math.cos(rad);
          const y = center + (radius.outer + 30) * Math.sin(rad);
          return (
            <text
              key={hour}
              x={x}
              y={y}
              textAnchor="middle"
              dominantBaseline="middle"
              className="text-xs font-medium fill-gray-400"
            >
              {hour}
            </text>
          );
        })}

        {/* --- Layer 3: 타임라인 (Activity) - 가장 바깥 --- */}
        {timelineEvents.map((ev, i) => {
          if (!ev.startTime || !ev.endTime) return null;
          const start = timeToDegree(ev.startTime);
          const end = timeToDegree(ev.endTime);
          
          // 색상 결정
          let eventColor = ev.color || '#a5b4fc';
          if (ev.type === 'sleep') eventColor = '#ddd6fe';
          if (ev.type === 'activity') eventColor = '#fcd34d';
          
          return (
            <path
              key={`outer-${i}`}
              d={createArc(start, end, radius.outer)}
              fill={eventColor}
              className="opacity-80 hover:opacity-100 transition-opacity cursor-pointer"
              strokeWidth={2}
              stroke="white"
            />
          );
        })}

        {/* --- Layer 2: 안전 (Safety) - 중간 --- */}
        {/* 안전 베이스 링 (초록색) */}
        <circle 
          cx={center} 
          cy={center} 
          r={radius.middle} 
          fill="none" 
          stroke="#22c55e" 
          strokeWidth={strokeWidth} 
          strokeOpacity={0.2}
        />
        
        {/* 위험했던 순간만 빨간색/주황색 점으로 표시 */}
        {safetyEvents.map((ev, i) => {
          const deg = timeToDegree(ev.time);
          const rad = (deg - 90) * Math.PI / 180;
          const x = center + radius.middle * Math.cos(rad);
          const y = center + radius.middle * Math.sin(rad);
          return (
            <g key={`middle-${i}`}>
              {/* 펄스 효과를 위한 큰 원 */}
              <circle 
                cx={x} 
                cy={y} 
                r={10} 
                fill={ev.severity === 'danger' ? '#ef4444' : '#fbbf24'} 
                opacity={0.2}
                className="animate-ping"
              />
              {/* 실제 점 */}
              <circle 
                cx={x} 
                cy={y} 
                r={6} 
                fill={ev.severity === 'danger' ? '#ef4444' : '#fbbf24'} 
                className="shadow-lg"
              />
            </g>
          );
        })}

        {/* --- Layer 1: 발달 (Development) - 가장 안쪽 --- */}
        {/* 배경 */}
        <circle 
          cx={center} 
          cy={center} 
          r={radius.inner} 
          fill="none" 
          stroke="#e0e7ff" 
          strokeWidth={strokeWidth}
        />
        
        {/* 발달 점수 게이지 */}
        <circle 
          cx={center} 
          cy={center} 
          r={radius.inner} 
          fill="none" 
          stroke="url(#devGradient)" 
          strokeWidth={strokeWidth} 
          strokeDasharray={`${2 * Math.PI * radius.inner * (developmentScore / 100)} ${2 * Math.PI * radius.inner}`} 
          strokeLinecap="round"
          transform={`rotate(-90 ${center} ${center})`}
          className="transition-all duration-1000"
        />

        {/* 그라데이션 정의 */}
        <defs>
          <linearGradient id="devGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.8} />
            <stop offset="100%" stopColor="#60a5fa" stopOpacity={1} />
          </linearGradient>
        </defs>

        {/* 시계 바늘 (현재 시간) */}
        <line
          x1={center}
          y1={center}
          x2={needleX}
          y2={needleY}
          stroke="#1f2937"
          stroke-width="3"
          strokeLinecap="round"
        />
        <circle cx={center} cy={center} r={5} fill="#1f2937" />
      </svg>
      
      {/* 중앙 텍스트 */}
      <div className="absolute flex flex-col items-center pointer-events-none">
        <span className="text-xs text-gray-400 font-medium">종합 점수</span>
        <span className="text-4xl font-bold bg-gradient-to-br from-gray-700 to-gray-900 bg-clip-text text-transparent">
          {currentScore}
        </span>
        <span className="text-xs text-gray-400 mt-0.5">
          {currentHour.toString().padStart(2, '0')}:{currentMinute.toString().padStart(2, '0')}
        </span>
      </div>
    </div>
  );
};

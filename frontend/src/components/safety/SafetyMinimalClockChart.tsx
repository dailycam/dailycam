import { useState, useMemo, useEffect, useCallback } from 'react';
import { motion } from 'motion/react';
import { ClockData } from '../../types/safety';

interface TooltipState {
    visible: boolean;
    x: number;
    y: number;
    data: ClockData | null;
}

// 커스텀 툴팁 컴포넌트
const CustomTooltip = ({ tooltip }: { tooltip: TooltipState, svgOffset: { top: number, left: number } }) => {
    if (!tooltip.visible || !tooltip.data) return null;

    const finalX = tooltip.x;
    const finalY = tooltip.y;

    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={{ duration: 0.2, type: 'spring', stiffness: 200 }}
            style={{
                position: 'absolute',
                top: finalY,
                left: finalX,
                transform: 'translate(-50%, -110%)',
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

const getSeverityColor = (severity: string | null) => {
    switch (severity) {
        case 'safe':
            return '#34d399';
        case 'warning':
            return '#facc15';
        case 'danger':
            return '#f87171';
        default:
            return '#e5e7eb';
    }
};

export const SafetyMinimalClockChart = ({ fullClockData, overallScore }: { fullClockData: ClockData[], overallScore: number }) => {
    const cx = 160;
    const cy = 160;
    const radius = 140;
    const centerRadius = 80;
    const svgWidth = 320;

    const [tooltip, setTooltip] = useState<TooltipState>({
        visible: false,
        x: 0,
        y: 0,
        data: null,
    });

    const [currentTime, setCurrentTime] = useState(new Date());
    const currentLocalHour = currentTime.getHours();
    const activeHour = currentLocalHour;

    useEffect(() => {
        const updateTime = () => {
            setCurrentTime(new Date());
        };

        const intervalId = setInterval(updateTime, 1000);
        return () => clearInterval(intervalId);
    }, []);

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

    const handleMouseEnter = useCallback((event: React.MouseEvent<SVGElement>, data: ClockData, index: number, type: 'am' | 'pm') => {
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

        if (includeMinutes) {
            const minutes = currentTime.getMinutes().toString().padStart(2, '0');
            return `${period} ${formattedHour}:${minutes}`;
        }

        return `${period} ${formattedHour}`;
    };

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

    const overallColor = overallScore >= 90 ? '#10b981' : overallScore >= 70 ? '#f59e0b' : '#ef4444';
    const overallLevel = overallScore >= 90 ? 'safe' : overallScore >= 70 ? 'warning' : 'danger';

    return (
        <div className="flex flex-col items-center justify-center flex-1 py-4 relative">
            <svg width={svgWidth} height={svgWidth} viewBox="0 0 320 320" className="relative max-w-full">
                <defs>
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

                {hourMapData.map((dataPair, index) => {
                    const amData = dataPair.am;
                    const pmData = dataPair.pm;

                    const angle = index * 30 - 90;
                    const radian = (angle * Math.PI) / 180;

                    const xCenter = cx + radius * Math.cos(radian);
                    const yCenter = cy + radius * Math.sin(radian);

                    const baseWidth = 20;
                    const baseHeight = 4;
                    const hoveredWidth = 28;
                    const hoveredHeight = 6;

                    const isAmHovered = tooltip.data?.hour === amData.hour;
                    const isPmHovered = tooltip.data?.hour === pmData?.hour;

                    const isCurrentAm = amData.hour === activeHour;
                    const isCurrentPm = pmData && pmData.hour === activeHour;

                    const currentAmWidth = isAmHovered || isCurrentAm ? hoveredWidth : baseWidth;
                    const currentAmHeight = isAmHovered || isCurrentAm ? hoveredHeight : baseHeight;
                    const currentPmWidth = isPmHovered || isCurrentPm ? hoveredWidth : baseWidth;
                    const currentPmHeight = isPmHovered || isCurrentPm ? hoveredHeight : baseHeight;

                    const isLabelHour = index % 3 === 0;

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
                            <motion.rect
                                width={currentAmWidth}
                                height={currentAmHeight}
                                rx={currentAmHeight / 2}
                                fill={amData.color}
                                filter={(amData.safetyLevel === 'warning' || amData.safetyLevel === 'danger') ? 'url(#neon-glow)' : undefined}
                                className="cursor-pointer"
                                style={{ transformOrigin: `${xCenter}px ${yCenter}px` }}
                                animate={{
                                    rotate: angle,
                                    width: currentAmWidth,
                                    height: currentAmHeight,
                                    x: xCenter - currentAmWidth / 2,
                                    y: yCenter - currentAmHeight / 2,
                                }}
                                transition={{ duration: 0.2 }}
                                onMouseEnter={(e) => handleMouseEnter(e, amData, index, 'am')}
                                onMouseLeave={handleMouseLeave}
                            />

                            {pmData && (
                                <motion.rect
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

                <motion.circle
                    cx={cx}
                    cy={cy}
                    r={centerRadius}
                    fill="#064e3b"
                    className="shadow-xl"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.5, duration: 0.5 }}
                />

                <motion.circle
                    cx={cx}
                    cy={cy}
                    r={centerRadius * 0.9}
                    fill="none"
                    stroke={overallColor || '#374151'}
                    strokeWidth="3"
                    strokeDasharray="40 10"
                    animate={{ rotate: 360 }}
                    transition={{ repeat: Infinity, duration: 20, ease: "linear" }}
                />

                <>
                    <motion.text
                        x={cx}
                        y={cy - centerRadius * 0.4}
                        textAnchor="middle"
                        className="text-sm font-bold"
                        fill={overallColor}
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.8 }}
                    >
                        종합 점수
                    </motion.text>

                    <motion.text
                        x={cx}
                        y={cy + 10}
                        textAnchor="middle"
                        className="text-5xl font-extrabold"
                        fill={overallColor}
                        filter="url(#neon-glow)"
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.9, type: 'spring', stiffness: 200 }}
                    >
                        {overallScore}
                    </motion.text>

                    <motion.text
                        x={cx}
                        y={cy + centerRadius * 0.35 + 20}
                        textAnchor="middle"
                        className="text-sm font-medium"
                        fill={overallColor}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 1.0 }}
                    >
                        {getScoreDescription(overallLevel)}
                    </motion.text>
                </>
            </svg>

            <CustomTooltip tooltip={tooltip} svgOffset={{ top: 0, left: 0 }} />
        </div>
    );
};

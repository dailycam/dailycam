import { CheckCircle2, Activity, Shield, AlertTriangle, Clock, Video } from 'lucide-react'
import { VideoAnalysisResult } from '../../../lib/api'

interface AnalysisResultProps {
    analysisResult: VideoAnalysisResult
}

export const AnalysisResult = ({ analysisResult }: AnalysisResultProps) => {
    // 디버깅용: 분석 결과 로깅
    console.log('📊 분석 결과:', analysisResult)

    // 안전도 레벨 배지
    const getSafetyLevelBadge = (level: string) => {
        if (level === '매우높음' || level === '매우안전') return { text: '매우 안전', color: 'bg-green-100 text-green-700' }
        if (level === '높음' || level === '안전') return { text: '안전', color: 'bg-green-100 text-green-700' }
        if (level === '중간') return { text: '주의', color: 'bg-yellow-100 text-yellow-700' }
        if (level === '낮음') return { text: '위험', color: 'bg-red-100 text-red-700' }
        return { text: '매우 위험', color: 'bg-red-100 text-red-700' }
    }

    // 안전 점수 색상
    const getSafetyScoreColor = (score?: number) => {
        if (score === undefined || score === null) return 'text-gray-500'
        if (score >= 90) return 'text-green-600'
        if (score >= 70) return 'text-green-500'
        if (score >= 50) return 'text-yellow-500'
        return 'text-red-600'
    }

    return (
        <div className="h-full space-y-4">
            <div className="flex items-center gap-2 mb-4">
                <CheckCircle2 className="w-5 h-5 text-green-600" />
                <h3 className="text-lg font-semibold text-gray-900">분석 결과</h3>
            </div>

            {/* 분석 결과 상세 */}
            <div className="bg-gray-50 rounded-lg p-4 space-y-4 max-h-[600px] overflow-y-auto">
                {/* 메타 정보 */}
                <div className="bg-white rounded-lg p-3 border border-gray-200">
                    <div className="grid grid-cols-2 gap-2 text-sm mb-2">
                        <div>
                            <span className="text-gray-500">발달 단계: </span>
                            <span className="font-medium">
                                {analysisResult.meta?.assumed_stage || '알 수 없음'}단계
                            </span>
                        </div>
                        {analysisResult.meta?.age_months && (
                            <div>
                                <span className="text-gray-500">개월 수: </span>
                                <span className="font-medium">
                                    {analysisResult.meta?.age_months}개월
                                </span>
                            </div>
                        )}
                    </div>
                    {/* 발달 단계 자동 판단 정보 */}
                    {analysisResult.stage_determination && (
                        <div className="mt-3 pt-3 border-t border-gray-200">
                            <div className="flex items-center gap-2 mb-2">
                                <span className="text-xs font-medium text-blue-600">
                                    자동 판단 정보
                                </span>
                                <span
                                    className={`px-2 py-0.5 rounded text-xs ${analysisResult.stage_determination?.confidence === '높음'
                                        ? 'bg-green-100 text-green-700'
                                        : analysisResult.stage_determination?.confidence === '중간'
                                            ? 'bg-yellow-100 text-yellow-700'
                                            : 'bg-gray-100 text-gray-700'
                                        }`}
                                >
                                    신뢰도: {analysisResult.stage_determination?.confidence || '알 수 없음'}
                                </span>
                            </div>
                            {analysisResult.stage_determination?.evidence &&
                                Array.isArray(analysisResult.stage_determination.evidence) &&
                                analysisResult.stage_determination.evidence.length > 0 && (
                                    <div className="text-xs text-gray-600">
                                        <p className="font-medium mb-1">판단 근거:</p>
                                        <ul className="list-disc list-inside space-y-1">
                                            {analysisResult.stage_determination.evidence
                                                .slice(0, 3)
                                                .map((ev: any, idx: number) => (
                                                    <li key={idx}>
                                                        {typeof ev === 'string' ? ev : (ev.comment || ev.description || JSON.stringify(ev))}
                                                    </li>
                                                ))}
                                        </ul>
                                    </div>
                                )}
                        </div>
                    )}
                </div>

                {/* 발달 분석 요약 */}
                <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg p-4 border border-blue-200">
                    <h4 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
                        <Activity className="w-4 h-4 text-blue-600" />
                        📋 발달 분석 요약
                    </h4>
                    <p className="text-sm text-gray-800 whitespace-pre-wrap font-medium">
                        {analysisResult.development_analysis?.summary ||
                            '분석 요약 정보가 없습니다.'}
                    </p>
                </div>

                {/* 발달 기술 (Skills) - 새로 추가 */}
                {analysisResult.development_analysis?.skills &&
                    Array.isArray(analysisResult.development_analysis.skills) &&
                    analysisResult.development_analysis.skills.length > 0 && (
                        <div className="bg-white rounded-lg p-4 border border-blue-200">
                            <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                                <Activity className="w-4 h-4 text-blue-600" />
                                관찰된 발달 기술
                            </h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                {analysisResult.development_analysis.skills.map((skill: any, idx: number) => (
                                    <div key={idx} className="bg-blue-50 p-2 rounded border-l-4 border-blue-500">
                                        <div className="flex items-center justify-between">
                                            <span className="text-sm font-medium text-blue-900">
                                                {skill.name || '기술'}
                                            </span>
                                            {skill.present && (
                                                <span className="px-2 py-0.5 rounded text-xs bg-green-100 text-green-700">
                                                    관찰됨
                                                </span>
                                            )}
                                        </div>
                                        {skill.category && (
                                            <p className="text-xs text-gray-600 mt-1">카테고리: {skill.category}</p>
                                        )}
                                        {skill.frequency && (
                                            <p className="text-xs text-gray-600">빈도: {skill.frequency}회</p>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                {/* 다음 단계 징후 */}
                {analysisResult.development_analysis?.next_stage_signs &&
                    analysisResult.development_analysis.next_stage_signs.length > 0 && (
                        <div className="bg-white rounded-lg p-4 border border-blue-200">
                            <h4 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
                                <Activity className="w-4 h-4 text-blue-600" />
                                다음 단계 발달 징후
                            </h4>
                            <div className="space-y-2">
                                {analysisResult.development_analysis.next_stage_signs.map(
                                    (sign: any, idx: number) => (
                                        <div
                                            key={idx}
                                            className="bg-blue-50 p-3 rounded border-l-4 border-blue-500"
                                        >
                                            <div className="flex items-center gap-2 mb-1">
                                                <span className="text-sm font-medium text-blue-900">
                                                    {sign.name || '다음 단계 기술'}
                                                </span>
                                                {sign.present && (
                                                    <span className="px-2 py-0.5 rounded text-xs bg-green-100 text-green-700">
                                                        관찰됨
                                                    </span>
                                                )}
                                            </div>
                                            {sign.comment && (
                                                <p className="text-xs text-gray-700">{sign.comment}</p>
                                            )}
                                            {sign.frequency && (
                                                <p className="text-xs text-gray-600 mt-1">
                                                    빈도: {sign.frequency}회
                                                </p>
                                            )}
                                        </div>
                                    )
                                )}
                            </div>
                        </div>
                    )}

                {/* 발달 단계 일치도 */}
                {analysisResult.stage_consistency && (
                    <div className="bg-white rounded-lg p-4 border border-gray-200">
                        <h4 className="font-semibold text-gray-900 mb-2">발달 단계 일치도</h4>
                        <div className="space-y-2">
                            {analysisResult.stage_consistency?.match_level && (
                                <div className="flex items-center gap-2">
                                    <span className="text-sm text-gray-600">일치 수준: </span>
                                    <span
                                        className={`px-2 py-1 rounded text-xs font-medium ${analysisResult.stage_consistency.match_level === '전형적'
                                            ? 'bg-green-100 text-green-700'
                                            : analysisResult.stage_consistency.match_level === '약간빠름' ||
                                                analysisResult.stage_consistency.match_level === '약간느림'
                                                ? 'bg-yellow-100 text-yellow-700'
                                                : 'bg-red-100 text-red-700'
                                            }`}
                                    >
                                        {analysisResult.stage_consistency.match_level}
                                    </span>
                                </div>
                            )}
                            {analysisResult.stage_consistency?.evidence &&
                                Array.isArray(analysisResult.stage_consistency.evidence) &&
                                analysisResult.stage_consistency.evidence.length > 0 && (
                                    <div className="text-sm text-gray-700">
                                        <p className="font-medium mb-1">근거:</p>
                                        <ul className="list-disc list-inside space-y-1">
                                            {analysisResult.stage_consistency.evidence.map(
                                                (ev: any, idx: number) => (
                                                    <li key={idx}>
                                                        {typeof ev === 'string' ? ev : (ev.comment || ev.description || JSON.stringify(ev))}
                                                    </li>
                                                )
                                            )}
                                        </ul>
                                    </div>
                                )}
                        </div>
                    </div>
                )}

                {/* 안전 분석 */}
                {analysisResult.safety_analysis && (
                    <div className="bg-white rounded-lg p-4 border border-gray-200">
                        <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                            <Shield className="w-4 h-4 text-primary-600" />
                            안전 분석
                        </h4>
                        <div className="space-y-3">
                            {/* 안전 점수 및 레벨 표시 */}
                            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-4 border border-blue-200">
                                <div className="flex items-center justify-between gap-4">
                                    {typeof analysisResult.safety_analysis.safety_score === 'number' && (
                                        <div className="flex items-center gap-2">
                                            <Shield className="w-5 h-5 text-primary-600" />
                                            <div>
                                                <span className="text-xs text-gray-600">안전 점수</span>
                                                <div className="flex items-baseline gap-2">
                                                    <span
                                                        className={`text-2xl font-bold ${getSafetyScoreColor(
                                                            analysisResult.safety_analysis.safety_score
                                                        )}`}
                                                    >
                                                        {analysisResult.safety_analysis.safety_score}
                                                    </span>
                                                    <span className="text-sm text-gray-500">/ 100</span>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                    {analysisResult.safety_analysis?.overall_safety_level && (
                                        <div className="flex items-center gap-2">
                                            <div className="text-right">
                                                <span className="text-xs text-gray-600">전체 안전도</span>
                                                <div>
                                                    <span
                                                        className={`px-3 py-1.5 rounded-md text-sm font-semibold ${getSafetyLevelBadge(
                                                            analysisResult.safety_analysis.overall_safety_level
                                                        ).color
                                                            }`}
                                                    >
                                                        {analysisResult.safety_analysis.overall_safety_level}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* 안전 인사이트 - 새로 추가 */}
                            {(analysisResult.safety_analysis as any)?.safety_insights &&
                                Array.isArray((analysisResult.safety_analysis as any).safety_insights) &&
                                (analysisResult.safety_analysis as any).safety_insights.length > 0 && (
                                    <div className="bg-blue-50 rounded-lg p-3 border border-blue-200">
                                        <p className="text-sm font-medium text-blue-900 mb-2">💡 안전 인사이트</p>
                                        <ul className="list-disc list-inside space-y-1 text-sm text-blue-800">
                                            {(analysisResult.safety_analysis as any).safety_insights.map((insight: string, idx: number) => (
                                                <li key={idx}>{insight}</li>
                                            ))}
                                        </ul>
                                    </div>
                                )}

                            {/* 환경 위험 요소 - 새로 추가 */}
                            {analysisResult.safety_analysis?.environment_risks &&
                                Array.isArray(analysisResult.safety_analysis.environment_risks) &&
                                analysisResult.safety_analysis.environment_risks.length > 0 && (
                                    <div className="bg-orange-50 rounded-lg p-3 border border-orange-200">
                                        <p className="text-sm font-medium text-orange-900 mb-2 flex items-center gap-2">
                                            <AlertTriangle className="w-4 h-4" />
                                            환경 위험 요소
                                        </p>
                                        <div className="space-y-2">
                                            {analysisResult.safety_analysis.environment_risks.map((risk: any, idx: number) => (
                                                <div key={idx} className="bg-white p-2 rounded border-l-4 border-orange-500">
                                                    <div className="flex items-center justify-between mb-1">
                                                        <span className="text-sm font-medium text-orange-900">
                                                            {risk.risk_type || '위험 요소'}
                                                        </span>
                                                        <span className={`px-2 py-0.5 rounded text-xs ${risk.severity === '사고' ? 'bg-red-100 text-red-700' :
                                                            risk.severity === '위험' ? 'bg-orange-100 text-orange-700' :
                                                                risk.severity === '주의' ? 'bg-yellow-100 text-yellow-700' :
                                                                    'bg-blue-100 text-blue-700'
                                                            }`}>
                                                            {risk.severity}
                                                        </span>
                                                    </div>
                                                    {risk.comment && (
                                                        <p className="text-xs text-gray-700">{risk.comment}</p>
                                                    )}
                                                    {risk.has_safety_device && risk.safety_device_type && (
                                                        <p className="text-xs text-green-600 mt-1">
                                                            ✓ 안전 장치: {risk.safety_device_type}
                                                        </p>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                            {/* 감점 내역 표시 */}
                            {analysisResult.safety_analysis?.incident_summary &&
                                Array.isArray(analysisResult.safety_analysis.incident_summary) &&
                                analysisResult.safety_analysis.incident_summary.length > 0 && (
                                    <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                                        <p className="text-sm font-medium text-gray-900 mb-2">
                                            감점 내역
                                        </p>
                                        <div className="space-y-2">
                                            {analysisResult.safety_analysis.incident_summary
                                                .filter(
                                                    (item: any) =>
                                                        item.occurrences > 0 || item.applied_deduction < 0
                                                )
                                                .map((item: any, idx: number) => {
                                                    const severityColors: Record<string, string> = {
                                                        사고: 'bg-red-100 text-red-700 border-red-300',
                                                        위험: 'bg-orange-100 text-orange-700 border-orange-300',
                                                        주의: 'bg-yellow-100 text-yellow-700 border-yellow-300',
                                                        권장: 'bg-blue-100 text-blue-700 border-blue-300',
                                                    }
                                                    const severity = item.severity || '기타'

                                                    return (
                                                        <div
                                                            key={idx}
                                                            className={`flex items-center justify-between p-2 rounded border ${severityColors[severity] ||
                                                                'bg-gray-100 text-gray-700 border-gray-300'
                                                                }`}
                                                        >
                                                            <div className="flex items-center gap-2">
                                                                <span className="text-xs font-medium">
                                                                    {severity}
                                                                </span>
                                                                <span className="text-sm font-medium">
                                                                    {item.description}
                                                                </span>
                                                            </div>
                                                            <div className="flex items-center gap-2 text-xs">
                                                                {item.occurrences > 0 && (
                                                                    <span className="bg-white/50 px-1.5 py-0.5 rounded">
                                                                        {item.occurrences}회
                                                                    </span>
                                                                )}
                                                                {item.applied_deduction < 0 && (
                                                                    <span className="font-bold text-red-600">
                                                                        {item.applied_deduction}점
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </div>
                                                    )
                                                })}
                                        </div>
                                    </div>
                                )}
                        </div>
                    </div>
                )}

                {/* 타임라인 이벤트 - 새로 추가 */}
                {analysisResult.timelineEvents &&
                    Array.isArray(analysisResult.timelineEvents) &&
                    analysisResult.timelineEvents.length > 0 && (
                        <div className="bg-white rounded-lg p-4 border border-gray-200">
                            <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                                <Clock className="w-4 h-4 text-gray-600" />
                                타임라인 ({analysisResult.timelineEvents.length}건)
                            </h4>
                            <div className="space-y-2 max-h-60 overflow-y-auto">
                                {analysisResult.timelineEvents.map((event: any, idx: number) => (
                                    <div key={idx} className="flex items-start gap-2 p-2 bg-gray-50 rounded">
                                        <span className="text-xs font-mono text-gray-500 min-w-[60px]">
                                            {event.timestamp}
                                        </span>
                                        <div className="flex-1">
                                            <div className="flex items-center gap-2">
                                                <span className={`px-2 py-0.5 rounded text-xs font-medium ${event.type === 'fall' ? 'bg-red-100 text-red-700' :
                                                    event.type === 'danger' ? 'bg-orange-100 text-orange-700' :
                                                        event.type === 'warning' ? 'bg-yellow-100 text-yellow-700' :
                                                            'bg-green-100 text-green-700'
                                                    }`}>
                                                    {event.type}
                                                </span>
                                                <span className="text-xs text-gray-600">{event.description}</span>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                {/* 하이라이트 클립 - 새로 추가 */}
                {(analysisResult as any).highlight_clips &&
                    Array.isArray((analysisResult as any).highlight_clips) &&
                    (analysisResult as any).highlight_clips.length > 0 && (
                        <div className="bg-white rounded-lg p-4 border border-purple-200">
                            <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                                <Video className="w-4 h-4 text-purple-600" />
                                하이라이트 클립 ({(analysisResult as any).highlight_clips.length}개)
                            </h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                {(analysisResult as any).highlight_clips.map((clip: any, idx: number) => (
                                    <div key={idx} className="bg-purple-50 p-3 rounded border border-purple-200">
                                        <div className="flex items-start justify-between mb-2">
                                            <span className="text-sm font-medium text-purple-900">
                                                {clip.title || `클립 ${idx + 1}`}
                                            </span>
                                            <span className="px-2 py-0.5 rounded text-xs bg-purple-100 text-purple-700">
                                                {clip.category}
                                            </span>
                                        </div>
                                        {clip.description && (
                                            <p className="text-xs text-gray-700 mb-2">{clip.description}</p>
                                        )}
                                        <div className="flex items-center gap-2 text-xs text-gray-600">
                                            {clip.timestamp_range && (
                                                <span className="font-mono">{clip.timestamp_range}</span>
                                            )}
                                            {clip.importance && (
                                                <span className={`px-2 py-0.5 rounded ${clip.importance === '높음' ? 'bg-red-100 text-red-700' :
                                                    clip.importance === '중간' ? 'bg-yellow-100 text-yellow-700' :
                                                        'bg-green-100 text-green-700'
                                                    }`}>
                                                    {clip.importance}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
            </div>
        </div>
    )
}

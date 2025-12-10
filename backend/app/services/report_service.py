from datetime import date, datetime, timedelta
from typing import Optional, List, Dict
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.models.analysis import AnalysisLog, SafetyEvent, DevelopmentEvent
from app.services.gemini_service import GeminiService

class ReportService:
    """리포트 생성 서비스 (Gemini LLM 활용)"""
    
    def __init__(self):
        self.gemini_service = GeminiService()

    async def generate_daily_report(self, db: Session, user_id: int, target_date: date) -> str:
        """
        특정 날짜의 분석 데이터를 기반으로 전문적인 데일리 리포트를 생성합니다.
        
        Args:
            db: DB 세션
            user_id: 사용자 ID
            target_date: 대상 날짜 (년-월-일)
            
        Returns:
            str: 생성된 데일리 리포트 텍스트 (Markdown)
        """
        
        # 1. 해당 날짜의 분석 로그 조회
        start_of_day = datetime.combine(target_date, datetime.min.time())
        end_of_day = datetime.combine(target_date, datetime.max.time())
        
        logs = db.query(AnalysisLog).filter(
            AnalysisLog.user_id == user_id,
            AnalysisLog.created_at >= start_of_day,
            AnalysisLog.created_at <= end_of_day
        ).all()
        
        if not logs:
            return "오늘 분석된 데이터가 없습니다. 영상을 업로드하여 아이의 하루를 기록해보세요!"
            
        # 2. 데이터 집계
        total_logs = len(logs)
        avg_safety = sum(log.safety_score or 0 for log in logs) / total_logs
        avg_dev = sum(log.development_score or 0 for log in logs) / total_logs
        
        # 사건 집계
        log_ids = [log.id for log in logs]
        safety_events = db.query(SafetyEvent).filter(SafetyEvent.analysis_log_id.in_(log_ids)).all()
        dev_events = db.query(DevelopmentEvent).filter(DevelopmentEvent.analysis_log_id.in_(log_ids)).all()
        
        # 안전 이벤트 분류
        danger_events = []
        warning_events = []
        recommendation_events = []
        
        for event in safety_events:
            severity = str(event.severity.value) if hasattr(event.severity, 'value') else str(event.severity)
            event_info = {
                'title': event.title,
                'description': event.description or '',
                'timestamp': event.timestamp_range or ''
            }
            
            if severity in ["위험", "사고", "danger", "accident"]:
                danger_events.append(event_info)
            elif severity in ["주의", "warning"]:
                warning_events.append(event_info)
            else:
                recommendation_events.append(event_info)
        
        # 발달 이벤트 분류
        dev_by_category = {
            '대근육운동': [],
            '소근육운동': [],
            '언어': [],
            '인지': [],
            '사회정서': []
        }
        
        new_milestones = []
        
        for event in dev_events:
            category = event.category.value if hasattr(event.category, 'value') else str(event.category)
            event_info = {
                'title': event.title,
                'description': event.description or '',
                'is_new': any(k in event.title for k in ["최초", "성공", "처음", "새로운"])
            }
            
            if category in dev_by_category:
                dev_by_category[category].append(event_info)
            
            if event_info['is_new']:
                new_milestones.append(event_info)
        
        # 3. 전문적인 LLM 프롬프트 구성
        prompt = f"""
당신은 **영유아 발달 및 안전 전문 분석 시스템**입니다. 
홈캠 영상 분석 데이터를 기반으로 보호자에게 전문적이고 체계적인 **일일 육아 리포트**를 제공합니다.

**[리포트 생성 가이드라인]**
- 모든 결과는 핵심만 간결하게 요약해서 전달해주세요.
- 각 섹션의 내용은 2-3문장으로 요약해주세요.

**[핵심 원칙]**
1. **데이터 기반 분석**: 제공된 실제 데이터만을 활용하며, 추측이나 가정을 배제합니다.
2. **전문성 유지**: 영유아 발달학 및 안전 관리 분야의 전문 용어를 정확히 사용합니다.
3. **객관적 서술**: "분석 결과", "관찰됨", "확인됨", "평가됨" 등 객관적 표현을 사용합니다.
4. **균형잡힌 평가**: 안전 및 발달 영역을 동등한 비중으로 평가합니다.
5. **실용적 권고**: 구체적이고 실행 가능한 조치 사항을 제시합니다.
6. **격식있는 문체**: 전문가 보고서 수준의 격식체를 유지합니다. 이모지나 구어체 표현을 사용하지 않습니다.

**[수집된 데이터]**
- 분석 세션 수: {total_logs}회
- 평균 안전 점수: {avg_safety:.1f}점
- 평균 발달 활동 점수: {avg_dev:.1f}점
- 위험 이벤트: {len(danger_events)}건
- 주의 이벤트: {len(warning_events)}건
- 권장 사항: {len(recommendation_events)}건
- 발달 관찰: {len(dev_events)}건
- 신규 발달 이정표: {len(new_milestones)}건

**[안전 이벤트 상세]**
{chr(10).join([f"- [위험] {e['title']}: {e['description'][:100]}" for e in danger_events[:5]]) if danger_events else "- 위험 이벤트 없음"}
{chr(10).join([f"- [주의] {e['title']}: {e['description'][:100]}" for e in warning_events[:5]]) if warning_events else ""}

**[발달 관찰 상세]**
- 대근육 운동: {len(dev_by_category['대근육운동'])}건
- 소근육 운동: {len(dev_by_category['소근육운동'])}건
- 언어 발달: {len(dev_by_category['언어'])}건
- 인지 발달: {len(dev_by_category['인지'])}건
- 사회정서: {len(dev_by_category['사회정서'])}건

{chr(10).join([f"- [신규] {m['title']}" for m in new_milestones[:3]]) if new_milestones else ""}

---

**[리포트 작성 지침]**

다음 구조를 **정확히** 준수하여 전문적인 리포트를 작성하십시오:

## 1. 종합 평가

**오늘의 리포트입니다.**

- **안전 점수**: {avg_safety:.1f}점 (100점 만점)
- **발달 활기도**: {avg_dev:.1f}점 (100점 만점)
- **모니터링 시간**: 약 {total_logs * 10}분
- **감지된 이벤트**: 총 {len(safety_events) + len(dev_events)}건

*점수 해석: 안전 점수와 발달 점수는 독립적으로 평가되며, 두 점수 모두 70점 이상이면 양호한 상태입니다.*

## 2. 안전 환경 분석

**위험도 평가**
- 위험 등급 이벤트: {len(danger_events)}건
- 주의 등급 이벤트: {len(warning_events)}건
- 권장 사항: {len(recommendation_events)}건

**감지된 안전 이슈 및 조치 방안**
{f'''
금일 영상 분석 결과, 총 {len(danger_events) + len(warning_events)}건의 안전 관련 이벤트가 확인되었습니다.

{chr(10).join([f"• **{e['title']}**: {e['description'][:100]}... → 즉시 {('콘센트 안전 커버 설치' if '콘센트' in e['title'] else '전선 정리 및 보호 커버 설치' if '전선' in e['title'] else '멀티탭 정리 및 보호' if '멀티탭' in e['title'] else '안전 매트 배치 및 보호대 설치' if '낙상' in e['title'] or '소파' in e['title'] or '침대' in e['title'] else '위험 물품 제거')} 필요" for e in (danger_events + warning_events)[:5]])}

**전문가 평가**: 상기 위험 요소는 영유아 발달 단계에서 예측 가능한 탐색 행동에 기인하나, 
사고 예방을 위한 즉각적인 환경 개선이 요구됩니다. 
특히 전기 관련 위험(감전)과 물리적 위험(낙상)은 중대 사고로 이어질 수 있으므로 
48시간 이내 안전 조치 완료를 권고합니다.
''' if (danger_events or warning_events) else '''
금일 분석된 영상에서 심각한 안전 위험 요소는 확인되지 않았습니다. 
현재 가정 내 안전 환경은 양호한 수준으로 평가됩니다.

**전문가 평가**: 안전 환경이 적절히 관리되고 있으나, 영유아의 발달 단계 변화에 따라 
새로운 위험 요소가 발생할 수 있습니다. 주 1회 정기 안전 점검 및 
월 1회 발달 단계별 위험 요소 재평가를 권장합니다.
'''}

## 3. 발달 행동 관찰

**발달 영역별 활동 분석**

{f'''
금일 관찰된 발달 행동은 총 {len(dev_events)}건이며, 영역별 분포는 다음과 같습니다:

• **대근육 운동 발달** ({len(dev_by_category['대근육운동'])}건): 
  {chr(10).join([f"  - {e['title']}" for e in dev_by_category['대근육운동'][:3]]) if dev_by_category['대근육운동'] else "  관련 활동이 제한적으로 관찰되었습니다."}
  {f"  → **권장 활동**: 안전한 공간에서의 자유로운 이동 시간 확보 (1일 30분 이상), 계단 오르내리기, 공 굴리기" if dev_by_category['대근육운동'] else ""}

• **소근육 운동 발달** ({len(dev_by_category['소근육운동'])}건): 
  {chr(10).join([f"  - {e['title']}" for e in dev_by_category['소근육운동'][:3]]) if dev_by_category['소근육운동'] else "  관련 활동이 제한적으로 관찰되었습니다."}
  {f"  → **권장 활동**: 블록 쌓기, 구슬 꿰기, 크레용 그리기 등 손가락 협응력 놀이 (1일 20분 이상)" if dev_by_category['소근육운동'] else ""}

• **언어 발달** ({len(dev_by_category['언어'])}건): 
  {chr(10).join([f"  - {e['title']}" for e in dev_by_category['언어'][:3]]) if dev_by_category['언어'] else "  영상 특성상 언어 발달 평가가 제한적입니다."}
  {f"  → **권장 활동**: 그림책 읽어주기 (1일 2회 이상), 일상 활동 시 언어적 설명 제공, 아이의 옹알이나 말에 적극 반응" if dev_by_category['언어'] else ""}

• **인지 발달** ({len(dev_by_category['인지'])}건): 
  {chr(10).join([f"  - {e['title']}" for e in dev_by_category['인지'][:3]]) if dev_by_category['인지'] else "  관련 활동이 제한적으로 관찰되었습니다."}
  {f"  → **권장 활동**: 색깔/모양 분류 놀이, 숨바꼭질, 원인-결과 관계 장난감 (누르면 소리나는 장난감 등)" if dev_by_category['인지'] else ""}

• **사회정서 발달** ({len(dev_by_category['사회정서'])}건): 
  {chr(10).join([f"  - {e['title']}" for e in dev_by_category['사회정서'][:3]]) if dev_by_category['사회정서'] else "  관련 활동이 제한적으로 관찰되었습니다."}
  {f"  → **권장 활동**: 또래와의 상호작용 기회 제공 (주 2회 이상), 감정 표현 격려, 일관된 양육 태도 유지" if dev_by_category['사회정서'] else ""}
''' if dev_events else '''
금일 수집된 영상 데이터에서는 발달 행동 관찰이 제한적이었습니다.
보다 정확한 발달 평가를 위해서는 다양한 시간대(오전/오후/저녁) 및 
활동 상황(놀이/식사/수면 전후)의 영상 수집을 권장합니다.

**일반 권장 활동**:
• 전반적 발달 촉진: 다양한 감각 자극 제공 (촉각, 시각, 청각), 안전한 탐색 환경 조성, 규칙적인 생활 리듬 유지
• 애착 형성: 충분한 스킨십, 일관된 양육자, 민감하고 반응적인 상호작용
• 건강 관리: 적절한 영양 섭취, 충분한 수면 (월령별 권장 시간 준수), 정기 건강검진 및 예방접종
'''}

**발달 이정표**
{f'''
{chr(10).join([f"▪ **{m['title']}**: 신규 발달 성취로 기록되었습니다." for m in new_milestones[:3]])}

**전문가 평가**: 상기 발달 성취는 해당 월령대의 정상 발달 범주 내에 있으며, 
지속적인 자극과 격려를 통해 발달을 촉진할 수 있습니다.
''' if new_milestones else '''
금일은 특별한 신규 발달 이정표가 관찰되지 않았습니다.

**전문가 평가**: 발달은 점진적이고 연속적인 과정으로, 일일 단위보다는 
주간/월간 단위의 장기 관찰이 더 의미 있습니다. 현재 발달 수준이 유지되고 있다면 
정상적인 발달 과정으로 평가할 수 있습니다.
'''}

## 4. 교육 자료 & 중점 사항

**보호자 교육 자료 추천**

• 영유아 발달 단계별 가이드: 보건복지부 '아이사랑' 포털 참고
• 가정 내 안전 체크리스트: 한국소비자원 '어린이 안전 가이드' 다운로드
• 응급처치 교육: 대한적십자사 '영유아 응급처치' 온라인 강좌 수강 권장

**다음 관찰 시 중점 사항**

• 오늘 감지된 안전 위험 요소의 개선 여부 확인
• 발달이 제한적으로 관찰된 영역({', '.join([k for k, v in dev_by_category.items() if not v][:2]) if any(not v for v in dev_by_category.values()) else '모든 영역'})의 활동 증가 여부
• 신규 발달 이정표 출현 여부

---

본 리포트는 영상 분석 데이터를 기반으로 작성되었습니다. 
지속적인 관찰과 기록을 통해 아이의 건강한 성장을 지원하시기 바랍니다.

"""

        # 4. Gemini 호출
        print(f"[DailyReport] ({target_date}) 전문 리포트 생성 요청 중...")
        report_text = await self.gemini_service.generate_text_from_prompt(prompt)
        print(f"[DailyReport] 생성 완료 (길이: {len(report_text)})")
        
        return report_text

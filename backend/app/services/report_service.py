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
        특정 날짜의 분석 데이터를 기반으로 데일리 리포트(텍스트)를 생성합니다.
        
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
        
        safety_summary_text = ""
        dangerous_count = 0
        warning_count = 0
        
        for event in safety_events:
            severity = str(event.severity.value) if hasattr(event.severity, 'value') else str(event.severity)
            if severity in ["위험", "사고"]:
                dangerous_count += 1
                safety_summary_text += f"- [위험] {event.title} ({event.timestamp_range})\n"
            elif severity == "주의":
                warning_count += 1
                safety_summary_text += f"- [주의] {event.title}\n"
                
        dev_summary_text = ""
        new_skills = []
        for event in dev_events:
            title = event.title
            dev_summary_text += f"- [{event.category.value}] {title}\n"
            if any(k in title for k in ["최초", "성공", "처음"]):
                new_skills.append(title)
        
        # 3. LLM 프롬프트 구성 (팩트 기반 & AI 정체성 준수)
        prompt = f"""
당신은 홈캠 영상을 분석하여 부모에게 객관적인 육아 정보를 제공하는 **AI 육아 분석 시스템**입니다.
오늘 수집된 데이터를 바탕으로 부모님이 참고할 수 있는 **[일일 육아 리포트]**를 작성해주세요.

**[절대 원칙 (Strict Rules)]**
1. **거짓 작성 금지 (No Hallucination):** 제공된 데이터에 없는 구체적인 행동을 절대 지어내지 마십시오.
2. **AI 정체성 유지:** 자신을 "전문가"나 "선생님"으로 지칭하지 마십시오. "분석 결과", "데이터에 따르면"과 같은 객관적인 표현을 사용하십시오.
3. **과장 금지:** 칭찬이나 격려는 좋지만, 사소한 행동을 과도하게 포장하지 마십시오.
4. **타임스탬프 나열 금지:** "00:04:33, 00:01:37" 같은 비디오 재생 시간을 나열하지 마십시오. 대신 "오전 중", "오후 2시경" 같은 일반적인 시간 표현만 사용하십시오.
5. **마크다운 사용 허용:** 섹션 제목(`##`)과 강조(`**`) 문법을 적극적으로 사용하십시오.

**[리포트 작성 가이드]**
다음 4단계 구조를 **반드시** 준수하여 작성해주세요.

## 1. 오늘의 데이터 요약
- 첫 줄은 반드시 "오늘의 리포트입니다."로 시작하세요.
- 그 다음 줄부터는 아래와 같이 리스트 형태로 점수를 나열하세요. (서술형 금지)
  - **안전 점수**: OO.O점
  - **발달 활기도**: OO.O점

## 2. 안전 분석 결과
- 제목: `## 2. 안전 분석 결과`
- 감지된 위험 요소가 있다면 종류와 빈도만 언급하세요. (타임스탬프 나열 금지)
- 예: "감전 위험이 여러 차례 감지되었습니다" (O) / "00:04:33, 00:01:37에 감지되었습니다" (X)
- 가정 내 안전 관리에 대한 일반적인 조언을 덧붙이세요.
- 위험 요소가 없다면 "안전한 환경이 잘 유지되었습니다"라고 팩트를 전달하세요.

## 3. 발달 행동 관찰
- 제목: `## 3. 발달 행동 관찰`
- 기록된 행동 데이터를 바탕으로 어떤 영역(대근육/소근육 등)의 활동이 있었는지 설명하세요.
- 데이터가 부족하면 "영상이 충분하지 않아 분석이 제한적입니다"라고 솔직하게 말하세요.

## 4. 내일을 위한 제언
- 제목: `## 4. 내일을 위한 제언`
- 데이터에 기반하여 내일 신경 쓰면 좋을 점 1~2가지를 제안하세요. (무리한 조언 금지)
- 부모님을 응원하는 짧은 문장으로 마무리하세요.

---
**작성 톤:** 정중하고 객관적인 해요체 ("~했습니다", "~보입니다").
**분량:** 약 400~600자. (간결하게)
**형식:**
- 각 섹션의 제목은 반드시 `## 번호. 제목` 형식을 사용해야 합니다. (예: `## 1. 오늘의 데이터 요약`)
- 점수나 중요 키워드는 `**`로 감싸서 강조해주세요.
"""

        # 4. Gemini 호출
        print(f"[DailyReport] ({target_date}) 리포트 생성 요청 중...")
        report_text = await self.gemini_service.generate_text_from_prompt(prompt)
        print(f"[DailyReport] 생성 완료 (길이: {len(report_text)})")
        
        return report_text

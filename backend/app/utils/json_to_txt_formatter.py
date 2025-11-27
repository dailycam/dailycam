"""Gemini 분석 결과 JSON을 TXT 파일로 변환하는 유틸리티"""

import json
from datetime import datetime
from pathlib import Path
from typing import Dict, Any, List


class GeminiAnalysisFormatter:
    """Gemini 분석 결과를 사람이 읽기 쉬운 TXT 형식으로 변환"""
    
    def __init__(self, output_dir: str = "analysis_results"):
        """
        Args:
            output_dir: TXT 파일을 저장할 디렉토리 경로
        """
        self.output_dir = Path(output_dir)
        self.output_dir.mkdir(parents=True, exist_ok=True)
    
    def format_and_save(
        self, 
        analysis_data: Dict[str, Any],
        metadata: Dict[str, Any] = None,
        stage_determination: Dict[str, Any] = None,
        filename_prefix: str = "analysis"
    ) -> str:
        """
        분석 결과를 TXT로 포맷팅하여 저장
        
        Args:
            analysis_data: 3단계 최종 분석 결과 JSON
            metadata: 1단계 VLM 메타데이터 JSON (선택)
            stage_determination: 2단계 발달 단계 판단 JSON (선택)
            filename_prefix: 파일명 접두사
            
        Returns:
            저장된 파일 경로
        """
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        filename = f"{filename_prefix}_{timestamp}.txt"
        filepath = self.output_dir / filename
        
        with open(filepath, "w", encoding="utf-8") as f:
            # 헤더
            f.write("=" * 80 + "\n")
            f.write("Gemini 비디오 분석 결과\n")
            f.write(f"생성 시각: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n")
            f.write("=" * 80 + "\n\n")
            
            # 1. 메타 정보
            self._write_meta_section(f, analysis_data.get("meta", {}))
            
            # 2. 발달 단계 판단 (있는 경우)
            if stage_determination or analysis_data.get("stage_determination"):
                self._write_stage_determination(
                    f, 
                    stage_determination or analysis_data.get("stage_determination")
                )
            
            # 3. 발달 분석
            if "development_analysis" in analysis_data:
                self._write_development_analysis(f, analysis_data["development_analysis"])
            
            # 4. 안전 분석
            if "safety_analysis" in analysis_data:
                self._write_safety_analysis(f, analysis_data["safety_analysis"])
            
            # 5. 환경 정보
            if "environment" in analysis_data:
                self._write_environment(f, analysis_data["environment"])
            
            # 6. 보호자 상호작용
            if "adult_presence" in analysis_data:
                self._write_adult_presence(f, analysis_data["adult_presence"])
            
            # 7. 원본 메타데이터 (있는 경우)
            if metadata:
                self._write_raw_metadata(f, metadata)
            elif "_extracted_metadata" in analysis_data:
                self._write_raw_metadata(f, analysis_data["_extracted_metadata"])
        
        print(f"✅ 분석 결과 TXT 파일 저장 완료: {filepath}")
        return str(filepath)
    
    def _write_meta_section(self, f, meta: Dict[str, Any]):
        """메타 정보 작성"""
        f.write("📋 메타 정보\n")
        f.write("-" * 80 + "\n")
        f.write(f"발달 단계: {meta.get('assumed_stage', 'N/A')}단계\n")
        f.write(f"개월 수: {meta.get('age_months', 'N/A')}개월\n")
        f.write(f"관찰 시간: {meta.get('observation_duration_minutes', 'N/A')}분\n")
        f.write(f"비디오 화질: {meta.get('video_quality', 'N/A')}\n")
        f.write(f"아이 가시성: {meta.get('child_visibility', 'N/A')}\n")
        f.write(f"환경 유형: {meta.get('environment_type', 'N/A')}\n")
        f.write("\n\n")
    
    def _write_stage_determination(self, f, stage_det: Dict[str, Any]):
        """발달 단계 판단 결과 작성"""
        f.write("🎯 발달 단계 판단\n")
        f.write("-" * 80 + "\n")
        f.write(f"판단된 단계: {stage_det.get('detected_stage', 'N/A')}단계\n")
        f.write(f"신뢰도: {stage_det.get('confidence', 'N/A')}\n\n")
        
        if "evidence" in stage_det and stage_det["evidence"]:
            f.write("📌 판단 근거:\n")
            for i, evidence in enumerate(stage_det["evidence"], 1):
                f.write(f"  {i}. {evidence}\n")
            f.write("\n")
        
        if "alternative_stages" in stage_det and stage_det["alternative_stages"]:
            f.write("🔄 대안 단계:\n")
            for alt in stage_det["alternative_stages"]:
                if isinstance(alt, dict):
                    f.write(f"  - {alt.get('stage')}단계 (가능성: {alt.get('probability', 'N/A')})\n")
                    if "reason" in alt:
                        f.write(f"    이유: {alt['reason']}\n")
                else:
                    f.write(f"  - {alt}단계\n")
            f.write("\n")
        
        f.write("\n")
    
    def _write_development_analysis(self, f, dev_analysis: Dict[str, Any]):
        """발달 분석 작성"""
        f.write("🧸 발달 분석\n")
        f.write("=" * 80 + "\n\n")
        
        # 요약
        if "summary" in dev_analysis:
            f.write("📝 전체 요약:\n")
            f.write(f"{dev_analysis['summary']}\n\n")
        
        # 발달 기술
        if "skills" in dev_analysis and dev_analysis["skills"]:
            f.write("✨ 관찰된 발달 기술:\n")
            f.write("-" * 80 + "\n")
            
            # 카테고리별로 그룹화
            categories = {}
            for skill in dev_analysis["skills"]:
                category = skill.get("category", "기타")
                if category not in categories:
                    categories[category] = []
                categories[category].append(skill)
            
            for category, skills in categories.items():
                f.write(f"\n[{category}]\n")
                for skill in skills:
                    present_mark = "✓" if skill.get("present") else "✗"
                    f.write(f"{present_mark} {skill.get('name', 'N/A')}\n")
                    f.write(f"   숙련도: {skill.get('level', 'N/A')} | ")
                    f.write(f"관찰 횟수: {skill.get('frequency', 0)}회\n")
                    
                    if "examples" in skill and skill["examples"]:
                        f.write(f"   관찰 예시:\n")
                        for example in skill["examples"]:
                            f.write(f"     • {example}\n")
                    f.write("\n")
            f.write("\n")
        
        # 단계 일치도
        if "stage_consistency" in dev_analysis:
            consistency = dev_analysis["stage_consistency"]
            f.write("📊 단계 일치도:\n")
            f.write("-" * 80 + "\n")
            f.write(f"일치 수준: {consistency.get('match_level', 'N/A')}\n\n")
            
            if "evidence" in consistency and consistency["evidence"]:
                f.write("근거:\n")
                for evidence in consistency["evidence"]:
                    f.write(f"  • {evidence}\n")
                f.write("\n")
            
            if "suggested_stage_for_next_analysis" in consistency:
                f.write(f"다음 분석 권장 단계: {consistency['suggested_stage_for_next_analysis']}단계\n")
            f.write("\n")
        
        # 다음 단계 징후
        if "next_stage_signs" in dev_analysis and dev_analysis["next_stage_signs"]:
            f.write("🚀 다음 단계 징후:\n")
            f.write("-" * 80 + "\n")
            for sign in dev_analysis["next_stage_signs"]:
                f.write(f"• {sign.get('behavior', 'N/A')}\n")
                f.write(f"  카테고리: {sign.get('category', 'N/A')}\n")
                if "timestamp" in sign:
                    f.write(f"  타임스탬프: {sign['timestamp']}\n")
                if "significance" in sign:
                    f.write(f"  의미: {sign['significance']}\n")
                f.write("\n")
        
        f.write("\n")
    
    def _write_safety_analysis(self, f, safety: Dict[str, Any]):
        """안전 분석 작성"""
        f.write("🛡️ 안전 분석\n")
        f.write("=" * 80 + "\n\n")
        
        # 안전 점수 및 레벨
        f.write("📊 안전 점수:\n")
        f.write("-" * 80 + "\n")
        f.write(f"점수: {safety.get('safety_score', 'N/A')}점\n")
        f.write(f"안전도 레벨: {safety.get('overall_safety_level', 'N/A')}\n\n")
        
        # 사고 요약
        if "incident_summary" in safety and safety["incident_summary"]:
            f.write("📉 감점 내역:\n")
            for item in safety["incident_summary"]:
                f.write(f"  • {item.get('severity', 'N/A')}: ")
                f.write(f"{item.get('occurrences', 0)}건 ")
                f.write(f"(감점: {item.get('applied_deduction', 0)}점)\n")
            f.write("\n")
        
        # 안전 사고/위험 이벤트
        if "incident_events" in safety and safety["incident_events"]:
            f.write("⚠️ 안전 사고/위험 이벤트:\n")
            f.write("-" * 80 + "\n")
            for event in safety["incident_events"]:
                severity = event.get("severity", "N/A")
                severity_icon = {
                    "사고발생": "🔴",
                    "위험": "🟠",
                    "주의": "🟡",
                    "권장": "🟢"
                }.get(severity, "⚪")
                
                f.write(f"{severity_icon} [{severity}] {event.get('event_id', 'N/A')}\n")
                f.write(f"   시간: {event.get('timestamp_range', 'N/A')}\n")
                f.write(f"   위험 유형: {event.get('risk_type', 'N/A')}\n")
                f.write(f"   상황: {event.get('description', 'N/A')}\n")
                
                if "trigger_behavior" in event:
                    f.write(f"   유발 행동: {event['trigger_behavior']}\n")
                if "environment_factor" in event:
                    f.write(f"   환경 요인: {event['environment_factor']}\n")
                if "has_safety_device" in event:
                    has_device = "있음" if event["has_safety_device"] else "없음"
                    f.write(f"   안전장치: {has_device}")
                    if event.get("safety_device_type"):
                        f.write(f" ({event['safety_device_type']})")
                    f.write("\n")
                if "adult_intervention" in event:
                    intervention = "있음" if event["adult_intervention"] else "없음"
                    f.write(f"   보호자 개입: {intervention}\n")
                if "comment" in event:
                    f.write(f"   💡 권장사항: {event['comment']}\n")
                f.write("\n")
        
        # 치명적 사고
        if "critical_events" in safety and safety["critical_events"]:
            f.write("🚨 치명적 사고 이벤트:\n")
            f.write("-" * 80 + "\n")
            for event in safety["critical_events"]:
                f.write(f"⚠️ {event.get('event_type', 'N/A')}\n")
                f.write(f"   시간: {event.get('timestamp', 'N/A')}\n")
                f.write(f"   상황: {event.get('description', 'N/A')}\n")
                if "prevented_injury" in event:
                    f.write(f"   예방된 부상: {event['prevented_injury']}\n")
                f.write("\n")
        
        # 환경 위험 요소
        if "environment_risks" in safety and safety["environment_risks"]:
            f.write("🏠 환경 위험 요소:\n")
            f.write("-" * 80 + "\n")
            for risk in safety["environment_risks"]:
                f.write(f"• {risk.get('risk_id', 'N/A')} - {risk.get('risk_type', 'N/A')}\n")
                f.write(f"  심각도: {risk.get('severity', 'N/A')}\n")
                f.write(f"  위치: {risk.get('location', 'N/A')}\n")
                f.write(f"  설명: {risk.get('description', 'N/A')}\n")
                if "has_safety_device" in risk:
                    has_device = "있음" if risk["has_safety_device"] else "없음"
                    f.write(f"  안전장치: {has_device}\n")
                if "recommendation" in risk:
                    f.write(f"  💡 권장사항: {risk['recommendation']}\n")
                f.write("\n")
        
        # 안전 권장사항
        if "safety_recommendations" in safety and safety["safety_recommendations"]:
            f.write("💡 안전 권장사항:\n")
            f.write("-" * 80 + "\n")
            for i, rec in enumerate(safety["safety_recommendations"], 1):
                f.write(f"{i}. {rec}\n")
            f.write("\n")
        
        f.write("\n")
    
    def _write_environment(self, f, env: Dict[str, Any]):
        """환경 정보 작성"""
        f.write("🏡 환경 정보\n")
        f.write("-" * 80 + "\n")
        f.write(f"장소: {env.get('location', 'N/A')}\n")
        f.write(f"바닥재: {env.get('floor_type', 'N/A')}\n\n")
        
        if "furniture_present" in env and env["furniture_present"]:
            f.write("가구: " + ", ".join(env["furniture_present"]) + "\n\n")
        
        if "toys_and_objects" in env and env["toys_and_objects"]:
            f.write("장난감/물건: " + ", ".join(env["toys_and_objects"]) + "\n\n")
        
        if "safety_devices" in env and env["safety_devices"]:
            f.write("안전장치: " + ", ".join(env["safety_devices"]) + "\n\n")
        
        f.write("\n")
    
    def _write_adult_presence(self, f, adult: Dict[str, Any]):
        """보호자 상호작용 작성"""
        f.write("👨‍👩‍👧 보호자 상호작용\n")
        f.write("-" * 80 + "\n")
        f.write(f"동반 빈도: {adult.get('overall_presence', 'N/A')}\n")
        f.write(f"상호작용 수준: {adult.get('interaction_quality', 'N/A')}\n\n")
        
        if "interactions" in adult and adult["interactions"]:
            f.write("상호작용 기록:\n")
            for interaction in adult["interactions"]:
                f.write(f"  [{interaction.get('timestamp', 'N/A')}] ")
                f.write(f"{interaction.get('type', 'N/A')}: ")
                f.write(f"{interaction.get('description', 'N/A')}\n")
            f.write("\n")
        
        f.write("\n")
    
    def _write_raw_metadata(self, f, metadata: Dict[str, Any]):
        """원본 메타데이터 작성 (축약)"""
        f.write("📦 원본 메타데이터 (1단계 VLM)\n")
        f.write("=" * 80 + "\n")
        f.write(f"(관찰 항목 {len(metadata.get('timeline_observations', []))}개, ")
        f.write(f"안전 관찰 {len(metadata.get('safety_observations', []))}개)\n\n")
        
        # behavior_summary 요약
        if "behavior_summary" in metadata:
            f.write("행동 요약:\n")
            for category, behaviors in metadata["behavior_summary"].items():
                f.write(f"  [{category}]\n")
                for behavior_name, stats in behaviors.items():
                    f.write(f"    • {behavior_name}: ")
                    f.write(f"{stats.get('count', 0)}회, ")
                    f.write(f"{stats.get('skill_level', 'N/A')} 수준\n")
            f.write("\n")
        
        f.write("\n")
    
    def save_raw_json(
        self, 
        data: Dict[str, Any], 
        stage: str = "final",
        filename_prefix: str = "raw"
    ) -> str:
        """
        원본 JSON을 그대로 저장
        
        Args:
            data: JSON 데이터
            stage: 단계 ("vlm_metadata", "stage_determination", "final")
            filename_prefix: 파일명 접두사
            
        Returns:
            저장된 파일 경로
        """
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        filename = f"{filename_prefix}_{stage}_{timestamp}.json"
        filepath = self.output_dir / filename
        
        with open(filepath, "w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
        
        print(f"✅ 원본 JSON 저장 완료: {filepath}")
        return str(filepath)

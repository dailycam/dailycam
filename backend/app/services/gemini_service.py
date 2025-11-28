"""Gemini AI 비디오 분석 서비스 (3단계 메타데이터 기반, 최적화 버전)"""

import base64
import json
import os
import tempfile
from pathlib import Path
from typing import Optional, Dict, Any, Tuple, List

import cv2
import google.generativeai as genai
import yaml
from dotenv import load_dotenv

# .env 파일 로드
env_path = Path(__file__).parent.parent.parent / ".env"
load_dotenv(dotenv_path=env_path)


class GeminiService:
    """
    Gemini 2.5 Flash를 사용한 비디오 분석 서비스 (정확도 유지 + 토큰/시간 절감 버전)

    구조:
      0단계: 비디오 최적화(해상도/FPS 다운샘플링, 선택)
      1단계: VLM 호출 → 메타데이터 추출 (vlm_metadata.ko.txt)
      2단계: LLM 호출 → 발달 단계 판단 (header.ko.txt)
      3단계: LLM 호출 → 단계별 상세 분석 (stage_xx + common prompt 조합)

    변경 포인트:
      - timeline_observations 최대 400개, safety_observations 최대 150개로 잘라서 사용
      - metadata JSON은 pretty-print 대신 compact 형식으로 전송해 토큰 절감
      - 비디오 최적화(_optimize_video) 유지: 480p / 1fps로 다운샘플링
    """

    # 메타데이터 상한 (토큰/시간 절감용)
    MAX_TIMELINE_OBS = 400
    MAX_SAFETY_OBS = 150

    def __init__(self) -> None:
        """Gemini API 클라이언트 초기화"""
        api_key = os.getenv("GEMINI_API_KEY")
        if not api_key:
            raise ValueError(
                "GEMINI_API_KEY 환경 변수가 설정되지 않았습니다.\n"
                f"backend/.env 파일에 GEMINI_API_KEY를 설정해주세요.\n"
                f".env 파일 경로: {env_path}"
            )

        genai.configure(api_key=api_key)

        # 기본 GenerationConfig (말투/자연스러움 위주)
        generation_config = genai.types.GenerationConfig(
            temperature=0.4,
            top_k=30,
            top_p=0.95,
        )

        self.model = genai.GenerativeModel(
            model_name="gemini-2.5-flash",
            generation_config=generation_config,
        )

        # 프롬프트 캐시 딕셔너리 초기화
        self.prompt_cache: Dict[str, str] = {}

    # ------------------------------------------------------------------
    # 공통 유틸
    # ------------------------------------------------------------------
    def _load_prompt(self, filename: str) -> str:
        """프롬프트 파일을 캐시하여 반환합니다."""
        if filename in self.prompt_cache:
            return self.prompt_cache[filename]

        prompts_dir = Path(__file__).parent.parent / "prompts"
        prompt_path = prompts_dir / filename

        try:
            # 1. 직접 경로 시도
            if (prompts_dir / filename).exists():
                prompt_path = prompts_dir / filename
            # 2. baby_dev_safety/common 시도
            elif (prompts_dir / "baby_dev_safety" / "common" / filename).exists():
                prompt_path = prompts_dir / "baby_dev_safety" / "common" / filename
            # 3. baby_dev_safety/stages 시도
            elif (prompts_dir / "baby_dev_safety" / "stages" / filename).exists():
                prompt_path = prompts_dir / "baby_dev_safety" / "stages" / filename
            # 4. baby_dev_safety/extraction 시도
            elif (prompts_dir / "baby_dev_safety" / "extraction" / filename).exists():
                prompt_path = prompts_dir / "baby_dev_safety" / "extraction" / filename
            else:
                # 못 찾으면 기본 경로로 설정하고 에러 발생 유도
                prompt_path = prompts_dir / filename

            with open(prompt_path, "r", encoding="utf-8") as f:
                content = f.read()
                self.prompt_cache[filename] = content
                print(f"[프롬프트 캐시 등록] {filename} ({len(content)}자)")
                return content
        except FileNotFoundError:
            error_msg = f"프롬프트 파일을 찾을 수 없습니다: {filename}"
            print(f"❌ {error_msg}")
            raise FileNotFoundError(error_msg)

    def _determine_stage_from_age_months(self, age_months: int) -> str:
        """
        개월 수를 기준으로 초기 발달 단계를 결정합니다.
        이는 AI 분석의 시작점(기준점)으로 사용되며, AI는 실제 관찰을 통해 다른 단계를 제안할 수 있습니다.
        
        Stage 범위 (config.yaml 기준):
        - Stage 1: 0-2개월
        - Stage 2: 3-5개월
        - Stage 3: 6-8개월
        - Stage 4: 9-11개월
        - Stage 5: 12-17개월
        - Stage 6: 18-23개월
        - Stage 7: 24-29개월
        - Stage 8: 30-35개월
        - Stage 9: 36-47개월
        - Stage 10: 48-59개월
        - Stage 11: 60-71개월
        """
        if age_months <= 2:
            return "1"
        elif age_months <= 5:
            return "2"
        elif age_months <= 8:
            return "3"
        elif age_months <= 11:
            return "4"
        elif age_months <= 17:
            return "5"
        elif age_months <= 23:
            return "6"
        elif age_months <= 29:
            return "7"
        elif age_months <= 35:
            return "8"
        elif age_months <= 47:
            return "9"
        elif age_months <= 59:
            return "10"
        else:
            return "11"

    def _format_duration(self, seconds: float) -> str:
        """초를 HH:MM:SS 형식으로 변환합니다."""
        hours = int(seconds // 3600)
        minutes = int((seconds % 3600) // 60)
        secs = int(seconds % 60)
        return f"{hours:02d}:{minutes:02d}:{secs:02d}"

    # ------------------------------------------------------------------
    # 단계별 VLM 프롬프트 로딩
    # ------------------------------------------------------------------
    def _load_vlm_prompt(
        self,
        stage: str,
        age_months: Optional[int] = None,
        video_duration_seconds: Optional[float] = None,
    ) -> str:
        """
        VLM 발달 단계별 프롬프트를 로드합니다.
        공통 파일(입력 전제, 분석 단계, 필드 정의, 안전 규칙)과 단계별 프롬프트를 조합합니다.
        """
        prompts_dir = Path(__file__).parent.parent / "prompts"
        baby_dev_safety_dir = prompts_dir / "baby_dev_safety"

        if not baby_dev_safety_dir.exists():
            raise FileNotFoundError(
                f"VLM 프롬프트 디렉토리를 찾을 수 없습니다: {baby_dev_safety_dir}"
            )

        # 1. 공통 입력 전제
        input_premise_path = baby_dev_safety_dir / "common" / "input_premise.ko.txt"
        with open(input_premise_path, "r", encoding="utf-8") as f:
            input_premise = f.read()

        # 2. 공통 분석 단계 템플릿
        analysis_steps_path = (
            baby_dev_safety_dir / "common" / "analysis_steps_template.ko.txt"
        )
        with open(analysis_steps_path, "r", encoding="utf-8") as f:
            analysis_steps = f.read()

        # 3. 공통 필드 정의
        field_definitions_path = (
            baby_dev_safety_dir / "common" / "field_definitions.ko.txt"
        )
        with open(field_definitions_path, "r", encoding="utf-8") as f:
            field_definitions = f.read()

        # 4. config.yaml 읽기 (단계별 prompt_file 매핑)
        config_path = baby_dev_safety_dir / "config.yaml"
        if not config_path.exists():
            raise FileNotFoundError(f"설정 파일을 찾을 수 없습니다: {config_path}")

        with open(config_path, "r", encoding="utf-8") as f:
            config = yaml.safe_load(f)

        if "stages" not in config or stage not in config["stages"]:
            raise ValueError(
                f"지원하지 않는 발달 단계입니다: {stage}. "
                f"지원 단계: {list(config.get('stages', {}).keys())}"
            )

        stage_config = config["stages"][stage]
        prompt_file = stage_config["prompt_file"]

        # 5. 단계별 프롬프트
        stage_prompt_path = baby_dev_safety_dir / "stages" / prompt_file
        if not stage_prompt_path.exists():
            raise FileNotFoundError(
                f"단계별 프롬프트 파일을 찾을 수 없습니다: {stage_prompt_path}"
            )

        with open(stage_prompt_path, "r", encoding="utf-8") as f:
            stage_prompt = f.read()

        # 6. 공통 안전 규칙
        common_rules_path = baby_dev_safety_dir / "common" / "safety_rules.ko.txt"
        if not common_rules_path.exists():
            raise FileNotFoundError(
                f"공통 안전 규칙 파일을 찾을 수 없습니다: {common_rules_path}"
            )
        with open(common_rules_path, "r", encoding="utf-8") as f:
            common_safety_rules = f.read()

        # 7. 메타데이터 섹션
        metadata_items: List[str] = []
        if age_months is not None:
            metadata_items.append(f"- age_months: {age_months}")
        metadata_items.append(f"- assumed_stage: {stage}")
        if video_duration_seconds is not None:
            minutes = round(video_duration_seconds / 60, 2)
            metadata_items.append(f"- video_duration_seconds: {video_duration_seconds}")
            metadata_items.append(f"- video_duration_minutes: {minutes}")
            metadata_items.append(
                f"- video_total_time: {self._format_duration(video_duration_seconds)}"
            )

        metadata_section = ""
        if metadata_items:
            metadata_section = "\n\n[메타데이터]\n" + "\n".join(metadata_items) + "\n"

        combined_prompt = f"""{stage_prompt}

{input_premise}

{analysis_steps}

{field_definitions}

{common_safety_rules}{metadata_section}"""

        print(
            f"[VLM 프롬프트 로드 완료] 단계: {stage}, 길이: {len(combined_prompt)}자"
        )
        return combined_prompt

    # ------------------------------------------------------------------
    # 비디오 길이/최적화 유틸
    # ------------------------------------------------------------------
    def _get_video_duration(
        self, video_bytes: bytes, mime_type: str = "video/mp4"
    ) -> Optional[float]:
        """비디오 바이트 데이터에서 비디오 길이(초)를 계산합니다."""
        try:
            with tempfile.NamedTemporaryFile(delete=False, suffix=".mp4") as temp_file:
                temp_file.write(video_bytes)
                temp_path = temp_file.name

            try:
                cap = cv2.VideoCapture(temp_path)
                if not cap.isOpened():
                    print("[비디오 길이 계산 실패] 비디오를 열 수 없습니다.")
                    return None

                fps = cap.get(cv2.CAP_PROP_FPS)
                frame_count = cap.get(cv2.CAP_PROP_FRAME_COUNT)
                cap.release()

                if fps > 0 and frame_count > 0:
                    duration = frame_count / fps
                    print(
                        f"[비디오 길이 계산 성공] FPS: {fps}, 프레임 수: {frame_count}, 길이: {duration}초"
                    )
                    return duration
                else:
                    print(
                        f"[비디오 길이 계산 실패] FPS 또는 프레임 수가 유효하지 않습니다. "
                        f"FPS: {fps}, 프레임 수: {frame_count}"
                    )
                    return None
            finally:
                try:
                    os.unlink(temp_path)
                except Exception as e:
                    print(f"[비디오 길이 계산] 임시 파일 삭제 실패: {e}")
        except Exception as e:
            print(f"[비디오 길이 계산 오류] {str(e)}")
            return None

    def _optimize_video(self, video_bytes: bytes) -> bytes:
        """
        비디오 최적화: 해상도 축소 및 FPS 조정
        - 해상도: 높이 480px (비율 유지)
        - FPS: 1fps (초당 1프레임)
        - 이미 충분히 낮은 경우(높이 <=480, fps <=2)는 원본 사용
        """
        print("[비디오 최적화] 전처리 시작...")

        with tempfile.NamedTemporaryFile(delete=False, suffix=".mp4") as input_temp:
            input_temp.write(video_bytes)
            input_path = input_temp.name

        output_path = input_path.replace(".mp4", "_opt.mp4")

        try:
            cap = cv2.VideoCapture(input_path)
            if not cap.isOpened():
                print("[비디오 최적화] 비디오 열기 실패, 원본 사용")
                return video_bytes

            orig_width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
            orig_height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
            orig_fps = cap.get(cv2.CAP_PROP_FPS)

            target_height = 480
            target_fps = 1.0

            # 이미 최적화된 상태면 패스
            if orig_height <= target_height and orig_fps <= 2:
                print(
                    f"[비디오 최적화] 이미 최적화된 상태 ({orig_width}x{orig_height}, {orig_fps}fps)"
                )
                cap.release()
                return video_bytes

            scale = target_height / float(orig_height)
            target_width = int(orig_width * scale)

            print(
                f"[비디오 최적화] {orig_width}x{orig_height} {orig_fps}fps "
                f"-> {target_width}x{target_height} {target_fps}fps"
            )

            fourcc = cv2.VideoWriter_fourcc(*"mp4v")
            out = cv2.VideoWriter(
                output_path, fourcc, target_fps, (target_width, target_height)
            )

            step = int(orig_fps / target_fps) if orig_fps > 0 else 1
            if step < 1:
                step = 1

            count = 0
            processed_frames = 0

            while cap.isOpened():
                ret, frame = cap.read()
                if not ret:
                    break

                if count % step == 0:
                    resized = cv2.resize(frame, (target_width, target_height))
                    out.write(resized)
                    processed_frames += 1

                count += 1

            cap.release()
            out.release()

            if not os.path.exists(output_path) or os.path.getsize(output_path) == 0:
                print("[비디오 최적화] 출력 파일 생성 실패, 원본 사용")
                return video_bytes

            with open(output_path, "rb") as f:
                optimized_bytes = f.read()

            reduction_ratio = (1 - len(optimized_bytes) / len(video_bytes)) * 100
            print(
                f"[비디오 최적화 완료] "
                f"{len(video_bytes)/1024/1024:.2f}MB -> {len(optimized_bytes)/1024/1024:.2f}MB "
                f"({reduction_ratio:.1f}% 감소)"
            )
            return optimized_bytes

        except Exception as e:
            print(f"[비디오 최적화 오류] {e}")
            return video_bytes
        finally:
            try:
                if os.path.exists(input_path):
                    os.unlink(input_path)
                if os.path.exists(output_path):
                    os.unlink(output_path)
            except Exception as e:
                print(f"[비디오 최적화] 임시 파일 삭제 실패: {e}")

    # ------------------------------------------------------------------
    # 안전 점수 계산
    # ------------------------------------------------------------------
    def _calculate_safety_score(self, safety_analysis: dict) -> Tuple[int, list]:
        """
        안전 점수 및 감점 내역을 계산합니다.

        감점 규칙:
          - 사고/사고발생: -50 (최대 1회)
          - 위험: -30 (최대 1회)
          - 주의: -10 (최대 1회)
          - 권장: -2점 × 발생 건수, 최대 -16점
        """
        total_deduction = 0
        has_accident = False
        has_danger = False
        has_warning = False
        recommended_count = 0

        accident_count = 0
        danger_count = 0
        warning_count = 0

        # incident_events
        if "incident_events" in safety_analysis and isinstance(
            safety_analysis["incident_events"], list
        ):
            for event in safety_analysis["incident_events"]:
                if not isinstance(event, dict):
                    continue
                severity = event.get("severity", "")
                if severity in ("사고", "사고발생"):
                    accident_count += 1
                    if not has_accident:
                        total_deduction -= 50
                        has_accident = True
                elif severity == "위험":
                    danger_count += 1
                    if not has_danger:
                        total_deduction -= 30
                        has_danger = True
                elif severity == "주의":
                    warning_count += 1
                    if not has_warning:
                        total_deduction -= 10
                        has_warning = True
                elif severity == "권장":
                    recommended_count += 1

        # environment_risks
        if "environment_risks" in safety_analysis and isinstance(
            safety_analysis["environment_risks"], list
        ):
            for risk in safety_analysis["environment_risks"]:
                if not isinstance(risk, dict):
                    continue
                severity = risk.get("severity", "")
                if severity in ("사고", "사고발생"):
                    accident_count += 1
                    if not has_accident:
                        total_deduction -= 50
                        has_accident = True
                elif severity == "위험":
                    danger_count += 1
                    if not has_danger:
                        total_deduction -= 30
                        has_danger = True
                elif severity == "주의":
                    warning_count += 1
                    if not has_warning:
                        total_deduction -= 10
                        has_warning = True
                elif severity == "권장":
                    recommended_count += 1

        # 권장 감점 (최대 -16점)
        recommended_deduction = min(recommended_count * 2, 16)
        total_deduction -= recommended_deduction

        safety_score = 100 + total_deduction
        safety_score = max(50, safety_score)

        incident_summary = []
        if accident_count > 0:
            incident_summary.append(
                {
                    "severity": "사고",
                    "occurrences": accident_count,
                    "applied_deduction": -50 if has_accident else 0,
                }
            )
        if danger_count > 0:
            incident_summary.append(
                {
                    "severity": "위험",
                    "occurrences": danger_count,
                    "applied_deduction": -30 if has_danger else 0,
                }
            )
        if warning_count > 0:
            incident_summary.append(
                {
                    "severity": "주의",
                    "occurrences": warning_count,
                    "applied_deduction": -10 if has_warning else 0,
                }
            )
        if recommended_count > 0:
            incident_summary.append(
                {
                    "severity": "권장",
                    "occurrences": recommended_count,
                    "applied_deduction": -recommended_deduction,
                }
            )

        print(
            f"[안전 점수 계산 완료] {safety_score}점 (감점: {total_deduction}, 항목: {len(incident_summary)}개)"
        )
        return safety_score, incident_summary

    # ------------------------------------------------------------------
    # JSON 추출/파싱
    # ------------------------------------------------------------------
    def _extract_and_parse_json(self, text: str) -> dict:
        """
        텍스트에서 JSON 블록을 추출하고 파싱합니다.
        - ```json 코드블록 제거
        - 첫 '{'부터 마지막 '}'까지를 우선 사용
        """
        cleaned_text = text

        if "```json" in cleaned_text:
            start = cleaned_text.find("```json")
            if start != -1:
                start = cleaned_text.find("\n", start) + 1
                end = cleaned_text.find("```", start)
                if end != -1:
                    cleaned_text = cleaned_text[start:end].strip()
        elif "```" in cleaned_text:
            start = cleaned_text.find("```")
            if start != -1:
                start = cleaned_text.find("\n", start) + 1
                end = cleaned_text.find("```", start)
                if end != -1:
                    cleaned_text = cleaned_text[start:end].strip()

        first_brace = cleaned_text.find("{")
        if first_brace != -1:
            brace_count = 0
            last_brace = first_brace
            for i in range(first_brace, len(cleaned_text)):
                ch = cleaned_text[i]
                if ch == "{":
                    brace_count += 1
                elif ch == "}":
                    brace_count -= 1
                    if brace_count == 0:
                        last_brace = i
                        break

            if brace_count == 0:
                cleaned_text = cleaned_text[first_brace : last_brace + 1]
            else:
                last_brace = cleaned_text.rfind("}")
                if last_brace != -1 and last_brace > first_brace:
                    cleaned_text = cleaned_text[first_brace : last_brace + 1]
                    print("[JSON 추출] 중괄호 불일치, 첫 { 부터 마지막 } 까지 추출")

        try:
            return json.loads(cleaned_text)
        except json.JSONDecodeError as e:
            print(f"⚠️ JSON 파싱 실패: {str(e)}")
            print(f"[추출된 텍스트 (처음 500자)]\n{cleaned_text[:500]}")
            raise ValueError(f"JSON 파싱 실패: {str(e)}")

    # ------------------------------------------------------------------
    # 메인 엔트리: 3단계 메타데이터 기반 분석
    # ------------------------------------------------------------------
    async def analyze_video_vlm(
        self,
        video_bytes: bytes,
        content_type: str,
        stage: Optional[str] = None,
        age_months: Optional[int] = None,
        generation_params: Optional[dict] = None,
    ) -> dict:
        """
        메타데이터 기반 비디오 분석 (Group A/B 순차 처리 방식)
        """
        try:
            mime_type = content_type or "video/mp4"

            # ----------------------------------------------------------
            # 0단계: 비디오 최적화 (해상도/FPS 다운샘플링)
            # ----------------------------------------------------------
            optimized_video_bytes = self._optimize_video(video_bytes)

            # ----------------------------------------------------------
            # 1단계: VLM 호출 → 메타데이터 추출
            # ----------------------------------------------------------
            print("[1차 VLM] 비디오에서 메타데이터 추출 중...")

            video_base64 = base64.b64encode(optimized_video_bytes).decode("utf-8")
            metadata_prompt = self._load_prompt("vlm_metadata.ko.txt")

            vlm_generation_config = genai.types.GenerationConfig(
                temperature=0.0,
                top_k=30,
                top_p=0.95,
            )

            response = self.model.generate_content(
                [
                    {"mime_type": mime_type, "data": video_base64},
                    metadata_prompt,
                ],
                generation_config=vlm_generation_config,
            )

            if not response or not hasattr(response, "text"):
                raise ValueError("Gemini VLM 응답이 올바르지 않습니다.")

            metadata_text = response.text.strip()
            metadata = self._extract_and_parse_json(metadata_text)
            
            # 비디오 길이 보정 로직 (OpenCV)
            calculated_duration = self._get_video_duration(video_bytes, mime_type)
            if calculated_duration:
                video_duration_seconds = calculated_duration
            else:
                video_duration_seconds = metadata.get("video_metadata", {}).get("total_duration_seconds", 0)

            video_duration_minutes = round(video_duration_seconds / 60, 2) if video_duration_seconds else None

            # ----------------------------------------------------------
            # 2단계: LLM 호출 → 발달 단계 판단
            # ----------------------------------------------------------
            detected_stage = stage
            stage_determination_result = None

            if stage is None:
                if age_months is not None:
                    detected_stage = self._determine_stage_from_age_months(age_months)
                    print(f"[발달 단계 초기화] age_months={age_months}개월 → 초기 단계: {detected_stage}단계")
                else:
                    print("[2차 LLM] 메타데이터로 발달 단계 판단 중...")
                    
                    stage_header_prompt = self._load_prompt("header.ko.txt")
                    metadata_json_str = json.dumps(metadata, ensure_ascii=False, separators=(",", ":"))
                    
                    combined_prompt_stage = f"""[입력 방식]
비디오 대신 비디오에서 추출된 메타데이터를 제공합니다.
이 메타데이터를 바탕으로 발달 단계를 판단하세요.

[메타데이터]
```json
{metadata_json_str}
```

{stage_header_prompt}

[판단 방법]
- timeline_observations에서 관찰된 행동 패턴 분석
- behavior_summary에서 각 행동의 빈도 확인
- 위 발달 단계 기준과 비교하여 판단
- evidence에는 구체적인 빈도/지속시간을 포함
"""
                    
                    response = self.model.generate_content(combined_prompt_stage)
                    
                    if not response or not hasattr(response, "text"):
                        raise ValueError("Gemini 단계 판단 응답이 올바르지 않습니다.")
                    
                    result_text = response.text.strip()
                    stage_determination_result = self._extract_and_parse_json(result_text)
                    detected_stage = stage_determination_result.get("detected_stage")
                    
                    if not detected_stage:
                        detected_stage = "1"  # Fallback
                        print("[발달 단계] 판단 실패, 기본값 사용: 1단계")
                    else:
                        print(f"[2차 완료] 판단된 단계: {detected_stage}, 신뢰도: {stage_determination_result.get('confidence')}")

            # ----------------------------------------------------------
            # 3단계: Group A & B 순차 분석 (Sequential Processing)
            # ----------------------------------------------------------
            print(f"=== [3단계 진입] {detected_stage}단계 기준 분리 분석 시작 ===")
            
            # 메타데이터 JSON 문자열 준비
            metadata_json_str = json.dumps(metadata, ensure_ascii=False, separators=(",", ":"))

            # [CALL A] 안전 분석 (Safety)
            print(">>> [Group A] 안전 분석 요청 중...")
            safety_prompt_template = self._load_prompt("groups/group_a_safety.ko.txt")
            
            full_safety_prompt = f"""
{safety_prompt_template}

[분석할 메타데이터]
```json
{metadata_json_str}
```
"""
            
            safety_response = self.model.generate_content(full_safety_prompt)
            safety_result_json = self._extract_and_parse_json(safety_response.text)
            print("<<< [Group A] 안전 분석 완료")

            # [CALL B] 발달 분석 (Development)
            print(">>> [Group B] 발달 분석 요청 중...")
            development_prompt_template = self._load_prompt("groups/group_b_development.ko.txt")
            
            full_dev_prompt = f"""
{development_prompt_template}

[분석할 메타데이터]
```json
{metadata_json_str}
```
"""
            
            dev_response = self.model.generate_content(full_dev_prompt)
            dev_result_json = self._extract_and_parse_json(dev_response.text)
            print("<<< [Group B] 발달 분석 완료")


            # -------------------------------------------------------
            # [결과 병합] 최종 리턴 데이터 구성
            # -------------------------------------------------------
            final_result = {
                "meta": {
                    "assumed_stage": detected_stage,
                    "age_months": age_months,
                    "observation_duration_minutes": video_duration_minutes
                },
                # Group A 결과 병합
                "safety_analysis": safety_result_json.get("safety_analysis", {}),
                
                # Group B 결과 병합
                "development_analysis": dev_result_json.get("development_analysis", {}),
                
                # 원본 메타데이터 (디버깅용)
                "_extracted_metadata": metadata
            }

            # 안전 점수 재계산 (기존 로직 유지)
            if "safety_analysis" in final_result:
                safety_analysis = final_result["safety_analysis"]
                safety_score, incident_summary = self._calculate_safety_score(safety_analysis)
                safety_analysis["safety_score"] = safety_score
                safety_analysis["incident_summary"] = incident_summary
                
                # overall_safety_level 설정
                if safety_score >= 90:
                    level = "매우높음"
                elif safety_score >= 75:
                    level = "높음"
                elif safety_score >= 65:
                    level = "중간"
                elif safety_score >= 55:
                    level = "낮음"
                else:
                    level = "매우낮음"
                safety_analysis["overall_safety_level"] = level
                print(f"[안전도 레벨 자동 설정] safety_score: {safety_score} → overall_safety_level: {level}")

            print("[3차 완료] Group A/B 분석 완료")
            return final_result

        except Exception as e:
            print(f"❌ 분석 중 오류 발생: {str(e)}")
            raise e


# 싱글톤 인스턴스
_gemini_service: Optional[GeminiService] = None


def get_gemini_service() -> GeminiService:
    """Gemini 서비스 인스턴스를 반환합니다."""
    global _gemini_service
    if _gemini_service is None:
        _gemini_service = GeminiService()
    return _gemini_service

"""Gemini AI 비디오 분석 서비스 (3단계 메타데이터 기반, 최적화 버전)"""

import base64
import json
import os
import tempfile
from pathlib import Path
from typing import Optional, Dict, Any, Tuple, List
import asyncio

import cv2
import time
import google.generativeai as genai
import yaml
from dotenv import load_dotenv

# .env 파일 로드 (루트 디렉토리)
env_path = Path(__file__).parent.parent.parent.parent / ".env"
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
      - 비디오 최적화(_optimize_video) 유지: 480p / 15fps로 다운샘플링 (원본 30fps 기준)
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

    async def _upload_to_gemini(self, video_path: str, mime_type: str = "video/mp4"):
        """
        Gemini File API를 사용하여 비디오 업로드 (비동기 처리)
        
        Args:
            video_path: 업로드할 비디오 파일의 경로
            mime_type: MIME 타입
        """
        def upload_sync():
            print(f"[Gemini 업로드] 파일 업로드 시작: {video_path} ({os.path.getsize(video_path)/1024/1024:.2f}MB)")
            return genai.upload_file(video_path, mime_type=mime_type)

        try:
            # 업로드는 동기 함수이므로 쓰레드로 실행
            video_file = await asyncio.to_thread(upload_sync)
            print(f"[Gemini 업로드] 완료: {video_file.name}")
            
            # 파일 처리가 완료될 때까지 대기 (비동기 polling)
            while video_file.state.name == "PROCESSING":
                print("[Gemini 업로드] 처리 중...")
                await asyncio.sleep(2)
                
                def get_file_sync():
                    return genai.get_file(video_file.name)
                
                video_file = await asyncio.to_thread(get_file_sync)
                
            if video_file.state.name == "FAILED":
                raise ValueError(f"Gemini 파일 처리 실패: {video_file.state.name}")
                
            print(f"[Gemini 업로드] 처리 완료 (상태: {video_file.state.name})")
            return video_file
        except Exception as e:
            print(f"[Gemini 업로드] 오류: {e}")
            raise

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
    async def _get_video_duration(
        self, video_path: str, mime_type: str = "video/mp4"
    ) -> Optional[float]:
        """비디오 파일에서 비디오 길이(초)를 계산합니다."""
        try:
            # OpenCV는 IO 작업이므로 Thread에서 실행
            def calculate_duration():
                try:
                    cap = cv2.VideoCapture(str(video_path))
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
                except Exception as e:
                    print(f"[비디오 길이 계산 오류] {str(e)}")
                    return None

            return await asyncio.to_thread(calculate_duration)
            
        except Exception as e:
            print(f"[비디오 길이 계산 오류] {str(e)}")
            return None

    async def _optimize_video(self, input_path: str) -> str:
        """
        비디오 최적화: 해상도 축소 및 FPS 조정
        - 파일 경로를 받아 최적화된 파일 경로를 반환합니다.
        - 해상도: 높이 480px (비율 유지)
        - FPS: 15fps
        """
        print("[비디오 최적화] 전처리 시작...")
        
        # 출력 경로 생성
        input_path_obj = Path(input_path)
        output_path = str(input_path_obj.parent / f"{input_path_obj.stem}_opt{input_path_obj.suffix}")

        try:
            # 블로킹 작업들을 쓰레드로 실행
            def run_optimization():
                # 먼저 비디오 정보 확인
                cap = cv2.VideoCapture(input_path)
                if not cap.isOpened():
                    print("[비디오 최적화] ❌ 비디오 열기 실패, 원본 사용")
                    return input_path

                orig_width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
                orig_height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
                orig_fps = cap.get(cv2.CAP_PROP_FPS)
                file_size = os.path.getsize(input_path)
                cap.release()

                target_height = 480
                target_fps = 15.0

                # 이미 최적화된 상태면 패스
                if orig_height <= target_height and orig_fps <= 18.0:
                    print(
                        f"[비디오 최적화] ✅ 이미 최적화된 상태 ({orig_width}x{orig_height}, {orig_fps}fps)"
                    )
                    return input_path

                scale = target_height / float(orig_height)
                target_width = int(orig_width * scale)
                if target_width % 2 != 0:
                    target_width += 1

                print(
                    f"[비디오 최적화] {orig_width}x{orig_height} {orig_fps}fps "
                    f"-> {target_width}x{target_height} {target_fps}fps"
                )

                # FFmpeg
                import subprocess
                import shutil
                import platform
                
                ffmpeg_path = None
                # 현재 파일 위치: backend/app/services/gemini_service.py
                # backend_dir: backend
                backend_dir = Path(__file__).resolve().parents[2]
                
                is_windows = platform.system() == 'Windows'
                ffmpeg_filename = "ffmpeg.exe" if is_windows else "ffmpeg"
                local_ffmpeg = backend_dir / "bin" / ffmpeg_filename
                
                if local_ffmpeg.exists():
                    ffmpeg_path = str(local_ffmpeg)
                else:
                    ffmpeg_path = shutil.which('ffmpeg')
                
                if not ffmpeg_path:
                    print("[비디오 최적화] ⚠️ FFmpeg를 찾을 수 없습니다. 원본 사용")
                    return input_path
                
                cmd = [
                    ffmpeg_path,
                    '-i', input_path,
                    '-vf', f'scale={target_width}:{target_height},fps={target_fps}',
                    '-c:v', 'libx264',
                    '-pix_fmt', 'yuv420p',
                    '-profile:v', 'baseline',
                    '-level', '3.0',
                    '-preset', 'fast',
                    '-crf', '28',
                    '-movflags', '+faststart',
                    '-an',
                    '-y',
                    output_path
                ]
                
                result = subprocess.run(
                    cmd,
                    stdout=subprocess.PIPE,
                    stderr=subprocess.PIPE,
                    creationflags=subprocess.CREATE_NO_WINDOW if hasattr(subprocess, 'CREATE_NO_WINDOW') else 0
                )

                if result.returncode != 0:
                    print(f"[비디오 최적화] ❌ FFmpeg 실행 실패, 원본 사용")
                    return input_path

                if not os.path.exists(output_path) or os.path.getsize(output_path) == 0:
                    print("[비디오 최적화] ❌ 출력 파일 생성 실패, 원본 사용")
                    return input_path

                opt_size = os.path.getsize(output_path)
                reduction_ratio = (1 - opt_size / file_size) * 100
                print(
                    f"[비디오 최적화] ✅ 완료: "
                    f"{file_size/1024/1024:.2f}MB -> {opt_size/1024/1024:.2f}MB "
                    f"({reduction_ratio:.1f}% 감소)"
                )
                return output_path

            return await asyncio.to_thread(run_optimization)

        except Exception as e:
            import traceback
            print(f"[비디오 최적화] ❌ 오류: {e}")
            print(traceback.format_exc())
            return input_path

    # ------------------------------------------------------------------
    # 안전 점수 계산
    # ------------------------------------------------------------------
    def _calculate_safety_score(self, safety_analysis: dict) -> Tuple[int, list]:
        """
        안전 점수 및 감점 내역을 계산합니다.
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
    # 실시간 스냅샷 분석 메서드
    # ------------------------------------------------------------------
    async def analyze_realtime_snapshot(
        self,
        frame_or_video: bytes,
        content_type: str = "image/jpeg",
        age_months: Optional[int] = None,
    ) -> dict:
        """
        실시간 프레임 또는 짧은 영상을 분석합니다.
        """
        try:
            # 프롬프트
            prompt = """
다음 이미지를 분석하여 아이의 현재 상태를 평가해주세요.

**분석 항목:**
1. 현재 활동 (current_activity)
2. 안전 상태 (safety_status)
3. 발달 관찰 (developmental_observation)
4. 이벤트 요약 (event_summary)

**응답 형식 (JSON):**
```json
{
  "current_activity": {
    "activity_type": "놀이",
    "location": "거실",
    "description": "블록으로 놀고 있습니다"
  },
  "safety_status": {
    "is_safe": true,
    "risk_level": "safe",
    "concerns": []
  },
  "developmental_observation": {
    "notable": false,
    "milestone": null,
    "description": "정상적인 놀이 활동"
  },
  "event_summary": {
    "title": "안전한 놀이 활동",
    "description": "아이가 거실에서 블록으로 안전하게 놀고 있습니다.",
    "severity": "safe",
    "action_needed": null
  }
}
```
"""
            
            # 이미지/비디오 인코딩
            media_base64 = base64.b64encode(frame_or_video).decode("utf-8")
            
            # Gemini API 호출 (Sync call wrapped in thread)
            generation_config = genai.types.GenerationConfig(
                temperature=0.3,
                top_k=30,
                top_p=0.95,
            )
            
            def generate_snapshot_sync():
                return self.model.generate_content(
                    [
                        {
                            "mime_type": content_type,
                            "data": media_base64,
                        },
                        prompt,
                    ],
                    generation_config=generation_config,
                )
            
            response = await asyncio.to_thread(generate_snapshot_sync)
            
            if not response or not hasattr(response, "text"):
                raise ValueError("Gemini 응답이 올바르지 않습니다.")
            
            result_text = response.text.strip()
            result = self._extract_and_parse_json(result_text)
            
            return result
            
        except Exception as e:
            print(f"[실시간 분석 오류] {e}")
            # 기본 응답 반환
            return {
                "current_activity": {
                    "activity_type": "알 수 없음",
                    "location": "알 수 없음",
                    "description": "분석 중 오류가 발생했습니다."
                },
                "safety_status": {
                    "is_safe": True,
                    "risk_level": "safe",
                    "concerns": []
                },
                "developmental_observation": {
                    "notable": False,
                    "milestone": None,
                    "description": "분석 불가"
                },
                "event_summary": {
                    "title": "분석 오류",
                    "description": str(e),
                    "severity": "info",
                    "action_needed": None
                }
            }

    # ------------------------------------------------------------------
    # 텍스트 생성 유틸 (LLM 모드)
    # ------------------------------------------------------------------
    async def generate_text_from_prompt(self, prompt: str) -> str:
        """
        순수 텍스트 프롬프트를 사용하여 텍스트 응답을 생성합니다. (LLM 모드)
        """
        try:
            print(f"[Gemini] 텍스트 생성 요청: {prompt[:50]}...")
            
            def generate_text_sync():
                return self.model.generate_content(prompt)
                
            response = await asyncio.to_thread(generate_text_sync)
            
            if response and hasattr(response, "text"):
                return response.text.strip()
            return "응답을 생성할 수 없습니다."
        except Exception as e:
            print(f"[Gemini 텍스트 생성 오류] {e}")
            return f"오류가 발생했습니다: {str(e)}"

    # ------------------------------------------------------------------
    # 메인 엔트리: 3단계 메타데이터 기반 분석
    # ------------------------------------------------------------------
    async def analyze_video_vlm(
        self,
        video_path: str,
        content_type: str,
        stage: Optional[str] = None,
        age_months: Optional[int] = None,
        generation_params: Optional[dict] = None,
    ) -> dict:
        """
        메타데이터 방식으로 비디오를 분석합니다.
        
        Args:
            video_path: 비디오 파일 경로 (문자열)
        """
        try:
            mime_type = content_type or "video/mp4"

            # 0단계: 비디오 최적화
            print(f"[0단계] 비디오 최적화 시작 (파일: {video_path})")
            optimized_video_path = await self._optimize_video(video_path)
            
            # 1단계: VLM 호출
            print("[1단계] 비디오에서 메타데이터 추출 중...")

            try:
                # File API 사용
                video_file = await self._upload_to_gemini(optimized_video_path, mime_type)
                
                metadata_prompt = self._load_prompt("vlm_metadata.ko.txt")
                
                vlm_generation_config = genai.types.GenerationConfig(
                    temperature=0.0,
                    top_k=30,
                    top_p=0.95,
                )

                print("[1단계] Gemini VLM API 호출 중...")
                def generate_metadata_sync():
                    return self.model.generate_content(
                        [video_file, metadata_prompt],
                        generation_config=vlm_generation_config,
                    )
                
                response = await asyncio.to_thread(generate_metadata_sync)
                
                # 원격 파일 삭제
                try:
                    await asyncio.to_thread(genai.delete_file, video_file.name)
                except Exception as e:
                    print(f"[Gemini 업로드] 원격 파일 삭제 실패: {e}")

                if not response or not hasattr(response, "text"):
                    raise ValueError("Gemini VLM 응답이 올바르지 않습니다.")

                metadata_text = response.text.strip()
                metadata = self._extract_and_parse_json(metadata_text)
                
            except Exception as e:
                print(f"[1단계] ❌ 메타데이터 추출 실패: {e}")
                raise
            finally:
                if optimized_video_path != video_path and os.path.exists(optimized_video_path):
                    try:
                        os.unlink(optimized_video_path)
                    except Exception:
                        pass

            # 1-1) 비디오 길이 계산
            calculated_duration = await self._get_video_duration(video_path, mime_type)
            if calculated_duration:
                video_duration_seconds = calculated_duration
                if "video_metadata" not in metadata:
                    metadata["video_metadata"] = {}
                metadata["video_metadata"]["total_duration_seconds"] = calculated_duration
            else:
                video_duration_seconds = metadata.get("video_metadata", {}).get("total_duration_seconds")

            # 메타데이터 상한 적용
            timeline_obs = metadata.get("timeline_observations")
            if isinstance(timeline_obs, list) and len(timeline_obs) > self.MAX_TIMELINE_OBS:
                metadata["timeline_observations"] = timeline_obs[: self.MAX_TIMELINE_OBS]

            safety_obs = metadata.get("safety_observations")
            if isinstance(safety_obs, list) and len(safety_obs) > self.MAX_SAFETY_OBS:
                metadata["safety_observations"] = safety_obs[: self.MAX_SAFETY_OBS]

            # 2단계: LLM 호출
            detected_stage = stage
            stage_determination_result = None
            initial_stage_from_age = None
            
            video_duration_minutes = (
                round(video_duration_seconds / 60, 2)
                if video_duration_seconds
                else None
            )

            if stage is None:
                if age_months is not None:
                    initial_stage_from_age = self._determine_stage_from_age_months(age_months)

                stage_header_prompt = self._load_prompt("header.ko.txt")
                age_hint = ""
                if age_months is not None and initial_stage_from_age is not None:
                    age_hint = f"\n[개월 수 정보]\n- 이 아이의 개월 수: {age_months}개월\n- 개월 수 기반 예상 단계: {initial_stage_from_age}단계\n"

                metadata_json_str = json.dumps(metadata, ensure_ascii=False, separators=(",", ":"))
                combined_prompt_stage = f"[입력 방식]\n비디오 대신 비디오에서 추출된 메타데이터를 제공합니다.\n{age_hint}\n[메타데이터]\n```json\n{metadata_json_str}\n```\n\n{stage_header_prompt}\n"

                def generate_stage_sync():
                    return self.model.generate_content(combined_prompt_stage)
                
                response = await asyncio.to_thread(generate_stage_sync)

                if not response or not hasattr(response, "text"):
                    raise ValueError("Gemini 단계 판단 응답이 올바르지 않습니다.")

                stage_determination_result = self._extract_and_parse_json(response.text.strip())
                detected_stage = stage_determination_result.get("detected_stage")
                if not detected_stage:
                    raise ValueError("발달 단계를 판단할 수 없습니다.")
            else:
                detected_stage = stage

            # 3단계: LLM 호출
            if age_months is None and stage_determination_result:
                estimated_age = stage_determination_result.get("age_months_estimate")
                if estimated_age:
                    age_months = estimated_age

            stage_prompt = self._load_vlm_prompt(
                stage=detected_stage,
                age_months=age_months,
                video_duration_seconds=video_duration_seconds,
            )

            metadata_json_str = json.dumps(metadata, ensure_ascii=False, separators=(",", ":"))
            combined_prompt_detail = f"[입력 방식 - 중요!]\n비디오를 직접 보는 것이 아니라, 비디오에서 이미 추출된 메타데이터를 분석합니다.\n[메타데이터]\n```json\n{metadata_json_str}\n```\n\n{stage_prompt}\n"

            generation_config = None
            if generation_params:
                generation_config = genai.types.GenerationConfig(
                    temperature=generation_params.get("temperature", 0.4),
                    top_k=generation_params.get("top_k", 30),
                    top_p=generation_params.get("top_p", 0.95),
                )

            def generate_detail_sync():
                return self.model.generate_content(
                    combined_prompt_detail,
                    generation_config=generation_config,
                )
            
            response = await asyncio.to_thread(generate_detail_sync)

            if not response or not hasattr(response, "text"):
                raise ValueError("Gemini 상세 분석 응답이 올바르지 않습니다.")

            result_text = response.text.strip()
            analysis_data = self._extract_and_parse_json(result_text)

            # 병합 및 마무리
            if stage_determination_result:
                analysis_data["stage_determination"] = {
                    "detected_stage": stage_determination_result.get("detected_stage"),
                    "confidence": stage_determination_result.get("confidence"),
                    "evidence": stage_determination_result.get("evidence", []),
                    "alternative_stages": stage_determination_result.get("alternative_stages", []),
                }

                if "meta" not in analysis_data:
                    analysis_data["meta"] = {}
                if "assumed_stage" not in analysis_data["meta"] or not analysis_data["meta"].get("assumed_stage"):
                    analysis_data["meta"]["assumed_stage"] = detected_stage
                if age_months is None:
                    estimated_age = stage_determination_result.get("age_months_estimate")
                    if estimated_age and ("age_months" not in analysis_data["meta"] or analysis_data["meta"].get("age_months") is None):
                        analysis_data["meta"]["age_months"] = estimated_age

            if video_duration_minutes is not None:
                if "meta" not in analysis_data:
                    analysis_data["meta"] = {}
                analysis_data["meta"]["observation_duration_minutes"] = video_duration_minutes

            if "safety_analysis" in analysis_data:
                safety_score, incident_summary = self._calculate_safety_score(analysis_data["safety_analysis"])
                analysis_data["safety_analysis"]["safety_score"] = safety_score
                analysis_data["safety_analysis"]["incident_summary"] = incident_summary
                
                score = analysis_data["safety_analysis"]["safety_score"]
                if score >= 90: level = "매우높음"
                elif score >= 75: level = "높음"
                elif score >= 65: level = "중간"
                elif score >= 55: level = "낮음"
                else: level = "매우낮음"
                analysis_data["safety_analysis"]["overall_safety_level"] = level

            analysis_data["_extracted_metadata"] = metadata
            return analysis_data

        except Exception as e:
            import traceback
            error_msg = str(e)
            print(f"❌ Gemini 메타데이터 기반 비디오 분석 오류: {error_msg}")
            print(traceback.format_exc())
            raise Exception(f"비디오 분석 중 오류 발생: {error_msg}")


# 싱글톤 인스턴스
_gemini_service: Optional[GeminiService] = None


def get_gemini_service() -> GeminiService:
    """Gemini 서비스 인스턴스를 반환합니다."""
    global _gemini_service
    if _gemini_service is None:
        _gemini_service = GeminiService()
    return _gemini_service

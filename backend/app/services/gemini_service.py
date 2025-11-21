"""Gemini AI 비디오 분석 서비스"""

import base64
import json
import os
import tempfile
from pathlib import Path
from typing import Optional, Dict

import cv2
import google.generativeai as genai
import yaml
from dotenv import load_dotenv
from fastapi import UploadFile

# .env 파일 로드
env_path = Path(__file__).parent.parent.parent / '.env'
load_dotenv(dotenv_path=env_path)


class GeminiService:
    """Gemini 2.5 Flash를 사용한 비디오 분석 서비스"""

    def __init__(self):
        """Gemini API 클라이언트 초기화"""
        api_key = os.getenv("GEMINI_API_KEY")
        if not api_key:
            raise ValueError(
                "GEMINI_API_KEY 환경 변수가 설정되지 않았습니다.\n"
                f"backend/.env 파일에 GEMINI_API_KEY를 설정해주세요.\n"
                f".env 파일 경로: {env_path}"
            )
        
        genai.configure(api_key=api_key)
        
        # GenerationConfig 설정
        generation_config = genai.types.GenerationConfig(
            temperature=0.4,  # 따뜻한 말투와 공감 능력을 위해 상향 조정
            top_k=30,         # 다양한 감성 어휘 사용을 위해 후보군 확보
            top_p=0.95        # 자연스러운 문장 구사
        )
        
        self.model = genai.GenerativeModel(
            model_name='gemini-2.5-flash',
            generation_config=generation_config
        )
        
        # 프롬프트 캐시 딕셔너리 초기화
        self.prompt_cache = {}

    def _load_prompt(self, filename: str) -> str:
        """프롬프트 파일을 캐시하여 반환합니다."""
        # 캐시 확인
        if filename in self.prompt_cache:
            return self.prompt_cache[filename]
        
        prompts_dir = Path(__file__).parent.parent / 'prompts'
        prompt_path = prompts_dir / filename
        
        try:
            # 1. 직접 경로 시도
            if (prompts_dir / filename).exists():
                prompt_path = prompts_dir / filename
            # 2. baby_dev_safety/analysis 시도
            elif (prompts_dir / 'baby_dev_safety' / 'analysis' / filename).exists():
                prompt_path = prompts_dir / 'baby_dev_safety' / 'analysis' / filename
            # 3. baby_dev_safety/extraction 시도
            elif (prompts_dir / 'baby_dev_safety' / 'extraction' / filename).exists():
                prompt_path = prompts_dir / 'baby_dev_safety' / 'extraction' / filename
            else:
                # 못 찾으면 기본 경로로 설정하고 에러 발생 유도
                prompt_path = prompts_dir / filename

            with open(prompt_path, 'r', encoding='utf-8') as f:
                content = f.read()
                # 캐시에 저장
                self.prompt_cache[filename] = content
                print(f"[프롬프트 캐시 등록] {filename} ({len(content)}자)")
                return content
        except FileNotFoundError:
            error_msg = f"프롬프트 파일을 찾을 수 없습니다: {filename}"
            print(f"❌ {error_msg}")
            raise FileNotFoundError(error_msg)
    
    def _load_vlm_prompt(self, stage: str, age_months: Optional[int] = None, video_duration_seconds: Optional[float] = None) -> str:
        """
        VLM 발달 단계별 프롬프트를 로드합니다.
        
        Args:
            stage: 발달 단계 ("1", "2", "3", "4", "5", "6")
            age_months: 아이의 개월 수 (선택)
            
        Returns:
            공통 헤더 + 단계별 프롬프트가 결합된 프롬프트 문자열
        """
        # backend/app/prompts/baby_dev_safety 디렉토리 찾기
        prompts_dir = Path(__file__).parent.parent / 'prompts'
        baby_dev_safety_dir = prompts_dir / 'baby_dev_safety'
        
        if not baby_dev_safety_dir.exists():
            raise FileNotFoundError(
                f"VLM 프롬프트 디렉토리를 찾을 수 없습니다: {baby_dev_safety_dir}"
            )
        
        # config.yaml 읽기
        config_path = baby_dev_safety_dir / 'config.yaml'
        if not config_path.exists():
            raise FileNotFoundError(f"설정 파일을 찾을 수 없습니다: {config_path}")
        
        with open(config_path, 'r', encoding='utf-8') as f:
            config = yaml.safe_load(f)
        
        if stage not in config['stages']:
            raise ValueError(f"지원하지 않는 발달 단계입니다: {stage}. 지원 단계: {list(config['stages'].keys())}")
        
        stage_config = config['stages'][stage]
        prompt_file = stage_config['prompt_file']
        
        # 단계별 프롬프트 로드 (analysis 폴더 내)
        stage_prompt_path = baby_dev_safety_dir / 'analysis' / prompt_file
        if not stage_prompt_path.exists():
            raise FileNotFoundError(f"단계별 프롬프트 파일을 찾을 수 없습니다: {stage_prompt_path}")
        
        with open(stage_prompt_path, 'r', encoding='utf-8') as f:
            stage_prompt = f.read()

        # 공통 안전 규칙 로드 (analysis 폴더 내)
        common_rules_path = baby_dev_safety_dir / 'analysis' / 'common_safety_rules.ko.txt'
        if not common_rules_path.exists():
            raise FileNotFoundError(f"공통 안전 규칙 파일을 찾을 수 없습니다: {common_rules_path}")
            
        with open(common_rules_path, 'r', encoding='utf-8') as f:
            common_safety_rules = f.read()
        
        # 메타데이터 추가
        metadata_items = []
        if age_months is not None:
            metadata_items.append(f"- age_months: {age_months}")
        metadata_items.append(f"- assumed_stage: {stage}")
        if video_duration_seconds is not None:
            # 비디오 길이 정보 추가 (초 단위)
            video_duration_minutes = round(video_duration_seconds / 60, 2)
            metadata_items.append(f"- video_duration_seconds: {video_duration_seconds}")
            metadata_items.append(f"- video_duration_minutes: {video_duration_minutes}")
            metadata_items.append(f"- video_total_time: {self._format_duration(video_duration_seconds)}")
        
        metadata_section = ""
        if metadata_items:
            metadata_section = f"\n\n[메타데이터]\n" + "\n".join(metadata_items) + "\n"
        
        # 프롬프트 결합: 단계별 프롬프트 + 공통 안전 규칙 + 메타데이터
        combined_prompt = f"{stage_prompt}\n\n{common_safety_rules}{metadata_section}"
        
        print(f"[VLM 프롬프트 로드 완료] 단계: {stage}, 길이: {len(combined_prompt)}자 (공통 규칙 포함)")
        
        return combined_prompt

    def _format_duration(self, seconds: float) -> str:
        """
        초를 HH:MM:SS 형식으로 변환합니다.
        
        Args:
            seconds: 초 단위 시간
            
        Returns:
            HH:MM:SS 형식 문자열
        """
        hours = int(seconds // 3600)
        minutes = int((seconds % 3600) // 60)
        secs = int(seconds % 60)
        return f"{hours:02d}:{minutes:02d}:{secs:02d}"

    def _get_video_duration(self, video_bytes: bytes, mime_type: str) -> Optional[float]:
        """
        비디오 바이트 데이터에서 비디오 길이(초)를 계산합니다.
        
        Args:
            video_bytes: 비디오 바이트 데이터
            mime_type: 비디오 MIME 타입
            
        Returns:
            비디오 길이(초), 계산 실패 시 None
        """
        try:
            # 임시 파일에 저장
            with tempfile.NamedTemporaryFile(delete=False, suffix='.mp4') as temp_file:
                temp_file.write(video_bytes)
                temp_path = temp_file.name
            
            try:
                # OpenCV로 비디오 열기
                cap = cv2.VideoCapture(temp_path)
                if not cap.isOpened():
                    print(f"[비디오 길이 계산 실패] 비디오를 열 수 없습니다.")
                    return None
                
                # FPS와 프레임 수 가져오기
                fps = cap.get(cv2.CAP_PROP_FPS)
                frame_count = cap.get(cv2.CAP_PROP_FRAME_COUNT)
                
                cap.release()
                
                if fps > 0 and frame_count > 0:
                    duration = frame_count / fps
                    print(f"[비디오 길이 계산 성공] FPS: {fps}, 프레임 수: {frame_count}, 길이: {duration}초")
                    return duration
                else:
                    print(f"[비디오 길이 계산 실패] FPS 또는 프레임 수가 유효하지 않습니다. FPS: {fps}, 프레임 수: {frame_count}")
                    return None
            finally:
                # 임시 파일 삭제
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
        """
        print("[비디오 최적화] 전처리 시작...")
        
        # 임시 파일 생성
        with tempfile.NamedTemporaryFile(delete=False, suffix='.mp4') as input_temp:
            input_temp.write(video_bytes)
            input_path = input_temp.name
            
        output_path = input_path.replace('.mp4', '_opt.mp4')
        
        try:
            cap = cv2.VideoCapture(input_path)
            if not cap.isOpened():
                print("[비디오 최적화] 비디오 열기 실패, 원본 사용")
                return video_bytes
                
            # 원본 정보
            orig_width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
            orig_height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
            orig_fps = cap.get(cv2.CAP_PROP_FPS)
            frame_count = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
            
            # 최적화 목표 (480p, 1fps)
            target_height = 480
            target_fps = 1.0
            
            # 이미 최적화된 상태(또는 그보다 작은 경우)라면 패스
            if orig_height <= target_height and orig_fps <= 2:
                 print(f"[비디오 최적화] 이미 최적화된 상태임 ({orig_width}x{orig_height}, {orig_fps}fps)")
                 cap.release()
                 return video_bytes

            # 비율 유지하며 리사이징
            scale = target_height / orig_height
            target_width = int(orig_width * scale)
            
            print(f"[비디오 최적화] {orig_width}x{orig_height} {orig_fps}fps -> {target_width}x{target_height} {target_fps}fps")

            # Writer 설정 (mp4v 코덱 사용)
            fourcc = cv2.VideoWriter_fourcc(*'mp4v')
            out = cv2.VideoWriter(output_path, fourcc, target_fps, (target_width, target_height))
            
            # 프레임 처리: 원본 FPS에 맞춰 스킵
            step = int(orig_fps / target_fps)
            if step < 1: step = 1
            
            count = 0
            processed_frames = 0
            
            while cap.isOpened():
                ret, frame = cap.read()
                if not ret:
                    break
                    
                if count % step == 0:
                    # 리사이징
                    resized = cv2.resize(frame, (target_width, target_height))
                    out.write(resized)
                    processed_frames += 1
                
                count += 1
                
            cap.release()
            out.release()
            
            # 최적화된 파일 읽기
            if not os.path.exists(output_path) or os.path.getsize(output_path) == 0:
                print("[비디오 최적화] 출력 파일 생성 실패, 원본 사용")
                return video_bytes

            with open(output_path, 'rb') as f:
                optimized_bytes = f.read()
                
            reduction_ratio = (1 - len(optimized_bytes) / len(video_bytes)) * 100
            print(f"[비디오 최적화 완료] {len(video_bytes)/1024/1024:.2f}MB -> {len(optimized_bytes)/1024/1024:.2f}MB ({reduction_ratio:.1f}% 감소)")
            return optimized_bytes
            
        except Exception as e:
            print(f"[비디오 최적화 오류] {e}")
            return video_bytes # 오류 시 원본 반환
        finally:
            # 정리
            try:
                if os.path.exists(input_path): os.unlink(input_path)
                if os.path.exists(output_path): os.unlink(output_path)
            except Exception as e:
                print(f"[비디오 최적화] 임시 파일 삭제 실패: {e}")

    async def analyze_video_vlm(
        self,
        video_bytes: bytes,
        content_type: str,
        stage: Optional[str] = None,
        age_months: Optional[int] = None,
        generation_params: Optional[dict] = None,
    ) -> dict:
        """
        메타데이터 방식으로 비디오를 분석합니다.
        3단계 프로세스: 1) VLM으로 메타데이터 추출, 2) LLM으로 발달 단계 판단, 3) LLM으로 상세 분석
        
        Args:
            video_bytes: 비디오 바이트 데이터
            content_type: 비디오 MIME 타입
            stage: 발달 단계 ("1", "2", "3", "4", "5", "6"). None이면 자동 판단
            age_months: 아이의 개월 수 (선택)
            generation_params: AI 생성 설정 (temperature, top_k, top_p)
            
        Returns:
            VLM 스키마에 맞는 분석 결과 딕셔너리
        """
        try:
            # 비디오 파일 읽기 코드 제거 - 이미 라우터에서 읽은 video_bytes 사용
            mime_type = content_type or "video/mp4"
            
            # ========================================
            # [0단계] 비디오 최적화 (전처리)
            # ========================================
            optimized_video_bytes = self._optimize_video(video_bytes)
            
            # ========================================
            # [1차 VLM] 비디오 → 메타데이터 추출
            # ========================================
            print("[1차 VLM] 비디오에서 메타데이터 추출 중...")
            
            video_base64 = base64.b64encode(optimized_video_bytes).decode('utf-8')
            
            # 메타데이터 추출 프롬프트 로드 (이름 변경됨)
            metadata_prompt = self._load_prompt('vlm_metadata.ko.txt')
            
            # VLM 호출 (사실 기반 추출을 위해 temperature=0.0 설정)
            vlm_generation_config = genai.types.GenerationConfig(
                temperature=0.0,
                top_k=32,
                top_p=0.95
            )
            
            response = self.model.generate_content(
                [
                    {
                        'mime_type': mime_type,
                        'data': video_base64
                    },
                    metadata_prompt
                ],
                generation_config=vlm_generation_config
            )
            
            # 메타데이터 파싱
            metadata_text = response.text.strip()
            metadata = self._extract_and_parse_json(metadata_text)
            
            print(f"[1차 완료] 관찰 {len(metadata.get('timeline_observations', []))}개, "
                  f"안전 이벤트 {len(metadata.get('safety_observations', []))}개")
            
            # 비디오 길이 (메타데이터에서 가져오기, 없으면 계산)
            video_duration_seconds = metadata.get('video_metadata', {}).get('total_duration_seconds')
            if not video_duration_seconds:
                video_duration_seconds = self._get_video_duration(video_bytes, mime_type)
                if video_duration_seconds and 'video_metadata' in metadata:
                    metadata['video_metadata']['total_duration_seconds'] = video_duration_seconds
            
            video_duration_minutes = round(video_duration_seconds / 60, 2) if video_duration_seconds else None
            print(f"[비디오 길이] {video_duration_seconds}초 ({video_duration_minutes}분)")
            
            # ========================================
            # [2차 LLM] 메타데이터 → 발달 단계 판단
            # ========================================
            detected_stage = stage
            stage_determination_result = None
            
            if stage is None:
                print("[2차 LLM] 메타데이터로 발달 단계 판단 중...")
                
                # 기존 common_header 프롬프트 로드 (경로 변경됨)
                stage_prompt = self._load_prompt('common_header.ko.txt')
                
                # 프롬프트 앞에 메타데이터 추가
                combined_prompt = f"""[입력 방식]
비디오 대신 비디오에서 추출된 메타데이터를 제공합니다.
이 메타데이터를 바탕으로 발달 단계를 판단하세요.

[메타데이터]
```json
{json.dumps(metadata, ensure_ascii=False, indent=2)}
```

{stage_prompt}

[판단 방법]
- timeline_observations에서 관찰된 행동 패턴 분석
- behavior_summary에서 각 행동의 빈도 확인
- 위 발달 단계 기준과 비교하여 판단
- evidence에는 메타데이터의 구체적인 빈도/지속시간 포함
"""
                
                # LLM 호출 (비디오 없이 텍스트만!)
                response = self.model.generate_content(combined_prompt)
                
                # 결과 파싱
                result_text = response.text.strip()
                stage_determination_result = self._extract_and_parse_json(result_text)
                detected_stage = stage_determination_result.get('detected_stage')
                
                if not detected_stage:
                    raise ValueError("발달 단계를 판단할 수 없습니다.")
                
                print(f"[2차 완료] 판단된 단계: {detected_stage}, "
                      f"신뢰도: {stage_determination_result.get('confidence')}")
            else:
                print(f"[발달 단계] 제공된 단계 사용: {stage}단계")
                detected_stage = stage
            
            # ========================================
            # [3차 LLM] 메타데이터 → 상세 분석
            # ========================================
            print(f"[3차 LLM] {detected_stage}단계 기준으로 상세 분석 중...")
            
            # age_months 업데이트 (판단 결과에 추정값이 있으면 사용)
            if age_months is None and stage_determination_result:
                estimated_age = stage_determination_result.get('age_months_estimate')
                if estimated_age:
                    age_months = estimated_age
                    print(f"[개월 수] 판단 결과에서 추정: {age_months}개월")
            
            # 기존 단계별 프롬프트 로드
            stage_prompt = self._load_vlm_prompt(
                stage=detected_stage,
                age_months=age_months,
                video_duration_seconds=video_duration_seconds
            )
            
            # 프롬프트 앞에 메타데이터 추가
            combined_prompt = f"""[입력 방식 - 중요!]
비디오를 직접 보는 것이 아니라, 비디오에서 이미 추출된 메타데이터를 분석합니다.
메타데이터에는 timeline_observations, behavior_summary, safety_observations 등이 포함되어 있습니다.

[메타데이터]
```json
{json.dumps(metadata, ensure_ascii=False, indent=2)}
```

{stage_prompt}

[메타데이터 기반 분석 방법]
아래 프롬프트에서 "탐지", "관찰", "기록" 등의 표현은 메타데이터를 분석하는 것으로 해석하세요.

1. development_analysis.skills 생성:
   - behavior_summary에서 각 행동의 빈도(count)와 지속시간(total_duration_seconds) 확인
   - timeline_observations에서 해당 행동의 구체적 예시(examples) 추출
   - frequency는 behavior_summary의 count 값 사용
   - examples는 timeline_observations에서 해당 action의 detail 사용
   
   예시:
   behavior_summary에 "혼자 앉기": {{"count": 12, "total_duration_seconds": 360}}이 있고
   timeline_observations에 [{{"action": "혼자 앉기", "detail": "지지 없이 30초간 앉음", "timestamp": "00:00:05"}}]가 있으면
   →  skills에 {{"name": "혼자 앉기", "present": true, "frequency": 12, "examples": ["00:00:05 - 지지 없이 30초간 앉음"]}}

2. safety_analysis.incident_events 생성:
   - safety_observations의 각 항목을 incident_events로 변환
   - event_id는 "E001", "E002" 형식으로 순차 부여
   - severity는 safety_observations의 severity 값 사용
   - timestamp_range는 safety_observations의 timestamp 사용 (단일 시점인 경우 +5초 하여 "HH:MM:SS-HH:MM:SS" 범위로 변환 필수)
   - description은 safety_observations의 description에 trigger_behavior와 environment_factor를 포함하여 상세히 기술
   - has_safety_device는 safety_observations의 has_safety_device 값 사용

3. safety_analysis.critical_events 생성:
   - safety_observations 중 severity가 '사고발생' 또는 '위험'인 항목은 critical_events에도 별도로 기록
   - event_type은 severity에 따라 '실제사고' 또는 '사고직전위험상황'으로 분류
   - estimated_outcome은 상황에 맞춰 추론

4. safety_analysis.environment_risks 생성:
   - environment.hazards_identified의 각 항목을 environment_risks로 변환
   - risk_type은 hazards의 type 사용
   - severity는 hazards의 severity 사용
   - environment_factor는 hazards의 description 사용
   - has_safety_device와 safety_device_type은 environment.safety_devices 목록을 참고하여 해당 위험 요소에 대한 안전장치가 있는지 추론하여 기입

5. safety_analysis.overall_safety_level 평가:
   - adult_presence 정보를 적극 반영하여 보호자의 개입 수준과 동반 여부를 고려해 안전 레벨을 판단

6. development_analysis.next_stage_signs 생성:
   - behavior_summary나 timeline_observations에서 현재 단계보다 더 발달된 행동(다음 단계 특징)이 관찰되면 이를 추출하여 기록

7. development_analysis.summary 생성:
   - behavior_summary의 전체 패턴을 보고 2-3문장으로 요약
   - 빈도가 높은 행동들을 중심으로 서술

8. 출력 스키마:
   - 위 프롬프트의 JSON 스키마를 정확히 따를 것
   - 모든 필수 필드 포함
"""
            
            # GenerationConfig 설정
            generation_config = None
            if generation_params:
                print(f"[Generation Config] 사용자 설정 적용: {generation_params}")
                generation_config = genai.types.GenerationConfig(
                    temperature=generation_params.get('temperature', 0.4),
                    top_k=generation_params.get('top_k', 30),
                    top_p=generation_params.get('top_p', 0.95)
                )
            
            # LLM 호출 (비디오 없이 텍스트만!)
            print("[Gemini API 호출 시작 (LLM 모드)]")
            response = self.model.generate_content(
                combined_prompt,
                generation_config=generation_config
            )
            print("[Gemini API 호출 완료]")
            
            # 응답 파싱
            if not response or not hasattr(response, 'text'):
                raise ValueError("Gemini API 응답이 올바르지 않습니다.")
            
            result_text = response.text.strip()
            print(f"[Gemini 원본 응답 길이] {len(result_text)}자")
            print(f"[Gemini 원본 응답 미리보기 (처음 500자)]\n{result_text[:500]}")
            
            # JSON 추출 및 파싱
            try:
                analysis_data = self._extract_and_parse_json(result_text)
                print(f"[JSON 파싱 성공] 파싱된 키: {list(analysis_data.keys())}")
                
                # 판단 결과 정보 추가 (자동 판단한 경우)
                if stage_determination_result:
                    # stage_determination 정보 추가
                    analysis_data['stage_determination'] = {
                        'detected_stage': stage_determination_result.get('detected_stage'),
                        'confidence': stage_determination_result.get('confidence'),
                        'evidence': stage_determination_result.get('evidence', []),
                        'alternative_stages': stage_determination_result.get('alternative_stages', [])
                    }
                    
                    # meta 정보 설정
                    if 'meta' not in analysis_data:
                        analysis_data['meta'] = {}
                    
                    # assumed_stage 설정
                    if 'assumed_stage' not in analysis_data['meta'] or not analysis_data['meta'].get('assumed_stage'):
                        analysis_data['meta']['assumed_stage'] = detected_stage
                    
                    # 개월 수 추정값이 있으면 meta에 추가 (기존 값이 없을 때만)
                    if age_months is None:
                        estimated_age = stage_determination_result.get('age_months_estimate')
                        if estimated_age and ('age_months' not in analysis_data['meta'] or analysis_data['meta'].get('age_months') is None):
                            analysis_data['meta']['age_months'] = estimated_age
                    
                    print(f"[2단계 완료] 상세 분석 완료. 최종 발달 단계: {detected_stage}단계")
                
                # 비디오 길이 자동 설정 (계산된 값이 있으면 항상 덮어쓰기)
                if video_duration_minutes is not None:
                    if 'meta' not in analysis_data:
                        analysis_data['meta'] = {}
                    analysis_data['meta']['observation_duration_minutes'] = video_duration_minutes
                    print(f"[비디오 길이 자동 설정] observation_duration_minutes: {video_duration_minutes}분")
                
                # safety_score가 없으면 incident_summary 또는 incident_events를 기반으로 계산
                if 'safety_analysis' in analysis_data:
                    safety_analysis = analysis_data['safety_analysis']
                    if 'safety_score' not in safety_analysis or safety_analysis.get('safety_score') is None:
                        total_deduction = 0
                        
                        # 방법 1: incident_summary의 applied_deduction 사용
                        if 'incident_summary' in safety_analysis and isinstance(safety_analysis['incident_summary'], list):
                            for item in safety_analysis['incident_summary']:
                                if isinstance(item, dict) and 'applied_deduction' in item:
                                    deduction = item.get('applied_deduction', 0)
                                    if isinstance(deduction, (int, float)):
                                        total_deduction += deduction
                        
                        # 방법 2: incident_summary에 applied_deduction이 없으면 incident_events를 기반으로 계산
                        if total_deduction == 0 and 'incident_events' in safety_analysis and isinstance(safety_analysis['incident_events'], list):
                            # 감점 규칙: 사고/사고발생(-50, 최대 1회), 위험(-30, 최대 1회), 주의(-10, 최대 1회), 권장(-2점 × 발생 건수, 최대 -16점)
                            has_accident = False
                            has_danger = False
                            has_warning = False
                            recommended_count = 0
                            
                            for event in safety_analysis['incident_events']:
                                if isinstance(event, dict):
                                    severity = event.get('severity', '')
                                    # '사고' 또는 '사고발생' 모두 처리
                                    if (severity == '사고' or severity == '사고발생') and not has_accident:
                                        total_deduction -= 50
                                        has_accident = True
                                    elif severity == '위험' and not has_danger:
                                        total_deduction -= 30
                                        has_danger = True
                                    elif severity == '주의' and not has_warning:
                                        total_deduction -= 10
                                        has_warning = True
                                    elif severity == '권장':
                                        recommended_count += 1
                            
                            # 권장 감점 계산 (최대 -16점)
                            recommended_deduction = min(recommended_count * 2, 16)
                            total_deduction -= recommended_deduction
                        
                        safety_score = 100 + total_deduction
                        # 최종 점수는 50점보다 낮아지면 50점으로 처리
                        safety_score = max(50, safety_score)
                        safety_analysis['safety_score'] = safety_score
                        
                        if total_deduction == 0 and not ('incident_summary' in safety_analysis or 'incident_events' in safety_analysis):
                            print(f"[safety_score 기본값 설정] 100점 (incident 데이터 없음)")
                        else:
                            print(f"[safety_score 계산 완료] {safety_score}점 (감점 합계: {total_deduction})")
                    
                    # safety_score가 있으면 overall_safety_level 자동 설정 (항상 덮어쓰기)
                    if 'safety_score' in safety_analysis and isinstance(safety_analysis.get('safety_score'), (int, float)):
                        safety_score = safety_analysis['safety_score']
                        
                        # safety_score를 기반으로 항상 자동 설정
                        if safety_score >= 90:
                            safety_analysis['overall_safety_level'] = '매우높음'
                        elif safety_score >= 75:
                            safety_analysis['overall_safety_level'] = '높음'
                        elif safety_score >= 65:
                            safety_analysis['overall_safety_level'] = '중간'
                        elif safety_score >= 55:
                            safety_analysis['overall_safety_level'] = '낮음'
                        else:
                            safety_analysis['overall_safety_level'] = '매우낮음'
                        
                        print(f"[안전도 레벨 자동 설정] safety_score: {safety_score} → overall_safety_level: {safety_analysis['overall_safety_level']}")
                
                # 메타데이터도 결과에 포함 (시각화/디버깅용)
                analysis_data['_extracted_metadata'] = metadata
                
                print(f"[3차 완료] 상세 분석 완료")
                
                return analysis_data
            except json.JSONDecodeError as json_err:
                print(f"⚠️ JSON 파싱 실패.")
                print(f"[추출된 JSON 텍스트 (처음 500자)]\n{result_text[:500]}")
                print(f"[추출된 JSON 텍스트 (마지막 500자)]\n{result_text[-500:]}")
                print(f"[에러 위치] {json_err}")
                raise ValueError(f"AI 응답을 파싱할 수 없습니다: {str(json_err)}")
            
        except json.JSONDecodeError as e:
            import traceback
            print(f"❌ JSON 파싱 오류: {str(e)}")
            print(f"상세:\n{traceback.format_exc()}")
            raise ValueError(f"AI 응답을 파싱할 수 없습니다: {str(e)}")
        except ValueError as e:
            raise
        except Exception as e:
            import traceback
            error_trace = traceback.format_exc()
            error_msg = str(e)
            print(f"❌ Gemini 메타데이터 기반 비디오 분석 오류: {error_msg}")
            print(f"상세 에러:\n{error_trace}")
            raise Exception(f"비디오 분석 중 오류 발생: {error_msg}")
    
    def _extract_and_parse_json(self, text: str) -> dict:
        """텍스트에서 JSON 추출 및 파싱"""
        cleaned_text = text
        
        # 마크다운 코드 블록 제거
        if '```json' in cleaned_text:
            start = cleaned_text.find('```json')
            if start != -1:
                start = cleaned_text.find('\n', start) + 1
                end = cleaned_text.find('```', start)
                if end != -1:
                    cleaned_text = cleaned_text[start:end].strip()
        elif '```' in cleaned_text:
            start = cleaned_text.find('```')
            if start != -1:
                start = cleaned_text.find('\n', start) + 1
                end = cleaned_text.find('```', start)
                if end != -1:
                    cleaned_text = cleaned_text[start:end].strip()
        
        # 중괄호 카운팅으로 JSON 추출
        first_brace = cleaned_text.find('{')
        if first_brace != -1:
            brace_count = 0
            last_brace = first_brace
            for i in range(first_brace, len(cleaned_text)):
                char = cleaned_text[i]
                if char == '{':
                    brace_count += 1
                elif char == '}':
                    brace_count -= 1
                    if brace_count == 0:
                        last_brace = i
                        break
            
            if brace_count == 0:
                cleaned_text = cleaned_text[first_brace:last_brace + 1]
            else:
                # 중괄호가 맞지 않으면 마지막 } 사용 (Fallback)
                last_brace = cleaned_text.rfind('}')
                if last_brace != -1 and last_brace > first_brace:
                    cleaned_text = cleaned_text[first_brace:last_brace + 1]
                    print("[JSON 추출] 중괄호 불일치, 첫 { 부터 마지막 } 까지 추출")
        
        # JSON 파싱
        try:
            return json.loads(cleaned_text)
        except json.JSONDecodeError as e:
            print(f"⚠️ JSON 파싱 실패: {str(e)}")
            print(f"[추출된 텍스트 (처음 500자)]\n{cleaned_text[:500]}")
            raise ValueError(f"JSON 파싱 실패: {str(e)}")


# 싱글톤 인스턴스
_gemini_service: Optional[GeminiService] = None


def get_gemini_service() -> GeminiService:
    """Gemini 서비스 인스턴스를 반환합니다."""
    global _gemini_service
    if _gemini_service is None:
        _gemini_service = GeminiService()
    return _gemini_service


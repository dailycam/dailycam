"""API routes for home camera integration - 간단 버전 (Gemini 분석만)"""

from fastapi import APIRouter, Depends, File, UploadFile, HTTPException, Query
import time  # 시간 측정을 위한 import 추가

from app.services.gemini_service import GeminiService, get_gemini_service
from app.utils.json_to_txt_formatter import GeminiAnalysisFormatter

router = APIRouter()

# TXT 파일 저장을 위한 formatter 인스턴스 생성
formatter = GeminiAnalysisFormatter(output_dir="analysis_results")


@router.post("/analyze-video")
async def analyze_video(
    video: UploadFile = File(..., description="분석할 비디오 파일"),
    stage: str = Query(None, description="발달 단계 (1, 2, 3, 4, 5, 6). None이면 자동 판단"),
    age_months: int = Query(None, description="아이의 개월 수"),
    temperature: float = Query(0.4, description="AI 창의성 (0.0 ~ 1.0)"),
    top_k: int = Query(30, description="어휘 다양성"),
    top_p: float = Query(0.95, description="문장 자연스러움"),
    gemini_service: GeminiService = Depends(get_gemini_service),
) -> dict:
    """
    비디오 파일을 업로드하여 VLM 프롬프트로 분석하고 결과를 반환합니다.
    2단계 프로세스: 1) 발달 단계 자동 판단 (stage가 None인 경우), 2) 해당 단계 프롬프트로 상세 분석
    
    - **video**: 비디오 파일 (mp4, mov, avi 등)
    - **stage**: 발달 단계 ("1", "2", "3", "4", "5", "6"). None이면 자동 판단
    - **age_months**: 아이의 개월 수 (선택사항, 참고용)
    - **temperature**: AI 창의성 (기본값: 0.4)
    - **top_k**: 어휘 다양성 (기본값: 30)
    - **top_p**: 문장 자연스러움 (기본값: 0.95)
    - 반환: VLM 스키마에 맞는 분석 결과
    """
    # 비디오 파일 타입 검증
    if not video.content_type or not video.content_type.startswith('video/'):
        raise HTTPException(
            status_code=400,
            detail="비디오 파일만 업로드 가능합니다."
        )
    
    # 발달 단계 검증 (제공된 경우)
    if stage is not None and stage not in ["1", "2", "3", "4", "5", "6"]:
        raise HTTPException(
            status_code=400,
            detail="발달 단계는 '1', '2', '3', '4', '5', '6' 중 하나여야 합니다."
        )
    
    try:
        print("[VLM 비디오 분석 시작]")
        start_time = time.time()  # 분석 시작 시간 기록
        
        if stage:
            print(f"[발달 단계] 제공됨: {stage}단계")
        else:
            print("[발달 단계] 자동 판단 모드")

        # 비디오 내용 읽기
        video_content = await video.read()
        
        # Gemini 서비스를 통해 분석 (video_file 대신 video_content 전달)
        result = await gemini_service.analyze_video_vlm(
            video_bytes=video_content,
            content_type=video.content_type or "video/mp4",
            stage=stage,
            age_months=age_months,
            generation_params={
                "temperature": temperature,
                "top_k": top_k,
                "top_p": top_p
            }
        )
        
        end_time = time.time()  # 분석 종료 시간 기록
        analysis_time = end_time - start_time
        print(f"[VLM 비디오 분석 완료] 총 소요 시간: {analysis_time:.2f}초")
        
        # ✅ TXT 파일로 저장 (사람이 읽기 쉽게 포맷팅)
        try:
            txt_path = formatter.format_and_save(
                analysis_data=result,
                filename_prefix=f"analysis_stage{result.get('meta', {}).get('assumed_stage', 'unknown')}"
            )
            print(f"📄 TXT 파일 저장 완료: {txt_path}")
        except Exception as txt_error:
            print(f"⚠️ TXT 파일 저장 실패: {txt_error}")
        
        # ✅ 원본 JSON도 저장 (디버깅용)
        try:
            json_path = formatter.save_raw_json(
                data=result,
                stage="final",
                filename_prefix=f"raw_stage{result.get('meta', {}).get('assumed_stage', 'unknown')}"
            )
            print(f"📄 원본 JSON 저장 완료: {json_path}")
        except Exception as json_error:
            print(f"⚠️ JSON 파일 저장 실패: {json_error}")
        
        return result
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        import traceback
        error_trace = traceback.format_exc()
        error_msg = str(e)
        print(f"❌ VLM 비디오 분석 오류: {error_msg}")
        print(f"상세 에러:\n{error_trace}")
        raise HTTPException(
            status_code=500,
            detail=f"비디오 분석 중 오류가 발생했습니다: {error_msg}"
        )

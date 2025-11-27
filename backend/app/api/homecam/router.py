"""API routes for home camera integration - Gemini 분석 + DB 저장"""

from fastapi import APIRouter, Depends, File, UploadFile, HTTPException, Query
import time
from sqlalchemy.orm import Session

from app.services.gemini_service import GeminiService, get_gemini_service
from app.utils.json_to_txt_formatter import GeminiAnalysisFormatter
from app.utils.json_to_db_mapper import JsonToDbMapper
from app.database import get_db

router = APIRouter()

# TXT 파일 저장을 위한 formatter 인스턴스 생성
formatter = GeminiAnalysisFormatter(output_dir="analysis_results")
# DB 매퍼 인스턴스  
db_mapper = JsonToDbMapper()


@router.post("/analyze-video")
async def analyze_video(
    video: UploadFile = File(..., description="분석할 비디오 파일"),
    child_id: int = Query(None, description="분석 대상 아이 ID (선택, 없으면 기본값 1 사용)"),
    user_id: int = Query(None, description="사용자 ID (선택, 없으면 기본값 1 사용)"),
    stage: str = Query(None, description="발달 단계 (1, 2, 3, 4, 5, 6). None이면 자동 판단"),
    age_months: int = Query(None, description="아이의 개월 수"),
    temperature: float = Query(0.4, description="AI 창의성 (0.0 ~ 1.0)"),
    top_k: int = Query(30, description="어휘 다양성"),
    top_p: float = Query(0.95, description="문장 자연스러움"),
    save_to_db: bool = Query(True, description="DB에 저장 여부"),
    gemini_service: GeminiService = Depends(get_gemini_service),
    db: Session = Depends(get_db),
) -> dict:
    """
    비디오 파일을 업로드하여 VLM 프롬프트로 분석하고 결과를 DB에 저장합니다.
    
    - **video**: 비디오 파일 (mp4, mov, avi 등)
    - **child_id**: 분석 대상 아이 ID (선택, 기본값: 1)
    - **user_id**: 사용자 ID (선택, 기본값: 1)
    - **stage**: 발달 단계 ("1", "2", "3", "4", "5", "6"). None이면 자동 판단
    - **age_months**: 아이의 개월 수 (선택사항)
    - **save_to_db**: DB에 저장 여부 (기본값: True)
    - 반환: VLM 스키마에 맞는 분석 결과
    """
    # 기본값 설정 (backwards compatibility)
    if child_id is None:
        child_id = 1
        print("⚠️  child_id not provided, using default: 1")
    if user_id is None:
        user_id = 1
        print("⚠️  user_id not provided, using default: 1")
    
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
        start_time = time.time()
        
        if stage:
            print(f"[발달 단계] 제공됨: {stage}단계")
        else:
            print("[발달 단계] 자동 판단 모드")

        # 비디오 내용 읽기
        video_content = await video.read()
        video_size = len(video_content)
        
        # Gemini 서비스를 통해 분석
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
        
        end_time = time.time()
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
        
        # ✅ 데이터베이스에 저장
        if save_to_db:
            try:
                print("[DB 저장] 분석 결과를 데이터베이스에 저장 중...")
                saved_analysis = db_mapper.save_analysis_to_db(
                    db=db,
                    child_id=child_id,
                    user_id=user_id,
                    analysis_data=result,
                    video_file_path=video.filename,
                    video_file_size=video_size
                )
                print(f"✅ DB 저장 완료! Analysis ID: {saved_analysis.id}")
                result["_db_id"] = saved_analysis.id
            except Exception as db_error:
                print(f"⚠️ DB 저장 실패: {db_error}")
                import traceback
                traceback.print_exc()
                # DB 저장 실패해도 분석 결과는 반환
        
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

"""이미지 분류 API 라우터"""

from fastapi import APIRouter, Depends, File, UploadFile, HTTPException
from typing import Dict, Any
import io

from app.services.image_classifier import ImageClassifier, get_image_classifier

router = APIRouter()


@router.post("/classify", response_model=Dict[str, Any])
async def classify_image(
    image: UploadFile = File(..., description="분류할 이미지 파일"),
    classifier: ImageClassifier = Depends(get_image_classifier),
) -> Dict[str, Any]:
    """
    이미지 파일을 업로드하여 분류합니다.
    
    - **image**: 이미지 파일 (jpg, png 등)
    - 반환: 분류 결과 (상위 5개 예측)
    """
    # 이미지 파일 타입 검증
    if not image.content_type or not image.content_type.startswith('image/'):
        raise HTTPException(
            status_code=400,
            detail="이미지 파일만 업로드 가능합니다."
        )
    
    try:
        # 이미지 데이터 읽기
        image_data = await image.read()
        
        # 이미지 분류
        result = classifier.classify_image(image_data)
        
        return {
            "success": True,
            "model": "Kibakimuoki/Qemb.AI-yolo-vit-gradio",
            "predictions": result.get("predictions", []),
            "top_label": result.get("top_label", ""),
            "top_score": result.get("top_score", 0)
        }
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"이미지 분류 중 오류가 발생했습니다: {str(e)}")


@router.post("/classify-url", response_model=Dict[str, Any])
async def classify_image_from_url(
    image_url: str,
    classifier: ImageClassifier = Depends(get_image_classifier),
) -> Dict[str, Any]:
    """
    이미지 URL을 제공하여 분류합니다.
    
    - **image_url**: 이미지 URL
    - 반환: 분류 결과 (상위 5개 예측)
    """
    try:
        # 이미지 분류
        result = classifier.classify_image_from_url(image_url)
        
        return {
            "success": True,
            "model": "Kibakimuoki/Qemb.AI-yolo-vit-gradio",
            "predictions": result.get("predictions", []),
            "top_label": result.get("top_label", ""),
            "top_score": result.get("top_score", 0)
        }
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"이미지 분류 중 오류가 발생했습니다: {str(e)}")


@router.get("/health", response_model=Dict[str, Any])
async def health_check(
    classifier: ImageClassifier = Depends(get_image_classifier),
) -> Dict[str, Any]:
    """
    이미지 분류 모델 상태 확인
    """
    try:
        # 모델 로드 시도
        classifier._load_model()
        return {
            "status": "healthy",
            "model": classifier.model_name,
            "loaded": classifier._pipeline is not None or classifier._model is not None
        }
    except Exception as e:
        return {
            "status": "error",
            "model": classifier.model_name,
            "error": str(e)
        }


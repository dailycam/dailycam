"""이미지 분류 서비스 (Qemb.AI-yolo-vit-gradio)"""

import io
from typing import Optional, Dict, Any
from pathlib import Path

try:
    from transformers import pipeline, AutoImageProcessor, AutoModelForImageClassification
    from PIL import Image
    TRANSFORMERS_AVAILABLE = True
except ImportError:
    TRANSFORMERS_AVAILABLE = False
    print("경고: transformers가 설치되지 않았습니다. pip install transformers pillow")


class ImageClassifier:
    """이미지 분류 클래스 (Qemb.AI-yolo-vit-gradio 모델)"""

    def __init__(self):
        """초기화"""
        self._pipeline = None
        self._processor = None
        self._model = None
        self.model_name = "Kibakimuoki/Qemb.AI-yolo-vit-gradio"

    def _load_model(self):
        """모델 로드 (lazy loading)"""
        if not TRANSFORMERS_AVAILABLE:
            raise Exception("transformers 라이브러리가 설치되지 않았습니다.")
        
        if self._pipeline is None:
            try:
                # Pipeline 방식 (간단)
                self._pipeline = pipeline(
                    "image-classification",
                    model=self.model_name
                )
                print(f"✅ 이미지 분류 모델 로드 완료: {self.model_name}")
            except Exception as e:
                print(f"Pipeline 로드 실패: {e}")
                try:
                    # 직접 로드 방식
                    self._processor = AutoImageProcessor.from_pretrained(self.model_name)
                    self._model = AutoModelForImageClassification.from_pretrained(self.model_name)
                    print(f"✅ 이미지 분류 모델 로드 완료 (직접 로드): {self.model_name}")
                except Exception as e2:
                    print(f"모델 직접 로드 실패: {e2}")
                    # 대체 모델 시도 (일반적인 이미지 분류 모델)
                    try:
                        print(f"대체 모델 시도: google/vit-base-patch16-224")
                        self._pipeline = pipeline(
                            "image-classification",
                            model="google/vit-base-patch16-224"
                        )
                        self.model_name = "google/vit-base-patch16-224"
                        print(f"✅ 대체 모델 로드 완료: {self.model_name}")
                    except Exception as e3:
                        raise Exception(f"이미지 분류 모델을 로드할 수 없습니다. 원본: {str(e2)}, 대체: {str(e3)}")

    def classify_image(self, image_data: bytes) -> Dict[str, Any]:
        """
        이미지를 분류합니다.
        
        Args:
            image_data: 이미지 바이트 데이터
            
        Returns:
            분류 결과 딕셔너리
        """
        try:
            self._load_model()
            
            # 이미지 로드
            image = Image.open(io.BytesIO(image_data))
            
            # RGB로 변환 (필요한 경우)
            if image.mode != 'RGB':
                image = image.convert('RGB')
            
            # 분류 수행
            if self._pipeline:
                # Pipeline 사용
                results = self._pipeline(image)
                
                # 결과 정규화
                if isinstance(results, list):
                    # 상위 5개 결과 반환
                    top_results = sorted(results, key=lambda x: x.get('score', 0), reverse=True)[:5]
                    return {
                        "predictions": top_results,
                        "top_label": top_results[0].get('label', '') if top_results else '',
                        "top_score": top_results[0].get('score', 0) if top_results else 0
                    }
                else:
                    return {
                        "predictions": [results],
                        "top_label": results.get('label', ''),
                        "top_score": results.get('score', 0)
                    }
            else:
                # 직접 모델 사용
                import torch
                inputs = self._processor(image, return_tensors="pt")
                outputs = self._model(**inputs)
                logits = outputs.logits
                
                # 소프트맥스 적용
                import torch.nn.functional as F
                probs = F.softmax(logits, dim=-1)
                
                # 상위 5개 결과
                top_probs, top_indices = torch.topk(probs, 5)
                
                predictions = []
                for prob, idx in zip(top_probs[0], top_indices[0]):
                    label = self._model.config.id2label.get(idx.item(), f"Class_{idx.item()}")
                    predictions.append({
                        "label": label,
                        "score": prob.item()
                    })
                
                return {
                    "predictions": predictions,
                    "top_label": predictions[0].get('label', '') if predictions else '',
                    "top_score": predictions[0].get('score', 0) if predictions else 0
                }
                
        except Exception as e:
            raise Exception(f"이미지 분류 실패: {str(e)}")

    def classify_image_from_url(self, image_url: str) -> Dict[str, Any]:
        """
        URL에서 이미지를 가져와 분류합니다.
        
        Args:
            image_url: 이미지 URL
            
        Returns:
            분류 결과 딕셔너리
        """
        try:
            import requests
            response = requests.get(image_url, timeout=10)
            response.raise_for_status()
            return self.classify_image(response.content)
        except Exception as e:
            raise Exception(f"이미지 URL에서 분류 실패: {str(e)}")


# 싱글톤 인스턴스
_image_classifier: Optional[ImageClassifier] = None


def get_image_classifier() -> ImageClassifier:
    """이미지 분류 서비스 인스턴스를 반환합니다."""
    global _image_classifier
    if _image_classifier is None:
        _image_classifier = ImageClassifier()
    return _image_classifier


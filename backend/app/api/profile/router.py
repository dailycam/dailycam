"""Profile management router"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from pydantic import BaseModel
from datetime import date
from typing import Optional

from app.database import get_db
from app.models.user import User
from app.utils.auth_utils import get_current_user_id


router = APIRouter(prefix="/api/profile", tags=["profile"])


class ProfileSetupRequest(BaseModel):
    """프로필 설정 요청"""
    name: Optional[str] = None
    phone: Optional[str] = None
    child_name: Optional[str] = None
    child_birthdate: Optional[str] = None  # YYYY-MM-DD 형식
    picture: Optional[str] = None  # Base64 인코딩된 이미지


@router.post("/setup")
async def setup_profile(
    request: ProfileSetupRequest,
    user_id: int = Depends(get_current_user_id),
    db: Session = Depends(get_db)
):
    """프로필 정보 등록/업데이트"""
    user = db.query(User).filter(User.id == user_id).first()
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="사용자를 찾을 수 없습니다"
        )
    
    try:
        # 이름 업데이트
        if request.name is not None:
            user.name = request.name
        
        # 전화번호 업데이트
        if request.phone is not None:
            user.phone = request.phone
        
        # 아이 이름 업데이트
        if request.child_name is not None:
            user.child_name = request.child_name
        
        # 생년월일 업데이트
        if request.child_birthdate is not None:
            birthdate = date.fromisoformat(request.child_birthdate)
            user.child_birthdate = birthdate
        
        # 프로필 사진 업데이트
        if request.picture is not None:
            user.picture = request.picture
        
        db.commit()
        db.refresh(user)
        
        return {
            "message": "프로필이 성공적으로 등록되었습니다",
            "profile": {
                "name": user.name,
                "phone": user.phone,
                "child_name": user.child_name,
                "child_birthdate": user.child_birthdate.isoformat() if user.child_birthdate else None,
                "picture": user.picture
            }
        }
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"잘못된 날짜 형식입니다: {str(e)}"
        )
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"프로필 등록 중 오류가 발생했습니다: {str(e)}"
        )

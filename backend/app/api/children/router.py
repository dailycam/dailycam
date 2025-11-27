"""Children API - 아이 관련 엔드포인트"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from datetime import date

from app.database import get_db
from app.models import Child, User

router = APIRouter()


@router.get("/children")
async def get_children(
    user_id: int,
    db: Session = Depends(get_db)
) -> List[dict]:
    """
    사용자의 아이 목록 조회
    
    - **user_id**: 사용자 ID
    """
    children = db.query(Child)\
        .filter(Child.user_id == user_id)\
        .order_by(Child.created_at.desc())\
        .all()
    
    return [
        {
            "id": child.id,
            "name": child.name,
            "birth_date": child.birth_date.isoformat() if child.birth_date else None,
            "gender": child.gender,
            "profile_image_url": child.profile_image_url,
            "created_at": child.created_at.isoformat() if child.created_at else None
        }
        for child in children
    ]


@router.get("/children/{child_id}")
async def get_child(
    child_id: int,
    db: Session = Depends(get_db)
) -> dict:
    """
    특정 아이 정보 조회
    
    - **child_id**: 아이 ID
    """
    child = db.query(Child).filter(Child.id == child_id).first()
    
    if not child:
        raise HTTPException(status_code=404, detail="Child not found")
    
    return {
        "id": child.id,
        "user_id": child.user_id,
        "name": child.name,
        "birth_date": child.birth_date.isoformat() if child.birth_date else None,
        "gender": child.gender,
        "profile_image_url": child.profile_image_url,
        "created_at": child.created_at.isoformat() if child.created_at else None
    }

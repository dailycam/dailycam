from datetime import datetime, timezone
from typing import List

from dateutil.relativedelta import relativedelta
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.user import User
from app.utils.auth_utils import get_current_user_id
from app.services.portone_service import (
    get_portone_access_token,
    get_payment_info,
    charge_with_billing_key,
)

router = APIRouter(prefix="/api/payments", tags=["payments"])

# 🔥 월정액 요금 상수 (프론트와 반드시 동일하게 유지)
BASIC_PLAN_AMOUNT = 9900  # 테스트할 때는 100으로, 프론트도 같이 바꾸기
BASIC_PLAN_NAME = "Daily-cam 베이직 플랜 (1개월 구독)"


class BasicSubscribeConfirmRequest(BaseModel):
    """
    베이직 플랜 첫 결제 검증 요청 바디
    (프론트에서 imp_uid / merchant_uid / customer_uid 보내줌)
    """

    imp_uid: str
    merchant_uid: str
    customer_uid: str  # 🔥 정기결제용 UID (빌링키 식별자)


@router.post("/subscribe/basic/confirm")
async def confirm_basic_subscription(
    body: BasicSubscribeConfirmRequest,
    db: Session = Depends(get_db),
    user_id: int = Depends(get_current_user_id),
):
    """
    월정액(정기결제) 베이직 플랜 첫 결제 확정:

    - PortOne 결제 검증
    - users.is_subscribed / subscription_customer_uid / next_billing_at 업데이트

    ⚠ 여기서는 PortOne 스케줄 기능을 쓰지 않는다.
    → 이후 자동결제는 /subscriptions/charge-due 엔드포인트에서
      우리 서버가 직접 again API를 호출하는 방식으로 처리.
    """
    # 1) 포트원 액세스 토큰
    token = await get_portone_access_token()

    # 2) 결제 정보 조회
    payment = await get_payment_info(body.imp_uid, token)

    if payment.get("status") != "paid":
        raise HTTPException(status_code=400, detail="결제가 완료되지 않았습니다.")

    # 3) 금액 체크 (프론트랑 반드시 동일)
    if payment.get("amount") != BASIC_PLAN_AMOUNT:
        raise HTTPException(status_code=400, detail="결제 금액이 일치하지 않습니다.")

    # 4) 유저 조회
    user: User | None = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="유저를 찾을 수 없습니다.")

    # 5) 구독 상태 & 정기결제 정보 업데이트
    now = datetime.now(timezone.utc)

    user.is_subscribed = 1  # 1 = 구독중
    user.subscription_plan = "BASIC"  # 🔥 어떤 플랜인지 기록
    user.subscription_customer_uid = body.customer_uid
    user.next_billing_at = now + relativedelta(months=1)

    db.add(user)
    db.commit()
    db.refresh(user)

    return {
        "message": "베이직 플랜 월 정기구독이 시작되었습니다.",
        "is_subscribed": True,
        "next_billing_at": user.next_billing_at,
    }


# 🔥 자동결제 공통 로직 (API / 워커에서 같이 사용 가능)
async def process_due_subscriptions(db: Session) -> dict:
    """
    웹훅 없이, 우리 서버가 호출해서
    '결제 날짜가 된 구독자들'을 일괄 결제하는 공통 함수.

    - next_billing_at <= now 이고 is_subscribed == 1 인 유저들 조회
    - 포트원 again API로 결제 시도
    - 성공: next_billing_at + 1개월
    - 실패: is_subscribed = 0 (또는 나중에 상태 컬럼 추가해서 '결제실패' 표시)
    """
    now = datetime.now(timezone.utc)

    users: List[User] = (
        db.query(User)
        .filter(
            User.is_subscribed == 1,
            User.next_billing_at != None,  # noqa: E711
            User.next_billing_at <= now,
        )
        .all()
    )

    results = []

    for user in users:
        if not user.subscription_customer_uid:
            continue

        try:
            payment = await charge_with_billing_key(
                customer_uid=user.subscription_customer_uid,
                amount=BASIC_PLAN_AMOUNT,
                plan_name=BASIC_PLAN_NAME,
            )

            if payment.get("status") == "paid":
                # ✅ 결제 성공 → 다음 달로 미루기
                user.next_billing_at = now + relativedelta(months=1)
                results.append(
                    {
                        "user_id": user.id,
                        "email": user.email,
                        "status": "paid",
                    }
                )
            else:
                # ❌ 실패 → 구독 끔 (원하면 상태 플래그를 따로 둬도 됨)
                user.is_subscribed = 0
                user.subscription_plan = None
                results.append(
                    {
                        "user_id": user.id,
                        "email": user.email,
                        "status": f"failed ({payment.get('status')})",
                    }
                )

        except Exception as e:
            print("자동결제 중 오류:", e)
            user.is_subscribed = 0
            user.subscription_plan = None
            results.append(
                {
                    "user_id": user.id,
                    "email": user.email,
                    "status": "error",
                }
            )

    db.commit()

    return {
        "now": now.isoformat(),
        "processed": results,
    }


@router.post("/subscriptions/charge-due")
async def charge_due_subscriptions(
    db: Session = Depends(get_db),
):
    """
    수동 호출용 자동결제 API
    (관리자에서 버튼 눌러서 돌리거나, 외부 크론에서 호출할 때 사용)
    """
    return await process_due_subscriptions(db)


@router.post("/subscribe/basic/cancel")
async def cancel_basic_subscription(
    db: Session = Depends(get_db),
    user_id: int = Depends(get_current_user_id),
):
    """
    베이직 플랜 월정액 '자동결제 해지':

    - 이미 결제된 이번 달 구독 기간은 그대로 유지
    - 다음 달부터 더 이상 자동 결제되지 않도록 billing key 제거
    - is_subscribed / next_billing_at / subscription_plan 은 그대로 둔다
    """
    user: User | None = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="유저를 찾을 수 없습니다.")

    # 이미 자동결제가 해지된 상태라면
    if not user.subscription_customer_uid:
        return {
            "message": "이미 자동결제가 해지된 상태입니다.",
            "is_subscribed": bool(user.is_subscribed),
            "next_billing_at": user.next_billing_at,
            "subscription_plan": user.subscription_plan,
            "has_billing_key": False,
        }

    # ✅ 자동결제만 끄기
    user.subscription_customer_uid = None

    db.add(user)
    db.commit()
    db.refresh(user)

    return {
        "message": "구독 자동결제가 해지되었습니다. 남은 이용 기간 동안은 계속 사용 가능합니다.",
        "is_subscribed": bool(user.is_subscribed),
        "next_billing_at": user.next_billing_at,
        "subscription_plan": user.subscription_plan,
        "has_billing_key": False,   # 이제 자동결제 없음
    }



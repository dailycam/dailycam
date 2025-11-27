# backend/app/services/portone_service.py

import os
import time
import datetime

import httpx
from dateutil.relativedelta import relativedelta

PORTONE_API_KEY = os.getenv("PORTONE_API_KEY")
PORTONE_API_SECRET = os.getenv("PORTONE_API_SECRET")

BASE_URL = "https://api.iamport.kr"


async def get_portone_access_token() -> str:
    """
    PortOne 액세스 토큰 발급
    """
    async with httpx.AsyncClient() as client:
        resp = await client.post(
            f"{BASE_URL}/users/getToken",
            json={
                "imp_key": PORTONE_API_KEY,
                "imp_secret": PORTONE_API_SECRET,
            },
        )
        data = resp.json()
        if data["code"] != 0:
            raise Exception(f"Token 발급 실패: {data}")
        return data["response"]["access_token"]


async def get_payment_info(imp_uid: str, token: str) -> dict:
    """
    단건 결제 조회 (첫 결제 검증용)
    """
    async with httpx.AsyncClient() as client:
        resp = await client.get(
            f"{BASE_URL}/payments/{imp_uid}",
            headers={"Authorization": token},
        )
        data = resp.json()
        if data["code"] != 0:
            raise Exception(f"결제 조회 실패: {data}")
        return data["response"]


async def charge_with_billing_key(
    customer_uid: str,
    amount: int,
    plan_name: str,
):
    """
    빌링키(customer_uid) 기반 즉시 재결제
    (포트원 subscribe/payments/again 사용)
    """
    token = await get_portone_access_token()

    merchant_uid = f"basic_{int(time.time())}"

    body = {
        "customer_uid": customer_uid,
        "merchant_uid": merchant_uid,
        "amount": amount,
        "name": plan_name,
    }

    async with httpx.AsyncClient() as client:
        resp = await client.post(
            f"{BASE_URL}/subscribe/payments/again",
            headers={"Authorization": token},
            json=body,
        )
        data = resp.json()
        if data["code"] != 0:
            raise Exception(f"재결제 실패: {data}")
        return data["response"]

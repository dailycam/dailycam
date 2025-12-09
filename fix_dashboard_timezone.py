import re

file_path = r'c:\dev\dailycam-main\backend\app\api\dashboard\router.py'

with open(file_path, 'r', encoding='utf-8') as f:
    lines = f.readlines()

# 40-44번 라인 찾기 및 수정
new_lines = []
i = 0
while i < len(lines):
    if i == 39:  # 40번 라인 (0-indexed)
        # 기존 5줄 제거하고 새로운 코드 삽입
        new_lines.append('    # 2. 오늘 날짜의 모든 분석 로그 조회 (일일 집계)\n')
        new_lines.append('    # KST 기준으로 오늘 날짜 계산\n')
        new_lines.append('    kst = pytz.timezone(\'Asia/Seoul\')\n')
        new_lines.append('    now_kst = datetime.now(kst)\n')
        new_lines.append('    today_start_kst = now_kst.replace(hour=0, minute=0, second=0, microsecond=0)\n')
        new_lines.append('    today_end_kst = now_kst.replace(hour=23, minute=59, second=59, microsecond=999999)\n')
        new_lines.append('    \n')
        new_lines.append('    # UTC로 변환 (DB에 저장된 시간은 UTC)\n')
        new_lines.append('    today_start = today_start_kst.astimezone(pytz.UTC).replace(tzinfo=None)\n')
        new_lines.append('    today_end = today_end_kst.astimezone(pytz.UTC).replace(tzinfo=None)\n')
        new_lines.append('    \n')
        new_lines.append('    print(f"[Dashboard] KST 오늘: {today_start_kst} ~ {today_end_kst}")\n')
        new_lines.append('    print(f"[Dashboard] UTC 범위: {today_start} ~ {today_end}")\n')
        i += 5  # 기존 5줄 건너뛰기
    else:
        new_lines.append(lines[i])
        i += 1

with open(file_path, 'w', encoding='utf-8') as f:
    f.writelines(new_lines)

print("✅ router.py 시간대 수정 완료!")

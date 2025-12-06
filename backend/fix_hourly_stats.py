# 임시 수정 스크립트
import re

file_path = r'c:\dev\dailycam-main\backend\app\api\dashboard\router.py'

with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# 수정
old_line = '    hourly_stats = list(hourly_data.values())'
new_line = '    hourly_stats = [stat for stat in hourly_data.values() if stat["analysisCount"] > 0]'

content = content.replace(old_line, new_line)

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)

print("✅ 수정 완료!")

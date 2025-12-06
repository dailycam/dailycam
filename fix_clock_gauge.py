import re

# ClockGaugeSection.tsx 수정
file_path = r'c:\dev\dailycam-main\frontend\src\features\dashboard\components\ClockGaugeSection.tsx'

with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# eventCount를 analysisCount로 변경
content = content.replace(
    'const hasCurrentData = (selectedStat?.eventCount ?? 0) > 0;',
    'const hasCurrentData = (selectedStat?.analysisCount ?? 0) > 0;'
)
content = content.replace(
    'const hasPrevData = (prevStat?.eventCount ?? 0) > 0;',
    'const hasPrevData = (prevStat?.analysisCount ?? 0) > 0;'
)

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)

print("✅ ClockGaugeSection.tsx 수정 완료!")

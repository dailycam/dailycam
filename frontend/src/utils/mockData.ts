// 차트 데이터 생성 헬퍼 (Home.tsx 랜딩 페이지 데모용)
export function generateWeeklySafetyData() {
  return [
    { day: '월', score: 85, incidents: 5 },
    { day: '화', score: 88, incidents: 3 },
    { day: '수', score: 92, incidents: 2 },
    { day: '목', score: 87, incidents: 4 },
    { day: '금', score: 90, incidents: 3 },
    { day: '토', score: 95, incidents: 1 },
    { day: '일', score: 93, incidents: 2 },
  ]
}
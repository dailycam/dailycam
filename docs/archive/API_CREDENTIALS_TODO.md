# API credentials: 'include' 추가 필요 목록

## 현재 상황
- httpOnly Cookie 인증 방식으로 변경
- 모든 인증이 필요한 API에 `credentials: 'include'` 필요
- 현재 21개 fetch 호출 중 일부만 적용됨

## 적용 완료 ✅
1. uploadVideoForStreaming
2. startHlsStream  
3. stopHlsStream
4. stopStream
5. getDashboardData
6. getDevelopmentData
7. 스트림 상태 확인 (LiveMonitoring.tsx)

## 적용 필요 ❌
```typescript
// 328번 줄: analyzeVideoWithBackend
const response = await fetch(url, {
    method: 'POST',
    headers,
    body: formData,
    credentials: 'include',  // 추가 필요
})

// 486번 줄: getAllAnalytics
const response = await fetch(`${API_BASE_URL}/api/analytics/all`, {
    method: 'GET',
    credentials: 'include',  // 추가 필요
})

// 737번 줄: getClipHighlights
const response = await fetch(url, {
    method: 'GET',
    credentials: 'include',  // 추가 필요
})

// 765번 줄: generateClip
const response = await fetch(url, {
    method: 'POST',
    headers: { ...getAuthHeader() },
    credentials: 'include',  // 추가 필요
})

// 789번 줄: deleteClip
const response = await fetch(`${API_BASE_URL}/api/clips/${clipId}`, {
    method: 'DELETE',
    headers: { ...getAuthHeader() },
    credentials: 'include',  // 추가 필요
})

// 853번 줄: getRecommendedVideos
const response = await fetch(`${API_BASE_URL}/api/content/recommended-videos`, {
    method: 'GET',
    headers: { ...getAuthHeader() },
    credentials: 'include',  // 추가 필요
})

// 878번 줄: getRecommendedBlogs
const response = await fetch(`${API_BASE_URL}/api/content/recommended-blogs`, {
    method: 'GET',
    headers: { ...getAuthHeader() },
    credentials: 'include',  // 추가 필요
})

// 902번 줄: getTrendingContent
const response = await fetch(`${API_BASE_URL}/api/content/trending`, {
    method: 'GET',
    headers: { ...getAuthHeader() },
    credentials: 'include',  // 추가 필요
})

// 949번 줄: getRecommendedNews
const response = await fetch(`${API_BASE_URL}/api/content/recommended-news`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
    credentials: 'include',  // 추가 필요
})

// 979번 줄: searchContent
const response = await fetch(`${API_BASE_URL}/api/content/search?query=...`, {
    method: 'GET',
    headers: { ...getAuthHeader() },
    credentials: 'include',  // 추가 필요
})

// 1025번 줄: getCameraList
const response = await fetch(`${API_BASE_URL}/api/camera-settings/cameras`, {
    method: 'GET',
    headers: { ...getAuthHeader() },
    credentials: 'include',  // 추가 필요
})

// 1062번 줄: uploadCameraVideo
const response = await fetch(`${API_BASE_URL}/api/camera-settings/cameras/${cameraId}/upload-video`, {
    method: 'POST',
    headers: { ...getAuthHeader() },
    credentials: 'include',  // 추가 필요
})

// 1094번 줄: deleteCameraVideo
const response = await fetch(`${API_BASE_URL}/api/camera-settings/videos/${videoId}`, {
    method: 'DELETE',
    headers: { ...getAuthHeader() },
    credentials: 'include',  // 추가 필요
})

// 1121번 줄: toggleCameraVideo
const response = await fetch(`${API_BASE_URL}/api/camera-settings/videos/${videoId}/toggle?...`, {
    method: 'PATCH',
    headers: { ...getAuthHeader() },
    credentials: 'include',  // 추가 필요
})

// 1157번 줄: getStorageUsage
const response = await fetch(`${API_BASE_URL}/api/camera-settings/storage/usage`, {
    method: 'GET',
    headers: { ...getAuthHeader() },
    credentials: 'include',  // 추가 필요
})
```

## 일괄 작업 방법
모든 `fetch` 호출의 옵션 객체에 `credentials: 'include'` 추가


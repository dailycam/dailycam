# FFmpeg 찾기 스크립트

Write-Host "🔍 FFmpeg 설치 위치 찾는 중..." -ForegroundColor Cyan
Write-Host ""

# 1. PATH에서 찾기
$ffmpegInPath = Get-Command ffmpeg -ErrorAction SilentlyContinue
if ($ffmpegInPath) {
    Write-Host "✅ PATH에서 찾음: $($ffmpegInPath.Source)" -ForegroundColor Green
    exit 0
}

# 2. 일반적인 경로들 확인
$commonPaths = @(
    "C:\ffmpeg\bin\ffmpeg.exe",
    "C:\ffmpeg\ffmpeg-8.0.1-essentials_build\bin\ffmpeg.exe",
    "C:\Program Files\ffmpeg\bin\ffmpeg.exe",
    "C:\Program Files (x86)\ffmpeg\bin\ffmpeg.exe",
    "C:\tools\ffmpeg\bin\ffmpeg.exe",
    "$env:USERPROFILE\ffmpeg\bin\ffmpeg.exe"
)

Write-Host "일반 경로 확인 중..." -ForegroundColor Yellow
foreach ($path in $commonPaths) {
    if (Test-Path $path) {
        Write-Host "✅ 찾음: $path" -ForegroundColor Green
        Write-Host ""
        Write-Host "이 경로를 환경 변수 FFMPEG_PATH에 추가하거나," -ForegroundColor Cyan
        Write-Host "백엔드 코드에 직접 경로를 추가하세요." -ForegroundColor Cyan
        exit 0
    }
}

# 3. 전체 C: 드라이브 검색 (느릴 수 있음)
Write-Host ""
Write-Host "일반 경로에서 못 찾았습니다. 전체 검색을 시작합니다..." -ForegroundColor Yellow
Write-Host "(이 작업은 시간이 걸릴 수 있습니다)" -ForegroundColor Yellow
Write-Host ""

$found = Get-ChildItem -Path "C:\" -Recurse -Filter "ffmpeg.exe" -ErrorAction SilentlyContinue | Select-Object -First 1

if ($found) {
    Write-Host "✅ 찾음: $($found.FullName)" -ForegroundColor Green
    Write-Host ""
    Write-Host "이 경로를 환경 변수 FFMPEG_PATH에 추가하거나," -ForegroundColor Cyan
    Write-Host "백엔드 코드에 직접 경로를 추가하세요." -ForegroundColor Cyan
} else {
    Write-Host "❌ FFmpeg를 찾을 수 없습니다." -ForegroundColor Red
    Write-Host ""
    Write-Host "FFmpeg가 설치되지 않았거나 다른 위치에 있습니다." -ForegroundColor Yellow
    Write-Host "수동으로 설치 위치를 확인해주세요." -ForegroundColor Yellow
}


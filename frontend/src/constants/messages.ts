/**
 * 공통 메시지 및 텍스트 상수
 */

/**
 * 에러 메시지
 */
export const ERROR_MESSAGES = {
    NETWORK_ERROR: '서버에 연결할 수 없습니다. 네트워크 연결을 확인해주세요.',
    UNAUTHORIZED: '인증이 필요합니다. 로그인 후 다시 시도해주세요.',
    FORBIDDEN: '접근 권한이 없습니다.',
    NOT_FOUND: '요청한 리소스를 찾을 수 없습니다.',
    SERVER_ERROR: '서버 오류가 발생했습니다. 잠시 후 다시 시도해주세요.',
    TIMEOUT: '요청 시간이 초과되었습니다.',
    UNKNOWN: '알 수 없는 오류가 발생했습니다.',

    // 비디오 관련
    VIDEO_UPLOAD_FAILED: '비디오 업로드 중 오류가 발생했습니다.',
    VIDEO_ANALYSIS_FAILED: '비디오 분석 중 오류가 발생했습니다.',
    VIDEO_SIZE_TOO_LARGE: '파일 크기가 너무 큽니다. 더 작은 파일을 선택해주세요.',

    // 데이터 로딩
    DATA_LOAD_FAILED: '데이터를 불러오는데 실패했습니다.',
    DASHBOARD_LOAD_FAILED: '대시보드 데이터를 가져오는 중 오류가 발생했습니다.',
    SAFETY_LOAD_FAILED: '안전 리포트 데이터 로딩 오류',
    DEVELOPMENT_LOAD_FAILED: '발달 데이터 로드 실패',
} as const

/**
 * 성공 메시지
 */
export const SUCCESS_MESSAGES = {
    VIDEO_UPLOADED: '비디오가 성공적으로 업로드되었습니다.',
    VIDEO_ANALYZED: '비디오 분석이 완료되었습니다.',
    DATA_SAVED: '데이터가 저장되었습니다.',
    SETTINGS_UPDATED: '설정이 업데이트되었습니다.',
} as const

/**
 * 안내 메시지
 */
export const INFO_MESSAGES = {
    NO_DATA: '아직 분석된 데이터가 없습니다.',
    NO_DATA_UPLOAD: '아직 분석된 데이터가 없습니다. 영상을 업로드하면 AI가 분석합니다.',
    NO_EVENTS: '감지된 이벤트가 없습니다.',
    NO_INSIGHTS: '분석된 인사이트가 없습니다.',
    LOADING: '로딩 중...',
    ANALYZING: '분석 중...',
} as const

/**
 * 확인 메시지
 */
export const CONFIRM_MESSAGES = {
    DELETE_CONFIRM: '정말 삭제하시겠습니까?',
    RESET_CONFIRM: '모든 설정을 초기화하시겠습니까?',
    LOGOUT_CONFIRM: '로그아웃하시겠습니까?',
} as const

/**
 * 버튼 텍스트
 */
export const BUTTON_LABELS = {
    CONFIRM: '확인',
    CANCEL: '취소',
    SAVE: '저장',
    DELETE: '삭제',
    EDIT: '수정',
    CLOSE: '닫기',
    UPLOAD: '업로드',
    DOWNLOAD: '다운로드',
    ANALYZE: '분석하기',
    RESET: '초기화',
    RETRY: '다시 시도',
} as const

/**
 * 플레이스홀더 텍스트
 */
export const PLACEHOLDERS = {
    SEARCH: '검색...',
    EMAIL: '이메일을 입력하세요',
    PASSWORD: '비밀번호를 입력하세요',
    AGE_MONTHS: '개월 수를 입력하세요',
} as const

/**
 * 라벨 텍스트
 */
export const LABELS = {
    SAFETY_SCORE: '안전 점수',
    DEVELOPMENT_SCORE: '발달 점수',
    MONITORING_HOURS: '모니터링 시간',
    INCIDENT_COUNT: '이벤트 감지',
    AGE_MONTHS: '아이의 개월 수',
    CURRENT_STAGE: '현재 발달 단계',
    STRONGEST_AREA: '발달 강점',
} as const

/**
 * 안전도 레벨 텍스트
 */
export const SAFETY_LEVELS = {
    VERY_HIGH: '매우 안전',
    HIGH: '안전',
    MEDIUM: '주의',
    LOW: '위험',
    VERY_LOW: '매우 위험',
} as const

/**
 * 발달 단계 텍스트
 */
export const DEVELOPMENT_STAGES = {
    STAGE_1: '1단계',
    STAGE_2: '2단계',
    STAGE_3: '3단계',
    STAGE_4: '4단계',
    STAGE_5: '5단계',
    STAGE_6: '6단계',
} as const

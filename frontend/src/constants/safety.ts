export const COLOR_PALETTE = {
    PRIMARY: '#14b8a6',
    PRIMARY_LIGHT: '#2dd4bf',
    PRIMARY_DARK: '#0d9488',
    HEADER_GRADIENT: 'from-primary-500 via-primary-600 to-primary-700',
    SUMMARY_BG_GRADIENT: 'from-primary-100/40 via-primary-50/30 to-cyan-50/30',
    LINE_STROKE: '#14b8a6',
    HOUR_LINE_INACTIVE: '#e5e7eb',
};

export const SAFETY_CHECKLIST_MOCK = [
    {
        title: '모서리 가드 설치',
        icon: 'Shield',
        description: '아이가 가구를 잡고 서기 시작했습니다. 뽰족한 모서리에 가드를 설치해주세요.',
        priority: 'high',
        gradient: 'from-danger-light/30 to-pink-50',
        checked: false,
    },
    {
        title: '전기 콘센트 안전 장치',
        icon: 'Zap',
        description: '전기 콘센트에 안전 장치가 설치돼있는지 확인해주세요.',
        priority: 'high',
        gradient: 'from-warning-light/30 to-orange-50',
        checked: true,
    },
    {
        title: '침대 낙상 방지',
        icon: 'Bed',
        description: '침대 가장자리 안전 패드가 제대로 고정되어 있는지 확인하세요.',
        priority: 'medium',
        gradient: 'from-primary-100/40 to-primary-50',
        checked: false,
    },
    {
        title: '작은 물건 정리',
        icon: 'Blocks',
        description: '아이가 삼킬 수 있는 작은 물건들을 손이 닿지 않는 곳에 보관하세요.',
        priority: 'medium',
        gradient: 'from-safe-light/30 to-cyan-50',
        checked: true,
    },
];

export const MOCK_INCIDENT_TYPE_DATA = [
    { name: '낙상', value: 35, color: '#fca5a5', count: 0 },
    { name: '충돌/부딛힘', value: 25, color: '#fdba74', count: 0 },
    { name: '끼임', value: 15, color: '#fde047', count: 0 },
    { name: '전도(가구 넘어짐)', value: 10, color: '#86efac', count: 0 },
    { name: '감전', value: 10, color: '#7dd3fc', count: 0 },
    { name: '질식', value: 5, color: '#c4b5fd', count: 0 },
];

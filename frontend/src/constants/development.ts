import { RecommendedActivityUI } from '../types/development';

export const RECOMMENDED_ACTIVITIES_MOCK: RecommendedActivityUI[] = [
    {
        title: '까꿍 놀이',
        category: '인지 발달',
        icon: 'Eye',
        description: '대상 영속성 개념을 발달시키는 데 도움이 됩니다.',
        duration: '10-15분',
        benefit: '인지 능력 향상',
        gradient: 'from-warning-light/30 to-orange-50',
        score: 85,
    },
    {
        title: '배밀이 연습',
        category: '운동 발달',
        icon: 'Activity',
        description: '좋아하는 장난감을 앞에 두고 손을 뻗게 유도하세요.',
        duration: '15-20분',
        benefit: '대근육 발달',
        gradient: 'from-safe-light/30 to-green-50',
        score: 92,
    },
    {
        title: '노래 부르기',
        category: '언어 발달',
        icon: 'Music',
        description: '다양한 동요와 자장가를 들려주세요.',
        duration: '5-10분',
        benefit: '언어 자극',
        gradient: 'from-primary-100/40 to-primary-50',
        score: 78,
    },
    {
        title: '촉각 놀이',
        category: '감각 발달',
        icon: 'Hand',
        description: '다양한 질감의 천이나 장난감을 만지게 해주세요.',
        duration: '10분',
        benefit: '감각 발달',
        gradient: 'from-primary-100/40 to-cyan-50',
        score: 70,
    },
];

export const DEFAULT_RADAR_DATA = [
    { category: '언어', score: 0, average: 70, fullMark: 100 },
    { category: '운동', score: 0, average: 75, fullMark: 100 },
    { category: '인지', score: 0, average: 72, fullMark: 100 },
    { category: '사회성', score: 0, average: 68, fullMark: 100 },
    { category: '정서', score: 0, average: 73, fullMark: 100 },
];

export const DEFAULT_FREQUENCY_DATA = [
    { category: '언어', count: 0, color: '#14b8a6' },
    { category: '운동', count: 0, color: '#86d5a8' },
    { category: '인지', count: 0, color: '#ffdb8b' },
    { category: '사회성', count: 0, color: '#5fe9d0' },
    { category: '정서', count: 0, color: '#99f6e0' },
];

import { RecommendedLink } from './types'

export const YOUTUBE_LINKS: RecommendedLink[] = [
    {
        id: 'yt1',
        type: 'youtube',
        title: '6개월 아기 발달 체크리스트',
        description: '우리 아기가 정상적으로 발달하고 있는지 확인해보세요',
        url: 'https://youtube.com/example',
        tags: ['발달', '6개월', '체크리스트'],
        category: '발달'
    },
    {
        id: 'yt2',
        type: 'youtube',
        title: '아기 수면교육 완벽 가이드',
        description: '밤에 푹 자는 아기로 만드는 수면교육 방법',
        url: 'https://youtube.com/example2',
        tags: ['수면', '교육', '밤잠'],
        category: '수면'
    },
    {
        id: 'yt3',
        type: 'youtube',
        title: '이유식 초기 준비물 총정리',
        description: '이유식 시작할 때 꼭 필요한 준비물 리스트',
        url: 'https://youtube.com/example3',
        tags: ['이유식', '준비물', '육아템'],
        category: '영양'
    },
]

export const BLOG_LINKS: RecommendedLink[] = [
    {
        id: 'blog1',
        type: 'blog',
        title: '아기 안전사고 예방 가이드',
        description: '집안에서 발생할 수 있는 안전사고를 미리 예방하는 방법',
        url: 'https://blog.example.com/safety-guide',
        tags: ['안전', '예방', '육아팁'],
        category: '안전'
    },
    {
        id: 'blog2',
        type: 'blog',
        title: '이유식 시작 완벽 가이드',
        description: '우리 아기 첫 이유식, 언제 어떻게 시작할까요?',
        url: 'https://blog.example.com/baby-food',
        tags: ['영양', '이유식', '육아'],
        category: '영양'
    },
    {
        id: 'blog3',
        type: 'blog',
        title: '아기랑 놀아주는 방법 100가지',
        description: '집에서 할 수 있는 다양한 놀이 방법',
        url: 'https://blog.example.com/play-ideas',
        tags: ['놀이', '육아', '집콕놀이'],
        category: '놀이'
    },
]

export const NEWS_LINKS: RecommendedLink[] = [
    {
        id: 'news1',
        type: 'news',
        title: '2024년 육아 지원금 정책 총정리',
        description: '올해 달라진 육아휴직 급여와 양육수당 안내',
        url: 'https://news.example.com/childcare-policy',
        tags: ['정책', '지원금', '육아휴직'],
        category: '정책'
    },
    {
        id: 'news2',
        type: 'news',
        title: '소아과 전문의가 알려주는 감기 예방법',
        description: '환절기 우리 아이 건강 지키는 방법',
        url: 'https://news.example.com/cold-prevention',
        tags: ['건강', '질병', '예방'],
        category: '건강'
    },
]

export const CATEGORIES = ['전체', '발달', '안전', '수면', '영양', '놀이']

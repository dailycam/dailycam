export type RecommendedLink = {
    id: string
    type: 'youtube' | 'blog' | 'news'
    title: string
    description: string
    thumbnail?: string
    url: string
    tags: string[]
    category: string
    views?: string
}

export type HighlightMoment = {
    id: string
    title: string
    time: string
    description: string
    thumbnail: string
}

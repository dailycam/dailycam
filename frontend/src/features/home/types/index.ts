export type RecommendedLink = {
    id: string
    type: 'youtube' | 'blog' | 'news'
    title: string
    description: string
    thumbnail?: string
    url: string
    tags: string[]
    category: string
}

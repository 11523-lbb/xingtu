/* ============================================================
   Tool 2：searchCommunity —— 社区攻略查询
   输入：{ locationIds, keywords? }
   输出：CommunityInsight[]（相关度降序）
   回答「这个地点，社区用户怎么评价」——
   全部证据来自 posts.json 真实内容，不生成虚构用户观点。
   ============================================================ */
import { getAgentPostsSync, getUserNicknameSync } from '@/services/data'
import type { CommunityInsight } from '../types'

export interface SearchCommunityInput {
  locationIds: string[]
  keywords?: string[]
}

export function searchCommunity(input: SearchCommunityInput): CommunityInsight[] {
  const { locationIds, keywords = [] } = input
  const posts = getAgentPostsSync()
  const kws = keywords.map((k) => k.toLowerCase()).filter(Boolean)

  const insights: CommunityInsight[] = []

  for (const post of posts) {
    const locIds = post.locationIds.filter((id) => locationIds.includes(id))
    if (locIds.length === 0) continue

    const haystack = `${post.title} ${post.content} ${post.tags.join(' ')}`.toLowerCase()
    const keywordHit = kws.length > 0 && kws.some((k) => haystack.includes(k))

    // 相关度：基础 60 + 关键词命中 20 + 攻略类型 10（上限 100）
    let relevance = 60
    if (keywordHit) relevance += 20
    if (post.type === 'guide') relevance += 10
    relevance = Math.min(100, relevance)

    const insight: CommunityInsight = {
      locationId: locIds[0],
      postId: post.id,
      postType: post.type,
      title: post.title,
      highlights: post.highlights ?? [],
      photoTips: post.photoTips,
      likes: post.likes,
      author: getUserNicknameSync(post.authorId) ?? '社区用户',
      relevance,
    }
    insights.push(insight)
  }

  return insights.sort((a, b) => b.relevance - a.relevance || b.likes - a.likes)
}

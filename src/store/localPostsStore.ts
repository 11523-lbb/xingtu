/* ============================================================
   本地发布内容（Zustand + localStorage 持久化）
   用户「发布打卡」产生的帖子存于此处，刷新后仍然存在；
   data.ts 查询层会自动合并进社区 Feed / 地点内容 / 帖子详情。
   与 mock 数据模型保持同一字段口径（Post 类型的本地化子集）。
   ============================================================ */
import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { CommentEntity } from '@/types'

export interface LocalPost {
  id: string
  type: 'checkin'
  authorId: string
  /** 作者快照（发布者即当前用户，避免渲染时回查） */
  author: { nickname: string; avatar: string }
  locationIds: string[]
  /** 打卡会话对应的路线 id（AI 路线为会话内生成，非 routes.json 条目） */
  routeId: string | null
  title: string
  content: string
  images: string[]
  tags: string[]
  likes: number
  collected: number
  comments: CommentEntity[]
  postedAt: string
}

interface LocalPostsState {
  publishedPosts: LocalPost[]
  addPost: (post: LocalPost) => void
}

export const useLocalPostsStore = create<LocalPostsState>()(
  persist(
    (set, get) => ({
      publishedPosts: [],
      addPost: (post) => set({ publishedPosts: [post, ...get().publishedPosts] }),
    }),
    { name: 'xingtu-local-content-v1' },
  ),
)

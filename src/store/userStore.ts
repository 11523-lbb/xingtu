/* ============================================================
   星途全局用户状态（Zustand）
   - 想去 / 收藏(地点) / 已打卡 / 点赞(帖子) / 收藏(帖子) / 关注
   - 本地新增评论
   - Toast 通知
   以 Stage 3 users.json 中当前用户 state 为初始种子，
   localStorage 持久化（刷新不丢失），未来接真实用户系统时替换本层
   ============================================================ */
import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { currentUserProfile, currentUserStateSeed } from '@/services/data'
import type { CommentEntity } from '@/types'

interface Toast {
  id: number
  text: string
}

/** 收藏的 AI 路线快照（本阶段轻量实现：名称去重，快照供「我的」未来展示） */
export interface SavedRoute {
  id: string
  name: string
  snapshot: {
    stops: number
    totalMin: number
    totalKm: number
    cityName: string
    celebName: string
  }
  createdAt: string
}

interface UserStore {
  profile: { id: string; nickname: string; avatar: string }
  wantedLocationIds: string[]
  collectedLocationIds: string[]
  checkedInLocationIds: string[]
  likedPostIds: string[]
  collectedPostIds: string[]
  followingIds: string[]
  myComments: Record<string, CommentEntity[]>
  savedRoutes: SavedRoute[]
  toast: Toast | null

  toggleWanted: (locationId: string) => void
  toggleCollectedLocation: (locationId: string) => void
  toggleCheckedIn: (locationId: string) => void
  toggleLikePost: (postId: string) => void
  toggleCollectPost: (postId: string) => void
  toggleFollow: (userId: string) => void
  toggleSaveRoute: (route: SavedRoute) => void
  addComment: (postId: string, content: string) => void
  showToast: (text: string) => void
  clearToast: () => void
}

const toggleIn = (arr: string[], id: string): string[] =>
  arr.includes(id) ? arr.filter((x) => x !== id) : [...arr, id]

export const useUserStore = create<UserStore>()(
  persist(
    (set, get) => ({
      profile: currentUserProfile,
      wantedLocationIds: [...currentUserStateSeed.wantedLocationIds],
      collectedLocationIds: [...currentUserStateSeed.collectedLocationIds],
      checkedInLocationIds: [...currentUserStateSeed.checkedInLocationIds],
      likedPostIds: [...currentUserStateSeed.likedPostIds],
      collectedPostIds: [...currentUserStateSeed.collectedPostIds],
      followingIds: [...currentUserStateSeed.followingIds],
      myComments: {},
      savedRoutes: [],
      toast: null,

      toggleWanted: (locationId) => {
        const next = toggleIn(get().wantedLocationIds, locationId)
        set({ wantedLocationIds: next })
        get().showToast(next.includes(locationId) ? '已加入「想去」清单' : '已从「想去」移除')
      },
      toggleCollectedLocation: (locationId) => {
        set({ collectedLocationIds: toggleIn(get().collectedLocationIds, locationId) })
      },
      toggleCheckedIn: (locationId) => {
        const next = toggleIn(get().checkedInLocationIds, locationId)
        set({ checkedInLocationIds: next })
        if (next.includes(locationId)) get().showToast('已打卡 ✦ 星光照进你的足迹')
      },
      toggleLikePost: (postId) => {
        set({ likedPostIds: toggleIn(get().likedPostIds, postId) })
      },
      toggleCollectPost: (postId) => {
        set({ collectedPostIds: toggleIn(get().collectedPostIds, postId) })
      },
      toggleFollow: (userId) => {
        set({ followingIds: toggleIn(get().followingIds, userId) })
      },
      toggleSaveRoute: (route) => {
        const exists = get().savedRoutes.some((r) => r.name === route.name)
        set({
          savedRoutes: exists
            ? get().savedRoutes.filter((r) => r.name !== route.name)
            : [route, ...get().savedRoutes],
        })
        get().showToast(exists ? '已取消收藏' : '路线已收藏')
      },
      addComment: (postId, content) => {
        const comment: CommentEntity = {
          id: `cmt_local_${Date.now()}`,
          authorId: get().profile.id,
          content,
          likes: 0,
          postedAt: new Date().toISOString(),
        }
        set({ myComments: { ...get().myComments, [postId]: [...(get().myComments[postId] ?? []), comment] } })
        get().showToast('评论已发布')
      },
      showToast: (text) => {
        const id = Date.now()
        set({ toast: { id, text } })
        setTimeout(() => {
          if (get().toast?.id === id) set({ toast: null })
        }, 2200)
      },
      clearToast: () => set({ toast: null }),
    }),
    {
      name: 'xingtu-user-store-v1',
      partialize: (s) => ({
        profile: s.profile,
        wantedLocationIds: s.wantedLocationIds,
        collectedLocationIds: s.collectedLocationIds,
        checkedInLocationIds: s.checkedInLocationIds,
        likedPostIds: s.likedPostIds,
        collectedPostIds: s.collectedPostIds,
        followingIds: s.followingIds,
        myComments: s.myComments,
        savedRoutes: s.savedRoutes,
      }),
    },
  ),
)

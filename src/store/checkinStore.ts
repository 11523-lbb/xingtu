/* ============================================================
   打卡会话状态（Zustand + localStorage 持久化）
   关联一条 AI 路线的逐站打卡进度：
   routeId / checkedLocationIds / currentIndex / completed / publishedPostId
   与 userStore 联动：完成打卡同步标记地点「已打卡」。
   ============================================================ */
import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { useUserStore } from './userStore'

export interface CheckinSession {
  /** 会话内路线 id（AI 路线为运行时生成） */
  routeId: string
  routeName: string
  cityName: string
  celebName: string
  /** 路线站点顺序（locationIds） */
  locationIds: string[]
  checkedLocationIds: string[]
  currentIndex: number
  completed: boolean
  publishedPostId: string | null
  startedAt: string
  completedAt: string | null
}

interface CheckinState {
  session: CheckinSession | null
  startSession: (session: CheckinSession) => void
  /** 完成当前站：标记 checked + 同步 userStore（幂等） */
  checkinCurrent: () => void
  /** 前往下一站 */
  advance: () => void
  /** 发布成功回写 */
  markPublished: (postId: string) => void
  clearSession: () => void
}

export const useCheckinStore = create<CheckinState>()(
  persist(
    (set, get) => ({
      session: null,
      startSession: (session) => set({ session }),
      checkinCurrent: () => {
        const s = get().session
        if (!s) return
        const id = s.locationIds[s.currentIndex]
        if (!id) return
        if (s.checkedLocationIds.includes(id)) return
        set({
          session: { ...s, checkedLocationIds: [...s.checkedLocationIds, id] },
        })
        // 同步用户资产：地点「已打卡」（幂等，不触发重复 Toast）
        if (!useUserStore.getState().checkedInLocationIds.includes(id)) {
          useUserStore.getState().toggleCheckedIn(id)
        }
      },
      advance: () => {
        const s = get().session
        if (!s) return
        if (s.currentIndex >= s.locationIds.length - 1) return
        set({ session: { ...s, currentIndex: s.currentIndex + 1 } })
      },
      markPublished: (postId) => {
        const s = get().session
        if (!s) return
        set({
          session: {
            ...s,
            publishedPostId: postId,
            completed: true,
            completedAt: s.completedAt ?? new Date().toISOString(),
          },
        })
      },
      clearSession: () => set({ session: null }),
    }),
    { name: 'xingtu-checkin-v1' },
  ),
)

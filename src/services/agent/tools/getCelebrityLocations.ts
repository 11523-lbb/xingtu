/* ============================================================
   Tool 1：getCelebrityLocations —— 明星地点查询
   输入：{ cityId, celebrityId? }
   输出：CelebrityLocation[]（按相关度降序）
   数据来源：locations.json（经 data.ts 引擎同步访问），无硬编码
   ============================================================ */
import { getAgentLocationsSync } from '@/services/data'
import type { CelebrityLocation } from '../types'

export interface GetCelebrityLocationsInput {
  cityId: string
  celebrityId?: string
}

export function getCelebrityLocations(input: GetCelebrityLocationsInput): CelebrityLocation[] {
  const { cityId, celebrityId } = input
  const all = getAgentLocationsSync()

  const filtered = all.filter((l) => {
    if (l.cityId !== cityId) return false
    if (celebrityId && l.celebrityId !== celebrityId) return false
    return true
  })

  return [...filtered].sort((a, b) => b.scores.relevance - a.scores.relevance)
}

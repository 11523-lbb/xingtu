/* ============================================================
   Tool 3：filterLocations —— 地点筛选与可解释评分
   输入：{ locations, communityInsights, request }
   输出：FilterLocationsResult { candidates[], excluded[] }
   硬约束（排除并说明原因）：
     · 出行日期为店休日
     · 营业时间与行程窗口重叠不足
   软评分（固定权重，见 rules.ts）：
     base 相关度 + 偏好命中 + 社区证据 + 上下文加成 − 少走路密度惩罚
   每个候选保留 matchedPreferences / reasons / warnings ——
   未来 AI Route Result 页面直接向用户解释「为什么选它」。
   ============================================================ */
import { getPostEntitySync, getRouteEntitySync } from '@/services/data'
import { distKm } from '@/utils/geo'
import { getIsoWeekday, toMin, WEEKDAY_LABELS } from '@/utils/time'
import { SCORE_WEIGHTS, SUPPLEMENT_KEYWORDS, TRAVEL_RULES } from '../rules'
import type {
  CandidateLocation,
  CelebrityLocation,
  CommunityInsight,
  ExcludedLocation,
  FilterLocationsResult,
  PlanningRequest,
  ScoreBreakdown,
} from '../types'

export interface FilterLocationsInput {
  locations: CelebrityLocation[]
  communityInsights: CommunityInsight[]
  request: PlanningRequest
}

/** 自然语言补充 → 偏好增强（确定性关键词规则；未来由 LLM 需求理解替代） */
function resolvePreferences(request: PlanningRequest) {
  const prefs = { ...request.preferences }
  const text = (request.supplement ?? '').toLowerCase()
  if (SUPPLEMENT_KEYWORDS.photo.test(text)) prefs.photo = true
  if (SUPPLEMENT_KEYWORDS.classic.test(text)) prefs.classic = true
  if (SUPPLEMENT_KEYWORDS.food.test(text)) prefs.food = true
  if (SUPPLEMENT_KEYWORDS.lessWalking.test(text)) prefs.lessWalking = true
  if (SUPPLEMENT_KEYWORDS.relax.test(text)) prefs.relax = true
  return prefs
}

/** 上下文优先集合（locationId / postId / routeId） */
function resolvePriorityIds(request: PlanningRequest): { ids: Set<string>; directLocationId?: string } {
  const ids = new Set<string>()
  const ctx = request.context
  if (ctx?.locationId) ids.add(ctx.locationId)
  if (ctx?.postId) {
    const post = getPostEntitySync(ctx.postId)
    post?.locationIds.forEach((id) => ids.add(id))
  }
  if (ctx?.routeId) {
    const route = getRouteEntitySync(ctx.routeId)
    route?.stops.forEach((s) => ids.add(s.locationId))
  }
  return { ids, directLocationId: ctx?.locationId }
}

/** 停留时长估算（轻松偏好 × 1.2，并受上下限约束） */
function estimateStay(loc: CelebrityLocation, relax: boolean): number {
  const factor = relax ? TRAVEL_RULES.relaxStayMultiplier : 1
  return Math.min(
    TRAVEL_RULES.stayMax,
    Math.max(TRAVEL_RULES.stayMin, Math.round(loc.suggestedStayMin * factor)),
  )
}

export function filterLocations(input: FilterLocationsInput): FilterLocationsResult {
  const { locations, communityInsights, request } = input
  const prefs = resolvePreferences(request)
  const { ids: priorityIds, directLocationId } = resolvePriorityIds(request)

  const restDayIso = getIsoWeekday(request.date)
  const winStart = toMin(request.startTime)
  const winEnd = toMin(request.endTime)

  // 少走路：每个地点与其他候选的平均近邻距离
  const nearDistCache = new Map<string, number>()
  const avgNearDist = (loc: CelebrityLocation): number => {
    const cached = nearDistCache.get(loc.id)
    if (cached !== undefined) return cached
    const dists = locations
      .filter((l) => l.id !== loc.id)
      .map((l) => distKm(loc, l))
      .sort((a, b) => a - b)
      .slice(0, 2)
    const avg = dists.length ? dists.reduce((s, d) => s + d, 0) / dists.length : 0
    nearDistCache.set(loc.id, avg)
    return avg
  }

  const candidates: CandidateLocation[] = []
  const excluded: ExcludedLocation[] = []

  for (const loc of locations) {
    const matched: string[] = []
    const reasons: string[] = []
    const warnings: string[] = []
    const insights = communityInsights.filter((i) => i.locationId === loc.id)

    // —— 硬约束 1：店休日 ——
    if (restDayIso !== null && loc.openingHours.restDays.includes(restDayIso)) {
      excluded.push({
        locationId: loc.id,
        name: loc.name,
        reason: `${WEEKDAY_LABELS[restDayIso]}为店休日，与出行日期冲突`,
      })
      continue
    }

    // —— 硬约束 2：营业时间窗口重叠不足 ——
    const stay = estimateStay(loc, prefs.relax === true)
    const open = toMin(loc.openingHours.start)
    const close = toMin(loc.openingHours.end)
    const overlap = Math.min(winEnd, close) - Math.max(winStart, open)
    if (overlap < stay) {
      excluded.push({
        locationId: loc.id,
        name: loc.name,
        reason: `营业时间（${loc.openingHours.start}–${loc.openingHours.end}）与行程窗口重叠不足`,
      })
      continue
    }

    // —— 软评分（全部可解释，无随机）——
    const b: ScoreBreakdown = {
      base: Math.round(loc.scores.relevance * SCORE_WEIGHTS.relevance),
      photo: 0,
      classic: 0,
      food: 0,
      community: 0,
      relax: 0,
      context: 0,
      walkingPenalty: 0,
      total: 0,
    }

    // 拍照偏好
    if (prefs.photo) {
      if (loc.scores.photo >= 85) {
        b.photo = SCORE_WEIGHTS.photoBonus
        matched.push('photo')
        reasons.push('地点拍照价值较高，符合你的拍照偏好')
      } else if (loc.scores.photo >= 70) {
        b.photo = SCORE_WEIGHTS.photoBonusSoft
        matched.push('photo')
        reasons.push('地点具备一定拍照价值，符合你的拍照偏好')
      }
    }

    // 经典偏好
    if (prefs.classic) {
      if (loc.type === 'concert') {
        b.classic = SCORE_WEIGHTS.classicConcert
        matched.push('classic')
        reasons.push('经典演出地标，符合你的经典偏好')
      } else if (loc.type === 'filming') {
        b.classic = SCORE_WEIGHTS.classicFilming
        matched.push('classic')
        reasons.push('经典取景氛围地点，符合你的经典偏好')
      }
    }

    // 美食偏好
    if (prefs.food && loc.type === 'food') {
      b.food = SCORE_WEIGHTS.foodBonus
      matched.push('food')
      reasons.push('美食类地点，符合你的美食偏好')
    }

    // 社区证据（全部来自真实 mock 内容）
    const guideCount = insights.filter((i) => i.postType === 'guide').length
    const checkinCount = insights.filter((i) => i.postType === 'checkin').length
    const maxLikes = insights.reduce((m, i) => Math.max(m, i.likes), 0)
    b.community = Math.min(
      SCORE_WEIGHTS.communityMax,
      insights.length * SCORE_WEIGHTS.communityPerEvidence +
        (maxLikes >= 2000
          ? SCORE_WEIGHTS.communityLikeBonusHigh
          : maxLikes >= 800
            ? SCORE_WEIGHTS.communityLikeBonusMid
            : 0),
    )
    if (guideCount > 0) {
      reasons.push(`社区中有 ${guideCount} 篇攻略、${checkinCount} 条打卡分享`)
      const tipCount = insights.filter((i) => i.photoTips).length
      if (tipCount > 0 && prefs.photo) reasons.push(`社区攻略提供了 ${tipCount} 条拍照建议`)
    } else if (insights.length > 0) {
      reasons.push(`社区中有 ${insights.length} 条打卡分享`)
    }

    // 轻松偏好
    if (prefs.relax && loc.suggestedStayMin >= 50) {
      b.relax = SCORE_WEIGHTS.relaxBonus
      matched.push('relax')
      reasons.push('停留节奏舒缓，适合轻松行程')
    }

    // 少走路（近邻密度）
    if (prefs.lessWalking) {
      const near = avgNearDist(loc)
      if (near <= SCORE_WEIGHTS.walkingNearThresholdKm) {
        matched.push('lessWalking')
        reasons.push('与其他候选地点距离较近，适合少走路')
      } else if (near <= SCORE_WEIGHTS.walkingMidThresholdKm) {
        b.walkingPenalty = SCORE_WEIGHTS.walkingMidPenalty
      } else {
        b.walkingPenalty = SCORE_WEIGHTS.walkingMaxPenalty
        warnings.push('与其他候选地点相距较远，步行成本较高')
      }
    }

    // 上下文优先（你从哪里进入规划）
    if (priorityIds.has(loc.id)) {
      b.context =
        directLocationId === loc.id ? SCORE_WEIGHTS.contextBonus : SCORE_WEIGHTS.contextSoftBonus
      matched.push('context')
      reasons.push(directLocationId === loc.id ? '你从这里进入规划' : '来自你参考的社区内容')
    }

    // 相关度说明
    if (loc.scores.relevance >= 85) {
      reasons.push('与明星主题关联度较高')
    }

    // 演示数据口径
    if (loc.sourceType === 'demo') {
      warnings.push('该地点为星途演示数据')
    }

    b.total = Math.max(
      0,
      b.base + b.photo + b.classic + b.food + b.community + b.relax + b.context - b.walkingPenalty,
    )

    candidates.push({
      location: loc,
      locationId: loc.id,
      score: b.total,
      scoreBreakdown: b,
      matchedPreferences: matched,
      reasons,
      warnings,
      communityInsights: insights,
    })
  }

  candidates.sort((a, b) => b.score - a.score || a.locationId.localeCompare(b.locationId))

  return { candidates, excluded }
}

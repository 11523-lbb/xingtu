/* ============================================================
   Orchestrator —— Agent 编排核心
   planTrip(request) → PlanningResult
   执行链：
     understandRequest → getCelebrityLocations → searchCommunity
     → filterLocations → planRoute → validateItinerary
     → optimize（≤2 轮）→ validateItinerary → buildPlanningResult
   特性：
     · 全程确定性（同输入同输出，无随机）
     · 结构化失败（不 throw，页面不崩溃）
     · trace[] 为产品展示数据（未来 AI Execution 页面直接消费）
     · 解释理由全部来自「规则 + 数据」，不虚构
   ============================================================ */
import {
  getAgentCelebritiesSync,
  getAgentCitiesSync,
  getLocationEntitySync,
  getPostEntitySync,
  getRouteEntitySync,
} from '@/services/data'
import { fmtMin, isValidDate, isValidTime, toMin } from '@/utils/time'
import { ERROR_CODES, PREFERENCE_LABELS, ROUTE_RULES, TRAVEL_RULES } from './rules'
import { getCelebrityLocations } from './tools/getCelebrityLocations'
import { searchCommunity } from './tools/searchCommunity'
import { filterLocations } from './tools/filterLocations'
import { planRoute } from './tools/planRoute'
import { validateItinerary } from './tools/validateItinerary'
import type {
  AgentError,
  CandidateLocation,
  CommunityEvidence,
  CommunityInsight,
  PlanningRequest,
  PlanningResult,
  ReasoningEntry,
  RoutePlanResult,
  TraceStep,
  Tradeoff,
  ValidationResult,
} from './types'

// ---------- 需求理解 ----------

interface UnderstandResult {
  ok: boolean
  error?: AgentError
  summary: string
}

function describePrefs(request: PlanningRequest): string {
  const labels = Object.entries(PREFERENCE_LABELS)
    .filter(([key]) => request.preferences[key as keyof typeof request.preferences] === true)
    .map(([, label]) => label)
  return labels.length ? `偏好（${labels.join('/')}）` : '无特别偏好'
}

function understandRequest(request: PlanningRequest): UnderstandResult {
  const cities = getAgentCitiesSync()
  const celebs = getAgentCelebritiesSync()

  if (!cities.some((c) => c.id === request.cityId)) {
    return {
      ok: false,
      error: { code: ERROR_CODES.CITY_NOT_FOUND, message: '没有找到这个城市的内容。' },
      summary: '需求解析失败：城市不存在',
    }
  }
  if (request.celebrityId && !celebs.some((c) => c.id === request.celebrityId)) {
    return {
      ok: false,
      error: { code: ERROR_CODES.CELEBRITY_NOT_FOUND, message: '没有找到这位明星的相关内容。' },
      summary: '需求解析失败：明星不存在',
    }
  }
  if (!isValidTime(request.startTime) || !isValidTime(request.endTime) || toMin(request.endTime) <= toMin(request.startTime)) {
    return {
      ok: false,
      error: { code: ERROR_CODES.INVALID_TIME_RANGE, message: '时间范围不合法：结束时间需晚于开始时间。' },
      summary: '需求解析失败：时间范围不合法',
    }
  }
  if (!isValidDate(request.date)) {
    return {
      ok: false,
      error: { code: ERROR_CODES.INVALID_DATE, message: '出行日期格式不合法（应为 YYYY-MM-DD）。' },
      summary: '需求解析失败：日期不合法',
    }
  }
  if (request.availableMin <= 0) {
    return {
      ok: false,
      error: { code: ERROR_CODES.INVALID_TIME_RANGE, message: '可用时长需大于 0。' },
      summary: '需求解析失败：可用时长不合法',
    }
  }
  if (request.maxStops < ROUTE_RULES.minStops) {
    return {
      ok: false,
      error: { code: ERROR_CODES.INVALID_MAX_STOPS, message: `期望地点数至少为 ${ROUTE_RULES.minStops} 个。` },
      summary: '需求解析失败：地点数过少',
    }
  }
  if (request.context?.locationId && getLocationEntitySync(request.context.locationId) === null) {
    return {
      ok: false,
      error: { code: ERROR_CODES.CONTEXT_LOCATION_NOT_FOUND, message: '你选择的地点不存在，请重新选择。' },
      summary: '需求解析失败：上下文地点不存在',
    }
  }
  if (request.context?.postId && getPostEntitySync(request.context.postId) === null) {
    return {
      ok: false,
      error: { code: ERROR_CODES.CONTEXT_POST_NOT_FOUND, message: '你参考的内容不存在。' },
      summary: '需求解析失败：上下文帖子不存在',
    }
  }
  if (request.context?.routeId && getRouteEntitySync(request.context.routeId) === null) {
    return {
      ok: false,
      error: { code: ERROR_CODES.CONTEXT_ROUTE_NOT_FOUND, message: '你参考的路线不存在。' },
      summary: '需求解析失败：上下文路线不存在',
    }
  }

  const cityName = cities.find((c) => c.id === request.cityId)?.name ?? request.cityId
  const celebName = request.celebrityId
    ? celebs.find((c) => c.id === request.celebrityId)?.name ?? request.celebrityId
    : ''
  const summary = `已理解你的需求：${cityName}${celebName ? ` · ${celebName}` : ''} · ${request.startTime}–${request.endTime} · ${describePrefs(request)}${request.supplement ? ' · 补充说明已解析' : ''}`
  return { ok: true, summary }
}

// ---------- Trace ----------

function traceStep(
  trace: TraceStep[],
  start: number,
  tool: string,
  status: TraceStep['status'],
  summary: string,
  inputSummary: string,
  outputSummary: string,
): TraceStep {
  const now = Date.now()
  const s: TraceStep = {
    step: trace.length + 1,
    tool,
    status,
    startTime: new Date(start).toISOString(),
    endTime: new Date(now).toISOString(),
    durationMs: now - start,
    summary,
    inputSummary,
    outputSummary,
  }
  trace.push(s)
  return s
}

// ---------- 失败结果 ----------

function failResult(request: PlanningRequest, error: AgentError, trace: TraceStep[]): PlanningResult {
  return {
    success: false,
    request,
    selectedLocations: [],
    route: null,
    reasoning: { locationReasons: [], routeReason: '', tradeoffs: [] },
    validation: { valid: false, issues: [], warnings: [] },
    communityEvidence: [],
    trace,
    optimizeRounds: 0,
    error,
  }
}

// ---------- 优化 ----------

interface OptimizeOutput {
  plan: RoutePlanResult
  validation: ValidationResult
  tradeoffs: Tradeoff[]
  summary: string
}

/**
 * 单轮优化（确定性）：
 * 1. 有具体站点的问题（营业/店休/重复）→ 移除问题站点
 * 2. 总时长超预算 → 移除评分最低站点
 * 3. 仍超时 → 压缩各站停留时长（0.85 系数，不低于下限）
 */
function optimizeOnce(
  validation: ValidationResult,
  request: PlanningRequest,
  candidates: CandidateLocation[],
): OptimizeOutput {
  const tradeoffs: Tradeoff[] = []
  const issueLocIds = new Set(
    validation.issues.filter((i) => i.locationId).map((i) => i.locationId as string),
  )

  let pool = candidates
  if (issueLocIds.size > 0) {
    const removed: string[] = []
    pool = candidates.filter((c) => {
      if (issueLocIds.has(c.locationId)) {
        removed.push(c.location.name)
        return false
      }
      return true
    })
    tradeoffs.push({
      type: 'remove',
      message: `已移除 ${removed.map((n) => `「${n}」`).join('、')}：与营业时间或出行日期冲突`,
    })
  } else if (validation.issues.some((i) => i.code === 'OVERTIME') && candidates.length > 0) {
    const lowest = [...candidates].sort((a, b) => a.score - b.score)[0]
    pool = candidates.filter((c) => c.locationId !== lowest.locationId)
    tradeoffs.push({
      type: 'remove',
      message: `已移除「${lowest.location.name}」：总时长超出你的时间预算`,
    })
  }

  let nextPlan = planRoute({ locations: pool, request })
  let nextValidation = validateItinerary({
    route: nextPlan.route,
    request,
    locations: pool.map((c) => c.location),
  })

  if (nextValidation.issues.some((i) => i.code === 'OVERTIME')) {
    nextPlan = planRoute({ locations: pool, request }, { stayFactor: TRAVEL_RULES.shortenStayFactor })
    nextValidation = validateItinerary({
      route: nextPlan.route,
      request,
      locations: pool.map((c) => c.location),
    })
    tradeoffs.push({
      type: 'shorten',
      message: '已压缩各站停留时长，让总行程落在可用时间内',
    })
  }

  const summary = tradeoffs.length > 0 ? tradeoffs.map((t) => t.message).join('；') : '调整候选地点后重新规划'
  return { plan: nextPlan, validation: nextValidation, tradeoffs, summary }
}

// ---------- 解释与证据 ----------

function buildRouteReason(
  request: PlanningRequest,
  plan: RoutePlanResult,
  validation: ValidationResult,
  excludedCount: number,
): string {
  const parts: string[] = []
  const prefs = describePrefs(request)
  parts.push(prefs !== '无特别偏好' ? `根据你的${prefs.replace('偏好', '需求')}，以综合评分排序候选地点` : '按综合评分排序候选地点')
  parts.push('路线采用「就近串联」顺序（最近邻 + 2-opt 局部优化），优先串联距离较近的地点，减少折返')
  const walkText = plan.route.walkingKm > 0 ? `，其中步行约 ${plan.route.walkingKm}km` : ''
  parts.push(`全程 ${plan.route.stops.length} 站，预计 ${plan.route.totalMin} 分钟${walkText}，交通估算为演示口径`)

  if (request.availableMin > 0) {
    const windowMin = toMin(request.endTime) - toMin(request.startTime)
    const budget = Math.min(request.availableMin, windowMin)
    const buffer = Math.max(0, budget - plan.route.totalMin)
    parts.push(`较你的时间预算（${fmtMin(budget)}）剩余约 ${fmtMin(buffer)} 缓冲`)
  }
  if (plan.dropped.length + excludedCount > 0) {
    parts.push(`另有 ${plan.dropped.length + excludedCount} 个地点未安排，原因见取舍说明`)
  }
  if (validation.warnings.some((w) => w.code === 'FEW_STOPS')) {
    parts.push('符合当前条件的地点较少，未强行凑数')
  }
  return parts.join('；') + '。'
}

function buildCommunityEvidence(plan: RoutePlanResult, insights: CommunityInsight[]): CommunityEvidence[] {
  const evidence: CommunityEvidence[] = []
  for (const stop of plan.route.stops) {
    const locInsights = insights
      .filter((i) => i.locationId === stop.locationId)
      .sort((a, b) => b.relevance - a.relevance || b.likes - a.likes)
    const picked: CommunityEvidence[] = []
    // 优先拍照建议，其次攻略亮点（每地点至多 2 条，全部来自真实 mock 内容）
    for (const ins of locInsights) {
      if (picked.length >= 2) break
      if (ins.photoTips) {
        picked.push({
          locationId: stop.locationId,
          postId: ins.postId,
          title: ins.title,
          evidenceType: 'photoTip',
          content: ins.photoTips,
          likes: ins.likes,
          author: ins.author,
        })
      } else if (ins.highlights.length > 0) {
        picked.push({
          locationId: stop.locationId,
          postId: ins.postId,
          title: ins.title,
          evidenceType: 'highlight',
          content: ins.highlights[0],
          likes: ins.likes,
          author: ins.author,
        })
      }
    }
    evidence.push(...picked)
  }
  return evidence
}

// ---------- 主入口 ----------

export function planTrip(request: PlanningRequest): PlanningResult {
  const stepStart = Date.now()
  const trace: TraceStep[] = []
  const t = (tool: string, status: TraceStep['status'], summary: string, inputSummary: string, outputSummary: string): TraceStep =>
    traceStep(trace, stepStart, tool, status, summary, inputSummary, outputSummary)

  // 1. 理解需求
  const understood = understandRequest(request)
  t('understandRequest', understood.ok ? 'completed' : 'failed', understood.summary, `${request.cityId}/${request.celebrityId ?? '不限明星'}`, understood.ok ? '需求解析完成' : understood.error?.message ?? '')
  if (!understood.ok) return failResult(request, understood.error as AgentError, trace)

  // 2. Tool 1：明星地点查询
  const locations = getCelebrityLocations({ cityId: request.cityId, celebrityId: request.celebrityId })
  t('getCelebrityLocations', 'completed', `找到 ${locations.length} 个相关打卡点`, `城市 ${request.cityId}${request.celebrityId ? ` / 明星 ${request.celebrityId}` : ''}`, `${locations.length} 个地点`)
  if (locations.length === 0) {
    return failResult(
      request,
      { code: ERROR_CODES.NO_AVAILABLE_LOCATIONS, message: '当前条件下没有找到可执行的打卡地点。' },
      trace,
    )
  }

  // 3. Tool 2：社区攻略查询
  const insights = searchCommunity({ locationIds: locations.map((l) => l.id) })
  t('searchCommunity', 'completed', `读取 ${insights.length} 条相关社区内容`, `${locations.length} 个地点的社区数据`, `${insights.length} 条帖子/攻略`)

  // 4. Tool 3：地点筛选
  const { candidates, excluded } = filterLocations({ locations, communityInsights: insights, request })
  t(
    'filterLocations',
    'completed',
    `筛选出 ${candidates.length} 个候选地点，排除 ${excluded.length} 个`,
    `${locations.length} 个地点 + ${insights.length} 条社区内容`,
    `${candidates.length} 个候选 / ${excluded.length} 个排除（${excluded.map((e) => e.name).join('、') || '无'}）`,
  )
  if (candidates.length === 0) {
    return failResult(
      request,
      { code: ERROR_CODES.NO_AVAILABLE_LOCATIONS, message: '当前条件下没有找到可执行的打卡地点（营业时间或店休日不匹配）。' },
      trace,
    )
  }

  // 5. Tool 4：路线规划
  let plan = planRoute({ locations: candidates, request })
  t(
    'planRoute',
    'completed',
    plan.route.stops.length > 0 ? `已生成 ${plan.route.stops.length} 站路线` : '未能生成有效路线',
    `${candidates.length} 个候选地点`,
    plan.route.stops.length > 0 ? `${plan.route.stops.length} 站 · 预计 ${plan.route.totalMin} 分钟` : '0 站',
  )

  // 6. Tool 5：行程校验
  let validation = validateItinerary({
    route: plan.route,
    request,
    locations: candidates.map((c) => c.location),
  })
  t(
    'validateItinerary',
    'completed',
    validation.valid ? '行程校验通过' : `发现 ${validation.issues.length} 个待解决问题`,
    `${plan.route.stops.length} 站路线`,
    `问题 ${validation.issues.length} / 提示 ${validation.warnings.length}`,
  )

  // 7. 优化（≤ 2 轮）
  const tradeoffs: Tradeoff[] = excluded.map((e) => ({
    type: 'excluded' as const,
    message: `未安排「${e.name}」：${e.reason}`,
  }))
  let rounds = 0
  while (!validation.valid && rounds < ROUTE_RULES.maxOptimizeRounds && plan.route.stops.length > 0) {
    rounds += 1
    const opt = optimizeOnce(validation, request, candidates)
    plan = opt.plan
    validation = opt.validation
    tradeoffs.push(...opt.tradeoffs)
    t('optimize', 'optimizing', opt.summary, `第 ${rounds} 轮优化`, `问题 ${validation.issues.length} / 提示 ${validation.warnings.length}`)
  }
  if (rounds === 0) {
    t('optimize', 'skipped', '无需优化，路线已符合条件', '-', '-')
  }

  // 8. 汇总结果
  const selectedStops = plan.route.stops
  const selectedCandidates = selectedStops
    .map((s) => candidates.find((c) => c.locationId === s.locationId))
    .filter((c): c is CandidateLocation => c !== undefined)

  const locationReasons: ReasoningEntry[] = selectedCandidates.map((c) => ({
    locationId: c.locationId,
    score: c.score,
    matchedPreferences: c.matchedPreferences,
    reasons: c.reasons,
    warnings: c.warnings,
  }))

  const routeReason = buildRouteReason(request, plan, validation, excluded.length)
  const communityEvidence = buildCommunityEvidence(plan, insights)

  // 成功判定：站点 ≥2 且无遗留 issue；0-1 站 → 时间过短；有遗留 issue → 优化上限
  let success = validation.valid && plan.route.stops.length >= 2
  let error: AgentError | undefined
  if (!success) {
    if (plan.route.stops.length <= 1) {
      error = { code: ERROR_CODES.TOO_SHORT_WINDOW, message: '可用时间过短，不足以安排打卡行程，建议放宽时间后再试。' }
    } else {
      error = { code: ERROR_CODES.OPTIMIZATION_LIMIT, message: '已尽力调整，但仍有部分条件无法同时满足，请查看校验详情。' }
    }
  }

  const result: PlanningResult = {
    success,
    request,
    selectedLocations: selectedCandidates.map((c) => c.location),
    route: plan.route,
    reasoning: { locationReasons, routeReason, tradeoffs },
    validation,
    communityEvidence,
    trace,
    optimizeRounds: rounds,
    error,
  }

  t(
    'buildPlanningResult',
    result.success ? 'completed' : 'failed',
    result.success ? `路线生成完成：${plan.route.stops.length} 站` : '未能生成有效路线',
    '-',
    result.success ? `${plan.route.stops.length} 站 · 证据 ${communityEvidence.length} 条 · 取舍 ${tradeoffs.length} 项` : error?.message ?? '',
  )

  return result
}

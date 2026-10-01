/* ============================================================
   Agent 类型定义（Tool Schema / 编排输入输出）
   设计目标：未来接入 LLM Function Calling 时，
   以下 Input/Output 结构可直接映射为 JSON Schema；
   当前全部由「规则 + 数据 + 编排」确定性驱动。
   ============================================================ */
import type { LocationEntity, PostType, TravelMode } from '@/types'

// ---------- 输入 ----------

export interface PlanningPreferences {
  photo?: boolean
  classic?: boolean
  food?: boolean
  lessWalking?: boolean
  relax?: boolean
}

export interface PlanningContext {
  /** 从地点详情进入：该地点进入候选优先集合（非绝对强制，条件不允许时 Agent 排除并说明原因） */
  locationId?: string
  /** 从攻略进入：帖内地点进入候选优先集合 */
  postId?: string
  /** 「调整我的路线」：以该路线站点为候选优先集合 */
  routeId?: string
}

export interface PlanningRequest {
  cityId: string
  celebrityId?: string
  /** 出行日期 YYYY-MM-DD（可选；用于休息日校验） */
  date?: string
  /** 开始时间 HH:mm */
  startTime: string
  /** 结束时间 HH:mm */
  endTime: string
  /** 可用时长（分钟），行程预算的硬约束 */
  availableMin: number
  /** 期望地点数（3 ≤ maxStops） */
  maxStops: number
  preferences: PlanningPreferences
  /** 自然语言补充（当前用规则关键词解析，未来由 LLM 替代） */
  supplement?: string
  context?: PlanningContext
}

// ---------- Tool 数据对象 ----------

/** Tool 1 输出：明星相关地点（字段与 locations.json 一致，未来可映射地图 POI API） */
export type CelebrityLocation = LocationEntity

/** Tool 2 输出：社区洞察（全部来自 posts.json 真实内容，不生成虚构观点） */
export interface CommunityInsight {
  locationId: string
  postId: string
  postType: PostType
  title: string
  highlights: string[]
  photoTips: string | null
  likes: number
  author: string
  /** 与地点的相关度（关键词命中/攻略类型加权，0-100） */
  relevance: number
}

/** Tool 3 输出：候选地点（带评分与可解释理由） */
export interface ScoreBreakdown {
  base: number
  photo: number
  classic: number
  food: number
  community: number
  relax: number
  context: number
  walkingPenalty: number
  total: number
}

export interface CandidateLocation {
  location: CelebrityLocation
  locationId: string
  score: number
  scoreBreakdown: ScoreBreakdown
  matchedPreferences: string[]
  reasons: string[]
  warnings: string[]
  /** 该地点的社区洞察（供结果页展示证据） */
  communityInsights: CommunityInsight[]
}

export interface ExcludedLocation {
  locationId: string
  name: string
  reason: string
}

export interface FilterLocationsResult {
  candidates: CandidateLocation[]
  excluded: ExcludedLocation[]
}

// ---------- 路线 ----------

export interface RouteStop {
  locationId: string
  /** 站点序号（1 起，按最终路线） */
  order: number
  arriveTime: string
  leaveTime: string
  stayMin: number
  travelMin: number
  distanceKm: number
  travelMode: TravelMode
}

export interface Route {
  cityId: string
  celebrityId?: string
  stops: RouteStop[]
  totalMin: number
  travelMin: number
  totalKm: number
  walkingKm: number
  startTime: string
  endTime: string
}

export interface DroppedLocation {
  locationId: string
  name: string
  reason: string
}

export interface RoutePlanResult {
  route: Route
  dropped: DroppedLocation[]
  warnings: string[]
}

// ---------- 校验 ----------

export interface ValidationIssue {
  code: string
  message: string
  /** issue = 必须修复；warning = 可接受但需告知 */
  severity: 'issue' | 'warning'
  locationId?: string
}

export interface ValidationResult {
  valid: boolean
  issues: ValidationIssue[]
  warnings: ValidationIssue[]
}

// ---------- 解释与证据 ----------

export interface ReasoningEntry {
  locationId: string
  score: number
  matchedPreferences: string[]
  reasons: string[]
  warnings: string[]
}

export interface Tradeoff {
  type: 'excluded' | 'remove' | 'shorten' | 'context'
  message: string
}

export interface CommunityEvidence {
  locationId: string
  postId: string
  title: string
  evidenceType: 'photoTip' | 'highlight'
  content: string
  likes: number
  author: string
}

// ---------- Trace ----------

export interface TraceStep {
  step: number
  tool: string
  status: 'completed' | 'skipped' | 'failed' | 'optimizing'
  startTime: string
  endTime: string
  durationMs: number
  /** 面向用户的中文摘要（产品展示数据，非 debug 日志） */
  summary: string
  inputSummary: string
  outputSummary: string
}

// ---------- 最终输出 ----------

export interface AgentError {
  code: string
  message: string
}

export interface PlanningResult {
  success: boolean
  request: PlanningRequest
  selectedLocations: CelebrityLocation[]
  route: Route | null
  reasoning: {
    locationReasons: ReasoningEntry[]
    routeReason: string
    tradeoffs: Tradeoff[]
  }
  validation: ValidationResult
  communityEvidence: CommunityEvidence[]
  trace: TraceStep[]
  /** 实际执行过的优化轮数（0-2） */
  optimizeRounds: number
  error?: AgentError
}

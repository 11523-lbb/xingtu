/* ============================================================
   Agent 规则与权重（集中管理：固定 / 可解释 / 可调 / 无随机）
   所有评分与约束参数只允许在本文件修改，
   保证同一输入永远得到同一结果（确定性）。
   ============================================================ */

/** Tool 3 评分权重（满分约 100，各部分可解释） */
export const SCORE_WEIGHTS = {
  /** base = relevance × 0.45（相关度 0-100 → 0-45 分） */
  relevance: 0.45,
  /** 拍照偏好命中（photo ≥ 85） */
  photoBonus: 12,
  /** 拍照偏好弱命中（photo 70-84） */
  photoBonusSoft: 8,
  /** 经典偏好：演唱会地标 */
  classicConcert: 10,
  /** 经典偏好：MV取景 */
  classicFilming: 7,
  /** 美食偏好命中（type = food） */
  foodBonus: 12,
  /** 轻松偏好命中（建议停留 ≥ 50min） */
  relaxBonus: 6,
  /** 从地点详情进入（context.locationId） */
  contextBonus: 8,
  /** 从帖子/路线进入（context.postId / routeId 的地点） */
  contextSoftBonus: 5,
  /** 社区证据得分上限 */
  communityMax: 18,
  /** 每条社区洞察加分 */
  communityPerEvidence: 4,
  /** 高赞内容加成（该地点 maxLikes ≥ 2000） */
  communityLikeBonusHigh: 4,
  /** 中赞内容加成（≥ 800） */
  communityLikeBonusMid: 2,
  /** 少走路：与其他候选平均距离 ≤ 2km 不扣分 */
  walkingNearThresholdKm: 2,
  /** 少走路：2-4km 中扣分 */
  walkingMidThresholdKm: 4,
  walkingMidPenalty: 5,
  /** 少走路：> 4km 重扣分 */
  walkingMaxPenalty: 10,
} as const

/** 时间与交通规则（Demo 估算口径，非真实导航） */
export const TRAVEL_RULES = {
  /** 步行速度 km/h（演示估算） */
  walkSpeedKmh: 4,
  /** 公共交通速度 km/h（演示估算，含等车折损） */
  metroSpeedKmh: 30,
  /** 公共交通固定换乘损耗（分钟） */
  metroTransferMin: 10,
  /** ≤ 该距离视为步行可达（km） */
  walkThresholdKm: 1.5,
  /** 停留时长下限/上限（分钟） */
  stayMin: 20,
  stayMax: 120,
  /** 「轻松」偏好停留系数 */
  relaxStayMultiplier: 1.2,
  /** 优化轮次中压缩停留的系数 */
  shortenStayFactor: 0.85,
} as const

export const TIME_RULES = {
  /** 行程缓冲比例（总时长 ≤ 预算 × (1-buffer) 为舒适） */
  bufferRatio: 0.1,
  /** 少走路偏好下步行总量提醒阈值（km） */
  walkingWarningKm: 4,
  /** 单段交通时间提醒阈值（分钟） */
  longTravelMin: 45,
} as const

export const ROUTE_RULES = {
  /** 站点数下限（不足时返回 warning，不硬塞地点） */
  minStops: 3,
  /** 优化轮数上限（防止无限循环） */
  maxOptimizeRounds: 2,
  /** 编排器内重新规划总次数安全阀 */
  maxPlans: 5,
} as const

/** 偏好中文标签（trace / 解释文案用） */
export const PREFERENCE_LABELS: Record<string, string> = {
  photo: '拍照',
  classic: '经典',
  food: '美食',
  lessWalking: '少走路',
  relax: '轻松',
}

/** 自然语言补充的关键词规则（非 LLM 的确定性解析，未来替换为 LLM 理解） */
export const SUPPLEMENT_KEYWORDS = {
  photo: /拍照|出片|机位|夜景|照片|好看/,
  classic: /经典|地标|情怀|老牌|标志/,
  food: /吃|美食|面|奶茶|咖啡|小吃|夜宵|餐厅|同款/,
  lessWalking: /少走路|不想走|少走|别太累/,
  relax: /轻松|慢|不赶|休闲|随意/,
} as const

/** 错误码（结构化失败，不抛异常） */
export const ERROR_CODES = {
  CITY_NOT_FOUND: 'CITY_NOT_FOUND',
  CELEBRITY_NOT_FOUND: 'CELEBRITY_NOT_FOUND',
  INVALID_TIME_RANGE: 'INVALID_TIME_RANGE',
  INVALID_DATE: 'INVALID_DATE',
  INVALID_MAX_STOPS: 'INVALID_MAX_STOPS',
  CONTEXT_LOCATION_NOT_FOUND: 'CONTEXT_LOCATION_NOT_FOUND',
  CONTEXT_POST_NOT_FOUND: 'CONTEXT_POST_NOT_FOUND',
  CONTEXT_ROUTE_NOT_FOUND: 'CONTEXT_ROUTE_NOT_FOUND',
  NO_AVAILABLE_LOCATIONS: 'NO_AVAILABLE_LOCATIONS',
  TOO_SHORT_WINDOW: 'TOO_SHORT_WINDOW',
  OPTIMIZATION_LIMIT: 'OPTIMIZATION_LIMIT',
} as const

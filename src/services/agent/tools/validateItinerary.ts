/* ============================================================
   Tool 5：validateItinerary —— 行程校验
   输入：{ route, request, locations }
   输出：ValidationResult { valid, issues[], warnings[] }
   issues = 必须修复（时间倒流/重复地点/超出营业/店休/超时预算）
   warnings = 可接受但需告知（缓冲偏紧/站点偏少/单段交通长/
              偏好未完全满足/少走路步行超提醒）
   ============================================================ */
import { getIsoWeekday, toMin, WEEKDAY_LABELS } from '@/utils/time'
import { ROUTE_RULES, TIME_RULES } from '../rules'
import type {
  CelebrityLocation,
  PlanningRequest,
  Route,
  ValidationIssue,
  ValidationResult,
} from '../types'

export interface ValidateItineraryInput {
  route: Route
  request: PlanningRequest
  locations: CelebrityLocation[]
}

export function validateItinerary(input: ValidateItineraryInput): ValidationResult {
  const { route, request, locations } = input
  const locMap = new Map(locations.map((l) => [l.id, l]))
  const issues: ValidationIssue[] = []
  const warnings: ValidationIssue[] = []

  // —— 时间倒流 / 重复地点 / 营业时间 / 店休日（逐站） ——
  let prevLeave = 0
  const seen = new Set<string>()
  const restDayIso = getIsoWeekday(request.date)

  route.stops.forEach((s, i) => {
    const loc = locMap.get(s.locationId)
    if (!loc) {
      issues.push({
        code: 'UNKNOWN_LOCATION',
        message: `路线中第 ${i + 1} 站地点不存在`,
        severity: 'issue',
        locationId: s.locationId,
      })
      return
    }

    if (seen.has(s.locationId)) {
      issues.push({
        code: 'DUPLICATE_LOCATION',
        message: `「${loc.name}」在路线中重复出现`,
        severity: 'issue',
        locationId: s.locationId,
      })
    }
    seen.add(s.locationId)

    const arrive = toMin(s.arriveTime)
    const leave = toMin(s.leaveTime)
    if (leave <= arrive) {
      issues.push({
        code: 'TIME_REVERSE',
        message: `「${loc.name}」离开时间早于到达时间`,
        severity: 'issue',
        locationId: s.locationId,
      })
    }
    if (i > 0 && arrive < prevLeave) {
      issues.push({
        code: 'TIME_REVERSE',
        message: `「${loc.name}」的到达时间早于上一站离开时间`,
        severity: 'issue',
        locationId: s.locationId,
      })
    }
    prevLeave = Math.max(prevLeave, leave)

    const open = toMin(loc.openingHours.start)
    const close = toMin(loc.openingHours.end)
    if (arrive < open || leave > close) {
      issues.push({
        code: 'CLOSED_AT_ARRIVAL',
        message: `「${loc.name}」到访时间（${s.arriveTime}–${s.leaveTime}）超出营业时间（${loc.openingHours.start}–${loc.openingHours.end}）`,
        severity: 'issue',
        locationId: s.locationId,
      })
    }

    if (restDayIso !== null && loc.openingHours.restDays.includes(restDayIso)) {
      issues.push({
        code: 'REST_DAY',
        message: `「${loc.name}」在出行日期为店休日（${WEEKDAY_LABELS[restDayIso]}）`,
        severity: 'issue',
        locationId: s.locationId,
      })
    }

    // —— 异常交通/停留（warning 级） ——
    if (s.travelMin > TIME_RULES.longTravelMin) {
      warnings.push({
        code: 'LONG_TRAVEL',
        message: `前往「${loc.name}」的单段交通时间较长（${s.travelMin} 分钟，演示估算）`,
        severity: 'warning',
        locationId: s.locationId,
      })
    }
  })

  // —— 总时长 vs 可用时间 ——
  const windowMin = toMin(request.endTime) - toMin(request.startTime)
  const budget = Math.min(request.availableMin, windowMin)
  if (route.totalMin > budget) {
    issues.push({
      code: 'OVERTIME',
      message: `路线总时长 ${route.totalMin} 分钟，超出可用时间 ${budget} 分钟`,
      severity: 'issue',
    })
  } else if (route.totalMin > budget * (1 - TIME_RULES.bufferRatio)) {
    warnings.push({
      code: 'BUFFER_TIGHT',
      message: `路线时长 ${route.totalMin} 分钟，缓冲较少（建议预留 10%）`,
      severity: 'warning',
    })
  }
  if (request.availableMin > windowMin) {
    warnings.push({
      code: 'BUDGET_CAPPED',
      message: '可用时长大于所选时段，已按时段上限计算',
      severity: 'warning',
    })
  }

  // —— 站点数量 ——
  if (route.stops.length === 0) {
    issues.push({
      code: 'EMPTY_ROUTE',
      message: '路线为空，没有可安排的站点',
      severity: 'issue',
    })
  } else if (route.stops.length < ROUTE_RULES.minStops) {
    warnings.push({
      code: 'FEW_STOPS',
      message: `符合当前条件的地点较少，仅安排了 ${route.stops.length} 站`,
      severity: 'warning',
    })
  }

  // —— 偏好满足度（warning 级，不硬性要求） ——
  const prefs = request.preferences
  if (prefs.photo && !route.stops.some((s) => (locMap.get(s.locationId)?.scores.photo ?? 0) >= 80)) {
    warnings.push({
      code: 'PREF_PHOTO_UNMET',
      message: '受时间或营业条件限制，未能安排高拍照价值的地点',
      severity: 'warning',
    })
  }
  if (prefs.food && !route.stops.some((s) => locMap.get(s.locationId)?.type === 'food')) {
    warnings.push({
      code: 'PREF_FOOD_UNMET',
      message: '受时间或营业条件限制，未能安排美食类地点',
      severity: 'warning',
    })
  }
  if (prefs.lessWalking && route.walkingKm > TIME_RULES.walkingWarningKm) {
    warnings.push({
      code: 'WALKING_OVER',
      message: `路线步行距离 ${route.walkingKm}km，超过「少走路」的舒适建议值`,
      severity: 'warning',
    })
  }

  return { valid: issues.length === 0, issues, warnings }
}

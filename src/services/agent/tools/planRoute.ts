/* ============================================================
   Tool 4：planRoute —— 路线规划
   输入：{ locations: CandidateLocation[], request } + 可选 options
   输出：RoutePlanResult { route, dropped[], warnings[] }
   算法（确定性，无随机）：
     1. 选择：按评分取 top maxStops
     2. 起点：context.locationId 优先（若入选），否则最高分站点
     3. 排序：贪心最近邻 + 局部 2-opt（减少折返）
     4. 时间：按 startTime 依次分配到达/离开，营业前等待；
        超出营业时间或 endTime 的站点 → 修剪并记录原因
   交通时间：Haversine 直线距离 + 演示估算速度（明确非真实导航）。
   ============================================================ */
import { distKm } from '@/utils/geo'
import { fmtMin, toMin } from '@/utils/time'
import { TRAVEL_RULES } from '../rules'
import type {
  CandidateLocation,
  CelebrityLocation,
  DroppedLocation,
  PlanningRequest,
  Route,
  RoutePlanResult,
  RouteStop,
} from '../types'
import type { TravelMode } from '@/types'

export interface PlanRouteInput {
  locations: CandidateLocation[]
  request: PlanningRequest
}

export interface PlanRouteOptions {
  /** 停留时长覆盖系数（优化轮次压缩停留用） */
  stayFactor?: number
}

interface TravelSegment {
  mode: TravelMode
  min: number
  km: number
}

/** 两站间交通估算（Demo 估算口径） */
function travelBetween(a: CelebrityLocation, b: CelebrityLocation): TravelSegment {
  const km = distKm(a, b)
  if (km <= TRAVEL_RULES.walkThresholdKm) {
    return { mode: 'walk', min: Math.round((km / TRAVEL_RULES.walkSpeedKmh) * 60), km }
  }
  return {
    mode: 'metro',
    min: Math.round((km / TRAVEL_RULES.metroSpeedKmh) * 60 + TRAVEL_RULES.metroTransferMin),
    km,
  }
}

function estimateStay(loc: CelebrityLocation, stayFactor: number): number {
  return Math.min(
    TRAVEL_RULES.stayMax,
    Math.max(TRAVEL_RULES.stayMin, Math.round(loc.suggestedStayMin * stayFactor)),
  )
}

/** 局部 2-opt：反转路径片段以缩短总距离（开放路径，确定性） */
function twoOpt(path: CandidateLocation[]): CandidateLocation[] {
  const order = [...path]
  const d = (i: number, j: number): number => distKm(order[i].location, order[j].location)
  let improved = true
  let guard = 0

  while (improved && guard < 10) {
    improved = false
    guard += 1
    outer: for (let i = 0; i < order.length - 2; i++) {
      for (let j = i + 2; j < order.length; j++) {
        const oldGain = d(i, i + 1) + (j + 1 < order.length ? d(j, j + 1) : 0)
        const newGain = d(i, j) + (j + 1 < order.length ? d(i + 1, j + 1) : 0)
        if (oldGain > newGain + 1e-9) {
          const seg = order.slice(i + 1, j + 1).reverse()
          order.splice(i + 1, j - i, ...seg)
          improved = true
          break outer
        }
      }
    }
  }

  return order
}

export function planRoute(input: PlanRouteInput, options: PlanRouteOptions = {}): RoutePlanResult {
  const { locations, request } = input
  const stayFactor =
    options.stayFactor ??
    (request.preferences.relax ? TRAVEL_RULES.relaxStayMultiplier : 1)

  const startMin = toMin(request.startTime)
  const endMin = toMin(request.endTime)

  // 1) 选择：评分 top maxStops（同分按 ID 稳定排序）
  const selected = [...locations]
    .sort((a, b) => b.score - a.score || a.locationId.localeCompare(b.locationId))
    .slice(0, Math.max(0, request.maxStops))

  if (selected.length === 0) {
    return {
      route: emptyRoute(request),
      dropped: locations.map((c) => ({
        locationId: c.locationId,
        name: c.location.name,
        reason: '无候选地点',
      })),
      warnings: ['没有可规划的候选地点'],
    }
  }

  // 2) 起点：context 地点优先
  let startIdx = 0
  const ctxId = request.context?.locationId
  if (ctxId) {
    const i = selected.findIndex((c) => c.locationId === ctxId)
    if (i >= 0) startIdx = i
  }
  const ordered: CandidateLocation[] = [
    selected[startIdx],
    ...selected.filter((_, i) => i !== startIdx),
  ]

  // 3) 贪心最近邻
  const path: CandidateLocation[] = [ordered[0]]
  const rest = ordered.slice(1)
  while (rest.length > 0) {
    const cur = path[path.length - 1]
    let best = 0
    for (let i = 1; i < rest.length; i++) {
      if (distKm(cur.location, rest[i].location) < distKm(cur.location, rest[best].location) - 1e-9) {
        best = i
      }
    }
    path.push(rest.splice(best, 1)[0])
  }

  // 4) 局部 2-opt 优化顺序
  const improved = twoOpt(path)

  // 5) 时间分配 + 修剪
  const stops: RouteStop[] = []
  const dropped: DroppedLocation[] = []
  let prevLoc: CelebrityLocation | null = null
  let clock = startMin

  for (const cand of improved) {
    const loc = cand.location
    const travel: TravelSegment = prevLoc
      ? travelBetween(prevLoc, loc)
      : { mode: null, min: 0, km: 0 }

    let arrive = clock + travel.min
    const open = toMin(loc.openingHours.start)
    const close = toMin(loc.openingHours.end)
    const stay = estimateStay(loc, stayFactor)

    if (arrive < open) arrive = open // 营业前等待
    if (arrive + stay > close) {
      dropped.push({
        locationId: loc.id,
        name: loc.name,
        reason: '到达时间超出营业时间，无法安排',
      })
      continue
    }
    if (arrive + stay > endMin) {
      dropped.push({
        locationId: loc.id,
        name: loc.name,
        reason: `超出时间预算（需在 ${fmtMin(endMin)} 前结束）`,
      })
      continue
    }

    stops.push({
      locationId: loc.id,
      order: stops.length + 1,
      arriveTime: fmtMin(arrive),
      leaveTime: fmtMin(arrive + stay),
      stayMin: stay,
      travelMin: travel.min,
      distanceKm: Number(travel.km.toFixed(1)),
      travelMode: travel.mode,
    })
    clock = arrive + stay
    prevLoc = loc
  }

  const travelMin = stops.reduce((s, st) => s + st.travelMin, 0)
  const totalKm = stops.reduce((s, st) => s + st.distanceKm, 0)
  const walkingKm = stops.reduce((s, st) => s + (st.travelMode === 'walk' ? st.distanceKm : 0), 0)

  const route: Route = {
    cityId: request.cityId,
    celebrityId: request.celebrityId,
    stops,
    totalMin: stops.length > 0 ? toMin(stops[stops.length - 1].leaveTime) - startMin : 0,
    travelMin,
    totalKm: Number(totalKm.toFixed(1)),
    walkingKm: Number(walkingKm.toFixed(1)),
    startTime: request.startTime,
    endTime: request.endTime,
  }

  const warnings: string[] = []
  if (dropped.length > 0) {
    warnings.push(`有 ${dropped.length} 个地点因时间或营业条件未安排`)
  }

  return { route, dropped, warnings }
}

function emptyRoute(request: PlanningRequest): Route {
  return {
    cityId: request.cityId,
    celebrityId: request.celebrityId,
    stops: [],
    totalMin: 0,
    travelMin: 0,
    totalKm: 0,
    walkingKm: 0,
    startTime: request.startTime,
    endTime: request.endTime,
  }
}

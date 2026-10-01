/* ============================================================
   Agent 引擎测试（6 组规格用例 + 确定性 + 失败场景）
   运行：npm run test:agent
   ============================================================ */
import { describe, expect, it } from 'vitest'
import { planTrip } from '@/services/agent'
import type { PlanningRequest } from '@/services/agent'

/** 基准请求：2026-10-10（周六），无店休冲突 */
const base: PlanningRequest = {
  cityId: 'city_shanghai',
  celebrityId: 'cele_jaychou',
  date: '2026-10-10',
  startTime: '13:00',
  endTime: '20:00',
  availableMin: 420,
  maxStops: 4,
  preferences: {},
}

describe('星途 AI Agent 引擎', () => {
  it('Test 1：上海 + 周杰伦，photo + classic，maxStops=4 → 成功生成路线', () => {
    const result = planTrip({ ...base, preferences: { photo: true, classic: true } })

    expect(result.success, `Input: photo+classic, 13:00-20:00\nActual: ${JSON.stringify(result.error)}`).toBe(true)
    expect(result.route!.stops.length).toBeGreaterThanOrEqual(3)
    expect(result.route!.stops.length).toBeLessThanOrEqual(4)
    // 解释性：每个选中地点都有理由，路线有总述，trace 完整
    expect(result.reasoning.locationReasons.length).toBe(result.route!.stops.length)
    result.reasoning.locationReasons.forEach((r) => {
      expect(r.reasons.length, `地点 ${r.locationId} 缺少推荐理由`).toBeGreaterThan(0)
    })
    expect(result.reasoning.routeReason.length).toBeGreaterThan(0)
    expect(result.trace.length).toBeGreaterThanOrEqual(8)
    expect(result.validation.valid).toBe(true)
    // 证据：来自真实 mock 内容
    expect(result.communityEvidence.length).toBeGreaterThan(0)
    result.communityEvidence.forEach((e) => expect(e.content.length).toBeGreaterThan(0))
  })

  it('Test 2：10:00-11:00（仅 1 小时）→ 时间过短，结构化失败', () => {
    const result = planTrip({ ...base, startTime: '10:00', endTime: '11:00', availableMin: 60 })

    expect(result.success).toBe(false)
    expect(result.error?.code).toBe('TOO_SHORT_WINDOW')
    expect(result.trace.length).toBeGreaterThan(0)
  })

  it('Test 3：出行日期为店休日（2026-10-05 周一）→ 店休地点被排除并说明原因', () => {
    const result = planTrip({ ...base, date: '2026-10-05' })

    expect(result.success).toBe(true)
    // loc_sh_007（周一店休）与 loc_sh_010（周一店休）不得出现在路线中
    const stopIds = result.route!.stops.map((s) => s.locationId)
    expect(stopIds).not.toContain('loc_sh_007')
    expect(stopIds).not.toContain('loc_sh_010')
    // 取舍说明中必须出现「店休」解释
    const mentioned = result.reasoning.tradeoffs.some((t) => t.message.includes('店休'))
    expect(mentioned, `取舍说明未解释店休排除:\n${result.reasoning.tradeoffs.map((t) => t.message).join('\n')}`).toBe(true)
  })

  it('Test 4：lessWalking=true → 步行距离不高于无偏好路线', () => {
    const withPref = planTrip({ ...base, preferences: { lessWalking: true } })
    const withoutPref = planTrip({ ...base, preferences: {} })

    expect(withPref.success).toBe(true)
    expect(withoutPref.success).toBe(true)
    expect(withPref.route!.walkingKm).toBeLessThanOrEqual(withoutPref.route!.walkingKm)
  })

  it('Test 5：food=true → 路线中包含美食类地点', () => {
    const result = planTrip({ ...base, maxStops: 6, preferences: { food: true } })

    expect(result.success).toBe(true)
    const foodStops = result.route!.stops.filter((s) =>
      result.selectedLocations.find((l) => l.id === s.locationId)?.type === 'food',
    )
    expect(foodStops.length, `路线未包含美食地点:\n${JSON.stringify(result.route!.stops, null, 2)}`).toBeGreaterThanOrEqual(1)
  })

  it('Test 6：context.locationId=田子坊 → 该地点进入路线且作为起点', () => {
    const result = planTrip({ ...base, context: { locationId: 'loc_sh_004' } })

    expect(result.success).toBe(true)
    expect(result.route!.stops[0].locationId).toBe('loc_sh_004')
    const reason = result.reasoning.locationReasons.find((r) => r.locationId === 'loc_sh_004')
    expect(reason?.matchedPreferences).toContain('context')
  })

  it('Test 7：确定性 —— 同一请求两次执行结果完全一致（除 trace 墙钟时间戳外）', () => {
    const request: PlanningRequest = { ...base, preferences: { photo: true, food: true } }
    const a = planTrip(request)
    const b = planTrip(request)

    // 业务结果完全一致：无任何随机因素
    const stripTrace = (r: typeof a) => {
      const { trace: _trace, ...rest } = r
      return rest
    }
    expect(JSON.stringify(stripTrace(a))).toBe(JSON.stringify(stripTrace(b)))

    // trace 的步骤序列与摘要一致（仅时间戳为墙钟时间，允许差异）
    const steps = (r: typeof a) => r.trace.map((t) => `${t.tool}:${t.status}:${t.summary}`)
    expect(steps(a)).toEqual(steps(b))
  })

  it('Test 8：城市不存在 → 结构化错误 CITY_NOT_FOUND，不抛异常', () => {
    const result = planTrip({ ...base, cityId: 'city_unknown' })

    expect(result.success).toBe(false)
    expect(result.error?.code).toBe('CITY_NOT_FOUND')
  })
})

/* ============================================================
   Agent 执行过程页（Stage 7）
   「星轨正在形成」——把真实 trace 产品化为 7 步执行时间轴。
   架构边界：
     · 只消费 agentStore（currentRequest / currentResult）
     · trace 是执行过程的唯一数据来源；route / reasoning /
       communityEvidence / validation 只用于展示
     · 不调用任何 Tool，不重新 planTrip，不新增假数字
   动画是对真实 trace 的可视化，不是模拟一个不存在的执行过程。
   ============================================================ */
import { useEffect, useMemo, useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { ArrowLeft, Check, MapPin, Star } from 'lucide-react'
import { useAgentStore } from '@/store/agentStore'
import { getCelebritySync, getCitySync } from '@/services/data'
import { getAgentErrorMessage } from '@/utils/agentMessages'
import { PREFERENCE_LABELS } from '@/services/agent'
import type { PlanningRequest, PlanningResult, TraceStep } from '@/services/agent'
import { formatDuration, formatDurationShort, LOCATION_TYPE_LABELS } from '@/utils/format'
import StarRailMark from '@/components/icons/StarRailMark'
import Tag from '@/components/ui/Tag'
import AgentErrorView from '@/components/ai/AgentErrorView'

// ---------- trace → 产品步骤映射（产品语言，不暴露内部字段） ----------

const TOOL_UI: Record<string, { title: string; running: string; duration: number }> = {
  understandRequest: { title: '理解你的需求', running: '正在识别你的城市、时间范围与打卡偏好', duration: 900 },
  getCelebrityLocations: { title: '寻找相关地点', running: '正在从星途地点库中寻找相关打卡地点', duration: 1100 },
  searchCommunity: { title: '查看社区攻略', running: '正在从社区内容中寻找攻略与拍摄建议', duration: 1400 },
  filterLocations: { title: '筛选地点', running: '正在根据你的时间、偏好与距离筛选候选地点', duration: 1200 },
  planRoute: { title: '规划路线', running: '正在计算地点之间的顺序与时间', duration: 2000 },
  validateItinerary: { title: '校验行程', running: '正在检查时间、营业时间与路线合理性', duration: 1100 },
  optimize: { title: '优化路线', running: '正在根据你的偏好进一步调整路线', duration: 900 },
}

const DISPLAY_TOOLS = Object.keys(TOOL_UI)
const INITIAL_DELAY = 400
const SKIPPED_STEP_DURATION = 700
const SEGMENT_REVEAL_MS = 420

const sleep = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms))

/** 确定性星点（装饰，无随机数，保证每次渲染一致） */
function seededStarfield(count: number): { x: number; y: number; r: number }[] {
  let seed = 42
  const rand = (): number => {
    seed = (seed * 1664525 + 1013904223) >>> 0
    return seed / 4294967296
  }
  return Array.from({ length: count }, () => ({ x: rand() * 560, y: rand() * 400, r: rand() * 1.1 + 0.4 }))
}

export default function AIExecutionPage() {
  const navigate = useNavigate()
  const currentRequest = useAgentStore((s) => s.currentRequest)
  const currentResult = useAgentStore((s) => s.currentResult)

  // —— 动画状态机：pending → running → completed → 全部完成 ——
  const [activeStep, setActiveStep] = useState(-1)
  const [completedCount, setCompletedCount] = useState(0)
  const [finished, setFinished] = useState(false)
  const [segmentsRevealed, setSegmentsRevealed] = useState(0)

  const steps: TraceStep[] = useMemo(() => {
    if (!currentResult) return []
    return currentResult.trace.filter((t) => DISPLAY_TOOLS.includes(t.tool))
  }, [currentResult])

  // 主流程动画：只对真实 trace 步骤做节奏可视化
  useEffect(() => {
    if (!currentResult || !currentResult.success || steps.length === 0) return
    let cancelled = false
    const run = async (): Promise<void> => {
      await sleep(INITIAL_DELAY)
      for (let i = 0; i < steps.length; i++) {
        if (cancelled) return
        setActiveStep(i)
        const step = steps[i]
        const duration =
          step.tool === 'optimize' && step.status === 'skipped'
            ? SKIPPED_STEP_DURATION
            : TOOL_UI[step.tool].duration
        await sleep(duration)
        if (cancelled) return
        setActiveStep(-1)
        setCompletedCount(i + 1)
      }
      if (cancelled) return
      setFinished(true)
    }
    void run()
    return () => {
      cancelled = true
    }
  }, [currentResult, steps])

  // 规划路线步骤进行中：星轨逐段连线
  const routeStepIndex = steps.findIndex((s) => s.tool === 'planRoute')
  useEffect(() => {
    if (activeStep !== routeStepIndex || routeStepIndex < 0) return
    const segments = Math.max(0, (currentResult?.route?.stops.length ?? 1) - 1)
    if (segments === 0) return
    setSegmentsRevealed(0)
    let revealed = 0
    const interval = setInterval(() => {
      revealed += 1
      setSegmentsRevealed(revealed)
      if (revealed >= segments) clearInterval(interval)
    }, SEGMENT_REVEAL_MS)
    return () => clearInterval(interval)
  }, [activeStep, routeStepIndex, currentResult])

  // 完成时确保路线完整呈现
  useEffect(() => {
    if (finished) {
      setSegmentsRevealed(Math.max(0, (currentResult?.route?.stops.length ?? 1) - 1))
    }
  }, [finished, currentResult])

  // —— 守卫（在 hooks 之后）——
  if (!currentRequest || !currentResult) {
    return <Navigate to="/ai/planning" replace />
  }

  if (!currentResult.success) {
    return (
      <AgentErrorView
        message={getAgentErrorMessage(currentResult.error?.code, currentResult.error?.message ?? '暂时无法完成规划。')}
        onBack={() => navigate('/ai/planning')}
      />
    )
  }

  const route = currentResult.route
  const locationsStepIndex = steps.findIndex((s) => s.tool === 'getCelebrityLocations')
  const validateStepIndex = steps.findIndex((s) => s.tool === 'validateItinerary')
  const nodesVisible = completedCount > locationsStepIndex || activeStep > locationsStepIndex
  const timesVisible = completedCount > validateStepIndex || activeStep > validateStepIndex

  return (
    <div className="xr-plan-page">
      <div className="xr-container">
        <button className="xr-plan-back" onClick={() => navigate('/ai/planning')}>
          <ArrowLeft size={16} strokeWidth={1.8} />
          返回调整
        </button>

        {/* —— 页头 —— */}
        <header className="xr-exec-head">
          <span className="xr-exec-head__brand">
            <StarRailMark size={16} />
            星途 AI
          </span>
          <h1>{finished ? '路线整理完成' : '正在为你整理一条打卡路线'}</h1>
          <p>我会从星途社区中寻找相关地点和攻略，再根据你的时间与偏好整理成可执行路线。</p>
        </header>

        <div className="xr-exec-layout">
          {/* ============ 左：执行时间线 ============ */}
          <div className="xr-exec-timeline">
            {steps.map((s, i) => {
              const ui = TOOL_UI[s.tool]
              const isActive = activeStep === i
              const isDone = i < completedCount
              const isPending = !isActive && !isDone
              return (
                <div
                  key={s.tool}
                  className={`xr-exec-step${isActive ? ' xr-exec-step--active' : ''}${isDone ? ' xr-exec-step--done' : ''}${isPending ? ' xr-exec-step--pending' : ''}`}
                >
                  <div className="xr-exec-step__rail">
                    <span className="xr-exec-step__node">
                      {isDone ? <Check size={14} strokeWidth={2.2} /> : <Star size={11} strokeWidth={1.8} />}
                    </span>
                    {i < steps.length - 1 && <span className="xr-exec-step__line" />}
                  </div>
                  <div className="xr-exec-step__body">
                    <div className="xr-exec-step__title-row">
                      <span className="xr-exec-step__title">{ui.title}</span>
                      {isActive && <span className="xr-exec-step__status xr-exec-step__status--active">进行中</span>}
                      {isDone && <span className="xr-exec-step__status">已完成</span>}
                    </div>
                    <p className="xr-exec-step__text">{isActive ? ui.running : s.summary}</p>
                    {(isActive || isDone) && (
                      <div className="xr-exec-artifact">
                        <Artifact tool={s.tool} request={currentRequest} result={currentResult} />
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>

          {/* ============ 右：实时路线预览 ============ */}
          <aside className="xr-exec-canvas-panel">
            <span className="xr-plan-rail__title">
              <StarRailMark size={15} />
              路线预览
            </span>
            <RouteCanvas
              result={currentResult}
              nodesVisible={nodesVisible}
              timesVisible={timesVisible}
              segmentsRevealed={segmentsRevealed}
              finished={finished}
            />
            {route && (finished || timesVisible) && (
              <div className="xr-exec-stats">
                <div>
                  <b className="num">{route.stops.length}</b>
                  <span>个地点</span>
                </div>
                <div>
                  <b className="num">约 {route.totalKm} km</b>
                  <span>总距离</span>
                </div>
                <div>
                  <b className="num">{formatDurationShort(route.totalMin)}</b>
                  <span>预计用时</span>
                </div>
              </div>
            )}
            <p className="xr-exec-canvas__hint">路线图为星途抽象示意，实际导航请以地图工具为准</p>
          </aside>
        </div>

        {/* ============ 完成横幅 ============ */}
        {finished && route && (
          <div className="xr-exec-banner">
            <div className="xr-exec-banner__title">
              <StarRailMark size={20} />
              路线整理完成
            </div>
            <p className="xr-exec-banner__text">
              星途已为你整理出 <b className="num">{route.stops.length}</b> 站路线 · 预计
              {formatDuration(route.totalMin)} · 全程约 {route.totalKm}km
            </p>
            <div className="xr-exec-banner__cta">
              <button className="xr-btn xr-btn--ghost-night xr-btn--md" onClick={() => navigate('/ai/planning')}>
                返回调整
              </button>
              <button className="xr-btn xr-btn--accent xr-btn--lg" onClick={() => navigate('/ai/result')}>
                查看路线
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

/* ============ 各步骤产物（全部来自真实 currentResult） ============ */

function Artifact(props: { tool: string; request: PlanningRequest; result: PlanningResult }) {
  const { tool, request, result } = props

  if (tool === 'understandRequest') {
    const cityName = getCitySync(request.cityId)?.name ?? request.cityId
    const celebName = request.celebrityId ? getCelebritySync(request.celebrityId)?.name ?? '' : null
    const prefLabels = Object.entries(PREFERENCE_LABELS)
      .filter(([k]) => request.preferences[k as keyof typeof request.preferences] === true)
      .map(([, v]) => v)
    return (
      <div className="xr-exec-chips">
        <Tag variant="night">
          <MapPin size={12} strokeWidth={1.8} />
          {cityName}
        </Tag>
        <Tag variant="night">
          <Star size={12} strokeWidth={1.8} />
          {celebName ?? '不限明星'}
        </Tag>
        <Tag variant="night-gold" className="num">
          {request.startTime}–{request.endTime}
        </Tag>
        <Tag variant="night" className="num">
          最多 {request.maxStops} 个地点
        </Tag>
        {prefLabels.map((l) => (
          <Tag key={l} variant="night">
            {l}
          </Tag>
        ))}
      </div>
    )
  }

  if (tool === 'getCelebrityLocations') {
    return (
      <div className="xr-exec-loc-list">
        {result.selectedLocations.slice(0, 3).map((l) => (
          <div key={l.id} className="xr-exec-loc">
            <MapPin size={14} strokeWidth={1.8} color="var(--gold-400)" />
            <span>{l.name}</span>
            <Tag variant="night">{LOCATION_TYPE_LABELS[l.type]}</Tag>
          </div>
        ))}
      </div>
    )
  }

  if (tool === 'searchCommunity') {
    return (
      <div className="xr-exec-ev-list">
        {result.communityEvidence.slice(0, 3).map((e) => (
          <div key={e.postId} className="xr-exec-ev">
            <p className="xr-exec-ev__title">{e.title}</p>
            <p className="xr-exec-ev__content">
              {e.evidenceType === 'photoTip' ? '拍照建议 · ' : '攻略要点 · '}
              {e.content}
            </p>
            <p className="xr-exec-ev__meta">
              {e.author} · {e.likes} 赞
            </p>
          </div>
        ))}
      </div>
    )
  }

  if (tool === 'filterLocations') {
    const excluded = result.reasoning.tradeoffs.filter((t) => t.type === 'excluded').slice(0, 2)
    return (
      <div className="xr-exec-warn-list">
        {excluded.length > 0 ? (
          excluded.map((t, i) => (
            <p key={i} className="xr-exec-warn">
              <span>!</span>
              {t.message}
            </p>
          ))
        ) : (
          <p className="xr-exec-note">候选地点全部通过时间与营业条件检查。</p>
        )}
      </div>
    )
  }

  if (tool === 'planRoute') {
    const route = result.route
    if (!route) return null
    return (
      <p className="xr-exec-note">
        已生成 <b className="num">{route.stops.length}</b> 站路线，预计 {formatDuration(route.totalMin)}
        {route.walkingKm > 0 ? `，其中步行约 ${route.walkingKm}km` : ''}。右侧星轨正在连接中…
      </p>
    )
  }

  if (tool === 'validateItinerary') {
    const issues = result.validation.issues
    const checks = [
      {
        label: '时间可执行',
        ok: !issues.some((i) => i.code === 'OVERTIME'),
        detail: issues.find((i) => i.code === 'OVERTIME')?.message,
      },
      {
        label: '开放时间匹配',
        ok: !issues.some((i) => i.code === 'CLOSED_AT_ARRIVAL' || i.code === 'REST_DAY'),
        detail: issues.find((i) => i.code === 'CLOSED_AT_ARRIVAL' || i.code === 'REST_DAY')?.message,
      },
      {
        label: '路线连续',
        ok: !issues.some((i) =>
          ['TIME_REVERSE', 'DUPLICATE_LOCATION', 'UNKNOWN_LOCATION', 'EMPTY_ROUTE'].includes(i.code),
        ),
        detail: issues.find((i) => i.code === 'TIME_REVERSE')?.message,
      },
    ]
    return (
      <div className="xr-exec-warn-list">
        {checks.map((c) => (
          <p key={c.label} className={`xr-exec-check${c.ok ? '' : ' xr-exec-check--bad'}`}>
            {c.ok ? <Check size={13} strokeWidth={2.2} color="var(--gold-400)" /> : <span>!</span>}
            {c.label}
            {!c.ok && c.detail ? ` · ${c.detail}` : ''}
          </p>
        ))}
        {result.validation.warnings.slice(0, 2).map((w, i) => (
          <p key={i} className="xr-exec-warn">
            <span>△</span>
            {w.message}
          </p>
        ))}
      </div>
    )
  }

  if (tool === 'optimize') {
    const adjust = result.reasoning.tradeoffs.filter((t) => t.type === 'remove' || t.type === 'shorten')
    return (
      <div className="xr-exec-warn-list">
        {adjust.length > 0 ? (
          adjust.map((t, i) => (
            <p key={i} className="xr-exec-warn">
              <span>✦</span>
              {t.message}
            </p>
          ))
        ) : (
          <p className="xr-exec-note">无需优化，路线已符合你的条件。</p>
        )}
      </div>
    )
  }

  return null
}

/* ============ 路线画布（星轨抽象预览，非真实地图） ============ */

function RouteCanvas(props: {
  result: PlanningResult
  nodesVisible: boolean
  timesVisible: boolean
  segmentsRevealed: number
  finished: boolean
}) {
  const { result, nodesVisible, timesVisible, segmentsRevealed, finished } = props
  const W = 560
  const H = 400
  const stars = useMemo(() => seededStarfield(64), [])

  const points = useMemo(() => {
    const stops = result.route?.stops ?? []
    if (stops.length === 0) return []
    const coordById = new Map(result.selectedLocations.map((l) => [l.id, { lng: l.lng, lat: l.lat }]))
    const coords = stops
      .map((s) => coordById.get(s.locationId))
      .filter((c): c is { lng: number; lat: number } => c !== undefined)
    if (coords.length === 0) return []
    const pad = 54
    const lngs = coords.map((c) => c.lng)
    const lats = coords.map((c) => c.lat)
    const minLng = Math.min(...lngs)
    const maxLng = Math.max(...lngs)
    const minLat = Math.min(...lats)
    const maxLat = Math.max(...lats)
    const lngRange = maxLng - minLng || 1
    const latRange = maxLat - minLat || 1
    return coords.map((c) => ({
      x: pad + ((c.lng - minLng) / lngRange) * (W - pad * 2),
      y: H - pad - ((c.lat - minLat) / latRange) * (H - pad * 2),
    }))
  }, [result])

  const stops = result.route?.stops ?? []
  const visibleSegments = Math.min(segmentsRevealed, Math.max(0, points.length - 1))

  return (
    <svg className="xr-exec-canvas" viewBox={`0 0 ${W} ${H}`} role="img" aria-label="路线抽象预览">
      {/* 星野 */}
      {stars.map((s, i) => (
        <circle key={i} cx={s.x} cy={s.y} r={s.r} fill="rgba(255,255,255,0.14)" />
      ))}

      {/* 星轨连线（逐段揭示） */}
      {points.length > 1 &&
        Array.from({ length: visibleSegments }, (_, i) => (
          <g key={i}>
            <line
              x1={points[i].x}
              y1={points[i].y}
              x2={points[i + 1].x}
              y2={points[i + 1].y}
              stroke="rgba(223,185,106,0.18)"
              strokeWidth="7"
              strokeLinecap="round"
            />
            <line
              x1={points[i].x}
              y1={points[i].y}
              x2={points[i + 1].x}
              y2={points[i + 1].y}
              stroke="#EACD8F"
              strokeWidth="2"
              strokeLinecap="round"
              strokeDasharray="6 5"
            />
          </g>
        ))}

      {/* 地点节点 */}
      {points.map((p, i) => {
        const stop = stops[i]
        const loc = result.selectedLocations.find((l) => l.id === stop?.locationId)
        return (
          <g
            key={stop?.locationId ?? i}
            opacity={nodesVisible ? 1 : 0}
            style={{ transition: 'opacity 0.4s ease-out' }}
          >
            <circle cx={p.x} cy={p.y} r="17" fill="#161E46" stroke={finished ? '#DFB96A' : '#EACD8F'} strokeWidth="1.5" />
            {finished && <circle cx={p.x} cy={p.y} r="17" fill="none" stroke="rgba(223,185,106,0.35)" strokeWidth="5" />}
            <text x={p.x} y={p.y + 4} textAnchor="middle" fontSize="13" fontWeight="600" fill="#EACD8F">
              {stop?.order ?? i + 1}
            </text>
            {loc && (
              <text x={p.x} y={p.y + 34} textAnchor="middle" fontSize="11.5" fill="rgba(255,255,255,0.78)">
                {loc.name.length > 8 ? `${loc.name.slice(0, 8)}…` : loc.name}
              </text>
            )}
            {timesVisible && stop && (
              <text x={p.x} y={p.y + 48} textAnchor="middle" fontSize="10.5" fill="#DFB96A">
                {stop.arriveTime}
              </text>
            )}
          </g>
        )
      })}

      {/* 等待态提示 */}
      {!nodesVisible && (
        <text x={W / 2} y={H / 2} textAnchor="middle" fontSize="14" fill="rgba(255,255,255,0.35)">
          星轨等待点亮…
        </text>
      )}
    </svg>
  )
}


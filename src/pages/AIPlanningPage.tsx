/* ============================================================
   AI 规划输入页（Stage 6）
   「这次，想怎么打卡？」
   - 结构化条件 + 补充说明 → PlanningRequest → planTrip()
   - 上下文预填：?locationId= / ?celebrityId=（可移除，不改原始数据）
   - 成功 → agentStore 存 request+result → /ai/execution
   - 失败 → 结构化错误展示，保留用户全部已填条件
   页面只调用 planTrip（编排由 Orchestrator 完成），不接触五个 Tool。
   ============================================================ */
import { useEffect, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import {
  ArrowLeft,
  CalendarDays,
  Camera,
  Clock,
  Footprints,
  MapPin,
  Moon,
  Star,
  Utensils,
  X,
} from 'lucide-react'
import { getCelebrities, getCities, getLocationRefSync } from '@/services/data'
import { planTrip } from '@/services/agent'
import type { PlanningRequest, PlanningPreferences } from '@/services/agent'
import { useAsync } from '@/hooks/useAsync'
import { useAgentStore } from '@/store/agentStore'
import { getIsoWeekday, toMin, WEEKDAY_LABELS } from '@/utils/time'
import { getAgentErrorMessage } from '@/utils/agentMessages'
import StarRailMark from '@/components/icons/StarRailMark'
import Avatar from '@/components/ui/Avatar'

// ---------- 表单状态（UI 状态与业务对象分离，提交时转换） ----------

type PreferenceKey = keyof PlanningPreferences

interface PlanningFormState {
  cityId: string
  celebrityId: string | null
  date: string
  startTime: string
  endTime: string
  maxStops: number
  preferences: Record<PreferenceKey, boolean>
  supplement: string
  contextLocationId: string | null
}

const PREFERENCE_OPTIONS: { key: PreferenceKey; label: string; icon: typeof Camera }[] = [
  { key: 'photo', label: '拍照', icon: Camera },
  { key: 'classic', label: '经典地点', icon: Star },
  { key: 'food', label: '美食', icon: Utensils },
  { key: 'lessWalking', label: '少走路', icon: Footprints },
  { key: 'relax', label: '轻松一点', icon: Moon },
]

const MAX_STOPS_OPTIONS = [3, 4, 5, 6]

/** 默认日期：今天 +3 天（不用过去日期） */
function defaultDate(offsetDays = 3): string {
  const d = new Date()
  d.setDate(d.getDate() + offsetDays)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export default function AIPlanningPage() {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const locationIdParam = params.get('locationId')
  const celebrityIdParam = params.get('celebrityId')

  const startPlanning = useAgentStore((s) => s.startPlanning)
  const [submitting, setSubmitting] = useState(false)
  const [agentError, setAgentError] = useState<string | null>(null)

  // 「调整路线」回传的上一轮条件（只读 peek，挂载后一次性消费）
  const adjustRef = useRef<ReturnType<typeof useAgentStore.getState>['pendingAdjustRequest']>(
    useAgentStore.getState().peekAdjustRequest(),
  )
  useEffect(() => {
    useAgentStore.getState().consumeAdjustRequest()
  }, [])

  // URL 上下文地点（用于初始城市推导）
  const paramLoc = locationIdParam ? getLocationRefSync(locationIdParam) : null

  const [form, setForm] = useState<PlanningFormState>(() => {
    const adjust = adjustRef.current
    if (adjust) {
      return {
        cityId: adjust.cityId,
        celebrityId: adjust.celebrityId ?? null,
        date: adjust.date ?? defaultDate(),
        startTime: adjust.startTime,
        endTime: adjust.endTime,
        maxStops: adjust.maxStops,
        preferences: {
          photo: adjust.preferences.photo ?? false,
          classic: adjust.preferences.classic ?? false,
          food: adjust.preferences.food ?? false,
          lessWalking: adjust.preferences.lessWalking ?? false,
          relax: adjust.preferences.relax ?? false,
        },
        supplement: adjust.supplement ?? '',
        contextLocationId: adjust.context?.locationId ?? locationIdParam,
      }
    }
    return {
      cityId: paramLoc?.cityId ?? 'city_shanghai',
      celebrityId: null,
      date: defaultDate(),
      startTime: '13:00',
      endTime: '20:00',
      maxStops: 4,
      preferences: { photo: false, classic: false, food: false, lessWalking: false, relax: false },
      supplement: '',
      contextLocationId: locationIdParam,
    }
  })

  // 调整路线回填时不再自动重选默认明星
  const [celebrityResolved, setCelebrityResolved] = useState(() => adjustRef.current !== null)

  // 当前表单上下文地点（同步解析用于展示；请求中透传原始 id，由 Agent 校验）
  const contextLoc = form.contextLocationId ? getLocationRefSync(form.contextLocationId) : null

  const { data, loading } = useAsync(
    () => Promise.all([getCities(), getCelebrities()]).then(([cities, celebs]) => ({ cities, celebs })),
    [],
  )

  // —— 默认明星解析：地点所属明星 > URL 明星 > 周杰伦(上海) > 城市内第一位 ——
  useEffect(() => {
    if (celebrityResolved || !data) return
    const cityCelebs = data.celebs.filter((c) => c.cityStats.some((cs) => cs.cityId === form.cityId))
    const fromContext = contextLoc ? cityCelebs.find((c) => c.id === contextLoc.celebrityId) : undefined
    const fromParam = celebrityIdParam ? cityCelebs.find((c) => c.id === celebrityIdParam) : undefined
    const jayInShanghai = form.cityId === 'city_shanghai' ? cityCelebs.find((c) => c.id === 'cele_jaychou') : undefined
    const chosen = fromContext ?? fromParam ?? jayInShanghai ?? cityCelebs[0] ?? null
    setForm((f) => ({ ...f, celebrityId: chosen?.id ?? null }))
    setCelebrityResolved(true)
  }, [data, celebrityResolved, form.cityId, contextLoc, celebrityIdParam])

  const setField = <K extends keyof PlanningFormState>(key: K, value: PlanningFormState[K]) =>
    setForm((f) => ({ ...f, [key]: value }))

  const cityCelebs = data
    ? data.celebs.filter((c) => c.cityStats.some((cs) => cs.cityId === form.cityId))
    : []

  /** 城市内容数（来自 getCelebrities 的 cityStats 聚合，数据层派生，无硬编码） */
  const cityLocationCount = (cityId: string): number =>
    data ? data.celebs.reduce((s, c) => s + (c.cityStats.find((cs) => cs.cityId === cityId)?.locationCount ?? 0), 0) : 0

  const selectedCity = data?.cities.find((c) => c.id === form.cityId)
  const selectedCeleb = data?.celebs.find((c) => c.id === form.celebrityId) ?? null
  const celebLocationCount = selectedCeleb
    ? selectedCeleb.cityStats.find((cs) => cs.cityId === form.cityId)?.locationCount ?? 0
    : 0

  const timeInvalid = toMin(form.endTime) <= toMin(form.startTime)
  const weekdayIso = getIsoWeekday(form.date)
  const prefCount = Object.values(form.preferences).filter(Boolean).length
  const hasPref = prefCount > 0

  const togglePreference = (key: PreferenceKey) =>
    setForm((f) => ({ ...f, preferences: { ...f.preferences, [key]: !f.preferences[key] } }))

  const removeContextLocation = () => setField('contextLocationId', null)

  // ---------- 提交 ----------
  const handleSubmit = () => {
    if (submitting) return

    // 前端基础校验（不调用 Agent）
    if (timeInvalid) return

    const request: PlanningRequest = {
      cityId: form.cityId,
      celebrityId: form.celebrityId ?? undefined,
      date: form.date,
      startTime: form.startTime,
      endTime: form.endTime,
      availableMin: toMin(form.endTime) - toMin(form.startTime),
      maxStops: form.maxStops,
      preferences: { ...form.preferences },
      supplement: form.supplement.trim() || undefined,
      context: form.contextLocationId ? { locationId: form.contextLocationId } : undefined,
    }

    setSubmitting(true)
    setAgentError(null)

    // 页面只调用 planTrip，工具链由 Orchestrator 完成
    const result = planTrip(request)

    if (result.success) {
      startPlanning(request, result)
      // 最小过渡时长：按钮进入 loading 态，随后进入执行页（防重复提交）
      setTimeout(() => navigate('/ai/execution'), 420)
    } else {
      setSubmitting(false)
      setAgentError(getAgentErrorMessage(result.error?.code, result.error?.message ?? '暂时无法规划，请调整条件后再试。'))
    }
  }

  if (loading || !data) {
    return (
      <div className="xr-plan-page">
        <div className="xr-container">
          <div className="xr-skeleton" style={{ width: 120, height: 20, marginBottom: 24, background: 'rgba(255,255,255,.08)' }} />
          <div className="xr-skeleton" style={{ width: '50%', height: 40, marginBottom: 12, background: 'rgba(255,255,255,.08)' }} />
          <div className="xr-skeleton" style={{ width: '35%', height: 18, background: 'rgba(255,255,255,.08)' }} />
        </div>
      </div>
    )
  }

  return (
    <div className="xr-plan-page">
      <div className="xr-container">
        <button className="xr-plan-back" onClick={() => navigate(-1)}>
          <ArrowLeft size={16} strokeWidth={1.8} />
          返回
        </button>

        <header className="xr-plan-head">
          <h1>这次，想怎么打卡？</h1>
          <p>告诉我时间和偏好，我会从星途社区里帮你整理一条路线。</p>
        </header>

        <div className="xr-plan-grid">
          {/* ============ 左栏：规划条件 ============ */}
          <form className="xr-plan-form" onSubmit={(e) => { e.preventDefault(); handleSubmit() }}>
            {/* 1. 城市 */}
            <div className="xr-field">
              <label className="xr-field__label">
                <MapPin size={14} strokeWidth={1.8} />
                城市
              </label>
              <div className="xr-night-chips">
                {data.cities.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    className={`xr-night-chip${form.cityId === c.id ? ' xr-night-chip--selected' : ''}`}
                    aria-pressed={form.cityId === c.id}
                    onClick={() => setField('cityId', c.id)}
                  >
                    {c.name}
                  </button>
                ))}
              </div>
              {selectedCity && cityLocationCount(form.cityId) === 0 && (
                <p className="xr-field-hint">{selectedCity.name}目前还没有足够的社区内容，你仍然可以尝试规划。</p>
              )}
            </div>

            {/* 2. 明星 */}
            <div className="xr-field">
              <label className="xr-field__label">
                <Star size={14} strokeWidth={1.8} />
                明星
              </label>
              {cityCelebs.length === 0 ? (
                <p className="xr-field-hint">这个城市暂时没有明星相关内容。</p>
              ) : (
                <div className="xr-night-chips">
                  <button
                    type="button"
                    className={`xr-night-chip${form.celebrityId === null ? ' xr-night-chip--selected' : ''}`}
                    aria-pressed={form.celebrityId === null}
                    onClick={() => setField('celebrityId', null)}
                  >
                    不限明星
                  </button>
                  {cityCelebs.map((c) => {
                    const count = c.cityStats.find((cs) => cs.cityId === form.cityId)?.locationCount ?? 0
                    return (
                      <button
                        key={c.id}
                        type="button"
                        className={`xr-night-chip${form.celebrityId === c.id ? ' xr-night-chip--selected' : ''}`}
                        aria-pressed={form.celebrityId === c.id}
                        onClick={() => setField('celebrityId', c.id)}
                      >
                        <Avatar src={c.avatar} name={c.name} size={20} />
                        {c.name}
                        <span className="xr-night-chip__count num">{count} 个相关地点</span>
                      </button>
                    )
                  })}
                </div>
              )}
              {form.celebrityId && celebLocationCount === 0 && (
                <p className="xr-field-hint">这位明星在这个城市暂无打卡点。</p>
              )}
            </div>

            {/* 3. 日期 */}
            <div className="xr-field">
              <label className="xr-field__label" htmlFor="xr-plan-date">
                <CalendarDays size={14} strokeWidth={1.8} />
                日期
              </label>
              <div className="xr-date-row">
                <input
                  id="xr-plan-date"
                  className="xr-night-input"
                  type="date"
                  min={defaultDate(1)}
                  value={form.date}
                  onChange={(e) => setField('date', e.target.value)}
                />
                {weekdayIso !== null && (
                  <span className="xr-date-row__week">{WEEKDAY_LABELS[weekdayIso]}</span>
                )}
              </div>
              <p className="xr-field-hint">星途会结合日期检查地点的营业时间与店休日。</p>
            </div>

            {/* 4. 时间 */}
            <div className="xr-field">
              <label className="xr-field__label">
                <Clock size={14} strokeWidth={1.8} />
                时间
              </label>
              <div className="xr-time-row">
                <input
                  className="xr-night-input"
                  type="time"
                  aria-label="开始时间"
                  value={form.startTime}
                  onChange={(e) => setField('startTime', e.target.value)}
                />
                <span>至</span>
                <input
                  className="xr-night-input"
                  type="time"
                  aria-label="结束时间"
                  value={form.endTime}
                  onChange={(e) => setField('endTime', e.target.value)}
                />
              </div>
              {timeInvalid && <p className="xr-field-error">结束时间需要晚于开始时间。</p>}
            </div>

            {/* 5. 最多打卡地点 */}
            <div className="xr-field">
              <label className="xr-field__label">
                <StarRailMark size={14} />
                最多打卡地点
              </label>
              <div className="xr-night-chips">
                {MAX_STOPS_OPTIONS.map((n) => (
                  <button
                    key={n}
                    type="button"
                    className={`xr-night-chip${form.maxStops === n ? ' xr-night-chip--selected' : ''}`}
                    aria-pressed={form.maxStops === n}
                    onClick={() => setField('maxStops', n)}
                  >
                    <span className="num">{n}</span> 个
                  </button>
                ))}
              </div>
            </div>

            {/* 6. 偏好 */}
            <div className="xr-field">
              <label className="xr-field__label">
                <Star size={14} strokeWidth={1.8} />
                偏好（可多选）
              </label>
              <div className="xr-night-chips">
                {PREFERENCE_OPTIONS.map(({ key, label, icon: Icon }) => (
                  <button
                    key={key}
                    type="button"
                    className={`xr-night-chip${form.preferences[key] ? ' xr-night-chip--selected' : ''}`}
                    aria-pressed={form.preferences[key]}
                    onClick={() => togglePreference(key)}
                  >
                    <Icon size={16} strokeWidth={1.8} />
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* 7. 补充说明 */}
            <div className="xr-field">
              <label className="xr-field__label" htmlFor="xr-plan-supplement">
                补充说明
              </label>
              <textarea
                id="xr-plan-supplement"
                className="xr-night-input xr-night-textarea"
                placeholder="还有什么想告诉星途的？比如想拍照、想去某个类型的地方、或者不想太赶……"
                value={form.supplement}
                maxLength={200}
                onChange={(e) => setField('supplement', e.target.value)}
              />
            </div>

            {/* 8. 当前上下文 */}
            {(form.contextLocationId || form.celebrityId) && (
              <div className="xr-context-box">
                <span className="xr-context-box__title">本次规划将参考</span>
                {form.contextLocationId && (
                  <span className="xr-context-chip">
                    <MapPin size={13} strokeWidth={1.8} />
                    从这个地点开始 · {contextLoc?.name ?? '无法识别的地点'}
                    <button type="button" onClick={removeContextLocation} aria-label="移除地点上下文">
                      <X size={14} strokeWidth={1.8} />
                    </button>
                  </span>
                )}
                {form.celebrityId && (
                  <span className="xr-context-chip">
                    <Star size={13} strokeWidth={1.8} />
                    围绕「{selectedCeleb?.name ?? ''}」规划
                  </span>
                )}
              </div>
            )}

            {/* Agent 错误（结构化，保留所有已填条件） */}
            {agentError && (
              <div className="xr-plan-error" role="alert">
                <span className="xr-plan-error__icon">!</span>
                <div>
                  <p>{agentError}</p>
                  <p className="xr-plan-error__hint">调整条件后可以再次尝试，已填写的内容不会丢失。</p>
                </div>
              </div>
            )}

            {/* 9. 开始规划（唯一主 CTA） */}
            <div className="xr-plan-cta">
              <button type="submit" className="xr-btn xr-btn--accent xr-btn--lg" disabled={submitting}>
                {submitting ? (
                  <>
                    <span className="xr-btn-spinner" aria-hidden="true" />
                    正在整理社区信息…
                  </>
                ) : (
                  <>
                    <StarRailMark size={18} />
                    开始规划
                  </>
                )}
              </button>
            </div>
          </form>

          {/* ============ 右栏：星轨条件进度 + 预览 ============ */}
          <aside className="xr-plan-aside">
            <div className="xr-plan-rail">
              <span className="xr-plan-rail__title">
                <StarRailMark size={15} />
                你的追星条件
              </span>
              <RailStep
                label="城市"
                detail={selectedCity ? `${selectedCity.name}${cityLocationCount(form.cityId) > 0 ? ` · ${cityLocationCount(form.cityId)} 个地点` : ' · 暂无内容'}` : ''}
                done={!!selectedCity}
                last={false}
              />
              <RailStep
                label="明星"
                detail={selectedCeleb ? `${selectedCeleb.name} · ${celebLocationCount} 个相关地点` : '不限明星'}
                done={!!form.celebrityId}
                last={false}
              />
              <RailStep
                label="日期时间"
                detail={timeInvalid ? '时间待修正' : `${form.date} · ${form.startTime}–${form.endTime}`}
                done={!timeInvalid && !!form.date}
                last={false}
              />
              <RailStep
                label="偏好"
                detail={
                  prefCount > 0
                    ? PREFERENCE_OPTIONS.filter((o) => form.preferences[o.key]).map((o) => o.label).join(' / ')
                    : '无特别偏好'
                }
                done={hasPref}
                last={false}
              />
              <RailStep label="出发" detail={submitting ? '星途正在整理社区信息…' : '交给星途'} done={submitting} last={true} />
            </div>

            <div className="xr-plan-preview">
              <p className="xr-plan-preview__title">行程预览</p>
              <p>
                {selectedCity?.name ?? '—'} · {selectedCeleb?.name ?? '不限明星'} · 最多{' '}
                <span className="num">{form.maxStops}</span> 站
              </p>
              <p className="xr-plan-preview__note">
                星途会读取社区攻略与打卡分享，帮你筛选地点、规划顺序、校验时间，最后给你一条可以真正执行的路线。
              </p>
            </div>
          </aside>
        </div>
      </div>
    </div>
  )
}

function RailStep(props: { label: string; detail: string; done: boolean; last: boolean }) {
  const { label, detail, done, last } = props
  return (
    <div className={`xr-rail-step${done ? ' xr-rail-step--done' : ''}`}>
      <div className="xr-rail-step__rail">
        <span className="xr-rail-step__node" />
        {!last && <span className={`xr-rail-step__line${done ? ' xr-rail-step__line--done' : ''}`} />}
      </div>
      <div>
        <p className="xr-rail-step__label">{label}</p>
        <p className="xr-rail-step__detail num">{detail}</p>
      </div>
    </div>
  )
}

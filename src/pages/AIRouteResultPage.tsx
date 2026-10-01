/* ============================================================
   AI 路线结果页（Stage 8）
   「AI 把社区里分散的追星信息，整理成了一条可以执行的路线。」
   架构边界：
     · 只消费 agentStore（currentRequest / currentResult）
     · 路线数据 → currentResult.route
     · 推荐理由 → currentResult.reasoning（不生成不存在的理由）
     · 社区依据 → currentResult.communityEvidence（点击进现有 Post Detail）
     · 不调用 Tool、不重新规划、不硬编码
   视觉：上半夜域（路线概览）→ 下方光域（星轨时间线 + 社区证据）
   ============================================================ */
import { useMemo, useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import {
  ArrowLeft,
  BadgeCheck,
  Bookmark,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clock,
  Footprints,
  MapPin,
  TrainFront,
} from 'lucide-react'
import { useAgentStore } from '@/store/agentStore'
import { useUserStore } from '@/store/userStore'
import { useCheckinStore } from '@/store/checkinStore'
import { getCelebritySync, getCitySync, getLocation } from '@/services/data'
import { getAgentErrorMessage } from '@/utils/agentMessages'
import { useAsync } from '@/hooks/useAsync'
import { formatDate, formatDurationShort, formatOpeningHours, LOCATION_TYPE_LABELS } from '@/utils/format'
import { getIsoWeekday, WEEKDAY_LABELS } from '@/utils/time'
import StarRailMark from '@/components/icons/StarRailMark'
import Tag from '@/components/ui/Tag'
import SmartImage from '@/components/ui/SmartImage'
import AgentErrorView from '@/components/ai/AgentErrorView'

export default function AIRouteResultPage() {
  const navigate = useNavigate()
  const currentRequest = useAgentStore((s) => s.currentRequest)
  const currentResult = useAgentStore((s) => s.currentResult)
  const startAdjust = useAgentStore((s) => s.startAdjust)
  const savedRoutes = useUserStore((s) => s.savedRoutes)
  const toggleSaveRoute = useUserStore((s) => s.toggleSaveRoute)
  const showToast = useUserStore((s) => s.showToast)
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const route = currentResult?.route ?? null

  // 预载每个站点的地点视图（封面图/开放时间等，数据层派生）
  const { data: locViews } = useAsync(
    () => (route ? Promise.all(route.stops.map((s) => getLocation(s.locationId))) : Promise.resolve([])),
    [currentResult],
  )
  const locViewMap = useMemo(() => new Map((locViews ?? []).map((l) => [l.id, l])), [locViews])

  // —— 守卫（hooks 之后）——
  if (!currentRequest || !currentResult) {
    return <Navigate to="/ai/planning" replace />
  }

  if (!currentResult.success || !route) {
    return (
      <AgentErrorView
        message={getAgentErrorMessage(currentResult.error?.code, currentResult.error?.message ?? '暂时无法完成规划。')}
        onBack={() => navigate('/ai/planning')}
      />
    )
  }

  const cityName = getCitySync(currentRequest.cityId)?.name ?? currentRequest.cityId
  const celebName = currentRequest.celebrityId
    ? getCelebritySync(currentRequest.celebrityId)?.name ?? ''
    : ''
  const weekdayIso = getIsoWeekday(currentRequest.date)
  const routeName = `${celebName || '星途'} · ${cityName} 打卡路线`
  const isSaved = savedRoutes.some((r) => r.name === routeName)
  const firstStopName =
    currentResult.selectedLocations.find((l) => l.id === route.stops[0]?.locationId)?.name ?? '第一站'

  const handleAdjust = () => {
    startAdjust(currentRequest)
    navigate('/ai/planning')
  }

  const handleSave = () => {
    toggleSaveRoute({
      id: `rt_${Date.now()}`,
      name: routeName,
      snapshot: {
        stops: route.stops.length,
        totalMin: route.totalMin,
        totalKm: route.totalKm,
        cityName,
        celebName,
      },
      createdAt: new Date().toISOString(),
    })
  }

  // —— 打卡会话联动（同一路线已开过会话时，展示进度/完成态） ——
  const checkinSession = useCheckinStore((s) => s.session)
  const startSession = useCheckinStore((s) => s.startSession)
  const routeSignature = route.stops.map((s) => s.locationId).join(',')
  const sessionMatches = checkinSession !== null && checkinSession.locationIds.join(',') === routeSignature
  const routeDone = sessionMatches && checkinSession.completed
  const routeActive = sessionMatches && !checkinSession.completed

  const handleStartCheckin = () => {
    showToast(`已进入打卡模式，第一站：「${firstStopName}」`)
    startSession({
      routeId: `rt_local_${Date.now()}`,
      routeName,
      cityName,
      celebName,
      locationIds: route.stops.map((s) => s.locationId),
      checkedLocationIds: [],
      currentIndex: 0,
      completed: false,
      publishedPostId: null,
      startedAt: new Date().toISOString(),
      completedAt: null,
    })
    navigate('/checkin')
  }

  const handleContinueCheckin = () => {
    navigate('/checkin')
  }

  return (
    <div className="xr-container xr-page">
      <button className="xr-back-row" onClick={() => navigate('/ai/execution')}>
        <ArrowLeft size={16} strokeWidth={1.8} />
        返回执行过程
      </button>

      {/* ============ 夜域：路线概览 ============ */}
      <section className="xr-result-hero">
        <span className="xr-exec-head__brand">
          <StarRailMark size={16} />
          星途 AI 路线
        </span>
        <h1>你的打卡路线已经整理好了</h1>
        <p>根据你的时间、偏好和星途社区内容，整理出一条可执行路线。</p>
        <div className="xr-result-hero__meta">
          <Tag variant="night">
            <MapPin size={12} strokeWidth={1.8} />
            {cityName}
            {celebName && ` · ${celebName}`}
          </Tag>
          <Tag variant="night">
            {currentRequest.date ? formatDate(currentRequest.date) : ''}
            {weekdayIso !== null ? ` ${WEEKDAY_LABELS[weekdayIso]}` : ''}
          </Tag>
          <Tag variant="night-gold" className="num">
            {currentRequest.startTime}—{currentRequest.endTime}
          </Tag>
          <Tag variant="night">
            <span className="num">{route.stops.length}</span> 个地点
          </Tag>
          <Tag variant="night">
            <span className="num">约 {route.totalKm} km</span>
          </Tag>
          <Tag variant="night">
            <span className="num">{formatDurationShort(route.totalMin)}</span>
          </Tag>
        </div>
      </section>

      {/* ============ 光域：路线 + 理由 + 社区 ============ */}
      <div className="xr-result-grid">
        {/* —— 左：星轨时间线 —— */}
        <div className="xr-result-main">
          <div className="xr-timeline">
            {route.stops.map((s, i) => {
              const loc = currentResult.selectedLocations.find((l) => l.id === s.locationId)
              const locView = locViewMap.get(s.locationId)
              const locReason = currentResult.reasoning.locationReasons.find((r) => r.locationId === s.locationId)
              const locEvidence = currentResult.communityEvidence
                .filter((e) => e.locationId === s.locationId)
                .slice(0, 2)
              const expanded = expandedId === s.locationId
              return (
                <div key={s.locationId} className="xr-timeline__row">
                  <div className="xr-timeline__rail">
                    <span className="xr-timeline__node num">{s.order}</span>
                    {i < route.stops.length - 1 && <span className="xr-timeline__line" />}
                  </div>
                  <div className="xr-timeline__body">
                    <article
                      className="xr-card xr-result-stop"
                      onClick={() => setExpandedId(expanded ? null : s.locationId)}
                    >
                      <div className="xr-result-stop__head">
                        <span className="xr-result-stop__name">{loc?.name ?? s.locationId}</span>
                        {loc && <Tag variant="neutral">{LOCATION_TYPE_LABELS[loc.type]}</Tag>}
                        {loc?.sourceType === 'demo' && <Tag variant="amber">演示数据</Tag>}
                        <span className="xr-result-stop__chev">
                          {expanded ? <ChevronUp size={16} strokeWidth={1.8} /> : <ChevronDown size={16} strokeWidth={1.8} />}
                        </span>
                      </div>
                      <div className="xr-result-stop__time num">
                        {s.arriveTime} – {s.leaveTime}
                        <Tag variant="gold">停留 {s.stayMin} 分钟</Tag>
                      </div>
                      {i > 0 && (
                        <div className="xr-result-stop__travel">
                          {s.travelMode === 'walk' ? (
                            <Footprints size={14} strokeWidth={1.8} />
                          ) : (
                            <TrainFront size={14} strokeWidth={1.8} />
                          )}
                          <span>
                            {s.travelMode === 'walk' ? '步行' : '地铁'} {s.travelMin} 分钟 ·{' '}
                            <span className="num">{s.distanceKm}km</span>
                            <span className="xr-result-stop__travel-note">（演示估算）</span>
                          </span>
                        </div>
                      )}

                      {/* —— 展开轻量详情 —— */}
                      {expanded && (
                        <div className="xr-result-stop__expand" onClick={(e) => e.stopPropagation()}>
                          {locView ? (
                            <SmartImage src={locView.stats.coverImage} alt={loc?.name ?? ''} ratio="16 / 9" />
                          ) : (
                            <div className="xr-skeleton" style={{ height: 180 }} />
                          )}

                          {locReason && locReason.reasons.length > 0 && (
                            <div>
                              <p className="xr-result-stop__label">
                                <StarRailMark size={14} />
                                AI 推荐理由
                              </p>
                              {locReason.reasons.slice(0, 3).map((reason, ri) => (
                                <p key={ri} className="xr-result-reason__item">
                                  <Check size={14} strokeWidth={2} />
                                  {reason}
                                </p>
                              ))}
                            </div>
                          )}

                          {locEvidence.length > 0 && (
                            <div>
                              <p className="xr-result-stop__label">社区依据</p>
                              {locEvidence.map((e) => (
                                <button
                                  key={e.postId}
                                  className="xr-result-ev"
                                  onClick={() => navigate(`/post/${e.postId}`)}
                                >
                                  <span className="xr-result-ev__title">{e.title}</span>
                                  <span className="xr-result-ev__content">
                                    {e.evidenceType === 'photoTip' ? '拍照建议 · ' : '攻略要点 · '}
                                    {e.content}
                                  </span>
                                </button>
                              ))}
                            </div>
                          )}

                          {loc && (
                            <div className="xr-result-stop__info">
                              <span>
                                <Clock size={13} strokeWidth={1.8} />
                                {formatOpeningHours(loc.openingHours)}
                              </span>
                              <span className="num">建议停留 {loc.suggestedStayMin} 分钟</span>
                            </div>
                          )}
                          {loc?.sourceNote && <p className="xr-loc-story__note">数据说明：{loc.sourceNote}</p>}
                          <button
                            className="xr-btn xr-btn--soft-gold xr-btn--sm"
                            onClick={() => navigate(`/location/${s.locationId}`)}
                          >
                            查看地点详情
                          </button>
                        </div>
                      )}
                    </article>
                  </div>
                </div>
              )
            })}
          </div>

          {/* —— 开始 / 继续打卡 —— */}
          <div className="xr-result-start">
            {routeDone ? (
              <div className="xr-result-start__done">
                <button
                  className="xr-btn xr-btn--primary xr-btn--lg"
                  onClick={() =>
                    checkinSession?.publishedPostId
                      ? navigate(`/post/${checkinSession.publishedPostId}`)
                      : navigate('/community')
                  }
                >
                  <CheckCircle2 size={18} strokeWidth={1.8} />
                  已完成打卡 · 查看我的发布
                </button>
                <button className="xr-btn xr-btn--secondary xr-btn--md" onClick={handleStartCheckin}>
                  再次打卡（新会话）
                </button>
              </div>
            ) : (
              <button
                className="xr-btn xr-btn--primary xr-btn--lg"
                onClick={routeActive ? handleContinueCheckin : handleStartCheckin}
              >
                <BadgeCheck size={18} strokeWidth={1.8} />
                {routeActive
                  ? `继续打卡 · 第 ${(checkinSession?.currentIndex ?? 0) + 1} / ${route.stops.length} 站`
                  : `开始打卡 · 第一站「${firstStopName.slice(0, 10)}」`}
              </button>
            )}
          </div>
        </div>

        {/* —— 右：AI 理由 + 取舍 + 社区证据 + 操作 —— */}
        <aside className="xr-rail">
          <div className="xr-card xr-rail-card">
            <h3 className="xr-rail-card__title">
              <StarRailMark size={16} />
              为什么是这条路线？
            </h3>
            <p className="xr-result-reason__text">{currentResult.reasoning.routeReason}</p>
            {currentResult.reasoning.locationReasons.map((r) => {
              const name = currentResult.selectedLocations.find((l) => l.id === r.locationId)?.name ?? r.locationId
              return (
                <div key={r.locationId} className="xr-result-reason__loc">
                  <p className="xr-result-reason__loc-name">{name}</p>
                  {r.reasons.slice(0, 3).map((reason, i) => (
                    <p key={i} className="xr-result-reason__item">
                      <Check size={14} strokeWidth={2} />
                      {reason}
                    </p>
                  ))}
                </div>
              )
            })}
            {currentResult.validation.valid && (
              <p className="xr-result-reason__item">
                <Check size={14} strokeWidth={2} />
                时间范围内可执行，营业时间匹配
              </p>
            )}
            {currentResult.validation.warnings.slice(0, 2).map((w, i) => (
              <p key={i} className="xr-result-warn">
                <span>△</span>
                {w.message}
              </p>
            ))}
          </div>

          {/* AI 做出的取舍（无内容则整个模块隐藏） */}
          {currentResult.reasoning.tradeoffs.length > 0 && (
            <div className="xr-card xr-rail-card xr-result-tradeoff">
              <h3 className="xr-rail-card__title">AI 做出的取舍</h3>
              {currentResult.reasoning.tradeoffs.map((t, i) => (
                <p key={i} className="xr-result-tradeoff__item">
                  <span>✦</span>
                  {t.message}
                </p>
              ))}
            </div>
          )}

          {/* 社区证据 */}
          <div className="xr-card xr-rail-card">
            <h3 className="xr-rail-card__title">这条路线，也参考了星途社区</h3>
            {currentResult.communityEvidence.slice(0, 4).map((e) => (
              <button key={e.postId} className="xr-result-ev" onClick={() => navigate(`/post/${e.postId}`)}>
                <span className="xr-result-ev__title">{e.title}</span>
                <span className="xr-result-ev__content">
                  {e.evidenceType === 'photoTip' ? '拍照建议 · ' : '攻略要点 · '}
                  {e.content}
                </span>
                <span className="xr-result-ev__meta">
                  {e.author} · {e.likes} 赞 · 点击查看原文
                </span>
              </button>
            ))}
          </div>

          {/* 操作 */}
          <div className="xr-card xr-rail-card xr-result-actions">
            <button className="xr-btn xr-btn--primary xr-btn--md" onClick={handleAdjust}>
              调整路线
            </button>
            <button
              className={`xr-btn xr-btn--md ${isSaved ? 'xr-btn--collected' : 'xr-btn--secondary'}`}
              onClick={handleSave}
            >
              <Bookmark size={16} strokeWidth={1.8} fill={isSaved ? 'currentColor' : 'none'} />
              {isSaved ? '已收藏路线' : '收藏路线'}
            </button>
          </div>
        </aside>
      </div>
    </div>
  )
}

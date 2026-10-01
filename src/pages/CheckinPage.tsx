/* ============================================================
   打卡模式页（Stage 9）
   「开始打卡 → 第一站 → 完成打卡 → 下一站 → … → 分享」
   光域 + 星轨进度；不伪造导航/距离；数据全部来自现有
   location / community 数据层与 checkinStore 会话。
   ============================================================ */
import { Navigate, useNavigate } from 'react-router-dom'
import { ArrowLeft, BadgeCheck, Camera, Check, Clock, MapPin, Star } from 'lucide-react'
import { getLocation, getLocationRefSync, getPostsByLocation } from '@/services/data'
import { useAsync } from '@/hooks/useAsync'
import { useCheckinStore } from '@/store/checkinStore'
import { formatOpeningHours, LOCATION_TYPE_LABELS } from '@/utils/format'
import SmartImage from '@/components/ui/SmartImage'
import Tag from '@/components/ui/Tag'
import StarRailMark from '@/components/icons/StarRailMark'

export default function CheckinPage() {
  const navigate = useNavigate()
  const session = useCheckinStore((s) => s.session)
  const checkinCurrent = useCheckinStore((s) => s.checkinCurrent)
  const advance = useCheckinStore((s) => s.advance)

  const locationId = session?.locationIds[session.currentIndex]

  // 当前站信息 + 社区拍摄建议（真实数据；依赖仅 locationId，打卡进度更新不重载）
  const { data } = useAsync(
    () =>
      locationId
        ? Promise.all([getLocation(locationId), getPostsByLocation(locationId)]).then(
            ([loc, posts]) => ({ loc, posts }),
          )
        : Promise.resolve(null),
    [locationId],
  )

  if (!session || !locationId) {
    return <Navigate to="/" replace />
  }

  const locRef = getLocationRefSync(locationId)
  const locView = data?.loc ?? null
  const photoTips = (data?.posts ?? []).filter((p) => p.type === 'guide' && p.photoTips)
  const isChecked = session.checkedLocationIds.includes(locationId)
  const isLast = session.currentIndex >= session.locationIds.length - 1
  const nextLocName = isLast
    ? ''
    : getLocationRefSync(session.locationIds[session.currentIndex + 1])?.name ?? '下一站'

  return (
    <div className="xr-container xr-page">
      <button className="xr-back-row" onClick={() => navigate(-1)}>
        <ArrowLeft size={16} strokeWidth={1.8} />
        返回
      </button>

      {/* —— 页头 —— */}
      <header className="xr-checkin-head">
        <h1>正在打卡</h1>
        <Tag variant="gold" className="num">
          第 {session.currentIndex + 1} / {session.locationIds.length} 站
        </Tag>
      </header>

      <div className="xr-checkin-grid">
        {/* —— 左：当前站点 —— */}
        <div>
          <div className="xr-card xr-checkin-card">
            <SmartImage
              src={locView?.stats.coverImage ?? ''}
              alt={locRef?.name ?? '打卡地点'}
              ratio="16 / 9"
            />
            <div className="xr-checkin-card__body">
              <div className="xr-checkin-card__head">
                <h2>{locRef?.name ?? locationId}</h2>
                {locRef && <Tag variant="violet">{LOCATION_TYPE_LABELS[locRef.type]}</Tag>}
              </div>
              <div className="xr-checkin-card__meta">
                <span>
                  <MapPin size={14} strokeWidth={1.8} />
                  {locRef?.celebrityName} · {locRef?.cityName}
                </span>
                <span>
                  <Clock size={14} strokeWidth={1.8} />
                  {locView ? `建议停留 ${locView.suggestedStayMin} 分钟` : '…'}
                </span>
              </div>
              {locView && (
                <p className="xr-checkin-card__hours num">{formatOpeningHours(locView.openingHours)}</p>
              )}
            </div>
          </div>

          {/* 社区拍摄建议（如有，来自真实攻略帖） */}
          {photoTips.length > 0 && (
            <div className="xr-checkin-tips">
              <p className="xr-checkin-tips__label">
                <Camera size={15} strokeWidth={1.8} />
                社区拍摄建议
              </p>
              {photoTips.slice(0, 2).map((g) => (
                <p key={g.id} className="xr-checkin-tips__item">
                  {g.photoTips}
                  <span>—— {g.author.nickname}</span>
                </p>
              ))}
            </div>
          )}

          {/* —— CTA 区 —— */}
          {!isChecked ? (
            <div className="xr-checkin-cta">
              <button className="xr-btn xr-btn--primary xr-btn--lg" onClick={checkinCurrent}>
                <BadgeCheck size={18} strokeWidth={1.8} />
                完成打卡
              </button>
            </div>
          ) : (
            <div className="xr-checkin-done">
              <div className="xr-checkin-done__title">
                <StarRailMark size={18} />
                这一站，完成了 ✦
              </div>
              <p className="xr-checkin-done__next">
                {isLast ? '全部站点打卡完成！' : `下一站：${nextLocName}`}
              </p>
              {!isLast ? (
                <button className="xr-btn xr-btn--accent xr-btn--lg" onClick={advance}>
                  前往下一站
                  <StarRailMark size={16} />
                </button>
              ) : (
                <button className="xr-btn xr-btn--accent xr-btn--lg" onClick={() => navigate('/publish')}>
                  分享这次打卡
                </button>
              )}
            </div>
          )}
        </div>

        {/* —— 右：星轨进度 —— */}
        <aside className="xr-card xr-checkin-progress">
          <p className="xr-checkin-progress__title">
            <StarRailMark size={15} />
            {session.routeName}
          </p>
          <div className="xr-checkin-progress__list">
            {session.locationIds.map((id, i) => {
              const name = getLocationRefSync(id)?.name ?? id
              const done = session.checkedLocationIds.includes(id)
              const current = i === session.currentIndex
              return (
                <div
                  key={id}
                  className={`xr-checkin-progress__step${done ? ' xr-checkin-progress__step--done' : ''}${
                    current ? ' xr-checkin-progress__step--current' : ''
                  }`}
                >
                  <div className="xr-checkin-progress__rail">
                    <span className="xr-checkin-progress__node num">
                      {done ? <Check size={12} strokeWidth={2.4} /> : i + 1}
                    </span>
                    {i < session.locationIds.length - 1 && (
                      <span className="xr-checkin-progress__line" />
                    )}
                  </div>
                  <div className="xr-checkin-progress__body">
                    <p className="xr-checkin-progress__name">
                      {name}
                      {current && !done && <span className="xr-checkin-progress__tag">当前打卡</span>}
                      {done && <span className="xr-checkin-progress__tag xr-checkin-progress__tag--done">已完成</span>}
                    </p>
                  </div>
                </div>
              )
            })}
          </div>
          <p className="xr-checkin-progress__hint">
            已打卡 {session.checkedLocationIds.length} / {session.locationIds.length} 站
            <Star size={12} strokeWidth={1.8} />
          </p>
        </aside>
      </div>
    </div>
  )
}

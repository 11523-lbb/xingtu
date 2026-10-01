import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Footprints, Heart, Route as RouteIcon } from 'lucide-react'
import { getPostsByRoute, getRouteView } from '@/services/data'
import { useAsync } from '@/hooks/useAsync'
import { formatCount, formatDurationShort } from '@/utils/format'
import Tag from '@/components/ui/Tag'
import Avatar from '@/components/ui/Avatar'
import StarRailStrip from '@/components/route/StarRailStrip'
import StarRailTimeline from '@/components/route/StarRailTimeline'
import { PostRow } from '@/components/feed/PostCard'

/** 路线详情（轻量版）：完整能力（调整/打卡/AI 二创）将在后续阶段开放 */
export default function RoutePage() {
  const navigate = useNavigate()
  const { routeId = '' } = useParams()

  const { data, loading } = useAsync(
    () => Promise.all([getRouteView(routeId), getPostsByRoute(routeId)]).then(([route, posts]) => ({ route, posts })),
    [routeId],
  )

  if (loading || !data) {
    return (
      <div className="xr-container xr-page">
        <div className="xr-skeleton" style={{ height: 40, width: 120, marginBottom: 16 }} />
        <div className="xr-skeleton" style={{ height: 220, marginBottom: 20, borderRadius: 'var(--r-lg)' }} />
        <div className="xr-skeleton" style={{ height: 300 }} />
      </div>
    )
  }

  const { route, posts } = data

  return (
    <div className="xr-container xr-page">
      <button className="xr-back-row" onClick={() => navigate(-1)}>
        <ArrowLeft size={16} strokeWidth={1.8} />
        返回
      </button>

      {/* 路线总览（夜域） */}
      <div className="xr-card--night xr-route-hero">
        <div className="xr-route-hero__head">
          <Tag variant="night-gold">{route.theme}</Tag>
          {route.isAiGenerated && <Tag variant="night">AI 生成</Tag>}
        </div>
        <StarRailStrip count={Math.min(route.stops.length, 8)} />
        <h1 className="xr-route-hero__name">{route.name}</h1>
        <p className="xr-route-hero__desc">{route.desc}</p>
        <div className="xr-route-hero__stats">
          <div>
            <p className="xr-route-hero__num num">{formatDurationShort(route.totalMin)}</p>
            <p className="xr-route-hero__label">总时长</p>
          </div>
          <div>
            <p className="xr-route-hero__num num">{route.stops.length} 站</p>
            <p className="xr-route-hero__label">地点数</p>
          </div>
          <div>
            <p className="xr-route-hero__num num">{route.totalKm}km</p>
            <p className="xr-route-hero__label">总距离</p>
          </div>
          <div>
            <p className="xr-route-hero__num num">{route.walkingKm}km</p>
            <p className="xr-route-hero__label">
              <Footprints size={13} strokeWidth={1.8} />
              步行
            </p>
          </div>
        </div>
        <div className="xr-route-hero__foot">
          {route.author && (
            <span className="xr-route-hero__author">
              <Avatar src={route.author.avatar} name={route.author.nickname} size={24} />
              {route.author.nickname} 分享
            </span>
          )}
          <span className="xr-route-hero__likes">
            <Heart size={14} strokeWidth={1.8} />
            <span className="num">{formatCount(route.likes)}</span>
          </span>
        </div>
      </div>

      <div className="xr-detail-layout xr-section--first">
        {/* 时间轴 */}
        <div className="xr-card xr-route-timeline">
          <h3 className="xr-rail-card__title">
            <RouteIcon size={16} strokeWidth={1.8} color="var(--gold-600)" />
            路线安排
          </h3>
          <StarRailTimeline route={route} />
        </div>

        {/* 右栏 */}
        <aside className="xr-rail">
          <div className="xr-card xr-rail-card">
            <h3 className="xr-rail-card__title">路线说明</h3>
            <p className="xr-route-note__text">
              这是社区用户分享的路线（演示数据）。在后续阶段，你可以把别人的路线一键「调整为我的版本」——星途
              AI 会根据你的时间与偏好重新安排。
            </p>
            <button
              className="xr-btn xr-btn--soft-gold xr-btn--md"
              style={{ marginTop: 12, width: '100%' }}
              onClick={() => navigate(`/ai/planning?celebrityId=${route.celebrityId}`)}
            >
              调整为我的版本（即将开放）
            </button>
          </div>

          {posts.length > 0 && (
            <div className="xr-card xr-rail-card">
              <h3 className="xr-rail-card__title">大家的路线反馈</h3>
              <div className="xr-rail-card__posts">
                {posts.map((p) => (
                  <PostRow key={p.id} post={p} />
                ))}
              </div>
            </div>
          )}
        </aside>
      </div>
    </div>
  )
}

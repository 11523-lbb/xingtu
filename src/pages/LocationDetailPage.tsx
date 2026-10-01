import { useNavigate, useParams } from 'react-router-dom'
import {
  ArrowLeft,
  BadgeCheck,
  Bookmark,
  Camera,
  Clock,
  Flame,
  Heart,
  Info,
  MapPin,
  Star,
  Timer,
} from 'lucide-react'
import { getLocation, getPostsByLocation, getRoutesByLocation } from '@/services/data'
import { useAsync } from '@/hooks/useAsync'
import { useUserStore } from '@/store/userStore'
import { formatCount, formatOpeningHours, LOCATION_TYPE_LABELS } from '@/utils/format'
import SmartImage from '@/components/ui/SmartImage'
import Avatar from '@/components/ui/Avatar'
import Tag from '@/components/ui/Tag'
import StarRailMark from '@/components/icons/StarRailMark'
import RouteCard from '@/components/route/RouteCard'
import { PostRow } from '@/components/feed/PostCard'
import AIEntryCard from '@/components/ai/AIEntryCard'

/**
 * 打卡点详情 —— 社区与 AI 的连接枢纽
 * 信息层级：主图 → 标题/类型/来源标注 → 想去/已打卡/收藏/加入AI路线
 * → 地点故事(含 sourceNote 数据口径) → 社区攻略(来自 mock 攻略帖)
 * → 用户照片墙 → 大家怎么打卡 → 相关路线；右栏：实用信息 + 热度
 */
export default function LocationDetailPage() {
  const navigate = useNavigate()
  const { locationId = '' } = useParams()

  const { data, loading } = useAsync(
    () =>
      Promise.all([getLocation(locationId), getPostsByLocation(locationId), getRoutesByLocation(locationId)]).then(
        ([location, posts, routes]) => ({ location, posts, routes }),
      ),
    [locationId],
  )

  const wanted = useUserStore((s) => s.wantedLocationIds.includes(locationId))
  const collected = useUserStore((s) => s.collectedLocationIds.includes(locationId))
  const checkedIn = useUserStore((s) => s.checkedInLocationIds.includes(locationId))
  const toggleWanted = useUserStore((s) => s.toggleWanted)
  const toggleCollected = useUserStore((s) => s.toggleCollectedLocation)
  const toggleCheckedIn = useUserStore((s) => s.toggleCheckedIn)

  if (loading || !data) {
    return (
      <div className="xr-container xr-page">
        <div className="xr-skeleton" style={{ height: 40, width: 120, marginBottom: 16 }} />
        <div className="xr-skeleton" style={{ height: 380, marginBottom: 20, borderRadius: 'var(--r-lg)' }} />
        <div className="xr-skeleton" style={{ height: 28, width: '50%', marginBottom: 12 }} />
        <div className="xr-skeleton" style={{ height: 16, width: '80%' }} />
      </div>
    )
  }

  const { location, posts, routes } = data
  const guides = posts.filter((p) => p.type === 'guide')
  const checkins = posts.filter((p) => p.type === 'checkin')
  const photos = checkins.flatMap((p) => p.images.slice(0, 1)).slice(0, 7)
  const allHighlights = [...new Set(guides.flatMap((g) => g.highlights))].slice(0, 6)
  const photoTips = guides.filter((g) => g.photoTips)

  return (
    <div className="xr-container xr-page">
      <button className="xr-back-row" onClick={() => navigate(-1)}>
        <ArrowLeft size={16} strokeWidth={1.8} />
        返回
      </button>

      {/* —— 主图 —— */}
      <div className="xr-loc-hero">
        <SmartImage src={location.stats.coverImage} alt={location.name} ratio="21 / 9" />
        <span className="xr-loc-hero__type">
          <MapPin size={12} strokeWidth={1.8} />
          {LOCATION_TYPE_LABELS[location.type]}
        </span>
      </div>

      <div className="xr-detail-layout xr-section--first">
        {/* —— 主栏 —— */}
        <div>
          {/* 标题区 */}
          <div className="xr-loc-head">
            <div className="xr-loc-head__top">
              <h1>{location.name}</h1>
              {location.sourceType === 'demo' ? (
                <Tag variant="amber">星途演示数据</Tag>
              ) : (
                <Tag variant="neutral">真实场所</Tag>
              )}
            </div>
            <div className="xr-loc-head__meta">
              <Star size={13} strokeWidth={1.8} color="var(--violet-600)" />
              <span>{location.celebrity.name}</span>
              <span className="xr-loc-head__dot">·</span>
              <span>{location.cityName}</span>
              {location.tags.map((t) => (
                <Tag key={t}>{t}</Tag>
              ))}
            </div>

            {/* 操作栏 */}
            <div className="xr-loc-actions">
              <button
                className={`xr-btn xr-btn--secondary xr-btn--md${wanted ? ' xr-btn--wanted' : ''}`}
                onClick={() => toggleWanted(location.id)}
              >
                <Heart size={18} strokeWidth={1.8} fill={wanted ? 'currentColor' : 'none'} />
                {wanted ? '已想去' : '想去'}
              </button>
              <button
                className={`xr-btn xr-btn--secondary xr-btn--md${collected ? ' xr-btn--collected' : ''}`}
                onClick={() => toggleCollected(location.id)}
              >
                <Bookmark size={18} strokeWidth={1.8} fill={collected ? 'currentColor' : 'none'} />
                {collected ? '已收藏' : '收藏'}
              </button>
              <button
                className={`xr-btn xr-btn--secondary xr-btn--md${checkedIn ? ' xr-btn--checkedin' : ''}`}
                onClick={() => toggleCheckedIn(location.id)}
              >
                <BadgeCheck size={18} strokeWidth={1.8} fill={checkedIn ? 'currentColor' : 'none'} />
                {checkedIn ? '已打卡' : '已打卡'}
              </button>
              <span className="xr-loc-actions__spacer" />
              <button
                className="xr-btn xr-btn--soft-gold xr-btn--md"
                onClick={() => navigate(`/ai/planning?locationId=${location.id}`)}
              >
                <StarRailMark size={16} />
                把这里加入 AI 路线
              </button>
            </div>
          </div>

          {/* 地点故事（严格沿用 Stage 3 数据口径） */}
          <div className="xr-card xr-loc-story">
            <h3 className="xr-loc-story__title">地点故事</h3>
            <p className="xr-loc-story__text">{location.story}</p>
            {location.event && <p className="xr-loc-story__event">{location.event}</p>}
            <p className="xr-loc-story__note">
              <Info size={12} strokeWidth={1.8} />
              数据说明：{location.sourceNote}
            </p>
          </div>

          {/* 社区攻略（来自 mock 攻略帖，不编造） */}
          {guides.length > 0 && (
            <div className="xr-card xr-loc-guide">
              <h3 className="xr-loc-story__title">
                <Star size={16} strokeWidth={1.8} color="var(--gold-600)" />
                社区攻略
              </h3>
              {allHighlights.length > 0 && (
                <div className="xr-loc-guide__highlights">
                  {allHighlights.map((h) => (
                    <Tag key={h} variant="gold">
                      {h}
                    </Tag>
                  ))}
                </div>
              )}
              {photoTips.map((g) => (
                <div key={g.id} className="xr-loc-guide__tip">
                  <Camera size={16} strokeWidth={1.8} color="var(--violet-600)" />
                  <div>
                    <p className="xr-loc-guide__tip-label">
                      拍照建议 · 来自「{g.author.nickname}」的攻略
                    </p>
                    <p>{g.photoTips}</p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* 用户照片墙 */}
          {photos.length > 0 && (
            <section className="xr-section">
              <h2 className="xr-loc-subtitle">大家怎么拍</h2>
              <div className="xr-photo-wall">
                {photos.map((img, i) => (
                  <SmartImage
                    key={i}
                    src={img}
                    alt={`${location.name} 打卡照片 ${i + 1}`}
                    ratio={i === 0 ? '1 / 1' : '1 / 1'}
                    className={i === 0 ? 'xr-photo-wall__first' : undefined}
                  />
                ))}
              </div>
            </section>
          )}

          {/* 大家怎么打卡 */}
          <section className="xr-section">
            <h2 className="xr-loc-subtitle">大家怎么打卡 · {posts.length} 篇内容</h2>
            <div className="xr-post-list">
              {posts.map((p) => (
                <PostRow key={p.id} post={p} />
              ))}
            </div>
          </section>

          {/* 相关路线 */}
          {routes.length > 0 && (
            <section className="xr-section">
              <h2 className="xr-loc-subtitle">包含这里的路线</h2>
              <div className="xr-grid-3">
                {routes.map((r) => (
                  <RouteCard key={r.id} route={r} />
                ))}
              </div>
            </section>
          )}
        </div>

        {/* —— 右栏 —— */}
        <aside className="xr-rail">
          <div className="xr-card xr-rail-card">
            <h3 className="xr-rail-card__title">实用信息</h3>
            <div className="xr-info-list">
              <div className="xr-info-row">
                <MapPin size={16} strokeWidth={1.8} color="var(--violet-600)" />
                <div>
                  <p className="xr-info-row__label">地址</p>
                  <p>{location.address}</p>
                </div>
              </div>
              <div className="xr-info-row">
                <Clock size={16} strokeWidth={1.8} color="var(--violet-600)" />
                <div>
                  <p className="xr-info-row__label">开放时间</p>
                  <p className="num">{formatOpeningHours(location.openingHours)}</p>
                </div>
              </div>
              <div className="xr-info-row">
                <Timer size={16} strokeWidth={1.8} color="var(--violet-600)" />
                <div>
                  <p className="xr-info-row__label">建议停留</p>
                  <p className="num">{location.suggestedStayMin} 分钟</p>
                </div>
              </div>
              <div className="xr-info-row">
                <Flame size={16} strokeWidth={1.8} color="var(--gold-600)" />
                <div>
                  <p className="xr-info-row__label">社区热度</p>
                  <p className="num">
                    {formatCount(location.checkinCount)} 人打卡 · {location.stats.communityScore} 分
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* AI 入口 */}
          <AIEntryCard
            variant="location"
            text={`把「${location.name}」加入我的路线`}
            onAction={() => navigate(`/ai/planning?locationId=${location.id}`)}
          />

          {/* 相关明星 */}
          <div className="xr-card xr-rail-card">
            <h3 className="xr-rail-card__title">相关明星</h3>
            <ul className="xr-celeb-mini">
              <li onClick={() => navigate(`/celebrity/${location.celebrity.id}`)}>
                <Avatar src={location.celebrity.avatar} name={location.celebrity.name} size={32} />
                <div>
                  <p className="xr-celeb-mini__name">{location.celebrity.name}</p>
                  <p className="xr-celeb-mini__fans">{location.cityName}</p>
                </div>
              </li>
            </ul>
          </div>
        </aside>
      </div>
    </div>
  )
}

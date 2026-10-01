import { useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { getCelebrityView, getLocationsByCelebrity, getPostsByCelebrity, getRoutesByCelebrity } from '@/services/data'
import { useAsync } from '@/hooks/useAsync'
import { formatCount, LOCATION_TYPE_LABELS } from '@/utils/format'
import type { LocationType } from '@/types'
import SmartImage from '@/components/ui/SmartImage'
import Avatar from '@/components/ui/Avatar'
import Tag from '@/components/ui/Tag'
import StarRailMark from '@/components/icons/StarRailMark'
import SectionHeader from '@/components/layout/SectionHeader'
import LocationCard from '@/components/location/LocationCard'
import RouteCard from '@/components/route/RouteCard'
import { PostRow } from '@/components/feed/PostCard'

const TYPE_FILTERS: { key: LocationType | 'all'; label: string }[] = [
  { key: 'all', label: '全部' },
  { key: 'concert', label: LOCATION_TYPE_LABELS.concert },
  { key: 'filming', label: LOCATION_TYPE_LABELS.filming },
  { key: 'food', label: LOCATION_TYPE_LABELS.food },
  { key: 'brand', label: LOCATION_TYPE_LABELS.brand },
  { key: 'fan', label: LOCATION_TYPE_LABELS.fan },
]

/** 明星主页：以明星为维度的内容聚合（头图 + 地点全集 + 攻略 + 路线 + AI 次级入口） */
export default function CelebrityPage() {
  const navigate = useNavigate()
  const { celebrityId = '' } = useParams()
  const [typeFilter, setTypeFilter] = useState<LocationType | 'all'>('all')

  const { data, loading } = useAsync(
    () =>
      Promise.all([
        getCelebrityView(celebrityId),
        getLocationsByCelebrity(celebrityId),
        getPostsByCelebrity(celebrityId),
        getRoutesByCelebrity(celebrityId),
      ]).then(([celeb, locations, posts, routes]) => ({ celeb, locations, posts, routes })),
    [celebrityId],
  )

  const filteredLocations = useMemo(() => {
    if (!data) return []
    return typeFilter === 'all' ? data.locations : data.locations.filter((l) => l.type === typeFilter)
  }, [data, typeFilter])

  if (loading || !data) {
    return (
      <div className="xr-container xr-page">
        <div className="xr-skeleton" style={{ height: 320, marginBottom: 20, borderRadius: 'var(--r-lg)' }} />
        <div className="xr-grid-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="xr-skeleton" style={{ height: 240 }} />
          ))}
        </div>
      </div>
    )
  }

  const { celeb, posts, routes } = data
  const guides = posts.filter((p) => p.type === 'guide').slice(0, 3)
  const primary = celeb.cityStats[0]

  return (
    <div className="xr-container xr-page">
      <button className="xr-back-row" onClick={() => navigate(-1)}>
        <ArrowLeft size={16} strokeWidth={1.8} />
        返回
      </button>

      {/* —— 明星头图（夜域）—— */}
      <div className="xr-celeb-hero">
        <SmartImage src={celeb.cardImage} alt={celeb.name} fill eager />
        <div className="xr-celeb-hero__overlay" />
        <div className="xr-celeb-hero__body">
          <Avatar src={celeb.avatar} name={celeb.name} size={64} ring />
          <div>
            <h1 className="xr-celeb-hero__name">{celeb.name}</h1>
            <p className="xr-celeb-hero__tagline">{celeb.tagline}</p>
          </div>
          <div className="xr-celeb-hero__stats">
            <Tag variant="night">
              <span className="num">{formatCount(celeb.fansCount)}</span> 社区关注
            </Tag>
            {primary && (
              <Tag variant="night">
                {primary.cityName} <span className="num">{primary.locationCount}</span> 个打卡点
              </Tag>
            )}
            <Tag variant="night">
              <span className="num">{celeb.totalPostCount}</span> 篇社区内容
            </Tag>
          </div>
          <button
            className="xr-btn xr-btn--soft-gold xr-btn--md"
            onClick={() => navigate(`/ai/planning?celebrityId=${celeb.id}`)}
          >
            <StarRailMark size={15} />
            用 AI 规划 TA 的打卡路线
          </button>
        </div>
      </div>

      {/* —— 地点全集 —— */}
      <section className="xr-section">
        <SectionHeader title={`${celeb.name} 的打卡点`} />
        <div className="xr-type-filters">
          {TYPE_FILTERS.map((f) => (
            <button
              key={f.key}
              className={`xr-chip${typeFilter === f.key ? ' xr-chip--active' : ''}`}
              onClick={() => setTypeFilter(f.key)}
            >
              {f.label}
            </button>
          ))}
        </div>
        <div className="xr-grid-3">
          {filteredLocations.map((l) => (
            <LocationCard key={l.id} location={l} />
          ))}
        </div>
      </section>

      {/* —— 相关攻略 —— */}
      {guides.length > 0 && (
        <section className="xr-section">
          <SectionHeader title="相关攻略" />
          <div className="xr-post-list">
            {guides.map((p) => (
              <PostRow key={p.id} post={p} />
            ))}
          </div>
        </section>
      )}

      {/* —— 相关路线 —— */}
      {routes.length > 0 && (
        <section className="xr-section">
          <SectionHeader title="相关路线" />
          <div className="xr-grid-3">
            {routes.map((r) => (
              <RouteCard key={r.id} route={r} />
            ))}
          </div>
        </section>
      )}
    </div>
  )
}

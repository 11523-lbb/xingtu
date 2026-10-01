import { useNavigate } from 'react-router-dom'
import { Search } from 'lucide-react'
import { getCelebrities, getCities, getCelebrityView, getFeed, getHotLocations, getRoutes } from '@/services/data'
import { useAsync } from '@/hooks/useAsync'
import SmartImage from '@/components/ui/SmartImage'
import Tag from '@/components/ui/Tag'
import StarRailMark from '@/components/icons/StarRailMark'
import SectionHeader from '@/components/layout/SectionHeader'
import CelebrityCard from '@/components/celebrity/CelebrityCard'
import LocationCard from '@/components/location/LocationCard'
import RouteCard from '@/components/route/RouteCard'
import FeedGrid from '@/components/feed/FeedGrid'

/**
 * 首页 / 发现 —— 信息层级：
 * 搜索（顶部导航）→ Hero（城市+明星+打卡，AI 为次级入口）→ 热门明星
 * → 精选路线 + 热门地点 → 社区精选 → 页脚
 * 视觉节奏：深(Hero) → 浅(明星) → 深(路线) → 浅(地点/社区)
 */
export default function HomePage() {
  const navigate = useNavigate()
  const { data, loading } = useAsync(async () => {
    const [celebs, routes, hotLocs, feed, cities, jay] = await Promise.all([
      getCelebrities(),
      getRoutes(),
      getHotLocations(6),
      getFeed('all'),
      getCities(),
      getCelebrityView('cele_jaychou'),
    ])
    return { celebs, routes: routes.slice(0, 3), hotLocs, feed: feed.slice(0, 6), city: cities[0], jay }
  }, [])

  if (loading || !data) return <HomeSkeleton />

  return (
    <div className="xr-container xr-page">
      {/* —— 移动端搜索入口（桌面端在顶部导航）—— */}
      <button className="xr-mobile-search" onClick={() => navigate('/search')}>
        <Search size={16} strokeWidth={1.8} />
        <span>搜索明星、地点、攻略</span>
      </button>

      {/* —— Hero：去哪里追星（唯一深色品牌时刻）—— */}
      <section className="xr-hero">
        <SmartImage src={data.city.heroImage} alt="上海城市夜景" fill eager />
        <div className="xr-hero__overlay" />
        <div className="xr-hero__content">
          <h1 className="xr-hero__title">今天，去哪里打卡？</h1>
          <p className="xr-hero__sub">跟着星光，找到属于你的追星地图</p>
          <div className="xr-hero__chips">
            <Tag variant="night">{data.city.name}</Tag>
            <Tag variant="night">{data.jay.name}</Tag>
            <Tag variant="night-gold">
              <StarRailMark size={12} />
              <span className="num">{data.jay.totalLocationCount} 个相关地点</span>
            </Tag>
          </div>
          <div className="xr-hero__cta">
            <button className="xr-btn xr-btn--accent xr-btn--lg" onClick={() => navigate('/community')}>
              看看大家都去了哪里
            </button>
            <button
              className="xr-btn xr-btn--ghost-night xr-btn--lg"
              onClick={() => navigate('/celebrity/cele_jaychou')}
            >
              进入 {data.jay.name} · {data.city.name}
            </button>
          </div>
          <button className="xr-hero__ai" onClick={() => navigate('/ai/planning')}>
            <StarRailMark size={13} />
            不知道怎么安排？让星途帮你规划 →
          </button>
        </div>
      </section>

      {/* —— 热门明星 —— */}
      <section className="xr-section">
        <SectionHeader title="热门明星" actionLabel="查看全部" onAction={() => navigate('/community')} />
        <div className="xr-grid-3">
          {data.celebs.map((c) => (
            <CelebrityCard key={c.id} celeb={c} />
          ))}
        </div>
      </section>

      {/* —— 精选路线（夜域卡，品牌呼吸点）—— */}
      <section className="xr-section">
        <SectionHeader title="精选路线" actionLabel="查看全部" onAction={() => navigate('/community')} />
        <div className="xr-grid-3">
          {data.routes.map((r) => (
            <RouteCard key={r.id} route={r} />
          ))}
        </div>
      </section>

      {/* —— 热门打卡点 —— */}
      <section className="xr-section">
        <SectionHeader title="热门打卡点" actionLabel="查看全部" onAction={() => navigate('/community')} />
        <div className="xr-grid-3">
          {data.hotLocs.map((l) => (
            <LocationCard key={l.id} location={l} />
          ))}
        </div>
      </section>

      {/* —— 社区精选 —— */}
      <section className="xr-section">
        <SectionHeader title="社区精选" actionLabel="进入社区" onAction={() => navigate('/community')} />
        <FeedGrid posts={data.feed} />
      </section>

      <footer className="xr-footer">
        <StarRailMark size={18} />
        <span>星途 · 社区沉淀，AI 转化，行动回流</span>
        <span className="xr-footer__note">本 Demo 全部内容均为演示数据，不构成任何真实关联声明</span>
      </footer>
    </div>
  )
}

function HomeSkeleton() {
  return (
    <div className="xr-container xr-page">
      <div className="xr-skeleton" style={{ height: 360, borderRadius: 'var(--r-lg)' }} />
      <div className="xr-section">
        <div className="xr-skeleton" style={{ width: 120, height: 28, marginBottom: 20 }} />
        <div className="xr-grid-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="xr-skeleton" style={{ height: 220 }} />
          ))}
        </div>
      </div>
      <div className="xr-section">
        <div className="xr-skeleton" style={{ width: 120, height: 28, marginBottom: 20 }} />
        <div className="xr-grid-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="xr-skeleton" style={{ height: 180 }} />
          ))}
        </div>
      </div>
    </div>
  )
}

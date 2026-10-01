import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Flame, PenLine } from 'lucide-react'
import { getCelebrities, getFeed, getHotLocations } from '@/services/data'
import { useAsync } from '@/hooks/useAsync'
import { useUserStore } from '@/store/userStore'
import type { PostType } from '@/types'
import { formatCount } from '@/utils/format'
import FeedGrid from '@/components/feed/FeedGrid'
import AIEntryCard from '@/components/ai/AIEntryCard'
import SmartImage from '@/components/ui/SmartImage'
import Avatar from '@/components/ui/Avatar'

type FeedTab = 'all' | PostType

const TABS: { key: FeedTab; label: string }[] = [
  { key: 'all', label: '推荐' },
  { key: 'guide', label: '攻略' },
  { key: 'route', label: '路线' },
  { key: 'checkin', label: '打卡' },
]

/**
 * 社区 —— 产品主体页面
 * 内容优先：瀑布流为主体；AI 仅一条轻量入口；右栏为热门地点/明星辅助发现
 */
export default function CommunityPage() {
  const navigate = useNavigate()
  const showToast = useUserStore((s) => s.showToast)
  const [tab, setTab] = useState<FeedTab>('all')

  const { data, loading } = useAsync(
    () =>
      Promise.all([getFeed(tab), getHotLocations(5), getCelebrities()]).then(
        ([feed, hotLocs, celebs]) => ({ feed, hotLocs, celebs }),
      ),
    [tab],
  )

  return (
    <div className="xr-container xr-page">
      {/* —— 页头 —— */}
      <div className="xr-community-head">
        <h1 className="xr-community-head__title">社区</h1>
        <div className="xr-tabs">
          {TABS.map((t) => (
            <button
              key={t.key}
              className={`xr-tabs__item${tab === t.key ? ' xr-tabs__item--active' : ''}`}
              onClick={() => setTab(t.key)}
            >
              {t.label}
            </button>
          ))}
        </div>
        <button
          className="xr-btn xr-btn--primary xr-btn--sm xr-community-head__publish"
          onClick={() => showToast('发布功能将在后续阶段开放')}
        >
          <PenLine size={15} strokeWidth={1.8} />
          发布
        </button>
      </div>

      {/* —— AI 轻量入口（唯一，不占面积）—— */}
      <AIEntryCard variant="feed" onAction={() => navigate('/ai/planning')} />

      {/* —— 主体：Feed + 右栏 —— */}
      <div className="xr-detail-layout xr-section--first">
        <div className="xr-community-main">
          {loading || !data ? (
            <FeedSkeleton />
          ) : data.feed.length === 0 ? (
            <div className="xr-empty">
              <span className="xr-empty__icon">☆</span>
              <p className="xr-empty__title">这里还没有内容</p>
              <p className="xr-empty__hint">换个分类看看，或去逛逛打卡点</p>
            </div>
          ) : (
            <FeedGrid posts={data.feed} />
          )}
        </div>

        {/* —— 右栏：热门地点榜 + 推荐明星 —— */}
        {data && (
          <aside className="xr-rail">
            <div className="xr-card xr-rail-card">
              <h3 className="xr-rail-card__title">热门地点榜</h3>
              <ol className="xr-rank-list">
                {data.hotLocs.map((l, i) => (
                  <li key={l.id} onClick={() => navigate(`/location/${l.id}`)}>
                    <span className="xr-rank-list__no num">{i + 1}</span>
                    <SmartImage src={l.stats.coverImage} alt={l.name} ratio="1 / 1" className="xr-rank-list__thumb" />
                    <span className="xr-rank-list__name">{l.name}</span>
                    <span className="xr-rank-list__heat">
                      <Flame size={12} strokeWidth={1.8} />
                      <span className="num">{formatCount(l.checkinCount)}</span>
                    </span>
                  </li>
                ))}
              </ol>
            </div>

            <div className="xr-card xr-rail-card">
              <h3 className="xr-rail-card__title">关注明星</h3>
              <ul className="xr-celeb-mini">
                {data.celebs.map((c) => (
                  <li key={c.id} onClick={() => navigate(`/celebrity/${c.id}`)}>
                    <Avatar src={c.avatar} name={c.name} size={32} />
                    <div>
                      <p className="xr-celeb-mini__name">{c.name}</p>
                      <p className="xr-celeb-mini__fans num">{formatCount(c.fansCount)} 社区关注</p>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </aside>
        )}
      </div>
    </div>
  )
}

function FeedSkeleton() {
  return (
    <div className="xr-feed">
      {[1, 2, 3, 4, 5, 6].map((i) => (
        <div key={i} className="xr-card" style={{ marginBottom: 20, padding: 16 }}>
          <div className="xr-skeleton" style={{ height: i % 2 === 0 ? 180 : 240, marginBottom: 12 }} />
          <div className="xr-skeleton" style={{ height: 18, width: '85%', marginBottom: 8 }} />
          <div className="xr-skeleton" style={{ height: 14, width: '50%' }} />
        </div>
      ))}
    </div>
  )
}

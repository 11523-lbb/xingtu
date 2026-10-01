import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, MapPin, Search, X } from 'lucide-react'
import { searchAll } from '@/services/data'
import { useAsync } from '@/hooks/useAsync'
import { formatCount, LOCATION_TYPE_LABELS } from '@/utils/format'
import SmartImage from '@/components/ui/SmartImage'
import Avatar from '@/components/ui/Avatar'
import Tag from '@/components/ui/Tag'
import PostTypeBadge from '@/components/ui/PostTypeBadge'
import { PostRow } from '@/components/feed/PostCard'

const HOT_WORDS = ['周杰伦', '上海', '外滩', '攻略', '奶茶', '唱片']

/** 基础搜索页：真实查询 mock 数据（明星/城市/地点/帖子），非假装完成 */
export default function SearchPage() {
  const navigate = useNavigate()
  const [q, setQ] = useState('')
  const [debounced, setDebounced] = useState('')

  useEffect(() => {
    const t = setTimeout(() => setDebounced(q.trim()), 250)
    return () => clearTimeout(t)
  }, [q])

  const { data, loading } = useAsync(() => searchAll(debounced), [debounced])

  const hasQuery = debounced.length > 0
  const isEmpty =
    hasQuery && data && !data.celebrities.length && !data.cities.length && !data.locations.length && !data.posts.length

  return (
    <div className="xr-container xr-page xr-search-page">
      <div className="xr-search-bar">
        <button className="xr-back-row" style={{ marginBottom: 0 }} onClick={() => navigate(-1)}>
          <ArrowLeft size={18} strokeWidth={1.8} />
        </button>
        <div className="xr-search-input">
          <Search size={16} strokeWidth={1.8} />
          <input
            autoFocus
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="搜索明星、地点、攻略"
            maxLength={40}
          />
          {q && (
            <button onClick={() => setQ('')} aria-label="清空">
              <X size={16} strokeWidth={1.8} />
            </button>
          )}
        </div>
      </div>

      {!hasQuery && (
        <div className="xr-search-hot">
          <p className="xr-search-hot__label">大家都在搜</p>
          <div className="xr-search-hot__words">
            {HOT_WORDS.map((w) => (
              <Tag key={w} onClick={() => setQ(w)}>
                {w}
              </Tag>
            ))}
          </div>
          <p className="xr-search-hot__hint">数据来自星途演示数据集（周杰伦 × 上海）</p>
        </div>
      )}

      {loading && hasQuery && (
        <div className="xr-search-results">
          {[1, 2, 3].map((i) => (
            <div key={i} className="xr-skeleton" style={{ height: 72, marginBottom: 12 }} />
          ))}
        </div>
      )}

      {!loading && hasQuery && data && (
        <div className="xr-search-results">
          {data.celebrities.length > 0 && (
            <section className="xr-search-group">
              <h3 className="xr-search-group__title">明星</h3>
              {data.celebrities.map((c) => (
                <div key={c.id} className="xr-search-row" onClick={() => navigate(`/celebrity/${c.id}`)}>
                  <Avatar src={c.avatar} name={c.name} size={40} />
                  <div className="xr-search-row__body">
                    <p className="xr-search-row__title">{c.name}</p>
                    <p className="xr-search-row__meta num">
                      {formatCount(c.fansCount)} 社区关注 · {c.totalLocationCount} 个打卡点
                    </p>
                  </div>
                </div>
              ))}
            </section>
          )}

          {data.cities.length > 0 && (
            <section className="xr-search-group">
              <h3 className="xr-search-group__title">城市</h3>
              {data.cities.map((c) => (
                <div
                  key={c.id}
                  className="xr-search-row"
                  onClick={() => {
                    if (c.locationCount > 0) navigate('/celebrity/cele_jaychou')
                  }}
                >
                  <MapPin size={20} strokeWidth={1.8} color="var(--violet-600)" />
                  <div className="xr-search-row__body">
                    <p className="xr-search-row__title">{c.name}</p>
                    <p className="xr-search-row__meta">
                      {c.locationCount > 0
                        ? `${c.locationCount} 个打卡点 · 点击查看周杰伦相关内容`
                        : '暂无打卡内容，敬请期待'}
                    </p>
                  </div>
                </div>
              ))}
            </section>
          )}

          {data.locations.length > 0 && (
            <section className="xr-search-group">
              <h3 className="xr-search-group__title">打卡点</h3>
              {data.locations.map((l) => (
                <div key={l.id} className="xr-search-row" onClick={() => navigate(`/location/${l.id}`)}>
                  <SmartImage src={l.stats.coverImage} alt={l.name} ratio="1 / 1" className="xr-search-row__thumb" />
                  <div className="xr-search-row__body">
                    <p className="xr-search-row__title">{l.name}</p>
                    <p className="xr-search-row__meta">
                      {LOCATION_TYPE_LABELS[l.type]} · {l.celebrity.name} · {l.cityName}
                    </p>
                  </div>
                  <Tag variant="gold">{formatCount(l.checkinCount)} 打卡</Tag>
                </div>
              ))}
            </section>
          )}

          {data.posts.length > 0 && (
            <section className="xr-search-group">
              <h3 className="xr-search-group__title">社区内容</h3>
              <div className="xr-post-list">
                {data.posts.map((p) => (
                  <div key={p.id}>
                    <PostTypeBadge type={p.type} />
                    <PostRow post={p} />
                  </div>
                ))}
              </div>
            </section>
          )}

          {isEmpty && (
            <div className="xr-empty">
              <span className="xr-empty__icon">☆</span>
              <p className="xr-empty__title">没有找到「{debounced}」相关内容</p>
              <p className="xr-empty__hint">试试「周杰伦」「外滩」「攻略」等关键词</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

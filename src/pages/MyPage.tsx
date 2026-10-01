import { useNavigate } from 'react-router-dom'
import { Heart, MapPin, Star } from 'lucide-react'
import { useUserStore } from '@/store/userStore'
import { getLocationRefSync } from '@/services/data'
import Avatar from '@/components/ui/Avatar'
import SmartImage from '@/components/ui/SmartImage'

/** 我的 —— 本阶段为基础占位：资料卡 + 想去/收藏/已打卡统计 + 想去清单预览（真实状态） */
export default function MyPage() {
  const navigate = useNavigate()
  const profile = useUserStore((s) => s.profile)
  const wanted = useUserStore((s) => s.wantedLocationIds)
  const collected = useUserStore((s) => s.collectedLocationIds)
  const checkedIn = useUserStore((s) => s.checkedInLocationIds)

  const wantedLocations = wanted.map((id) => getLocationRefSync(id)).filter((l): l is NonNullable<typeof l> => l !== null)

  return (
    <div className="xr-container xr-page">
      {/* 资料卡 */}
      <div className="xr-card xr-my-profile">
        <Avatar src={profile.avatar} name={profile.nickname} size={64} ring />
        <div className="xr-my-profile__body">
          <h1>{profile.nickname}</h1>
          <p>在上海生活，周末出门找星光</p>
        </div>
        <div className="xr-my-profile__stats">
          <div>
            <p className="xr-my-profile__num num">{wanted.length}</p>
            <p className="xr-my-profile__label">想去</p>
          </div>
          <div>
            <p className="xr-my-profile__num num">{collected.length}</p>
            <p className="xr-my-profile__label">收藏</p>
          </div>
          <div>
            <p className="xr-my-profile__num num">{checkedIn.length}</p>
            <p className="xr-my-profile__label">已打卡</p>
          </div>
        </div>
      </div>

      {/* 想去清单预览（真实状态，可跳转） */}
      <section className="xr-section">
        <h2 className="xr-loc-subtitle">
          <Heart size={16} strokeWidth={1.8} color="var(--pink-500)" />
          我的想去清单
        </h2>
        {wantedLocations.length === 0 ? (
          <div className="xr-empty">
            <span className="xr-empty__icon">☆</span>
            <p className="xr-empty__title">还没有想去的打卡点</p>
            <p className="xr-empty__hint">去社区逛逛，收藏你的第一颗星光</p>
            <button className="xr-btn xr-btn--primary xr-btn--md" onClick={() => navigate('/community')}>
              去发现
            </button>
          </div>
        ) : (
          <div className="xr-grid-3">
            {wantedLocations.map((l) => (
              <article key={l.id} className="xr-card xr-card--hover xr-my-loc" onClick={() => navigate(`/location/${l.id}`)}>
                <SmartImage src="" alt={l.name} ratio="16 / 9" />
                <div className="xr-my-loc__body">
                  <p className="xr-my-loc__name">{l.name}</p>
                  <p className="xr-my-loc__meta">
                    <MapPin size={12} strokeWidth={1.8} />
                    {l.celebrityName} · {l.cityName}
                  </p>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      {/* 阶段说明 */}
      <div className="xr-card xr-my-note">
        <Star size={16} strokeWidth={1.8} color="var(--gold-600)" />
        <p>
          打卡足迹、我的路线、我的发布等完整功能将在后续阶段开放。已打卡与收藏状态已在全站可用。
        </p>
      </div>
    </div>
  )
}

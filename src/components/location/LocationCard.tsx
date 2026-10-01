import { useNavigate } from 'react-router-dom'
import { BadgeCheck, BookOpen, Bookmark, Camera, Flame, Heart, MapPin, Star, Timer } from 'lucide-react'
import type { LocationView } from '@/types'
import { formatCount, LOCATION_TYPE_LABELS } from '@/utils/format'
import { useUserStore } from '@/store/userStore'
import SmartImage from '@/components/ui/SmartImage'
import StarRailMark from '@/components/icons/StarRailMark'

interface Props {
  location: LocationView
}

/**
 * 打卡点卡片：图片 / 名称 / 类型 / 明星城市 / 内容数量 / 想去 / 已打卡 / 加入AI路线
 * 整卡点击 → 地点详情；操作按钮不冒泡
 */
export default function LocationCard({ location }: Props) {
  const navigate = useNavigate()
  const wanted = useUserStore((s) => s.wantedLocationIds.includes(location.id))
  const checkedIn = useUserStore((s) => s.checkedInLocationIds.includes(location.id))
  const collected = useUserStore((s) => s.collectedLocationIds.includes(location.id))
  const toggleWanted = useUserStore((s) => s.toggleWanted)
  const toggleCheckedIn = useUserStore((s) => s.toggleCheckedIn)
  const toggleCollected = useUserStore((s) => s.toggleCollectedLocation)

  return (
    <article
      className="xr-card xr-card--hover xr-loc-card"
      onClick={() => navigate(`/location/${location.id}`)}
    >
      <div className="xr-loc-card__cover">
        <SmartImage src={location.stats.coverImage} alt={location.name} ratio="16 / 9" />
        <span className="xr-loc-card__type">
          <MapPin size={12} strokeWidth={1.8} />
          {LOCATION_TYPE_LABELS[location.type]}
        </span>
        <span className="xr-loc-card__heat">
          <Flame size={12} strokeWidth={1.8} />
          <span className="num">{formatCount(location.checkinCount)}</span>
        </span>
      </div>

      <div className="xr-loc-card__body">
        <h3 className="xr-loc-card__name">{location.name}</h3>
        <div className="xr-loc-card__meta">
          <Star size={12} strokeWidth={1.8} color="var(--violet-600)" />
          <span>
            {location.celebrity.name} · {location.cityName}
          </span>
        </div>

        <div className="xr-loc-card__stats">
          <span>
            <Camera size={14} strokeWidth={1.8} />
            <span className="num">{location.stats.checkinPhotoCount}</span> 照片
          </span>
          <span>
            <BookOpen size={14} strokeWidth={1.8} />
            <span className="num">{location.stats.guideCount}</span> 攻略
          </span>
          <span>
            <Timer size={14} strokeWidth={1.8} />
            {location.suggestedStayMin}min
          </span>
        </div>

        <div className="xr-loc-card__actions">
          <button
            className={`xr-action${wanted ? ' xr-action--liked' : ''}`}
            onClick={(e) => {
              e.stopPropagation()
              toggleWanted(location.id)
            }}
            aria-label="想去"
            title={wanted ? '已加入想去' : '想去'}
          >
            <Heart size={18} strokeWidth={1.8} fill={wanted ? 'currentColor' : 'none'} />
          </button>
          <button
            className={`xr-action${collected ? ' xr-action--collected' : ''}`}
            onClick={(e) => {
              e.stopPropagation()
              toggleCollected(location.id)
            }}
            aria-label="收藏"
            title="收藏"
          >
            <Bookmark size={18} strokeWidth={1.8} fill={collected ? 'currentColor' : 'none'} />
          </button>
          <button
            className={`xr-action${checkedIn ? ' xr-action--checkedin' : ''}`}
            onClick={(e) => {
              e.stopPropagation()
              toggleCheckedIn(location.id)
            }}
            aria-label="已打卡"
            title={checkedIn ? '已打卡' : '标记已打卡'}
          >
            <BadgeCheck size={18} strokeWidth={1.8} fill={checkedIn ? 'currentColor' : 'none'} />
          </button>

          <span className="xr-loc-card__spacer" />

          <button
            className="xr-btn xr-btn--soft-gold xr-btn--sm"
            onClick={(e) => {
              e.stopPropagation()
              navigate(`/ai/planning?locationId=${location.id}`)
            }}
          >
            <StarRailMark size={13} />
            加入AI路线
          </button>
        </div>
      </div>
    </article>
  )
}

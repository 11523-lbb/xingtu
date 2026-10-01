import { useNavigate } from 'react-router-dom'
import { Heart, User } from 'lucide-react'
import type { RouteView } from '@/types'
import { formatCount, formatDurationShort } from '@/utils/format'
import Avatar from '@/components/ui/Avatar'
import Tag from '@/components/ui/Tag'
import StarRailStrip from './StarRailStrip'

interface Props {
  route: RouteView
}

/** 路线卡（夜域）：名称 / 主题 / 星轨节点条 / 统计 / 作者 / 点赞 */
export default function RouteCard({ route }: Props) {
  const navigate = useNavigate()

  return (
    <article
      className="xr-card--night xr-route-card"
      onClick={() => navigate(`/route/${route.id}`)}
    >
      <div className="xr-route-card__head">
        <Tag variant="night-gold">{route.theme}</Tag>
        {route.author && (
          <span className="xr-route-card__author">
            <User size={12} strokeWidth={1.8} />
            {route.author.nickname}
          </span>
        )}
      </div>
      <StarRailStrip count={Math.min(route.stops.length, 6)} />
      <h3 className="xr-route-card__name">{route.name}</h3>
      <p className="xr-route-card__meta num">
        {route.stops.length} 个地点 · {formatDurationShort(route.totalMin)} · {route.totalKm}km
      </p>
      <p className="xr-route-card__desc">{route.desc}</p>
      <div className="xr-route-card__foot">
        <span className="xr-route-card__likes">
          <Heart size={14} strokeWidth={1.8} />
          <span className="num">{formatCount(route.likes)}</span>
        </span>
        {route.author && (
          <Avatar src={route.author.avatar} name={route.author.nickname} size={22} />
        )}
      </div>
    </article>
  )
}

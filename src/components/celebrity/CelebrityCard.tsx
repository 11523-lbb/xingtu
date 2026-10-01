import { useNavigate } from 'react-router-dom'
import type { CelebritySummary } from '@/types'
import { formatCount } from '@/utils/format'
import SmartImage from '@/components/ui/SmartImage'
import Avatar from '@/components/ui/Avatar'

interface Props {
  celeb: CelebritySummary
}

/** 明星卡：城市夜景底 + 品牌化首字头像 + 社区数据（全部来自 mock 派生） */
export default function CelebrityCard({ celeb }: Props) {
  const navigate = useNavigate()
  const primary = celeb.cityStats[0]

  return (
    <article
      className="xr-card--night xr-celeb-card"
      onClick={() => navigate(`/celebrity/${celeb.id}`)}
    >
      <SmartImage src={celeb.cardImage} alt={celeb.name} ratio="16 / 10" fill />
      <div className="xr-celeb-card__overlay" />
      <div className="xr-celeb-card__body">
        <Avatar src={celeb.avatar} name={celeb.name} size={48} ring />
        <h3>{celeb.name}</h3>
        <p className="xr-celeb-card__tagline">{celeb.tagline}</p>
        <p className="xr-celeb-card__stats num">
          {formatCount(celeb.fansCount)} 社区关注
          {primary ? ` · ${primary.cityName} ${primary.locationCount} 个打卡点 · ${primary.postCount} 篇内容` : ''}
        </p>
      </div>
    </article>
  )
}

import { Link } from 'react-router-dom'
import { Footprints, TrainFront } from 'lucide-react'
import type { RouteView } from '@/types'
import Tag from '@/components/ui/Tag'

interface Props {
  route: RouteView
}

/** 纵向星轨时间轴：编号节点 + 到达/离开/停留 + 交通段 ——「这是一条可以真正执行的路线」 */
export default function StarRailTimeline({ route }: Props) {
  return (
    <div className="xr-timeline">
      {route.stops.map((s, i) => {
        const next = route.stops[i + 1]
        return (
          <div key={s.location.id} className="xr-timeline__row">
            <div className="xr-timeline__rail">
              <span className="xr-timeline__node num">{i + 1}</span>
              {i < route.stops.length - 1 && <span className="xr-timeline__line" />}
            </div>
            <div className="xr-timeline__body">
              <div className="xr-timeline__time num">
                {s.arriveAt} – {s.leaveAt}
                <Tag variant="gold">{s.stayMin} 分钟</Tag>
              </div>
              <div className="xr-timeline__name">
                <Link to={`/location/${s.location.id}`}>{s.location.name}</Link>
              </div>
              {s.note && <div className="xr-timeline__note">{s.note}</div>}
              {next && (
                <div className="xr-timeline__travel">
                  {next.travelMode === 'walk' ? (
                    <Footprints size={14} strokeWidth={1.8} />
                  ) : (
                    <TrainFront size={14} strokeWidth={1.8} />
                  )}
                  <span>
                    {next.travelMode === 'walk' ? '步行' : '地铁'} {next.travelMin} 分钟 ·{' '}
                    <span className="num">{next.distanceFromPrevKm}km</span>
                  </span>
                </div>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}

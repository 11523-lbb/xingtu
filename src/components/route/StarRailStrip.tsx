import { Star } from 'lucide-react'

interface Props {
  count: number
}

/** 横向星轨节点条：路线卡的品牌元素（星尘虚线 + 节点 + 终点星） */
export default function StarRailStrip({ count }: Props) {
  const nodes = Array.from({ length: count }, (_, i) => i)
  return (
    <div className="xr-starrail" aria-hidden="true">
      {nodes.map((i) => (
        <div key={i} className="xr-starrail__group">
          {i === count - 1 ? (
            <Star size={13} strokeWidth={1.8} fill="currentColor" className="xr-starrail__star" />
          ) : (
            <span className="xr-starrail__node" />
          )}
          {i < count - 1 && <span className="xr-starrail__seg" />}
        </div>
      ))}
    </div>
  )
}

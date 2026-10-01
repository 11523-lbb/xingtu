import { ArrowRight } from 'lucide-react'
import StarRailMark from '@/components/icons/StarRailMark'

interface Props {
  text?: string
  actionLabel?: string
  onAction: () => void
  /** feed = 社区轻量入口（细条）；location = 地点详情入口卡 */
  variant?: 'feed' | 'location'
}

/**
 * AI 入口卡 —— 社区与 AI 的连接点
 * 视觉克制（金色软底 + 星轨标记），文案强调「整理社区信息」而非「机器人」
 */
export default function AIEntryCard({ text, actionLabel, onAction, variant = 'feed' }: Props) {
  return (
    <div className={`xr-ai-entry xr-ai-entry--${variant}`}>
      <StarRailMark size={variant === 'feed' ? 16 : 22} />
      <div className="xr-ai-entry__body">
        <p className="xr-ai-entry__text">
          {text ?? '攻略太多，不知道怎么安排？让星途帮你把社区里的打卡点变成一条路线'}
        </p>
        {variant === 'location' && (
          <p className="xr-ai-entry__hint">星途 AI 会结合你的时间与偏好，把这里安排进你的行程</p>
        )}
      </div>
      <button className="xr-btn xr-btn--soft-gold xr-btn--sm" onClick={onAction}>
        {actionLabel ?? '试试 AI 路线'}
        <ArrowRight size={14} strokeWidth={1.8} />
      </button>
    </div>
  )
}

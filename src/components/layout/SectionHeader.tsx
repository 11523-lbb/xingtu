import { ChevronRight } from 'lucide-react'

interface Props {
  title: string
  actionLabel?: string
  onAction?: () => void
}

/** 区块标题：左标题 + 右「查看全部」 */
export default function SectionHeader({ title, actionLabel, onAction }: Props) {
  return (
    <div className="xr-section-head">
      <h2>{title}</h2>
      {actionLabel && (
        <button className="xr-section-head__action" onClick={onAction}>
          {actionLabel}
          <ChevronRight size={16} strokeWidth={1.8} />
        </button>
      )}
    </div>
  )
}

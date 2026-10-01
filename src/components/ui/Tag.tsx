import type { ReactNode } from 'react'

export type TagVariant = 'neutral' | 'violet' | 'gold' | 'pink' | 'amber' | 'glass' | 'night' | 'night-gold'

interface Props {
  variant?: TagVariant
  children: ReactNode
  className?: string
  onClick?: () => void
}

/** 标签/徽章：h24 圆角全，12/500；图标由 children 组合传入 */
export default function Tag({ variant = 'neutral', children, className, onClick }: Props) {
  return (
    <span
      className={`xr-tag xr-tag--${variant}${className ? ` ${className}` : ''}${onClick ? ' xr-tag--clickable' : ''}`}
      onClick={onClick}
    >
      {children}
    </span>
  )
}

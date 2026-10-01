/* ============================================================
   SmartImage —— 统一图片组件
   - lazy loading（eager 可选，Hero 用）
   - 骨架占位（shimmer）
   - onError → 品牌渐变兜底（夜空 + 星光金星轨）
   - object-fit: cover
   ============================================================ */
import { useState } from 'react'
import StarRailMark from '@/components/icons/StarRailMark'

interface Props {
  src: string
  alt: string
  /** 宽高比，如 '16 / 9'；不传则由父级高度决定 */
  ratio?: string
  /** 绝对填充父容器（Hero 等场景） */
  fill?: boolean
  eager?: boolean
  className?: string
}

export default function SmartImage({ src, alt, ratio, fill, eager, className }: Props) {
  const [status, setStatus] = useState<'loading' | 'ok' | 'error'>('loading')

  return (
    <div
      className={`xr-img${fill ? ' xr-img--fill' : ''}${className ? ` ${className}` : ''}`}
      style={ratio && !fill ? { aspectRatio: ratio } : undefined}
    >
      {status === 'error' ? (
        <div className="xr-img__fallback">
          <StarRailMark size={28} />
        </div>
      ) : (
        <>
          {status === 'loading' && <div className="xr-img__skeleton" />}
          <img
            src={src}
            alt={alt}
            loading={eager ? 'eager' : 'lazy'}
            decoding="async"
            onLoad={() => setStatus('ok')}
            onError={() => setStatus('error')}
            style={{ opacity: status === 'ok' ? 1 : 0 }}
          />
        </>
      )}
    </div>
  )
}

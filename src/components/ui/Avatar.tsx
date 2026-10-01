import { useState } from 'react'

interface Props {
  src: string
  name: string
  size?: number
  ring?: boolean
  className?: string
}

/** 圆形头像：加载失败时降级为首字头像（无网络依赖） */
export default function Avatar({ src, name, size = 32, ring, className }: Props) {
  const [failed, setFailed] = useState(false)
  const first = name.trim().charAt(0) || '星'

  return (
    <span
      className={`xr-avatar${ring ? ' xr-avatar--ring' : ''}${className ? ` ${className}` : ''}`}
      style={{ width: size, height: size }}
    >
      {!failed && src ? (
        <img src={src} alt={name} loading="lazy" onError={() => setFailed(true)} />
      ) : (
        <span className="xr-avatar__fallback" style={{ fontSize: Math.round(size * 0.42) }}>
          {first}
        </span>
      )}
    </span>
  )
}

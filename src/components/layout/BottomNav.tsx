import { NavLink } from 'react-router-dom'
import { Compass, MessageCircle, User } from 'lucide-react'

const ITEMS = [
  { to: '/', label: '首页', icon: Compass },
  { to: '/community', label: '社区', icon: MessageCircle },
  { to: '/my', label: '我的', icon: User },
]

/** 移动端底部导航：固定三个入口，AI 不进导航 */
export default function BottomNav() {
  return (
    <nav className="xr-bottomnav">
      {ITEMS.map(({ to, label, icon: Icon }) => (
        <NavLink
          key={to}
          to={to}
          end={to === '/'}
          className={({ isActive }) => `xr-bottomnav__item${isActive ? ' xr-bottomnav__item--active' : ''}`}
        >
          <Icon size={22} strokeWidth={1.8} />
          <span>{label}</span>
        </NavLink>
      ))}
    </nav>
  )
}
